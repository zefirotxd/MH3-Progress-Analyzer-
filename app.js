(() => {
  'use strict';

  const DATA = window.MH3_DATA;
  if (!DATA) {
    const status = document.querySelector('#saveStatus');
    if (status) {
      status.classList.remove('loaded');
      status.innerHTML = '<span class="status-dot"></span>Catálogo de juego no disponible';
    }
    const warning = document.createElement('p');
    warning.className = 'privacy-note';
    warning.textContent = 'El catálogo no se cargó. Puedes seleccionar el save, pero hace falta actualizar la app para analizarlo.';
    document.querySelector('.save-box')?.append(warning);
    const reportUnavailable = () => {
      if (status) status.innerHTML = '<span class="status-dot"></span>Save seleccionado; falta actualizar el catálogo';
    };
    document.querySelector('#saveFiles')?.addEventListener('change', reportUnavailable);
    window.mh3Desktop?.onOpenSaveDialog(async () => {
      const result = await window.mh3Desktop.openSaveFiles();
      if (result?.files?.length) reportUnavailable();
    });
    const chooseFolder = async () => {
      const result = await window.mh3Desktop?.openSaveFolder();
      if (result?.files?.length) reportUnavailable();
      else if (result?.candidates?.length) reportUnavailable();
    };
    document.querySelectorAll('[data-open-save-folder]').forEach((button) => button.addEventListener('click', chooseFolder));
    window.mh3Desktop?.onOpenSaveFolder(chooseFolder);
    return;
  }

  const FILE_SIZE = 0x14000;
  const MAX_SAVE_SIZE = 1024 * 1024;
  const CHAR_START = 0x48;
  const CHAR_SIZE = 0x6000;
  const ITEM_BOX = 0x180;
  const ITEM_BOX_SLOTS = 800;
  const HRP_OFFSET = 0x3de0;
  const HR_OFFSET = 0x3de4;
  const CLEARED_QUESTS = 0x512c;
  const QUEST_INDEX = new Map(DATA.reference.questIds.map((id, index) => [Number.parseInt(id, 16), index]));
  const QUESTS = new Map(DATA.quests.map((quest) => [quest.id, quest]));
  const ITEM_NAMES = new Map(DATA.items.map((item) => [item.id, item.name]));
  const MONSTER_NAMES = new Map(DATA.monsters.map((monster) => [monster.id, monster.name]));
  const ARMOR = DATA.armor;
  const ARMOR_BY_TYPE = {
    head: 'Cabeza', chest: 'Pecho', arms: 'Brazos', waist: 'Cintura', legs: 'Piernas',
  };
  const PIECE_TYPES = ['head', 'chest', 'arms', 'waist', 'legs'];
  const WEAPON_CLASS_ORDER = ['Great Sword', 'Longsword', 'Sword and Shield', 'Hammer', 'Lance', 'Switch Axe'];
  const WEAPON_CLASSES = WEAPON_CLASS_ORDER.filter((type) => (DATA.weapons || []).some((weapon) => weapon.type === type));
  const WEAPON_SHOPPING_STORAGE_KEY = 'mh3-progress-analyzer.weapon-shopping.v1';
  const WEAPON_CLASS_NAMES = {
    'Great Sword': 'Espada grande', Longsword: 'Espada larga', 'Sword and Shield': 'Espada y escudo',
    Hammer: 'Martillo', Lance: 'Lanza', 'Switch Axe': 'Hacha espada',
  };

  const QUEST_LABELS = new Map([
    [0x2711, 'Sunken Treasures'], [0x2714, 'Help the "Hunter"'],
    [0x2715, 'Playing with Fire'], [0x2716, "The Fisherman's Tale"], [0x2718, 'No Guts, No Glory'],
    [0x2743, 'Bug Hunt'], [0x274a, 'Flooded Forest Extermination'], [0x274b, 'Scene of the Crime'],
    [0x274d, "The Merchant's Mission"], [0x2750, "The Butler's Great Baggi"],
    [0x2776, 'We Need a Hero'], [0x2777, 'Into the Danger Zone'], [0x277a, 'The Creeping Venom'],
    [0x277c, "The Bard's Barioth"], [0x2780, 'To Catch an Uragaan'],
    [0x3a9b, 'Reel In a Rathian'], [0x3a9e, 'Jumping for Jaggi'], [0x3a9f, 'The Mysterious Mimic'],
    [0x3aa1, 'Avenging the Fallen Hunter'], [0x3aa6, 'Grab a Gobul'],
    [0x3acb, 'Into the Danger Zone'], [0x3acd, 'Rotten Fish'], [0x3ad0, 'The Creeping Venom'],
    [0x3ad4, 'Run Down a Rathalos'], [0x3ad6, 'The Molten Monstrosity'],
    [0x36b0, 'Leading the Charge'], [0x36b1, "The Fisherman's Fiend"], [0x36b2, 'The Festival of Fear'],
    [0x4a38, 'Double Trouble'], [0x4a39, 'The Brilliant Darkness'],
    [0x3e8, "Harvest 'Shroom"], [0x3eb, 'Farm Aid'], [0x3ec, "Guts: It's What's for Dinner"],
    [0x3f5, 'Big Game Hunting'], [0x3f6, "Who's the Boss?"], [0x400, 'Playing with Fire'],
    [0x402, 'Save Our Boat'], [0x403, 'Leading the Charge'], [0x406, 'Lost in Blue'],
    [0x407, 'Leader of the Icepack'], [0x40c, 'Dragon Lady'], [0x410, 'Best the Lava Beasts!'],
    [0x414, 'The Wrath of Rathalos'], [0x415, "A Bard's Tale"], [0x419, "The Volcano's Fury"],
    [0x7d0, 'No Love for Ludroth'], [0x7d1, 'Shakalaka Savior!'], [0x7d2, 'Accident Investigation'],
    [0x7d3, 'Trial of the Sea Dragon'], [0x7d4, 'Fell the Lagiacrus!'],
    [0x7d5, 'Save Moga Village!'], [0x7d6, 'The Decisive Battle'],
  ]);
  const QUEST_GOAL_LABELS = {
    gathering: 'Recolección', slay: 'Eliminar', hunt: 'Cazar', capture: 'Capturar', repel: 'Repeler', other: 'Objetivo especial',
  };
  const QUEST_TYPE_LABELS = {
    gather: 'Recolección', hunt: 'Cacería', capture: 'Captura', escort: 'Escolta', slay: 'Eliminación',
    multihunt: 'Cacería múltiple', harvest: 'Cosecha', repel: 'Repeler',
  };
  const QUEST_REGION_LABELS = { Village: 'Aldea de Moga', City: 'Loc Lac' };
  const QUEST_RANK_LABELS = { Low: 'Bajo', High: 'Alto' };

  const ONLINE_STAGES = [
    { gate: 8, stars: '1★', urgent: 0x36b0, urgentName: 'Leading the Charge', nextStars: '2★', keys: [0x2711, 0x2714, 0x2715, 0x2718, 0x2716] },
    { gate: 17, stars: '2★', urgent: 0x36b1, urgentName: "The Fisherman's Fiend", nextStars: '3★', keys: [0x2743, 0x274a, 0x274b, 0x274d, 0x2750] },
    { gate: 30, stars: '3★', urgent: 0x36b2, urgentName: 'The Festival of Fear', nextStars: '4★', keys: [0x2776, 0x2777, 0x277a, 0x277c, 0x2780] },
    { gate: 39, stars: '4★', urgent: 0x4a38, urgentName: 'Double Trouble', nextStars: '5★', keys: [0x3a9b, 0x3a9e, 0x3a9f, 0x3aa1, 0x3aa6] },
    { gate: 50, stars: '5★', urgent: 0x4a39, urgentName: 'The Brilliant Darkness', nextStars: '6★', keys: [0x3acb, 0x3acd, 0x3ad0, 0x3ad6, 0x3ad4] },
  ];

  const VILLAGE_STEPS = [
    { phase: '1★', to: '2★', keys: [0x3e8, 0x3eb, 0x3ec], urgent: 0x7d0, urgentName: 'No Love for Ludroth' },
    { phase: '2★', to: '3★', keys: [0x3f5, 0x3f6], urgent: 0x7d1, urgentName: 'Shakalaka Savior!' },
    { phase: '3★', to: '4★', keys: [0x400, 0x402, 0x403], urgent: 0x7d2, urgentName: 'Accident Investigation' },
    { phase: '4★ · primera parte', to: '4★', keys: [0x406, 0x407], urgent: 0x7d3, urgentName: 'Trial of the Sea Dragon' },
    { phase: '4★ · segunda parte', to: '5★', keys: [0x40c], urgent: 0x7d4, urgentName: 'Fell the Lagiacrus!' },
    { phase: '5★', to: '6★', keys: [0x410, 0x414, 0x415, 0x419], urgent: 0x7d5, urgentName: 'Save Moga Village!' },
    { phase: 'Posjuego', to: 'Final', keys: [], urgent: 0x7d6, urgentName: 'The Decisive Battle' },
  ];
  const QUEST_PROGRESSION_ROLES = new Map();
  const addQuestRole = (id, role) => {
    if (!QUEST_PROGRESSION_ROLES.has(id)) QUEST_PROGRESSION_ROLES.set(id, new Set());
    QUEST_PROGRESSION_ROLES.get(id).add(role);
  };
  for (const stage of ONLINE_STAGES) {
    stage.keys.forEach((id) => addQuestRole(id, 'online-key'));
    addQuestRole(stage.urgent, 'online-urgent');
  }
  for (const stage of VILLAGE_STEPS) {
    stage.keys.forEach((id) => addQuestRole(id, 'village-key'));
    addQuestRole(stage.urgent, 'village-urgent');
  }
  const QUEST_PROGRESSION_LABELS = {
    'online-key': 'Clave · Loc Lac', 'online-urgent': 'Urgente · Loc Lac',
    'village-key': 'Clave · Moga', 'village-urgent': 'Urgente · Moga',
  };

  const VILLAGE_GROUPS = [
    { title: 'Aldea · 1 estrella', min: 0x3e8, max: 0x3ed },
    { title: 'Aldea · 2 estrellas', min: 0x3f2, max: 0x3f6 },
    { title: 'Aldea · 3 estrellas', min: 0x3fc, max: 0x404 },
    { title: 'Aldea · 4 estrellas', min: 0x406, max: 0x40f },
    { title: 'Aldea · 5 estrellas', min: 0x410, max: 0x41a },
    { title: 'Aldea · 6 estrellas', min: 0x424, max: 0x429 },
    { title: 'Urgentes de la aldea', urgentIds: [0x7d0, 0x7d1, 0x7d2, 0x7d3, 0x7d4, 0x7d5, 0x7d6] },
  ];

  const REQUESTS = [
    { title: 'Máscara Antigua · Cha-Cha', items: [['Lagiacrus Scale', 2], ['Sharqskin', 1], ['Pelagicite Ore', 4]], note: 'Esta solicitud abre contenido adicional y permite obtener la máscara de Cha-Cha.' },
    { title: 'One Chance · misiones extra de 5★', items: [['Flabby Hide', 2], ['Rath Talon', 2], ['Machalite Ore', 8]], note: 'Solicitud de Junior. El guardado no expone su estado de entrega; confirma con el NPC si ya la completaste.' },
  ];

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const formatNumber = (value) => new Intl.NumberFormat('es-UY').format(value ?? 0);
  const hex = (id) => `0x${Number(id).toString(16).toUpperCase().padStart(4, '0')}`;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function loadWeaponShoppingList() {
    try {
      const stored = JSON.parse(localStorage.getItem(WEAPON_SHOPPING_STORAGE_KEY) || '[]');
      if (!Array.isArray(stored)) return [];
      const goals = [];
      for (const entry of stored.slice(0, 50)) {
        if (!entry || typeof entry !== 'object') continue;
        if (!WEAPON_CLASSES.includes(entry?.type)) continue;
        const targetId = Number(entry.targetId);
        const startId = entry.startId == null ? null : Number(entry.startId);
        const routeIds = Array.isArray(entry.weaponIds) ? entry.weaponIds.slice(0, 100).map(Number) : [];
        if (!Number.isSafeInteger(targetId) || routeIds.length === 0 || routeIds.some((id) => !Number.isSafeInteger(id))) continue;
        if (startId !== null && !Number.isSafeInteger(startId)) continue;
        const weapons = DATA.weapons.filter((weapon) => weapon.type === entry.type);
        const route = collectForgePaths(weapons, targetId, startId === null ? '' : String(startId))
          .find((path) => path.weapons.length === routeIds.length && path.weapons.every((weapon, index) => weapon.id === routeIds[index]));
        if (!route) continue;
        const requirements = collectForgeRequirements(route);
        if (!requirements.size) continue;
        const goal = {
          key: forgeGoalKey(entry.type, targetId, startId, routeIds),
          type: entry.type,
          targetId,
          startId,
          weaponIds: routeIds,
          name: route.weapons.at(-1).name,
          route: route.weapons.map((weapon) => weapon.name).join(' → '),
          copies: clamp(Math.floor(Number(entry.copies) || 1), 1, 99),
          requirements: [...requirements.entries()].map(([id, required]) => ({ id, required })),
        };
        const existing = goals.find((candidate) => candidate.key === goal.key);
        if (existing) existing.copies = clamp(existing.copies + goal.copies, 1, 99);
        else goals.push(goal);
      }
      return goals;
    } catch (error) {
      console.warn('No se pudo recuperar la lista local de materiales', error);
      return [];
    }
  }

  function persistWeaponShoppingList() {
    try {
      localStorage.setItem(WEAPON_SHOPPING_STORAGE_KEY, JSON.stringify(appState.weaponShoppingList.map((goal) => ({
        type: goal.type,
        targetId: goal.targetId,
        startId: goal.startId,
        weaponIds: goal.weaponIds,
        copies: goal.copies,
      }))));
    } catch (error) {
      console.warn('No se pudo guardar la lista local de materiales', error);
    }
  }

  function forgeGoalKey(type, targetId, startId, weaponIds) {
    return `${type}:${targetId}:${startId ?? 'new'}:${weaponIds.join('>')}`;
  }
  const appState = { profiles: [], files: [], selected: 0, view: 'dashboard', monsterSearch: '', itemSearch: '', questSearch: '', questRegion: 'all', questRank: 'all', questGoal: 'all', questProgression: 'all', questStatus: 'all', armorStyle: 'blade', set: {}, decorations: {}, weaponClass: WEAPON_CLASSES[0] || '', weaponTarget: '', weaponStart: '', weaponRoute: 0, weaponShoppingList: loadWeaponShoppingList() };
  const rankThreshold = (rank) => {
    const target = Math.max(0, Math.floor(rank));
    if (target === 0) return 0;
    if (target <= 50) return DATA.reference.hrThresholds1to50[target - 1] ?? 0;
    if (target > 999) return 9999999;
    let points = DATA.reference.hrThresholds1to50[49];
    let previous = 50;
    for (const [cap, step] of DATA.reference.hrpSegments51to999) {
      if (target <= cap) return points + step * (target - previous);
      points += step * (cap - previous);
      previous = cap;
    }
    return 9999999;
  };
  const questTitle = (id) => QUEST_LABELS.get(id) || QUESTS.get(id)?.name || `Misión ${hex(id)}`;
  const clearStatus = (profile, id) => profile.completed.has(id);
  const safeStorageGet = (key) => { try { return localStorage.getItem(key); } catch { return null; } };
  const safeStorageSet = (key, value) => { try { localStorage.setItem(key, value); } catch { /* los checks siguen funcionando solo durante esta sesión */ } };

  function readProfileRecords(file, bytes, checksum) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const profiles = [];
    for (let slot = 0; slot < 3; slot += 1) {
      const recordOffset = CHAR_START + slot * CHAR_SIZE;
      if (view.getUint32(recordOffset, false) === 0) continue;
      const points = view.getUint32(recordOffset + HRP_OFFSET, false);
      const rawRank = view.getUint16(recordOffset + HR_OFFSET, false);
      const itemCounts = new Map();
      for (let index = 0; index < ITEM_BOX_SLOTS; index += 1) {
        const entry = recordOffset + ITEM_BOX + index * 4;
        const itemId = view.getUint16(entry, false);
        const count = view.getInt16(entry + 2, false);
        if (count > 0) itemCounts.set(itemId, (itemCounts.get(itemId) || 0) + count);
      }
      const completed = new Set();
      for (let index = 0; index < DATA.reference.questIds.length; index += 1) {
        const wordOffset = recordOffset + CLEARED_QUESTS + 4 * (index >>> 5);
        const word = view.getUint32(wordOffset, false);
        if (((word >>> (index & 31)) & 1) === 1) completed.add(Number.parseInt(DATA.reference.questIds[index], 16));
      }
      profiles.push({
        key: `${file.name}:${slot}:${checksum.toString(16)}`,
        fileName: file.name,
        relativePath: file.webkitRelativePath || file.name,
        slot,
        rank: rawRank || 1,
        rawRank,
        points,
        zenny: view.getInt32(recordOffset + 0x18, false),
        recordMarker: view.getUint32(recordOffset, false),
        characterId: view.getUint32(recordOffset + 0x1c, false),
        recordOffset,
        itemCounts,
        completed,
        checksum,
      });
    }
    return profiles;
  }

  async function loadSaves(fileList) {
    const files = [...fileList].filter((file) => /^data0[0-5]$/i.test(file.name));
    if (!files.length) {
      notify('No encontré archivos data00 a data05 en la selección.');
      return;
    }
    const fileNameCounts = new Map();
    for (const file of files) {
      const name = file.name.toLowerCase();
      fileNameCounts.set(name, (fileNameCounts.get(name) || 0) + 1);
    }
    const duplicates = [...fileNameCounts].filter(([, count]) => count > 1).map(([name]) => name);
    if (duplicates.length) {
      notify(`Hay archivos repetidos (${duplicates.join(', ')}). Selecciona los de una sola carpeta para no mezclar partidas.`);
      return;
    }
    const nextProfiles = [];
    const errors = [];
    const diagnostics = [];
    let inactiveFiles = 0;
    for (const file of files) {
      const expectedMagic = `FILE${Number(file.name.at(-1)) + 1}`;
      const declaredSize = Number(file.size || file.bytes?.byteLength || 0);
      if (declaredSize > MAX_SAVE_SIZE) {
        diagnostics.push({ name: file.name.toLowerCase(), size: declaredSize, expectedMagic, magic: '—', checksumOk: false, slots: [], status: 'Archivo demasiado grande' });
        errors.push(`${file.name}: supera el tamaño máximo esperado para un save`);
        continue;
      }
      let bytes;
      try {
        bytes = file.bytes
          ? new Uint8Array(file.bytes)
          : new Uint8Array(await file.arrayBuffer());
      } catch (error) {
        diagnostics.push({ name: file.name.toLowerCase(), size: declaredSize || null, expectedMagic, magic: '—', checksumOk: false, slots: [], status: 'No se pudo leer' });
        errors.push(`${file.name}: no se pudo leer (${error?.message || 'error de acceso'})`);
        continue;
      }
      const diagnostic = {
        name: file.name.toLowerCase(),
        size: bytes.byteLength,
        expectedMagic,
        magic: bytes.length >= 13 ? String.fromCharCode(...bytes.subarray(8, 13)) : '—',
        flags: bytes.length >= 4 ? new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0, false) : null,
        checksumOk: false,
        slots: [],
        status: 'Tamaño incorrecto',
      };
      if (bytes.byteLength !== FILE_SIZE) {
        errors.push(`${file.name}: tamaño distinto de 81.920 bytes`);
        diagnostics.push(diagnostic);
        continue;
      }
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      let checksum = 0;
      for (let index = 8; index < bytes.length; index += 1) checksum = (checksum + bytes[index]) >>> 0;
      diagnostic.checksumStored = view.getUint32(4, false);
      diagnostic.checksumCalculated = checksum;
      diagnostic.checksumOk = diagnostic.checksumStored === checksum;
      diagnostic.inUse = diagnostic.flags !== 0;
      if (diagnostic.magic !== expectedMagic) {
        diagnostic.status = 'Firma inesperada';
        errors.push(`${file.name}: marcador ${diagnostic.magic}; se esperaba ${expectedMagic}`);
        diagnostics.push(diagnostic);
        continue;
      }
      if (!diagnostic.checksumOk) {
        diagnostic.status = 'Checksum inválido';
        errors.push(`${file.name}: checksum no válido`);
        diagnostics.push(diagnostic);
        continue;
      }
      diagnostic.slots = [0, 1, 2].map((slot) => ({
        slot,
        marker: view.getUint32(CHAR_START + slot * CHAR_SIZE, false),
        occupied: view.getUint32(CHAR_START + slot * CHAR_SIZE, false) !== 0,
      }));
      if (!diagnostic.inUse) {
        inactiveFiles += 1;
        diagnostic.status = 'Válido · inactivo';
        diagnostics.push(diagnostic);
        continue;
      }
      const fileProfiles = readProfileRecords(file, bytes, checksum);
      diagnostic.status = fileProfiles.length ? 'Válido · activo' : 'Válido · sin cazador';
      for (const slot of diagnostic.slots) {
        const profile = fileProfiles.find((entry) => entry.slot === slot.slot);
        if (profile) Object.assign(slot, { rank: profile.rank, points: profile.points, quests: profile.completed.size, items: profile.itemCounts.size });
      }
      diagnostics.push(diagnostic);
      nextProfiles.push(...fileProfiles);
    }
    const selectedNames = new Set(diagnostics.map((file) => file.name));
    for (let index = 0; index < 6; index += 1) {
      const name = `data0${index}`;
      if (!selectedNames.has(name)) diagnostics.push({ name, status: 'No incluido en la selección', selected: false, slots: [] });
    }
    diagnostics.sort((a, b) => a.name.localeCompare(b.name));
    if (!nextProfiles.length) {
      if (appState.profiles.length) {
        notify(`No se encontró un cazador válido. Se conserva la partida que ya estaba abierta.${errors.length ? ` ${errors.join(' · ')}` : ''}`);
        return;
      }
      appState.files = diagnostics;
      appState.profiles = [];
      appState.selected = 0;
      $('#saveStatus').classList.remove('loaded');
      $('#saveStatus').innerHTML = '<span class="status-dot"></span>No se reconoció ningún cazador válido';
      $('#appContent').classList.add('hidden');
      $('#emptyState').classList.remove('hidden');
      renderEmptyDiagnostics(diagnostics);
      notify(errors.length ? errors.join(' · ') : `No hay cazadores activos en los archivos seleccionados${inactiveFiles ? ` (${inactiveFiles} archivos están vacíos)` : ''}.`);
      return;
    }
    appState.files = diagnostics;
    appState.profiles = nextProfiles;
    appState.selected = 0;
    $('#emptyState').classList.add('hidden');
    $('#emptyDiagnostics').classList.add('hidden');
    $('#emptyDiagnostics').textContent = '';
    $('#appContent').classList.remove('hidden');
    $('#saveStatus').classList.add('loaded');
    $('#saveStatus').innerHTML = `<span class="status-dot"></span>${nextProfiles.length} cazador${nextProfiles.length === 1 ? '' : 'es'} reconocido${nextProfiles.length === 1 ? '' : 's'}`;
    populateProfileSelect();
    renderApp();
    if (errors.length) notify(`Se cargaron los archivos válidos. ${errors.join(' · ')}`);
  }

  async function safelyLoadSaves(fileList) {
    try {
      await loadSaves(fileList);
    } catch (error) {
      console.error('No se pudo analizar la selección de saves', error);
      notify(`No se pudo analizar esta selección: ${error?.message || 'datos inesperados'}. El análisis actual se conserva.`);
    }
  }

  function notify(message) {
    let toast = $('#toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast';
      toast.className = 'toast';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      toast.setAttribute('aria-atomic', 'true');
      document.body.append(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(notify.timer);
    notify.timer = setTimeout(() => toast.classList.remove('show'), 5200);
  }

  function renderEmptyDiagnostics(files) {
    const panel = $('#emptyDiagnostics');
    const rows = files.map((file) => {
      const details = [];
      if (file.size != null) details.push(`${formatNumber(file.size)} / ${formatNumber(FILE_SIZE)} bytes`);
      if (file.magic && file.magic !== '—') details.push(`firma ${file.magic}`);
      if (file.checksumOk != null) details.push(file.checksumOk ? 'checksum correcto' : 'checksum no válido');
      return `<div class="empty-diagnostic-row"><strong>${escapeHtml(file.name)}</strong><span>${escapeHtml(file.status)}</span>${details.length ? `<small>${escapeHtml(details.join(' · '))}</small>` : ''}</div>`;
    }).join('');
    panel.innerHTML = `<strong>Resultado de la lectura</strong><div class="empty-diagnostic-list">${rows || '<div class="empty-diagnostic-row">No hay archivos seleccionados para mostrar.</div>'}</div>`;
    panel.classList.remove('hidden');
  }

  function selectSaveCandidate(candidates, scanLimited, scannedDirectories) {
    const dialog = $('#saveCandidateDialog');
    const select = $('#saveCandidateSelect');
    const limitNote = $('#saveScanLimitNote');
    const hasOneLimitedCandidate = scanLimited && candidates.length === 1;
    $('#saveCandidateEyebrow').textContent = hasOneLimitedCandidate ? 'BÚSQUEDA LIMITADA' : 'VARIAS PARTIDAS ENCONTRADAS';
    $('#saveCandidateTitle').textContent = hasOneLimitedCandidate ? 'Confirma la carpeta encontrada' : 'Elige la carpeta correcta';
    $('#saveCandidateIntro').textContent = hasOneLimitedCandidate
      ? 'Encontré esta carpeta antes de alcanzar el límite del escaneo. Confirma que corresponde a tu partida.'
      : 'Encontré más de una carpeta con archivos data00–data05. Selecciona una para evitar mezclar o abrir una partida distinta.';
    select.innerHTML = candidates.map((candidate) => `<option value="${candidate.index}">${escapeHtml(candidate.folder)} · ${candidate.fileCount}/6 archivos</option>`).join('');
    limitNote.textContent = scanLimited
      ? `La búsqueda llegó a su límite tras revisar ${formatNumber(scannedDirectories || 0)} carpetas y la lista puede estar incompleta. Si no aparece tu partida, selecciona su carpeta nocopy directamente y vuelve a buscar.`
      : '';
    limitNote.classList.toggle('hidden', !scanLimited);
    return new Promise((resolve) => {
      dialog.addEventListener('close', () => resolve(dialog.returnValue === 'choose' ? Number(select.value) : null), { once: true });
      dialog.showModal();
    });
  }

  function currentProfile() { return appState.profiles[appState.selected] || null; }

  function populateProfileSelect() {
    const select = $('#profileSelect');
    select.innerHTML = appState.profiles.map((profile, index) => `<option value="${index}">${escapeHtml(profile.fileName)} · Cazador ${profile.slot + 1}</option>`).join('');
    select.disabled = false;
    select.value = String(appState.selected);
  }

  function manualState(profile = currentProfile()) {
    if (!profile) return {};
    try { return JSON.parse(safeStorageGet(`mh3-manual:${profile.key}`) || '{}') || {}; } catch { return {}; }
  }

  function setManual(key, value) {
    const profile = currentProfile();
    if (!profile) return;
    const state = manualState(profile);
    state[key] = Boolean(value);
    safeStorageSet(`mh3-manual:${profile.key}`, JSON.stringify(state));
    renderApp();
  }

  function nextOnlineStage(profile) { return ONLINE_STAGES.find((stage) => !clearStatus(profile, stage.urgent)) || null; }
  function nextVillageStep(profile) { return VILLAGE_STEPS.find((step) => !clearStatus(profile, step.urgent)) || null; }

  function stageState(profile, stage, isVillage = false) {
    const missing = stage.keys.filter((id) => !clearStatus(profile, id));
    const urgentDone = clearStatus(profile, stage.urgent);
    let rankReady = true;
    let pointsNeeded = 0;
    if (!isVillage) {
      rankReady = profile.rank >= stage.gate || profile.points >= rankThreshold(stage.gate);
      pointsNeeded = Math.max(0, rankThreshold(stage.gate) - profile.points);
    }
    let status = 'Pendiente';
    if (urgentDone) status = 'Completada';
    else if (!missing.length && rankReady) status = 'Urgente disponible';
    else if (!missing.length && !rankReady) status = `Faltan ${formatNumber(pointsNeeded)} HRP`;
    else status = `Faltan ${missing.length} clave${missing.length === 1 ? '' : 's'}`;
    return { missing, urgentDone, rankReady, pointsNeeded, status };
  }

  function questRow(profile, id, keyIds = [], urgentIds = []) {
    const done = clearStatus(profile, id);
    const key = keyIds.includes(id);
    const urgent = urgentIds.includes(id);
    const label = key ? '<span class="quest-flags">Clave</span>' : urgent ? '<span class="quest-flags">Urgente</span>' : '';
    return `<div class="quest-row ${done ? 'done' : ''}"><span class="quest-state">${done ? '✓' : '○'}</span><span class="quest-name">${escapeHtml(questTitle(id))}</span>${label}</div>`;
  }

  function renderDashboard(profile) {
    const online = nextOnlineStage(profile);
    const village = nextVillageStep(profile);
    const onlineStatus = online ? stageState(profile, online) : null;
    const villageStatus = village ? stageState(profile, village, true) : null;
    const monsters = monsterProgress(profile);
    const completeAll = [...profile.completed].length;

    let headline = 'Ya completaste las urgentes principales de Loc Lac.';
    let subline = 'Puedes seguir subiendo RC; las misiones posdesbloqueo continúan disponibles.';
    let tags = '<span class="tag good">Urgentes principales listas</span>';
    if (online && onlineStatus) {
      const missingOnline = onlineStatus.missing.length;
      headline = missingOnline ? `Tu siguiente meta online es ${online.urgentName}.` : onlineStatus.rankReady ? `Ya puedes ir por ${online.urgentName}.` : `Te faltan ${formatNumber(onlineStatus.pointsNeeded)} puntos para RC ${online.gate}.`;
      subline = missingOnline ? `Completa ${missingOnline} misión${missingOnline === 1 ? '' : 'es'} clave de ${online.stars} antes de la urgente.` : onlineStatus.rankReady ? `Las claves de ${online.stars} están listas${clearStatus(profile, online.urgent) ? '; urgente completada.' : '; revisa la urgente en el tablón.'}` : `Las misiones clave de ${online.stars} ya están hechas. Sigue ganando HRP hasta llegar a RC ${online.gate}.`;
      tags = `<span class="tag ${missingOnline ? 'warn' : 'good'}">${missingOnline ? `${missingOnline} misión${missingOnline === 1 ? '' : 'es'} clave pendiente${missingOnline === 1 ? '' : 's'}` : 'Claves completas'}</span><span class="tag ${onlineStatus.rankReady ? 'good' : 'warn'}">${onlineStatus.rankReady ? `RC ${online.gate} alcanzado` : `Meta RC ${online.gate}`}</span>`;
    }
    $('#heroObjective').innerHTML = `<div class="eyebrow">TU SIGUIENTE OBJETIVO</div><h2>${escapeHtml(headline)}</h2><p>${escapeHtml(subline)}</p><div class="hero-tags">${tags}${village ? `<span class="tag">Moga: ${escapeHtml(village.urgentName)}</span>` : '<span class="tag good">Historia de Moga completa</span>'}</div>`;
    const villageStoryIds = [...new Set(VILLAGE_STEPS.flatMap((step) => [...step.keys, step.urgent]))];
    const villageStoryDone = villageStoryIds.filter((id) => profile.completed.has(id)).length;
    $('#summaryStats').innerHTML = [
      ['Rango actual', `RC ${profile.rank}`, `Guardado: ${escapeHtml(profile.fileName)} · cazador ${profile.slot + 1}`, true],
      ['Puntos de rango', formatNumber(profile.points), `${formatNumber(profile.zenny)} zenny`, false],
      ['Misiones registradas', formatNumber(completeAll), `${DATA.reference.questIds.length} IDs que el save puede registrar`, false],
      ['Historia principal de Moga', `${villageStoryDone}/${villageStoryIds.length}`, `${monsters.length} especies con objetivos completados`, false],
    ].map(([label, value, detail, accent]) => `<article class="stat-card ${accent ? 'accent' : ''}"><div class="stat-label">${label}</div><div class="stat-value">${value}</div><div class="stat-detail">${detail}</div></article>`).join('');

    const nextRank = Math.min(999, Math.max(2, profile.rank + 1));
    const previousThreshold = rankThreshold(profile.rank);
    const nextThreshold = rankThreshold(nextRank);
    const rankProgress = nextThreshold > previousThreshold ? clamp(((profile.points - previousThreshold) / (nextThreshold - previousThreshold)) * 100, 0, 100) : 100;
    const toNext = Math.max(0, nextThreshold - profile.points);
    $('#rankPanel').innerHTML = `<div class="panel-heading"><div><h3>RC y puntos</h3><div class="panel-subtitle">La barra usa el umbral de rango de la versión europea.</div></div><span class="tag">RC ${profile.rank}</span></div><div class="progress-row"><span>Progreso al RC ${nextRank}</span><strong>${formatNumber(profile.points)} / ${formatNumber(nextThreshold)} HRP</strong></div><div class="progress-track"><div class="progress-fill" style="width:${rankProgress}%"></div></div><div class="progress-caption"><span>${rankProgress.toFixed(1)}%</span><span>${toNext ? `Faltan ${formatNumber(toNext)} HRP` : 'Rango listo'}</span></div><div class="warning-inline">El RC mostrado en el save y el umbral de puntos se presentan por separado; una urgente puede mantener bloqueado el ascenso.</div>`;

    if (village && villageStatus) {
      const missing = villageStatus.missing;
      $('#villagePanel').innerHTML = `<div class="panel-heading"><div><h3>Próxima urgente de Moga</h3><div class="panel-subtitle">${escapeHtml(village.phase)} · avanza a ${escapeHtml(village.to)}</div></div><button class="panel-link" data-goto="village">Ver aldea →</button></div><div class="check-list"><div class="check-row ${missing.length ? '' : 'done'}"><span class="check-icon">${missing.length ? '!' : '✓'}</span><span class="check-text">${missing.length ? `${missing.length} misión${missing.length === 1 ? '' : 'es'} clave pendiente${missing.length === 1 ? '' : 's'}` : `Claves listas para ${escapeHtml(village.urgentName)}`}</span></div>${missing.slice(0, 3).map((id) => `<div class="check-row"><span class="check-icon">○</span><span class="check-text">${escapeHtml(questTitle(id))}</span></div>`).join('')}${!missing.length ? `<div class="check-row"><span class="check-icon">○</span><span class="check-text">${escapeHtml(village.urgentName)} · ${clearStatus(profile, village.urgent) ? 'completada' : 'pendiente'}</span></div>` : ''}</div>`;
    } else {
      $('#villagePanel').innerHTML = '<div class="panel-heading"><div><h3>Próxima urgente de Moga</h3><div class="panel-subtitle">Progreso principal completado</div></div></div><p class="panel-subtitle">Todas las urgentes principales registradas aparecen completadas.</p>';
    }
    const doneKeys = [...new Set([...ONLINE_STAGES.flatMap((stage) => stage.keys), ...VILLAGE_STEPS.flatMap((step) => step.keys)])].filter((id) => profile.completed.has(id)).slice(-3).reverse();
    $('#recentPanel').innerHTML = `<div class="panel-heading"><div><h3>Misiones clave completadas</h3><div class="panel-subtitle">El save guarda el estado de misiones, no una fecha de finalización.</div></div></div>${doneKeys.length ? `<div class="recent-list">${doneKeys.map((id) => `<div class="recent-item"><strong>${escapeHtml(questTitle(id))}</strong><span>${hex(id)} · completada</span></div>`).join('')}</div>` : '<div class="panel-subtitle">Todavía no hay misiones clave completadas entre las que puede leer esta versión.</div>'}`;
  }

  function renderOnline(profile) {
    const stage = nextOnlineStage(profile);
    if (!stage) {
      $('#onlineNext').innerHTML = '<article class="next-card complete"><div class="eyebrow">CAMPAÑA PRINCIPAL ONLINE COMPLETADA</div><h3>Completaste las cinco urgentes de progresión.</h3><p>El RC sigue subiendo con HRP. Las misiones avanzadas y de evento no forman parte de esta cadena principal.</p></article>';
    } else {
      const state = stageState(profile, stage);
      const rankText = state.rankReady ? `RC ${stage.gate} alcanzado` : `Faltan ${formatNumber(state.pointsNeeded)} HRP para RC ${stage.gate}`;
      const message = state.missing.length
        ? `Completa las misiones clave pendientes de ${stage.stars}. Al llegar a RC ${stage.gate} y cerrar todas las claves, se habilita la urgente.`
        : state.rankReady
          ? `Las misiones clave están completas y ya alcanzaste RC ${stage.gate}. Busca la urgente en el tablón de Loc Lac.`
          : `Las claves ya están completas. Sigue ganando HRP hasta RC ${stage.gate}; la urgente se habilita al cumplir ambas condiciones.`;
      $('#onlineNext').innerHTML = `<article class="next-card"><div class="next-top"><div><div class="eyebrow">SIGUIENTE DESBLOQUEO · ${stage.nextStars}</div><h3>${escapeHtml(stage.urgentName)}</h3><p>${escapeHtml(message)}</p></div><span class="next-status ${state.missing.length === 0 && state.rankReady ? 'good' : ''}">${escapeHtml(state.status)}</span></div><div class="next-lists"><div><h4>Misiones clave · ${stage.stars}</h4><div class="check-list">${stage.keys.map((id) => `<div class="check-row ${clearStatus(profile, id) ? 'done' : ''}"><span class="check-icon">${clearStatus(profile, id) ? '✓' : '○'}</span><span class="check-text">${escapeHtml(questTitle(id))}</span></div>`).join('')}</div></div><div><h4>Puntos de RC</h4><div class="progress-row"><span>${rankText}</span><strong>${formatNumber(profile.points)} HRP</strong></div><div class="progress-track"><div class="progress-fill ${state.rankReady ? 'green' : ''}" style="width:${clamp((profile.points / rankThreshold(stage.gate)) * 100, 0, 100)}%"></div></div><div class="progress-caption"><span>Meta: ${formatNumber(rankThreshold(stage.gate))}</span><span>${state.rankReady ? 'Alcanzada' : `${formatNumber(state.pointsNeeded)} restantes`}</span></div><p class="warning-inline">No se suman misiones estimadas: solo se usa el total HRP almacenado en tu partida.</p></div></div></article>`;
    }
    $('#onlineMilestones').innerHTML = ONLINE_STAGES.map((item) => {
      const state = stageState(profile, item);
      const done = state.urgentDone;
      const pending = state.missing.length ? `${state.missing.length} clave${state.missing.length === 1 ? '' : 's'} pendiente${state.missing.length === 1 ? '' : 's'}` : state.rankReady ? 'Urgente pendiente' : `${formatNumber(state.pointsNeeded)} HRP pendientes`;
      return `<article class="milestone-card ${done ? 'done' : ''}"><div class="panel-heading"><div><h3>${item.stars} · ${escapeHtml(item.urgentName)}</h3><p>Para avanzar a ${item.nextStars} · requiere RC ${item.gate} y ${item.keys.length} misiones clave</p></div><span class="tag ${done ? 'good' : ''}">${done ? '✓' : `RC ${item.gate}`}</span></div><div class="check-list">${item.keys.map((id) => `<div class="check-row ${clearStatus(profile, id) ? 'done' : ''}"><span class="check-icon">${clearStatus(profile, id) ? '✓' : '○'}</span><span class="check-text">${escapeHtml(questTitle(id))}</span></div>`).join('')}<div class="check-row ${done ? 'done' : ''}"><span class="check-icon">${done ? '✓' : '○'}</span><span class="check-text">Urgente: ${escapeHtml(item.urgentName)}</span></div></div><div class="mini-status">${done ? 'Progreso completado' : pending}</div></article>`;
    }).join('');
  }

  function renderVillage(profile) {
    const step = nextVillageStep(profile);
    const manual = manualState(profile);
    if (!step) {
      $('#villageNext').innerHTML = '<article class="next-card complete"><div class="eyebrow">MOGA COMPLETADA</div><h3>Terminaste la cadena de urgentes de la aldea.</h3><p>La historia principal y la urgente posjuego aparecen completadas en el save.</p></article>';
    } else {
      const state = stageState(profile, step, true);
      const missingHtml = state.missing.length
        ? `<div class="next-lists"><div><h4>Claves pendientes · ${escapeHtml(step.phase)}</h4><div class="check-list">${state.missing.map((id) => `<div class="check-row"><span class="check-icon">○</span><span class="check-text">${escapeHtml(questTitle(id))}</span></div>`).join('')}</div></div><div><h4>Cuando estén listas</h4><p>${escapeHtml(step.urgentName)} · misión urgente que abre ${escapeHtml(step.to)}.</p></div></div>`
        : `<div class="next-lists"><div><h4>Prerrequisitos de esta etapa</h4><div class="check-list">${step.keys.map((id) => `<div class="check-row done"><span class="check-icon">✓</span><span class="check-text">${escapeHtml(questTitle(id))}</span></div>`).join('') || '<div class="check-row done"><span class="check-icon">✓</span><span class="check-text">Sin otras claves registradas</span></div>'}</div></div><div><h4>Urgente</h4><div class="check-row ${clearStatus(profile, step.urgent) ? 'done' : ''}"><span class="check-icon">${clearStatus(profile, step.urgent) ? '✓' : '○'}</span><span class="check-text">${escapeHtml(step.urgentName)} · ${clearStatus(profile, step.urgent) ? 'completada' : 'pendiente'}</span></div>${step.urgent === 0x7d5 ? '<div class="warning-inline">Para Save Moga Village, el juego exige que Cha-Cha esté desplegado. Ese estado no se lee de las banderas de misión.</div>' : ''}</div></div>`;
      $('#villageNext').innerHTML = `<article class="next-card ${state.missing.length === 0 && clearStatus(profile, step.urgent) ? 'complete' : ''}"><div class="next-top"><div><div class="eyebrow">${escapeHtml(step.phase)} · AVANCE A ${escapeHtml(step.to)}</div><h3>${escapeHtml(step.urgentName)}</h3><p>${state.missing.length ? `Faltan ${state.missing.length} misiones clave para que el juego habilite esta urgente.` : clearStatus(profile, step.urgent) ? 'Esta urgente ya figura completada; pasa a la siguiente etapa.' : 'Las claves están completas. La urgente es el siguiente paso registrado.'}</p></div><span class="next-status ${state.missing.length === 0 ? 'good' : ''}">${state.missing.length ? `${state.missing.length} pendientes` : clearStatus(profile, step.urgent) ? 'Completada' : 'Lista para intentar'}</span></div>${missingHtml}</article>`;
    }

    const special = step?.urgent === 0x7d5 || step?.urgent === 0x7d4 || clearStatus(profile, 0x7d5);
    $('#villageManual').innerHTML = special ? `<div class="manual-box"><h3>Comprobaciones que el save no permite confirmar</h3><p>Son notas locales para ti. Guardarlas aquí no modifica la partida. La solicitud One Chance desbloquea misiones extra de 5★; Cha-Cha debe estar disponible para la urgente final.</p><div class="manual-checks"><label class="manual-check"><input type="checkbox" data-manual="chacha" ${manual.chacha ? 'checked' : ''}> Cha-Cha listo / desplegado</label><label class="manual-check"><input type="checkbox" data-manual="oneChance" ${manual.oneChance ? 'checked' : ''}> Ya entregué One Chance</label></div></div>` : '';

    const keyIds = [...new Set(VILLAGE_STEPS.flatMap((item) => item.keys))];
    $('#villageQuestGroups').innerHTML = VILLAGE_GROUPS.map((group, index) => {
      const ids = group.urgentIds
        ? group.urgentIds
        : DATA.reference.questIds.map((id) => Number.parseInt(id, 16)).filter((id) => id >= group.min && id <= group.max);
      const known = ids.map((id) => ({ id, quest: QUESTS.get(id) })).filter((row) => row.quest || QUEST_LABELS.has(row.id));
      const doneCount = known.filter(({ id }) => clearStatus(profile, id)).length;
      return `<details class="quest-group" ${index === 0 ? '' : ''}><summary><span>${escapeHtml(group.title)}</span><span class="quest-group-count">${doneCount}/${known.length} completadas</span></summary><div class="quest-list">${known.length ? known.map(({ id }) => questRow(profile, id, keyIds, VILLAGE_STEPS.map((item) => item.urgent))).join('') : '<div class="quest-row"><span></span><span class="quest-name">Sin misiones de esta categoría en la base incluida.</span></div>'}</div></details>`;
    }).join('');
  }

  function monsterProgress(profile) {
    const counts = new Map();
    const validGoals = new Set(['hunt', 'capture', 'slay']);
    for (const id of profile.completed) {
      const quest = QUESTS.get(id);
      if (!quest || !validGoals.has(quest.goal)) continue;
      const targets = Object.keys(quest.targets || {}).map(Number);
      for (const monsterId of targets) {
        const name = MONSTER_NAMES.get(monsterId);
        if (name) counts.set(monsterId, (counts.get(monsterId) || 0) + 1);
      }
    }
    return [...counts.entries()].map(([id, count]) => ({ id, name: MONSTER_NAMES.get(id), count })).sort((a, b) => a.name.localeCompare(b.name));
  }

  function renderHunts(profile) {
    const monsters = monsterProgress(profile);
    const query = appState.monsterSearch.trim().toLocaleLowerCase('es');
    const filtered = monsters.filter((monster) => !query || monster.name.toLocaleLowerCase('es').includes(query));
    $('#monsterCount').textContent = `${filtered.length} de ${monsters.length} monstruos`;
    $('#monsterGrid').innerHTML = filtered.length ? filtered.map((monster) => `<article class="monster-card"><div><strong>${escapeHtml(monster.name)}</strong><small>${monster.count} misión${monster.count === 1 ? '' : 'es'} completada${monster.count === 1 ? '' : 's'} como objetivo · ${hex(monster.id)}</small></div><span class="monster-count">${monster.count}</span></article>`).join('') : '<div class="table-empty">No aparecen objetivos de monstruo en las misiones completadas que puede leer el save.</div>';
  }

  function questTargetSummary(quest) {
    const isGathering = quest.goal === 'gathering' || ['gather', 'harvest'].includes(quest.type);
    return Object.entries(quest.targets || {}).map(([rawId, rawAmount]) => {
      const id = Number(rawId);
      const name = isGathering
        ? ITEM_NAMES.get(id) || MONSTER_NAMES.get(id)
        : MONSTER_NAMES.get(id) || ITEM_NAMES.get(id);
      const amount = Number(rawAmount);
      return `${name || `ID ${id}`}${amount > 1 ? ` ×${formatNumber(amount)}` : ''}`;
    }).join(', ') || 'El catálogo no detalla el objetivo';
  }

  function questSaveStatus(profile, quest) {
    if (profile.completed.has(quest.id)) return { label: 'Completada', className: 'quest-status-done' };
    if (QUEST_INDEX.has(quest.id)) return { label: 'Sin completar · registrable', className: 'quest-status-open' };
    return { label: 'Sin bandera en el save', className: 'quest-status-unknown' };
  }

  function renderQuestCatalog(profile) {
    const search = appState.questSearch.trim().toLocaleLowerCase('es');
    const filtered = DATA.quests.filter((quest) => {
      if (appState.questRegion !== 'all' && quest.region !== appState.questRegion) return false;
      if (appState.questRank !== 'all' && quest.rank !== appState.questRank) return false;
      if (appState.questGoal !== 'all' && quest.goal !== appState.questGoal) return false;
      const progressionRoles = QUEST_PROGRESSION_ROLES.get(quest.id) || new Set();
      if (appState.questProgression === 'other' && progressionRoles.size > 0) return false;
      if (appState.questProgression !== 'all' && appState.questProgression !== 'other' && !progressionRoles.has(appState.questProgression)) return false;
      const tracked = QUEST_INDEX.has(quest.id);
      const completed = profile.completed.has(quest.id);
      if (appState.questStatus === 'completed' && !completed) return false;
      if (appState.questStatus === 'not-completed' && (!tracked || completed)) return false;
      if (appState.questStatus === 'untracked' && tracked) return false;
      if (!search) return true;
      const searchable = [
        quest.name,
        QUEST_REGION_LABELS[quest.region] || quest.region,
        quest.region,
        QUEST_RANK_LABELS[quest.rank] || quest.rank,
        quest.rank,
        QUEST_TYPE_LABELS[quest.type] || quest.type,
        quest.type,
        QUEST_GOAL_LABELS[quest.goal] || quest.goal,
        quest.goal,
        hex(quest.id),
        [...progressionRoles].map((role) => QUEST_PROGRESSION_LABELS[role]),
        questTargetSummary(quest),
      ].join(' ').toLocaleLowerCase('es');
      return searchable.includes(search);
    }).sort((a, b) => {
      const regionOrder = { Village: 0, City: 1 };
      const rankOrder = { Low: 0, High: 1 };
      return (regionOrder[a.region] ?? 9) - (regionOrder[b.region] ?? 9)
        || (rankOrder[a.rank] ?? 9) - (rankOrder[b.rank] ?? 9)
        || a.name.localeCompare(b.name);
    });
    const completedCount = filtered.filter((quest) => profile.completed.has(quest.id)).length;
    $('#questCount').textContent = `${formatNumber(filtered.length)} de ${formatNumber(DATA.quests.length)} misiones · ${formatNumber(completedCount)} completadas en esta selección`;
    $('#questCatalog').innerHTML = filtered.length ? filtered.map((quest) => {
      const status = questSaveStatus(profile, quest);
      const target = questTargetSummary(quest);
      const progressionTags = [...(QUEST_PROGRESSION_ROLES.get(quest.id) || [])].map((role) => `<span class="quest-role-tag">${escapeHtml(QUEST_PROGRESSION_LABELS[role])}</span>`).join('');
      return `<article class="quest-catalog-card"><div class="quest-catalog-top"><div><h3>${escapeHtml(quest.name)}</h3><div class="quest-catalog-tags"><span>${escapeHtml(QUEST_REGION_LABELS[quest.region] || quest.region)}</span><span>Rango ${escapeHtml(QUEST_RANK_LABELS[quest.rank] || quest.rank)}</span>${progressionTags}</div></div><span class="quest-save-status ${status.className}">${status.label}</span></div><div class="quest-catalog-details"><div><small>Tipo</small><strong>${escapeHtml(QUEST_TYPE_LABELS[quest.type] || quest.type || 'Sin tipo')}</strong></div><div><small>Objetivo registrado</small><strong>${escapeHtml(QUEST_GOAL_LABELS[quest.goal] || quest.goal || 'Sin objetivo')}</strong></div><div class="quest-target-detail"><small>Objetivos</small><strong>${escapeHtml(target)}</strong></div></div><div class="quest-catalog-id">ID ${hex(quest.id)}${QUEST_INDEX.has(quest.id) ? ' · bandera compatible con el save' : ' · sin bandera compatible conocida'}</div></article>`;
    }).join('') : '<div class="quest-catalog-empty">No hay misiones con estos filtros. Prueba otra zona, rango u objetivo.</div>';
  }

  function findItem(name) {
    const normalized = name.toLocaleLowerCase('en');
    return DATA.items.find((item) => item.name.toLocaleLowerCase('en') === normalized)
      || DATA.items.find((item) => item.name.toLocaleLowerCase('en').includes(normalized));
  }

  function renderMaterials(profile) {
    const totalEntries = profile.itemCounts.size;
    const query = appState.itemSearch.trim().toLocaleLowerCase('es');
    const rows = [...profile.itemCounts.entries()].map(([id, count]) => ({ id, count, name: ITEM_NAMES.get(id) || `Objeto #${id}` })).sort((a, b) => a.name.localeCompare(b.name));
    const filtered = rows.filter((item) => !query || item.name.toLocaleLowerCase('es').includes(query));
    $('#itemCount').textContent = `${filtered.length} de ${totalEntries} objetos con cantidad`;
    $('#itemRows').innerHTML = filtered.length ? filtered.map((item) => `<tr><td>${escapeHtml(item.name)}</td><td class="numeric">${formatNumber(item.count)}</td></tr>`).join('') : `<tr><td class="table-empty" colspan="2">${query ? 'No encontré objetos con esa búsqueda.' : 'El baúl no tiene objetos con cantidad positiva.'}</td></tr>`;
    $('#requestPanel').innerHTML = REQUESTS.map((request) => `<div class="request-block"><h3>${escapeHtml(request.title)}</h3><p>${escapeHtml(request.note)} Cantidades leídas del baúl; si están en la bolsa del cazador no se cuentan.</p><div class="request-items">${request.items.map(([name, required]) => {
      const item = findItem(name);
      const count = item ? profile.itemCounts.get(item.id) || 0 : 0;
      return `<div class="request-item ${count >= required ? 'enough' : ''}"><strong>${escapeHtml(item?.name || name)}</strong><span>${formatNumber(count)} / ${required} ${count >= required ? '· alcanza' : '· faltan ' + formatNumber(required - count)}</span></div>`;
    }).join('')}</div></div>`).join('<div class="request-separator"></div>');
    renderWeaponPlanner(profile);
    renderWeaponShoppingList(profile);
  }

  function weaponPathOptions(weapons, targetId) {
    const byId = new Map(weapons.map((weapon) => [weapon.id, weapon]));
    const found = new Set();
    const pending = [...(byId.get(Number(targetId))?.upgradesFrom?.weaponId || [])];
    while (pending.length) {
      const id = pending.pop();
      if (found.has(id) || !byId.has(id)) continue;
      found.add(id);
      pending.push(...(byId.get(id).upgradesFrom?.weaponId || []));
    }
    found.add(Number(targetId));
    return [...found].map((id) => byId.get(id)).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name));
  }

  function collectForgePaths(weapons, targetId, startId) {
    const byId = new Map(weapons.map((weapon) => [weapon.id, weapon]));
    const sourceId = startId === '' ? null : Number(startId);
    const visit = (weapon, seen) => {
      if (!weapon || seen.has(weapon.id)) return [];
      if (sourceId !== null && weapon.id === sourceId) return [{ weapons: [weapon], steps: [] }];
      const nextSeen = new Set(seen).add(weapon.id);
      const paths = [];
      if (sourceId === null && weapon.create?.length) {
        paths.push({ weapons: [weapon], steps: [{ weapon, materials: weapon.create, action: 'Forja' }] });
      }
      for (const predecessorId of weapon.upgradesFrom?.weaponId || []) {
        const predecessor = byId.get(predecessorId);
        for (const prefix of visit(predecessor, nextSeen)) {
          paths.push({
            weapons: [...prefix.weapons, weapon],
            steps: [...prefix.steps, { weapon, materials: weapon.upgradesFrom?.materials || [], action: 'Mejora' }],
          });
          if (paths.length >= 1000) return paths;
        }
      }
      return paths;
    };
    return visit(byId.get(Number(targetId)), new Set());
  }

  function collectForgeRequirements(path) {
    const requirements = new Map();
    for (const step of path.steps) {
      for (const material of step.materials || []) {
        requirements.set(material.itemId, (requirements.get(material.itemId) || 0) + material.amount);
      }
    }
    return requirements;
  }

  function scoreForgePath(path, profile) {
    const requirements = collectForgeRequirements(path);
    const rows = [...requirements.entries()].map(([id, required]) => ({
      id,
      required,
      owned: profile.itemCounts.get(id) || 0,
      missing: Math.max(0, required - (profile.itemCounts.get(id) || 0)),
      name: ITEM_NAMES.get(id) || `Objeto #${id}`,
    })).sort((a, b) => a.name.localeCompare(b.name));
    return {
      ...path,
      rows,
      missing: rows.reduce((total, row) => total + row.missing, 0),
      total: rows.reduce((total, row) => total + row.required, 0),
    };
  }

  function renderWeaponPlanner(profile) {
    const classSelect = $('#weaponClass');
    const targetSelect = $('#weaponTarget');
    const startSelect = $('#weaponStart');
    const routeSelect = $('#weaponRoute');
    classSelect.innerHTML = WEAPON_CLASSES.map((type) => `<option value="${escapeHtml(type)}">${escapeHtml(WEAPON_CLASS_NAMES[type] || type)}</option>`).join('');
    if (!WEAPON_CLASSES.includes(appState.weaponClass)) appState.weaponClass = WEAPON_CLASSES[0] || '';
    classSelect.value = appState.weaponClass;

    const weapons = (DATA.weapons || []).filter((weapon) => weapon.type === appState.weaponClass);
    const ordered = [...weapons].sort((a, b) => a.name.localeCompare(b.name));
    if (!weapons.some((weapon) => String(weapon.id) === String(appState.weaponTarget))) appState.weaponTarget = String(ordered[0]?.id ?? '');
    targetSelect.innerHTML = ordered.map((weapon) => `<option value="${weapon.id}">${escapeHtml(weapon.name)}</option>`).join('');
    targetSelect.value = appState.weaponTarget;

    const starts = weaponPathOptions(weapons, appState.weaponTarget);
    if (appState.weaponStart !== '' && !starts.some((weapon) => String(weapon.id) === String(appState.weaponStart))) appState.weaponStart = '';
    startSelect.innerHTML = `<option value="">Desde cero</option>${starts.map((weapon) => `<option value="${weapon.id}">Ya tengo: ${escapeHtml(weapon.name)}</option>`).join('')}`;
    startSelect.value = appState.weaponStart;

    const paths = collectForgePaths(weapons, appState.weaponTarget, appState.weaponStart)
      .map((path) => scoreForgePath(path, profile))
      .sort((a, b) => a.missing - b.missing || a.steps.length - b.steps.length || a.total - b.total || a.weapons.map((weapon) => weapon.name).join(' ').localeCompare(b.weapons.map((weapon) => weapon.name).join(' ')));
    appState.weaponRoute = clamp(appState.weaponRoute, 0, Math.max(0, paths.length - 1));
    routeSelect.innerHTML = paths.map((path, index) => {
      const routeName = path.weapons.map((weapon) => weapon.name).join(' → ');
      const status = path.missing === 0 ? 'materiales del baúl suficientes' : `faltan ${formatNumber(path.missing)}`;
      return `<option value="${index}">Ruta ${index + 1} · ${escapeHtml(routeName)} · ${status}</option>`;
    }).join('');
    routeSelect.disabled = paths.length < 2;
    if (paths.length) routeSelect.value = String(appState.weaponRoute);

    const result = $('#weaponPlanResult');
    if (!paths.length) {
      result.innerHTML = '<div class="weapon-empty">No hay una receta completa conectada para esta ruta en los datos incluidos. Prueba otra arma objetivo o punto de partida.</div>';
      return;
    }
    const path = paths[appState.weaponRoute];
    const target = weapons.find((weapon) => String(weapon.id) === String(appState.weaponTarget));
    const weaponDetail = target ? `Ataque ${formatNumber(target.attack)} · ${target.secondaryDamageType ? `${escapeHtml(target.secondaryDamageType)} ${formatNumber(target.secondaryAttack)}` : 'sin elemento'} · afinidad ${target.affinity > 0 ? '+' : ''}${target.affinity}% · ${target.slots} ranura${target.slots === 1 ? '' : 's'}` : '';
    const pathMarkup = path.weapons.map((weapon, index) => `<span class="weapon-path-step">${escapeHtml(weapon.name)}</span>${index < path.weapons.length - 1 ? '<span class="weapon-path-arrow">→</span>' : ''}`).join('');
    const materials = path.rows.length ? `<div class="table-wrap weapon-material-table"><table><thead><tr><th>Material</th><th class="numeric">Necesitas</th><th class="numeric">En baúl</th><th class="numeric">Faltan</th></tr></thead><tbody>${path.rows.map((row) => `<tr><td>${escapeHtml(row.name)}</td><td class="numeric">${formatNumber(row.required)}</td><td class="numeric">${formatNumber(row.owned)}</td><td class="numeric ${row.missing ? 'number-negative' : 'number-positive'}">${formatNumber(row.missing)}</td></tr>`).join('')}</tbody></table></div>` : '<div class="weapon-empty">No se requieren materiales para el tramo seleccionado; el arma objetivo ya está marcada como punto de partida.</div>';
    result.innerHTML = `<div class="weapon-plan-heading"><div><strong>${escapeHtml(target?.name || 'Arma seleccionada')}</strong><span>${weaponDetail}</span></div><span class="tag ${path.missing === 0 ? 'good' : 'warn'}">${path.missing === 0 ? 'Alcanza el baúl' : `Faltan ${formatNumber(path.missing)} unidades`}</span></div><div class="weapon-path">${pathMarkup}</div>${materials}${path.rows.length ? '<div class="weapon-plan-actions"><button class="button button-secondary" id="addWeaponGoal" type="button">Sumar a lista de materiales</button><span>La lista combina esta ruta con tus otros objetivos.</span></div>' : ''}`;
    $('#addWeaponGoal')?.addEventListener('click', () => {
      const targetId = Number(appState.weaponTarget);
      const startId = appState.weaponStart === '' ? null : Number(appState.weaponStart);
      const weaponIds = path.weapons.map((weapon) => weapon.id);
      const key = forgeGoalKey(appState.weaponClass, targetId, startId, weaponIds);
      const existing = appState.weaponShoppingList.find((goal) => goal.key === key);
      if (existing) {
        if (existing.copies >= 99) {
          notify('La lista admite hasta 99 copias por objetivo.');
          return;
        }
        existing.copies += 1;
      } else {
        appState.weaponShoppingList.push({
          key,
          type: appState.weaponClass,
          targetId,
          startId,
          weaponIds,
          name: target?.name || 'Arma seleccionada',
          route: path.weapons.map((weapon) => weapon.name).join(' → '),
          copies: 1,
          requirements: path.rows.map(({ id, required }) => ({ id, required })),
        });
      }
      persistWeaponShoppingList();
      renderWeaponShoppingList(currentProfile());
      notify(`Objetivo agregado a la lista: ${target?.name || 'arma seleccionada'}.`);
    });
  }

  function renderWeaponShoppingList(profile) {
    const root = $('#weaponShoppingList');
    const goals = appState.weaponShoppingList;
    if (!goals.length) {
      root.innerHTML = '<section class="weapon-shopping panel"><div class="panel-heading"><div><h3>Lista de materiales para tus armas</h3><div class="panel-subtitle">Agrega rutas desde el planificador para combinar objetivos y calcular qué te falta.</div></div></div><div class="weapon-shopping-empty">Tu lista está vacía. Elige un arma y una ruta arriba, y pulsa <strong>Sumar a lista de materiales</strong>.</div><p class="small-note">La lista se guarda en este equipo, separada de la partida. Solo se incluyen recetas de armas del catálogo; los costos de forja de armaduras no están disponibles.</p></section>';
      return;
    }
    const requirements = new Map();
    for (const goal of goals) {
      for (const requirement of goal.requirements) {
        requirements.set(requirement.id, (requirements.get(requirement.id) || 0) + requirement.required * goal.copies);
      }
    }
    const rows = [...requirements.entries()].map(([id, required]) => {
      const owned = profile.itemCounts.get(id) || 0;
      return { id, name: ITEM_NAMES.get(id) || `Objeto #${id}`, required, owned, missing: Math.max(0, required - owned) };
    }).sort((a, b) => a.name.localeCompare(b.name));
    const missingUnits = rows.reduce((sum, row) => sum + row.missing, 0);
    const goalMarkup = goals.map((goal, index) => `<div class="weapon-goal-row"><div><strong>${escapeHtml(goal.name)} <span>×${formatNumber(goal.copies)}</span></strong><small>${escapeHtml(goal.route)}</small></div><div class="weapon-goal-controls"><button type="button" class="goal-quantity" data-change-weapon-goal="${index}" data-delta="-1" aria-label="Quitar una copia de ${escapeHtml(goal.name)}">−</button><button type="button" class="goal-quantity" data-change-weapon-goal="${index}" data-delta="1" aria-label="Agregar una copia de ${escapeHtml(goal.name)}">+</button><button type="button" class="goal-remove" data-remove-weapon-goal="${index}" aria-label="Quitar ${escapeHtml(goal.name)} de la lista">Quitar</button></div></div>`).join('');
    root.innerHTML = `<section class="weapon-shopping panel"><div class="panel-heading"><div><h3>Lista de materiales para tus armas</h3><div class="panel-subtitle">${formatNumber(goals.reduce((sum, goal) => sum + goal.copies, 0))} copias · ${formatNumber(rows.length)} materiales distintos · cantidades del baúl descontadas una sola vez</div></div><button class="button button-secondary" type="button" data-clear-weapon-goals>Vaciar lista</button></div><div class="weapon-goals">${goalMarkup}</div><div class="weapon-shopping-summary"><span class="tag ${missingUnits === 0 ? 'good' : 'warn'}" role="status" aria-live="polite">${missingUnits === 0 ? 'Tienes todos los materiales' : `Te faltan ${formatNumber(missingUnits)} unidades`}</span><span>El cálculo usa el baúl del cazador seleccionado; no cuenta objetos de la bolsa.</span></div><div class="table-wrap weapon-material-table"><table><thead><tr><th>Material</th><th class="numeric">Total para objetivos</th><th class="numeric">En baúl</th><th class="numeric">Faltan</th></tr></thead><tbody>${rows.map((row) => `<tr><td>${escapeHtml(row.name)}</td><td class="numeric">${formatNumber(row.required)}</td><td class="numeric">${formatNumber(row.owned)}</td><td class="numeric ${row.missing ? 'number-negative' : 'number-positive'}">${formatNumber(row.missing)}</td></tr>`).join('')}</tbody></table></div><p class="small-note">La lista se guarda en este equipo, separada de la partida. Solo se incluyen recetas de armas del catálogo; los costos de forja de armaduras no están disponibles.</p></section>`;
  }

  function renderSaveInspector() {
    const validCount = appState.files.filter((file) => file.checksumOk && file.magic === file.expectedMagic && file.size === FILE_SIZE).length;
    const activeCount = appState.files.filter((file) => file.inUse && file.checksumOk && file.magic === file.expectedMagic && file.size === FILE_SIZE).length;
    const rows = appState.files.map((file) => {
      const size = file.size == null ? '—' : `${formatNumber(file.size)} / ${formatNumber(FILE_SIZE)} bytes`;
      const checksum = file.checksumOk == null ? '—' : file.checksumOk ? 'Correcto' : 'No coincide';
      const used = file.inUse == null ? '—' : file.inUse ? `Sí · flags ${hex(file.flags)}` : 'No · vacío';
      const slots = file.slots?.length
        ? file.slots.map((slot) => `${slot.slot + 1}: ${slot.occupied ? `ocupado${slot.rank ? ` · RC ${slot.rank} · ${formatNumber(slot.points)} HRP` : ''}` : 'vacío'}${slot.occupied && slot.marker != null ? ` · marcador ${hex(slot.marker)}` : ''}`).join('<br>')
        : file.selected === false ? 'No seleccionado' : 'Sin registros válidos';
      const stateClass = file.status.includes('Válido') ? 'diagnostic-good' : file.status.includes('inactivo') || file.status.includes('No incluido') ? 'diagnostic-muted' : 'diagnostic-bad';
      return `<tr><td><strong>${escapeHtml(file.name)}</strong></td><td><code>${escapeHtml(file.magic || '—')}</code><small>esperado ${escapeHtml(file.expectedMagic || '—')}</small></td><td>${escapeHtml(size)}</td><td>${escapeHtml(used)}</td><td>${escapeHtml(checksum)}</td><td>${slots}</td><td><span class="diagnostic-status ${stateClass}">${escapeHtml(file.status)}</span></td></tr>`;
    }).join('');
    const profiles = currentProfile() ? appState.profiles.map((profile) => `<tr><td>${escapeHtml(profile.fileName)} · registro ${profile.slot + 1}</td><td>${hex(profile.recordMarker)}</td><td>${formatNumber(profile.characterId)} (${hex(profile.characterId)})</td><td>RC ${profile.rank}</td><td>${formatNumber(profile.points)} HRP</td><td>${formatNumber(profile.zenny)} zenny</td><td>${formatNumber(profile.completed.size)} misiones · ${formatNumber(profile.itemCounts.size)} IDs de objeto</td><td>0x${profile.recordOffset.toString(16).toUpperCase().padStart(5, '0')}</td></tr>`).join('') : '';

    $('#saveInspector').innerHTML = `<div class="section-intro"><div><div class="eyebrow">ESTRUCTURA Y VALIDACIÓN</div><h2>Qué leyó la app del save</h2></div><p>Inspección de solo lectura. La validez se basa en tamaño, firma del archivo, flags activos, checksum y marcas de registro de cazador.</p></div><div class="diagnostic-summary"><article class="stat-card"><div class="stat-label">Archivos comprobados</div><div class="stat-value">${validCount}/6</div><div class="stat-detail">Tamaño, firma y checksum coinciden</div></article><article class="stat-card"><div class="stat-label">Archivos activos validados</div><div class="stat-value">${activeCount}</div><div class="stat-detail">Flags de uso distintos de cero</div></article><article class="stat-card"><div class="stat-label">Cazadores detectados</div><div class="stat-value">${appState.profiles.length}</div><div class="stat-detail">Tres registros posibles por archivo</div></article></div><article class="panel diagnostic-panel"><div class="panel-heading"><div><h3>Archivos data00–data05</h3><div class="panel-subtitle">Cada archivo mide 0x14000 bytes; el checksum es la suma de los bytes desde 0x08.</div></div></div><div class="table-wrap"><table><thead><tr><th>Archivo</th><th>Firma</th><th>Tamaño</th><th>En uso</th><th>Checksum</th><th>Registros de cazador</th><th>Estado</th></tr></thead><tbody>${rows}</tbody></table></div></article><article class="panel diagnostic-panel"><div class="panel-heading"><div><h3>Registros que sí se decodifican</h3><div class="panel-subtitle">Offsets relativos al inicio del archivo; el ID interno todavía no se etiqueta como nombre.</div></div></div><div class="table-wrap"><table><thead><tr><th>Registro</th><th>Marca</th><th>ID interno (+0x1C)</th><th>Rango (+0x3DE4)</th><th>HRP (+0x3DE0)</th><th>Zenny (+0x18)</th><th>Completados · objeto</th><th>Offset registro</th></tr></thead><tbody>${profiles || '<tr><td class="table-empty" colspan="8">No hay registros activos cargados.</td></tr>'}</tbody></table></div><p class="small-note">Las misiones completadas no equivalen a un contador de cacerías. Los materiales reflejan el baúl, no la bolsa. Consulta <code>docs/save-format.md</code> para el formato y sus límites.</p></article>`;
  }

  function armorSkills() {
    const map = new Map();
    for (const tree of DATA.skillTrees) {
      map.set(tree.key, tree);
    }
    return map;
  }
  const SKILL_TREES = armorSkills();

  function renderSetBuilder() {
    const root = $('#setBuilder');
    root.innerHTML = PIECE_TYPES.map((type) => {
      const chosen = appState.set[type] || '';
      const options = ARMOR.filter((piece) => piece.type === type && piece[appState.armorStyle]);
      const selectedPiece = options.find((piece) => String(piece.id) === String(chosen));
      return `<div class="piece-card"><label for="piece-${type}">${ARMOR_BY_TYPE[type]}</label><select id="piece-${type}" data-piece="${type}"><option value="">Elegir pieza…</option>${options.map((piece) => `<option value="${piece.id}" ${String(piece.id) === String(chosen) ? 'selected' : ''}>${escapeHtml(piece.name)} · DEF ${piece.defense} · ${piece.slots} ran.</option>`).join('')}</select>${renderDecorationControls(type, selectedPiece)}</div>`;
    }).join('');
    root.querySelectorAll('[data-piece]').forEach((select) => select.addEventListener('change', () => {
      const value = select.value;
      if (value === '') delete appState.set[select.dataset.piece];
      else appState.set[select.dataset.piece] = Number(value);
      const piece = ARMOR.find((item) => item.type === select.dataset.piece && String(item.id) === String(value));
      trimDecorations(select.dataset.piece, piece?.slots || 0);
      renderSetBuilder();
    }));
    root.querySelectorAll('[data-add-decoration]').forEach((button) => button.addEventListener('click', () => {
      const type = button.dataset.addDecoration;
      const piece = PIECE_TYPES.includes(type) ? ARMOR.find((item) => item.type === type && String(item.id) === String(appState.set[type])) : null;
      const rows = appState.decorations[type] || [];
      if (!piece || rows.includes('')) return;
      const used = rows.reduce((total, name) => total + (DATA.decorations.find((decoration) => decoration.name === name)?.slotUsage || 0), 0);
      if (used < piece.slots) {
        appState.decorations[type] = [...rows, ''];
        renderSetBuilder();
      }
    }));
    root.querySelectorAll('[data-decoration]').forEach((select) => select.addEventListener('change', () => {
      const type = select.dataset.decoration;
      const index = Number(select.dataset.decorationIndex);
      const piece = ARMOR.find((item) => item.type === type && String(item.id) === String(appState.set[type]));
      const rows = [...(appState.decorations[type] || [])];
      const otherSlots = rows.reduce((total, name, rowIndex) => rowIndex === index ? total : total + (DATA.decorations.find((decoration) => decoration.name === name)?.slotUsage || 0), 0);
      const chosenDecoration = DATA.decorations.find((decoration) => decoration.name === select.value);
      if (!piece || (chosenDecoration && otherSlots + chosenDecoration.slotUsage > piece.slots)) return;
      rows[index] = select.value;
      appState.decorations[type] = rows;
      renderSetBuilder();
    }));
    root.querySelectorAll('[data-remove-decoration]').forEach((button) => button.addEventListener('click', () => {
      const type = button.dataset.removeDecoration;
      const rows = [...(appState.decorations[type] || [])];
      rows.splice(Number(button.dataset.decorationIndex), 1);
      if (rows.length) appState.decorations[type] = rows;
      else delete appState.decorations[type];
      renderSetBuilder();
    }));
    renderSetSummary();
  }

  function trimDecorations(type, maxSlots) {
    const rows = [...(appState.decorations[type] || [])];
    const usedSlots = () => rows.reduce((total, name) => total + (DATA.decorations.find((decoration) => decoration.name === name)?.slotUsage || 0), 0);
    while (rows.length && usedSlots() > maxSlots) rows.pop();
    if (rows.length) appState.decorations[type] = rows;
    else delete appState.decorations[type];
  }

  function renderDecorationControls(type, piece) {
    if (!piece) return '<div class="decoration-controls"><span>Elige una pieza para asignarle joyas.</span></div>';
    const rows = appState.decorations[type] || [];
    const jewels = new Map(DATA.decorations.map((decoration) => [decoration.name, decoration]));
    const usedSlots = rows.reduce((total, name) => total + (jewels.get(name)?.slotUsage || 0), 0);
    const rowsMarkup = rows.map((name, index) => {
      const otherSlots = rows.reduce((total, other, otherIndex) => otherIndex === index ? total : total + (jewels.get(other)?.slotUsage || 0), 0);
      const available = DATA.decorations.filter((decoration) => decoration.slotUsage <= piece.slots - otherSlots || decoration.name === name).sort((a, b) => a.slotUsage - b.slotUsage || a.name.localeCompare(b.name));
      const options = available.map((decoration) => {
        const points = Object.entries(decoration.skillPoints || {}).map(([skill, value]) => `${skill} ${value > 0 ? '+' : ''}${value}`).join(', ');
        return `<option value="${escapeHtml(decoration.name)}" ${decoration.name === name ? 'selected' : ''}>${escapeHtml(decoration.name)} · ${decoration.slotUsage} ran. · ${escapeHtml(points)}</option>`;
      }).join('');
      return `<div class="decoration-row"><select data-decoration="${type}" data-decoration-index="${index}" aria-label="Joya ${index + 1} de ${ARMOR_BY_TYPE[type]}"><option value="">Elegir joya…</option>${options}</select><button type="button" class="decoration-remove" data-remove-decoration="${type}" data-decoration-index="${index}" aria-label="Quitar joya">×</button></div>`;
    }).join('');
    const canAdd = usedSlots < piece.slots && !rows.includes('');
    return `<div class="decoration-controls"><div class="decoration-heading"><span>Joyas · ${usedSlots}/${piece.slots} espacios</span><button type="button" class="decoration-add" data-add-decoration="${type}" ${canAdd ? '' : 'disabled'}>+ Añadir</button></div>${rowsMarkup || '<span class="decoration-empty">Sin joyas</span>'}</div>`;
  }

  function renderSetSummary() {
    const chosen = PIECE_TYPES.map((type) => ARMOR.find((piece) => piece.type === type && piece.id === appState.set[type])).filter(Boolean);
    const torsoUpCount = chosen.filter((piece) => piece.torsoUp).length;
    const torsoUpMultiplier = 1 + torsoUpCount;
    const totals = { defense: 0, fireRes: 0, waterRes: 0, iceRes: 0, thunderRes: 0, dragonRes: 0, slots: 0, skills: new Map() };
    let decorationSlotsUsed = 0;
    for (const piece of chosen) {
      totals.defense += piece.defense || 0;
      totals.fireRes += piece.fireRes || 0;
      totals.waterRes += piece.waterRes || 0;
      totals.iceRes += piece.iceRes || 0;
      totals.thunderRes += piece.thunderRes || 0;
      totals.dragonRes += piece.dragonRes || 0;
      totals.slots += piece.slots || 0;
      const skillMultiplier = piece.type === 'chest' ? torsoUpMultiplier : 1;
      for (const [skill, points] of Object.entries(piece.skillPoints || {})) totals.skills.set(skill, (totals.skills.get(skill) || 0) + points * skillMultiplier);
      for (const name of appState.decorations[piece.type] || []) {
        const decoration = DATA.decorations.find((item) => item.name === name);
        if (!decoration) continue;
        decorationSlotsUsed += decoration.slotUsage || 0;
        const decorationMultiplier = piece.type === 'chest' ? torsoUpMultiplier : 1;
        for (const [skill, points] of Object.entries(decoration.skillPoints || {})) totals.skills.set(skill, (totals.skills.get(skill) || 0) + points * decorationMultiplier);
      }
    }
    const active = [];
    for (const [key, points] of totals.skills) {
      const tree = SKILL_TREES.get(key);
      if (!tree) continue;
      const reached = tree.armorSkills.filter((skill) => skill.threshold > 0 ? points >= skill.threshold : points <= skill.threshold).sort((a, b) => Math.abs(b.threshold) - Math.abs(a.threshold));
      if (reached.length) active.push({ name: reached[0].name || tree.name, description: reached[0].description || tree.description, points, key });
    }
    active.sort((a, b) => a.name.localeCompare(b.name));
    const missing = 5 - chosen.length;
    const freeSlots = Math.max(0, totals.slots - decorationSlotsUsed);
    $('#setResults').innerHTML = `<div class="panel"><div class="panel-heading"><div><h3>Defensa y resistencias</h3><div class="panel-subtitle">${chosen.length}/5 piezas seleccionadas</div></div></div><div class="set-metrics"><div class="set-metric"><strong>${totals.defense}</strong><span>Defensa base</span></div><div class="set-metric"><strong>${freeSlots}/${totals.slots}</strong><span>Ranuras libres</span></div></div><div class="resist-list">${[['Fuego', totals.fireRes], ['Agua', totals.waterRes], ['Hielo', totals.iceRes], ['Trueno', totals.thunderRes], ['Dragón', totals.dragonRes]].map(([name, value]) => `<div class="resist-chip">${name}<b class="${value > 0 ? 'number-positive' : value < 0 ? 'number-negative' : ''}">${value > 0 ? '+' : ''}${value}</b></div>`).join('')}</div>${missing ? `<div class="warning-inline">Selecciona ${missing} pieza${missing === 1 ? '' : 's'} más para completar el set.</div>` : ''}</div><div class="panel"><div class="panel-heading"><div><h3>Habilidades activadas</h3><div class="panel-subtitle">Puntos de armadura y joyas combinados</div></div></div>${torsoUpCount ? `<div class="torso-up-note">Torso Up x${torsoUpCount}: las habilidades del pecho y sus joyas cuentan ${torsoUpMultiplier}×.</div>` : ''}${active.length ? `<div class="skill-list">${active.map((skill) => `<div class="skill-item"><strong>${escapeHtml(skill.name)} <span class="subtle">${skill.points > 0 ? '+' : ''}${skill.points} pts</span></strong><span>${escapeHtml(skill.description || '')}</span></div>`).join('')}</div>` : '<div class="skill-empty">Todavía no se activa ninguna habilidad.<br>Combina piezas y joyas hasta alcanzar sus umbrales.</div>'}</div>`;
  }

  function renderApp() {
    const profile = currentProfile();
    if (!profile) return;
    const errorBanner = $('#analysisError');
    errorBanner.classList.add('hidden');
    errorBanner.textContent = '';
    try {
      renderDashboard(profile);
      renderOnline(profile);
      renderVillage(profile);
      renderQuestCatalog(profile);
      renderHunts(profile);
      renderMaterials(profile);
      renderSaveInspector();
      renderSetBuilder();
      showView(appState.view);
    } catch (error) {
      console.error('No se pudo representar el progreso del save', error);
      errorBanner.textContent = `El save se leyó, pero falló el cálculo del panel: ${error?.message || 'error desconocido'}.`;
      errorBanner.classList.remove('hidden');
    }
  }

  function showView(view, updateTitle = true) {
    appState.view = view;
    $$('.nav-item').forEach((button) => {
      const active = button.dataset.view === view;
      button.classList.toggle('active', active);
      if (active) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    $$('.view').forEach((section) => section.classList.toggle('active', section.id === `view-${view}`));
    const names = {
      dashboard: ['PANEL DEL CAZADOR', 'Tu progreso, de un vistazo'],
      online: ['RANGO DE CAZADOR', 'Loc Lac online'],
      village: ['PROGRESO DE HISTORIA', 'Aldea de Moga'],
      quests: ['CATÁLOGO DE MISIONES', 'Explorar misiones'],
      hunts: ['OBJETIVOS COMPLETADOS', 'Monstruos'],
      materials: ['BAÚL DE OBJETOS', 'Materiales'],
      save: ['DIAGNÓSTICO DE PARTIDA', 'Inspector de save'],
      sets: ['PLANIFICADOR DE EQUIPO', 'Armar set'],
    };
    if (updateTitle && names[view]) {
      $('#crumb').textContent = names[view][0];
      $('#pageTitle').textContent = names[view][1];
    }
  }

  const questGoals = [...new Set(DATA.quests.map((quest) => quest.goal).filter(Boolean))]
    .sort((a, b) => (QUEST_GOAL_LABELS[a] || a).localeCompare(QUEST_GOAL_LABELS[b] || b));
  $('#questGoal').insertAdjacentHTML('beforeend', questGoals.map((goal) => `<option value="${escapeHtml(goal)}">${escapeHtml(QUEST_GOAL_LABELS[goal] || goal)}</option>`).join(''));
  const updateQuestFilters = () => {
    appState.questSearch = $('#questSearch').value;
    appState.questRegion = $('#questRegion').value;
    appState.questRank = $('#questRank').value;
    appState.questGoal = $('#questGoal').value;
    appState.questProgression = $('#questProgression').value;
    appState.questStatus = $('#questStatus').value;
    const profile = currentProfile();
    if (profile) renderQuestCatalog(profile);
  };
  $('#questSearch').addEventListener('input', updateQuestFilters);
  $('#questFilters').addEventListener('change', updateQuestFilters);
  $('#resetQuestFilters').addEventListener('click', () => {
    appState.questSearch = '';
    appState.questRegion = 'all';
    appState.questRank = 'all';
    appState.questGoal = 'all';
    appState.questProgression = 'all';
    appState.questStatus = 'all';
    $('#questSearch').value = '';
    $('#questRegion').value = 'all';
    $('#questRank').value = 'all';
    $('#questGoal').value = 'all';
    $('#questProgression').value = 'all';
    $('#questStatus').value = 'all';
    const profile = currentProfile();
    if (profile) renderQuestCatalog(profile);
  });

  $('#saveFiles').addEventListener('change', (event) => safelyLoadSaves(event.target.files));
  window.mh3Desktop?.onOpenSaveDialog(async () => {
    try {
      const result = await window.mh3Desktop.openSaveFiles();
      if (result.canceled) return;
      if (result.error) notify(result.error);
      else if (result.files?.length) await safelyLoadSaves(result.files);
      else notify('Selecciona archivos llamados data00 a data05.');
    } catch (error) {
      notify(`No se pudo abrir el selector de partida: ${error?.message || 'error desconocido'}`);
    }
  });
  const chooseSaveFolder = async () => {
    let result;
    try {
      result = await window.mh3Desktop?.openSaveFolder();
    } catch (error) {
      notify(`No se pudo buscar la partida: ${error?.message || 'error desconocido'}`);
      return;
    }
    if (!result || result.canceled) return;
    if (result.error) {
      notify(result.error);
      return;
    }
    if (!result.files?.length && !result.candidates?.length) {
      notify(result.scanLimited
        ? `La búsqueda alcanzó su límite tras revisar ${formatNumber(result.scannedDirectories || 0)} carpetas y no encontró archivos. Selecciona directamente la carpeta nocopy para buscar en una ruta más pequeña.`
        : `Revisé ${formatNumber(result.scannedDirectories || 0)} carpetas y no encontré archivos data00 a data05. Elige saves, la carpeta del juego o la carpeta nocopy.`);
      return;
    }
    if (result.candidates?.length) {
      const selectedIndex = await selectSaveCandidate(result.candidates, result.scanLimited, result.scannedDirectories);
      if (selectedIndex == null) return;
      try {
        result = await window.mh3Desktop.chooseSaveCandidate(selectedIndex);
      } catch (error) {
        notify(`No se pudo abrir la carpeta seleccionada: ${error?.message || 'error desconocido'}`);
        return;
      }
      if (result.error) {
        notify(result.error);
        return;
      }
    }
    await safelyLoadSaves(result.files || []);
  };
  document.querySelectorAll('[data-open-save-folder]').forEach((button) => button.addEventListener('click', chooseSaveFolder));
  window.mh3Desktop?.onOpenSaveFolder(chooseSaveFolder);
  $('#profileSelect').addEventListener('change', (event) => { appState.selected = Number(event.target.value); renderApp(); });
  $$('.nav-item').forEach((button) => button.addEventListener('click', () => showView(button.dataset.view)));
  document.addEventListener('click', (event) => {
    const go = event.target.closest('[data-goto]');
    if (go) showView(go.dataset.goto);
    const changeGoal = event.target.closest('[data-change-weapon-goal]');
    const removeGoal = event.target.closest('[data-remove-weapon-goal]');
    const profile = currentProfile();
    if (!profile) return;
    if (changeGoal) {
      const goal = appState.weaponShoppingList[Number(changeGoal.dataset.changeWeaponGoal)];
      if (!goal) return;
      const nextCopies = goal.copies + Number(changeGoal.dataset.delta);
      if (nextCopies > 99) {
        notify('La lista admite hasta 99 copias por objetivo.');
        return;
      }
      goal.copies = nextCopies;
      if (goal.copies <= 0) appState.weaponShoppingList.splice(Number(changeGoal.dataset.changeWeaponGoal), 1);
      persistWeaponShoppingList();
      renderWeaponShoppingList(profile);
    } else if (removeGoal) {
      appState.weaponShoppingList.splice(Number(removeGoal.dataset.removeWeaponGoal), 1);
      persistWeaponShoppingList();
      renderWeaponShoppingList(profile);
    } else if (event.target.closest('[data-clear-weapon-goals]')) {
      appState.weaponShoppingList = [];
      persistWeaponShoppingList();
      renderWeaponShoppingList(profile);
    }
  });
  $('#monsterSearch').addEventListener('input', (event) => { appState.monsterSearch = event.target.value; const profile = currentProfile(); if (profile) renderHunts(profile); });
  $('#itemSearch').addEventListener('input', (event) => { appState.itemSearch = event.target.value; const profile = currentProfile(); if (profile) renderMaterials(profile); });
  $('#weaponClass').addEventListener('change', (event) => {
    appState.weaponClass = event.target.value;
    appState.weaponTarget = '';
    appState.weaponStart = '';
    appState.weaponRoute = 0;
    const profile = currentProfile();
    if (profile) renderWeaponPlanner(profile);
  });
  $('#weaponTarget').addEventListener('change', (event) => {
    appState.weaponTarget = event.target.value;
    appState.weaponStart = '';
    appState.weaponRoute = 0;
    const profile = currentProfile();
    if (profile) renderWeaponPlanner(profile);
  });
  $('#weaponStart').addEventListener('change', (event) => {
    appState.weaponStart = event.target.value;
    appState.weaponRoute = 0;
    const profile = currentProfile();
    if (profile) renderWeaponPlanner(profile);
  });
  $('#weaponRoute').addEventListener('change', (event) => {
    appState.weaponRoute = Number(event.target.value) || 0;
    const profile = currentProfile();
    if (profile) renderWeaponPlanner(profile);
  });
  $('#villageManual').addEventListener('change', (event) => {
    const control = event.target.closest('[data-manual]');
    if (control) setManual(control.dataset.manual, control.checked);
  });
  $$('.style-button').forEach((button) => button.addEventListener('click', () => {
    appState.armorStyle = button.dataset.style;
    $$('.style-button').forEach((item) => item.classList.toggle('active', item === button));
    appState.set = {};
    appState.decorations = {};
    renderSetBuilder();
  }));
  $('#clearSet').addEventListener('click', () => { appState.set = {}; appState.decorations = {}; renderSetBuilder(); });
})();
