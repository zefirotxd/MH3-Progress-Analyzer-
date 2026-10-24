const { app, BrowserWindow, dialog, ipcMain, Menu } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { findSaveFiles } = require('./find-saves.cjs');

const APP_TITLE = 'MH3 Progress Analyzer';
let mainWindow;

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
  if (result.canceled) return [];

  return result.filePaths.map((filePath) => {
    const bytes = fs.readFileSync(filePath);
    return { name: path.basename(filePath), size: bytes.byteLength, bytes: Uint8Array.from(bytes) };
  });
});

ipcMain.handle('save:open-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Selecciona la carpeta saves o nocopy del juego',
    buttonLabel: 'Buscar partida aquí',
    properties: ['openDirectory'],
  });
  if (result.canceled || !result.filePaths[0]) return { canceled: true, files: [] };

  const folder = result.filePaths[0];
  const paths = findSaveFiles(folder);
  return {
    canceled: false,
    folder,
    files: paths.map((filePath) => {
      const bytes = fs.readFileSync(filePath);
      return { name: path.basename(filePath), size: bytes.byteLength, bytes: Uint8Array.from(bytes) };
    }),
  };
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
