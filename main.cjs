const { app, BrowserWindow, dialog, ipcMain, Menu, shell } = require('electron');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { findSaveCandidates } = require('./find-saves.cjs');

const APP_TITLE = 'MH3 Progress Analyzer';
let mainWindow;
let pendingSaveCandidates = [];
const MAX_SAVE_FILE_SIZE = 1024 * 1024;

function readSaveFiles(filePaths) {
  try {
    const paths = filePaths.filter((filePath) => /^data0[0-5]$/i.test(path.basename(filePath)));
    const nameCounts = new Map();
    for (const filePath of paths) {
      const name = path.basename(filePath).toLowerCase();
      nameCounts.set(name, (nameCounts.get(name) || 0) + 1);
    }
    const duplicates = [...nameCounts].filter(([, count]) => count > 1).map(([name]) => name);
    if (duplicates.length) {
      return { error: `Hay archivos repetidos (${duplicates.join(', ')}). Selecciona una sola carpeta de partida para evitar mezclar saves.` };
    }
    const files = paths.map((filePath) => {
      const stat = fs.statSync(filePath);
      if (!stat.isFile()) throw new Error(`${path.basename(filePath)} no es un archivo.`);
      if (stat.size > MAX_SAVE_FILE_SIZE) throw new Error(`${path.basename(filePath)} supera el tamaño máximo esperado para un save.`);
      const bytes = fs.readFileSync(filePath);
      const sourceId = crypto.createHash('sha256').update(path.resolve(path.dirname(filePath)).toLowerCase()).digest('hex').slice(0, 24);
      return { name: path.basename(filePath), size: bytes.byteLength, bytes: Uint8Array.from(bytes), sourceId };
    });
    return { files };
  } catch (error) {
    return { error: `No se pudo leer la partida: ${error?.message || 'error de acceso'}` };
  }
}

function createMenu() {
  const template = [
    {
      label: 'Archivo',
      submenu: [
        {
          label: 'Abrir archivos de partida…',
          accelerator: 'Ctrl+O',
          click: () => mainWindow?.webContents.send('save:request-open-dialog'),
        },
        {
          label: 'Buscar saves dentro de una carpeta…',
          accelerator: 'Ctrl+Shift+O',
          click: () => mainWindow?.webContents.send('save:request-open-folder'),
        },
        { type: 'separator' },
        { role: 'quit', label: 'Salir' },
      ],
    },
    {
      label: 'Editar',
      submenu: [
        { role: 'undo', label: 'Deshacer' },
        { role: 'redo', label: 'Rehacer' },
        { type: 'separator' },
        { role: 'cut', label: 'Cortar' },
        { role: 'copy', label: 'Copiar' },
        { role: 'paste', label: 'Pegar' },
        { role: 'selectAll', label: 'Seleccionar todo' },
      ],
    },
    {
      label: 'Ver',
      submenu: [
        { role: 'reload', label: 'Recargar' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Tamaño normal' },
        { role: 'zoomIn', label: 'Aumentar' },
        { role: 'zoomOut', label: 'Reducir' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Pantalla completa' },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    title: APP_TITLE,
    width: 1480,
    height: 980,
    minWidth: 1000,
    minHeight: 700,
    backgroundColor: '#07111f',
    autoHideMenuBar: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  const appPage = path.join(__dirname, 'index.html');
  mainWindow.loadFile(appPage);
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event, targetUrl) => {
    if (targetUrl !== pathToFileURL(appPage).href) event.preventDefault();
  });
  mainWindow.on('closed', () => { mainWindow = null; });
}

ipcMain.handle('save:open-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Selecciona los archivos data00–data05 de tu partida',
    properties: ['openFile', 'multiSelections'],
  });
  if (result.canceled) return { canceled: true, files: [] };

  return readSaveFiles(result.filePaths);
});

ipcMain.handle('save:open-folder', async () => {
  pendingSaveCandidates = [];
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Selecciona la carpeta saves o nocopy del juego',
    buttonLabel: 'Buscar partida aquí',
    properties: ['openDirectory'],
  });
  if (result.canceled || !result.filePaths[0]) return { canceled: true, files: [] };

  const folder = result.filePaths[0];
  const scan = await findSaveCandidates(folder);
  const { candidates } = scan;
  if (!candidates.length) return { canceled: false, folder, candidates: [], files: [], scanLimited: scan.scanLimited };
  if (candidates.length > 1 || scan.scanLimited) {
    pendingSaveCandidates = candidates;
    return {
      canceled: false,
      folder,
      scanLimited: scan.scanLimited,
      scannedDirectories: scan.scannedDirectories,
      candidates: candidates.map((candidate, index) => ({
        index,
        folder: candidate.folder,
        fileCount: candidate.files.length,
      })),
    };
  }
  const candidate = candidates[0];
  return { canceled: false, folder: candidate.folder, scanLimited: false, ...readSaveFiles(candidate.files) };
});

ipcMain.handle('save:choose-candidate', async (_event, index) => {
  const candidate = Number.isInteger(index) ? pendingSaveCandidates[index] : null;
  pendingSaveCandidates = [];
  if (!candidate) return { error: 'La carpeta seleccionada ya no está disponible. Vuelve a buscar las saves.' };
  return { folder: candidate.folder, ...readSaveFiles(candidate.files) };
});

const EXTERNAL_SOURCE_HOSTS = new Set(['game.daihouko.com', 'monsterhunter.fandom.com']);
ipcMain.handle('external:open', async (_event, value) => {
  try {
    const url = new URL(String(value));
    if (url.protocol !== 'https:' || !EXTERNAL_SOURCE_HOSTS.has(url.hostname)) {
      return { error: 'Este enlace no pertenece a una fuente de datos permitida.' };
    }
    await shell.openExternal(url.href);
    return { opened: true };
  } catch {
    return { error: 'No se pudo abrir la fuente.' };
  }
});

app.whenReady().then(() => {
  app.setAppUserModelId('com.oceantri.mh3progressanalyzer');
  createMenu();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
