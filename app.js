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
  const PROGRESS_SNAPSHOT_STORAGE_KEY = 'mh3-progress-analyzer.progress-snapshots.v1';
  const SET_PRESET_STORAGE_KEY = 'mh3-progress-analyzer.saved-sets.v1';
  const MAX_PROGRESS_SNAPSHOTS_PER_PROFILE = 12;
  const MAX_PROGRESS_SNAPSHOTS_TOTAL = 60;
  const MAX_SAVED_SET_PRESETS = 20;
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
  const SUBQUEST_GOAL_LABELS = {
    anthill: 'Destruir hormigueros', break: 'Romper una parte', eggs: 'Entregar huevos',
    fish: 'Pescar al objetivo', gathering: 'Recolección', hunt: 'Cazar',
    light: 'Objetivo especial (light)', pitfall: 'Usar trampa escollo',
    sever: 'Cortar la cola', slay: 'Eliminar', sonic: 'Afectar con bomba sónica',
    stun: 'Aturdir',
  };
  const QUEST_TYPE_LABELS = {
    gather: 'Recolección', hunt: 'Cacería', capture: 'Captura', escort: 'Escolta', slay: 'Eliminación',
    multihunt: 'Cacería múltiple', harvest: 'Cosecha', repel: 'Repeler',
  };
  const QUEST_REGION_LABELS = { Village: 'Aldea de Moga', City: 'Loc Lac' };
  const QUEST_RANK_LABELS = { Low: 'Bajo', High: 'Alto' };
  const MONSTER_TYPE_LABELS = {
    'bird wyvern': 'Ave wyvern', 'brute wyvern': 'Wyvern bruto', 'elder dragon': 'Dragón anciano',
    fish: 'Pez', 'flying wyvern': 'Wyvern volador', herbivore: 'Herbívoro', leviathan: 'Leviatán',
    lynian: 'Lynian', neopteron: 'Neopterón', 'piscine wyvern': 'Wyvern piscino',
  };
  const STATUS_LABELS = { poison: 'Veneno', paralysis: 'Parálisis', sleep: 'Sueño', stun: 'Aturdimiento', exhaust: 'Cansancio' };

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
  const appState = { profiles: [], files: [], selected: 0, view: 'dashboard', monsterSearch: '', gatheringSearch: '', gatheringMap: 'all', gatheringArea: 'all', gatheringRank: 'all', gatheringType: 'all', itemSearch: '', questSearch: '', questRegion: 'all', questRank: 'all', questLocation: 'all', questGoal: 'all', questProgression: 'all', questStatus: 'all', materialSourceSearch: '', materialSourceRank: 'all', materialSourceItemId: null, armorStyle: 'blade', set: {}, decorations: {}, weaponClass: WEAPON_CLASSES[0] || '', weaponTarget: '', weaponStart: '', weaponRoute: 0, weaponShoppingList: loadWeaponShoppingList(), progressSnapshots: [], historyBaselineId: '', savedSetPresets: [] };
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

  function validProgressSnapshot(snapshot) {
    return snapshot?.version === 1
      && typeof snapshot.id === 'string' && snapshot.id.length <= 80
      && typeof snapshot.label === 'string' && snapshot.label.length <= 64
      && typeof snapshot.capturedAt === 'string' && Number.isFinite(Date.parse(snapshot.capturedAt))
      && typeof snapshot.sourceId === 'string' && snapshot.sourceId.length <= 128
      && /^data0[0-5]$/i.test(snapshot.fileName)
      && Number.isInteger(snapshot.slot) && snapshot.slot >= 0 && snapshot.slot < 3
      && Number.isInteger(snapshot.characterId) && snapshot.characterId >= 0 && snapshot.characterId <= 0xffffffff
      && Number.isInteger(snapshot.rank) && snapshot.rank >= 0 && snapshot.rank <= 0xffff
      && Number.isInteger(snapshot.points) && snapshot.points >= 0 && snapshot.points <= 0xffffffff
      && Number.isInteger(snapshot.zenny) && snapshot.zenny >= -0x80000000 && snapshot.zenny <= 0x7fffffff
      && Array.isArray(snapshot.completed) && snapshot.completed.length <= 512
      && snapshot.completed.every((id) => Number.isInteger(id) && id >= 0 && id <= 0xffff)
      && Array.isArray(snapshot.items) && snapshot.items.length <= ITEM_BOX_SLOTS
      && snapshot.items.every((entry) => Array.isArray(entry) && entry.length === 2
        && Number.isInteger(entry[0]) && entry[0] >= 0 && entry[0] <= 0xffff
        && Number.isInteger(entry[1]) && entry[1] > 0 && entry[1] <= ITEM_BOX_SLOTS * 0x7fff);
  }

  function persistProgressSnapshots(snapshots) {
    try {
      localStorage.setItem(PROGRESS_SNAPSHOT_STORAGE_KEY, JSON.stringify(snapshots));
      return true;
    } catch (error) {
      console.warn('No se pudo guardar el historial local de progreso', error);
      return false;
    }
  }

  function loadProgressSnapshots() {
    try {
      const parsed = JSON.parse(safeStorageGet(PROGRESS_SNAPSHOT_STORAGE_KEY) || '[]');
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(validProgressSnapshot)
        .sort((a, b) => Date.parse(b.capturedAt) - Date.parse(a.capturedAt))
        .slice(0, MAX_PROGRESS_SNAPSHOTS_TOTAL);
    } catch (error) {
      console.warn('No se pudo recuperar el historial local de progreso', error);
      return [];
    }
  }

  appState.progressSnapshots = loadProgressSnapshots();

  function persistSavedSetPresets(presets) {
    try {
      localStorage.setItem(SET_PRESET_STORAGE_KEY, JSON.stringify(presets));
      return true;
    } catch (error) {
      console.warn('No se pudieron guardar los sets locales', error);
      return false;
    }
  }

  function loadSavedSetPresets() {
    try {
      const parsed = JSON.parse(safeStorageGet(SET_PRESET_STORAGE_KEY) || '[]');
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((preset) => preset?.version === 1
        && typeof preset.id === 'string' && preset.id.length <= 80
        && typeof preset.name === 'string' && preset.name.length > 0 && preset.name.length <= 48
        && typeof preset.code === 'string' && preset.code.length <= 16000
        && typeof preset.savedAt === 'string' && Number.isFinite(Date.parse(preset.savedAt)))
        .slice(0, MAX_SAVED_SET_PRESETS);
    } catch (error) {
      console.warn('No se pudieron recuperar los sets locales', error);
      return [];
    }
  }

  appState.savedSetPresets = loadSavedSetPresets();

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
        sourceId: file.sourceId || (file.webkitRelativePath ? file.webkitRelativePath.replace(/[\\/][^\\/]*$/, '') : ''),
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

  function fandomFileUrl(fileName) {
    return `https://monsterhunter.fandom.com/wiki/Special:FilePath/${encodeURIComponent(fileName)}`;
  }

  const ARMOR_ART_ALIASES = {
    'Great Jaggi': ['Jaggie'], 'Great Baggi': ['DosBaggi'], Deviljho: ['Ibirujo'],
    'Royal Ludroth': ['Roarudorosu'], Gigginox: ['Giginebura'], Barioth: ['Beliolos'],
    Rhenoplos: ['Rinopros'], Bnahabra: ['Bunaha'], 'Jhen Mohran': ['Moran'],
    Leather: ['LeatherArmor'], Chain: ['ChainArmor'], Steel: ['MH3-SteelArmor'],
  };

  function armorImageCandidates(family, style) {
    const aliases = [...new Set([family, ...(ARMOR_ART_ALIASES[family] || [])])];
    const styleNames = style === 'Blademaster' ? ['Blademaster', 'Blade'] : ['Gunner'];
    const fileNames = [`MH3-${family} Armor (${style}) Render.png`];
    for (const alias of aliases) {
      for (const styleName of styleNames) {
        fileNames.push(`${alias}-${styleName}.png`, `MH3-${alias}-${styleName}.png`);
      }
    }
    if (family === 'Leather') fileNames.push('LeatherArmor.png', 'LeatherPants.png');
    if (family === 'Chain') fileNames.push('ChainArmor.png');
    return [...new Set(fileNames)].map(fandomFileUrl);
  }

  function initials(label) {
    return String(label || 'MH3').split(/\s+/).slice(0, 2).map((word) => word[0] || '').join('').toLocaleUpperCase('en');
  }

  function bindRemoteImages(root) {
    root.querySelectorAll('img[data-image-candidates]').forEach((image) => {
      let candidates = [];
      try { candidates = JSON.parse(image.dataset.imageCandidates); } catch { candidates = []; }
      let candidateIndex = 0;
      image.addEventListener('error', () => {
        candidateIndex += 1;
        if (candidateIndex < candidates.length) image.src = candidates[candidateIndex];
        else image.classList.add('image-unavailable');
      });
      if (candidates.length > 0) image.src = candidates[0];
    });
  }

  function monsterImageMarkup(monster) {
    const candidates = [fandomFileUrl(`MH3-${monster.name} Icon.png`), fandomFileUrl(`MH3-${monster.name} Icon 001.png`)];
    return `<span class="monster-portrait" aria-hidden="true"><span class="monster-portrait-fallback">${escapeHtml(initials(monster.name))}</span><img loading="lazy" data-image-candidates="${escapeHtml(JSON.stringify(candidates))}" alt=""></span>`;
  }

  function renderHunts(profile) {
    const progress = new Map(monsterProgress(profile).map((monster) => [monster.id, monster.count]));
    const query = appState.monsterSearch.trim().toLocaleLowerCase('es');
    const allMonsters = [...DATA.monsters].sort((a, b) => a.name.localeCompare(b.name));
    const filtered = allMonsters.filter((monster) => !query
      || `${monster.name} ${monster.type || ''}`.toLocaleLowerCase('es').includes(query));
    const tracked = filtered.filter((monster) => progress.has(monster.id)).length;
    $('#monsterCount').textContent = `${filtered.length} de ${allMonsters.length} especies · ${tracked} con objetivos registrados como completados`;
    const percent = (value) => `${Math.round(Number(value) <= 1 ? Number(value) * 100 : Number(value))}%`;
    const damageTypes = [['cut', 'Corte'], ['impact', 'Impacto'], ['gun', 'Disparo'], ['fire', 'Fuego'], ['water', 'Agua'], ['thunder', 'Trueno'], ['ice', 'Hielo'], ['dragon', 'Dragón']];
    const cards = filtered.map((monster) => {
      const states = monster.monsterStates || [];
      const hitzoneMarkup = states.length ? states.map((state) => `<div class="hitzone-state"><strong>${escapeHtml(state.name)}</strong><div class="table-wrap hitzone-table-wrap"><table><thead><tr><th>Zona</th>${damageTypes.map(([, label]) => `<th>${label}</th>`).join('')}</tr></thead><tbody>${(state.hitzones || []).map((zone) => `<tr><td>${escapeHtml(zone.name)}</td>${damageTypes.map(([key]) => `<td>${zone.values?.[key] == null ? '—' : percent(zone.values[key])}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`).join('') : '<div class="hitzone-empty">El catálogo no trae zonas de daño para esta especie.</div>';
      const statusRows = Object.entries(monster.status || {}).map(([key, status]) => `<div class="status-chip"><strong>${escapeHtml(STATUS_LABELS[key] || key)}</strong><span>Inicio ${status.tolerance?.initial == null ? '—' : formatNumber(status.tolerance.initial)} · máxima ${status.tolerance?.max == null ? '—' : formatNumber(status.tolerance.max)}${status.duration ? ` · ${formatNumber(status.duration)} s` : ''}</span></div>`).join('');
      const count = progress.get(monster.id) || 0;
      return `<article class="monster-card"><div class="monster-card-header"><div class="monster-identity">${monsterImageMarkup(monster)}<div><strong>${escapeHtml(monster.name)}</strong><small>${escapeHtml(MONSTER_TYPE_LABELS[monster.type] || monster.type || 'Especie')} · ${count ? `${count} misión${count === 1 ? '' : 'es'} completada${count === 1 ? '' : 's'} con esta especie como objetivo` : 'Sin objetivo completado registrado'} · ${hex(monster.id)}</small></div></div><span class="monster-count">${formatNumber(count)}</span></div><details class="monster-details"><summary>Preparación: hitzones y estados</summary><div class="monster-guide-body"><p class="monster-guide-legend">Porcentajes catalogados por zona; números más altos representan mayor vulnerabilidad según la tabla.</p>${hitzoneMarkup}${statusRows ? `<h4>Tolerancia a estados</h4><div class="status-grid">${statusRows}</div>` : '<div class="hitzone-empty">El catálogo no incluye tolerancias de estado para esta especie.</div>'}</div></details></article>`;
    }).join('');
    $('#monsterGrid').innerHTML = cards || '<div class="table-empty">No hay especies que coincidan con la búsqueda.</div>';
    bindRemoteImages($('#monsterGrid'));
  }

  function gatheringRankLabel(rank) {
    return rank === 'Low' ? 'Rango bajo' : rank === 'High' ? 'Rango alto' : 'Libre · Bosque de Moga';
  }

  function gatheringQuantityLabel(quantity) {
    if (quantity?.infinite) return 'Punto renovable';
    if (Number.isFinite(quantity?.min) && Number.isFinite(quantity?.max)) {
      return quantity.min === quantity.max ? `×${quantity.min}` : `×${quantity.min}–${quantity.max}`;
    }
    return '';
  }

  function updateGatheringAreaOptions() {
    const mapId = $('#gatheringMap').value;
    const maps = DATA.gathering?.maps || [];
    const areas = [...new Set(maps.filter((map) => mapId === 'all' || map.id === mapId)
      .flatMap((map) => map.nodes.map((node) => node.area)))].sort((a, b) => a.localeCompare(b, 'es'));
    const selected = areas.includes(appState.gatheringArea) ? appState.gatheringArea : 'all';
    appState.gatheringArea = selected;
    $('#gatheringArea').innerHTML = '<option value="all">Todas las áreas</option>'
      + areas.map((area) => `<option value="${escapeHtml(area)}" ${area === selected ? 'selected' : ''}>${escapeHtml(area)}</option>`).join('');
  }

  function renderGatheringGuide() {
    const catalog = DATA.gathering;
    const maps = catalog?.maps || [];
    const canOpenMaterialSources = Boolean(currentProfile());
    if (!maps.length) {
      $('#gatheringCatalog').innerHTML = '<div class="source-empty">No se incluyó el catálogo de puntos de recolección en esta compilación.</div>';
      $('#gatheringCount').textContent = 'Catálogo no disponible';
      return;
    }
    const query = appState.gatheringSearch.trim().toLocaleLowerCase('es');
    const chosenMaps = maps.filter((map) => appState.gatheringMap === 'all' || map.id === appState.gatheringMap);
    let visibleNodes = 0;
    let visibleResults = 0;
    const mapMarkup = chosenMaps.map((map) => {
      const nodes = map.nodes.filter((node) => {
        if (appState.gatheringRank !== 'all' && node.rank !== appState.gatheringRank) return false;
        if (appState.gatheringArea !== 'all' && node.area !== appState.gatheringArea) return false;
        if (appState.gatheringType !== 'all' && node.type !== appState.gatheringType) return false;
        if (!query) return true;
        return `${map.name} ${map.sourceName} ${node.area} ${node.rank} ${node.type} ${node.items.map((item) => item.name).join(' ')}`
          .toLocaleLowerCase('es').includes(query);
      });
      if (!nodes.length) return '';
      visibleNodes += nodes.length;
      visibleResults += nodes.reduce((total, node) => total + node.items.length, 0);
      const groups = new Map();
      for (const node of nodes) {
        const key = `${node.rank}|${node.area}`;
        if (!groups.has(key)) groups.set(key, { rank: node.rank, area: node.area, nodes: [] });
        groups.get(key).nodes.push(node);
      }
      const areaMarkup = [...groups.values()].map((group) => `<section class="gathering-area-group"><div class="gathering-area-heading"><h4>${escapeHtml(group.area)}</h4><span>${escapeHtml(gatheringRankLabel(group.rank))} · ${group.nodes.length} punto${group.nodes.length === 1 ? '' : 's'}</span></div><div class="gathering-node-grid">${group.nodes.map((node) => {
        const quantity = gatheringQuantityLabel(node.quantity);
        const items = node.items.map((item) => item.itemId != null && canOpenMaterialSources
          ? `<button type="button" class="gathering-item" data-material-source-pick="${Number(item.itemId)}"><span>${escapeHtml(item.name)}</span><small>Ver fuentes</small></button>`
          : `<span class="gathering-item gathering-item-static">${escapeHtml(item.name)}</span>`).join('');
        return `<article class="gathering-node"><div class="gathering-node-heading"><strong>${escapeHtml(node.type)}${node.pointCount > 1 ? ` <small>×${formatNumber(node.pointCount)} puntos</small>` : ''}</strong>${quantity ? `<span>${escapeHtml(quantity)}</span>` : ''}</div><div class="gathering-item-list">${items || '<span class="gathering-empty-result">La fuente no enumera materiales para este punto.</span>'}</div>${node.note ? `<p class="gathering-node-note">${escapeHtml(node.note)}</p>` : ''}</article>`;
      }).join('')}</div></section>`).join('');
      return `<article class="gathering-map panel"><div class="gathering-map-heading"><div><h3>${escapeHtml(map.name)}</h3><span>${map.kind === 'free-roam' ? 'Exploración libre' : 'Mapa de misión'} · ${nodes.length} puntos visibles</span></div><button type="button" class="source-link-button" data-open-external="${escapeHtml(map.sourceUrl)}">Ver fuente</button></div>${areaMarkup}</article>`;
    }).join('');
    $('#gatheringCount').textContent = `${formatNumber(visibleNodes)} puntos · ${formatNumber(visibleResults)} resultados de material mostrados completos`;
    $('#gatheringCatalog').innerHTML = mapMarkup || '<div class="source-empty">No hay puntos con esos filtros. Prueba otro mapa, área, rango o búsqueda.</div>';
  }

  function questTargetSummary(quest) {
    const isGathering = quest.goal === 'gathering' || ['gather', 'harvest'].includes(quest.type);
    const targetEntries = Array.isArray(quest.targets)
      ? quest.targets.map((id) => [String(id), 1])
      : Object.entries(quest.targets || {});
    return targetEntries.map(([rawId, rawAmount]) => {
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
      if (appState.questLocation !== 'all' && quest.location !== appState.questLocation) return false;
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
        quest.location,
        QUEST_TYPE_LABELS[quest.type] || quest.type,
        quest.type,
        QUEST_GOAL_LABELS[quest.goal] || quest.goal,
        quest.goal,
        hex(quest.id),
        [...progressionRoles].map((role) => QUEST_PROGRESSION_LABELS[role]),
        questTargetSummary(quest),
        ...(quest.secondaryRewards || []).map((reward) => ITEM_NAMES.get(reward.itemId)),
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
      const economy = [
        quest.location ? `Zona: ${quest.location}` : '',
        quest.contract != null ? `Contrato: ${formatNumber(quest.contract)} z` : '',
        quest.reward != null ? `Pago: ${formatNumber(quest.reward)} z` : '',
        quest.hrp != null ? `${formatNumber(quest.hrp)} HRP` : '',
      ].filter(Boolean).join(' · ');
      const rewards = [...(quest.secondaryRewards || [])].sort((a, b) => b.chance - a.chance || (a.itemId || 0) - (b.itemId || 0));
      const rewardMarkup = rewards.length
        ? '<div class="quest-reward-detail"><small>Tabla secundaria · ' + formatNumber(rewards.length) + ' resultados completos</small><div class="quest-reward-items" role="list">'
          + rewards.map((reward) => {
            const itemName = ITEM_NAMES.get(reward.itemId) || 'Objeto ' + hex(reward.itemId);
            return '<button type="button" class="quest-reward-item" data-material-source-pick="' + Number(reward.itemId) + '" title="Buscar fuentes de ' + escapeHtml(itemName) + '"><strong>' + escapeHtml(itemName) + '</strong><span>×' + formatNumber(reward.count || 1) + ' · ' + formatNumber(reward.chance) + '%</span></button>';
          }).join('')
          + '</div></div>'
        : '';
      const subquestMarkup = (quest.subquests || []).length
        ? '<div class="quest-subquests-detail"><small>Objetivos secundarios y recompensas</small>' + quest.subquests.map((subquest, index) => {
          const details = [
            SUBQUEST_GOAL_LABELS[subquest.goal] || 'Objetivo especial',
            subquest.targets != null ? questTargetSummary({ goal: subquest.goal, targets: subquest.targets }) : '',
            subquest.count != null ? 'Cantidad: ' + formatNumber(subquest.count) : '',
            subquest.reward != null ? 'Pago ' + formatNumber(subquest.reward) + ' z' : '',
            subquest.hrp != null ? formatNumber(subquest.hrp) + ' HRP' : '',
          ].filter(Boolean).join(' · ');
          return '<div class="quest-subquest-row"><strong>Objetivo secundario ' + formatNumber(index + 1) + '</strong><span>' + escapeHtml(details) + '</span></div>';
        }).join('') + '</div>'
        : '';
      return `<article class="quest-catalog-card"><div class="quest-catalog-top"><div><h3>${escapeHtml(quest.name)}</h3><div class="quest-catalog-tags"><span>${escapeHtml(QUEST_REGION_LABELS[quest.region] || quest.region)}</span><span>Rango ${escapeHtml(QUEST_RANK_LABELS[quest.rank] || quest.rank)}</span>${progressionTags}</div></div><span class="quest-save-status ${status.className}">${status.label}</span></div><div class="quest-catalog-details"><div><small>Tipo</small><strong>${escapeHtml(QUEST_TYPE_LABELS[quest.type] || quest.type || 'Sin tipo')}</strong></div><div><small>Objetivo registrado</small><strong>${escapeHtml(QUEST_GOAL_LABELS[quest.goal] || quest.goal || 'Sin objetivo')}</strong></div><div class="quest-target-detail"><small>Objetivos</small><strong>${escapeHtml(target)}</strong></div>${economy ? `<div class="quest-economy-detail"><small>Datos de misión</small><strong>${escapeHtml(economy)}</strong></div>` : ''}${rewardMarkup}${subquestMarkup}</div><div class="quest-catalog-id">ID ${hex(quest.id)}${QUEST_INDEX.has(quest.id) ? ' · bandera compatible con el save' : ' · sin bandera compatible conocida'}</div></article>`;
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
    $('#itemRows').innerHTML = filtered.length ? filtered.map((item) => `<tr><td>${escapeHtml(item.name)}</td><td class="numeric">${formatNumber(item.count)}</td><td><button type="button" class="material-guide-link" data-material-source-pick="${item.id}">Ver fuentes</button></td></tr>`).join('') : `<tr><td class="table-empty" colspan="3">${query ? 'No encontré objetos con esa búsqueda.' : 'El baúl no tiene objetos con cantidad positiva.'}</td></tr>`;
    $('#requestPanel').innerHTML = REQUESTS.map((request) => `<div class="request-block"><h3>${escapeHtml(request.title)}</h3><p>${escapeHtml(request.note)} Cantidades leídas del baúl; si están en la bolsa del cazador no se cuentan.</p><div class="request-items">${request.items.map(([name, required]) => {
      const item = findItem(name);
      const count = item ? profile.itemCounts.get(item.id) || 0 : 0;
      return `<div class="request-item ${count >= required ? 'enough' : ''}"><strong>${escapeHtml(item?.name || name)}</strong><span>${formatNumber(count)} / ${required} ${count >= required ? '· alcanza' : '· faltan ' + formatNumber(required - count)}</span></div>`;
    }).join('')}</div></div>`).join('<div class="request-separator"></div>');
    renderMaterialSources(profile);
    renderWeaponPlanner(profile);
    renderWeaponShoppingList(profile);
  }

  function itemResultsForRank(results, rankKey) {
    const rank = rankKey === 'low' ? 'Low' : 'High';
    return (results || []).filter((result) => result.itemId === appState.materialSourceItemId
      && (appState.materialSourceRank === 'all' || rank === appState.materialSourceRank));
  }

  function weaponRecipeSourcesForItem(itemId) {
    const weapons = DATA.weapons || [];
    const weaponById = new Map(weapons.map((weapon) => [weapon.id, weapon]));
    const sources = [];
    for (const weapon of weapons) {
      for (const material of weapon.create || []) {
        if (material.itemId === itemId) sources.push({ weapon, action: 'Forja directa', amount: material.amount });
      }
      const upgrade = weapon.upgradesFrom;
      if (!upgrade) continue;
      const origins = (upgrade.weaponId || []).map((id) => weaponById.get(id)?.name).filter(Boolean);
      for (const material of upgrade.materials || []) {
        if (material.itemId === itemId) sources.push({ weapon, action: 'Mejora', origin: origins.join(' / '), amount: material.amount });
      }
    }
    return sources.sort((a, b) => a.weapon.type.localeCompare(b.weapon.type)
      || a.weapon.name.localeCompare(b.weapon.name) || a.action.localeCompare(b.action));
  }

  function renderWeaponRecipeSources(itemId) {
    const sources = weaponRecipeSourcesForItem(itemId);
    const rows = sources.length ? sources.map((source) =>
      '<article class="weapon-recipe-source-row"><div><strong>'
        + escapeHtml(WEAPON_CLASS_NAMES[source.weapon.type] || source.weapon.type) + ' · ' + escapeHtml(source.weapon.name)
        + '</strong><small>' + escapeHtml(source.action)
        + (source.origin ? ' · desde ' + escapeHtml(source.origin) : '')
        + '</small></div><b>×' + formatNumber(source.amount) + '</b></article>'
    ).join('')
      : '<div class="source-empty">Este material no aparece en las recetas de armas incluidas.</div>';
    return '<div class="source-result-section"><h5>Se usa para forjar o mejorar armas · '
      + formatNumber(sources.length) + ' recetas</h5><p>Recetas registradas en el catálogo local. No incluye armaduras.</p>'
      + '<div class="source-quest-list">' + rows + '</div></div>';
  }

  function renderGatheringMaterialSources(itemId) {
    const maps = DATA.gathering?.maps || [];
    const rows = [];
    for (const map of maps) {
      for (const node of map.nodes) {
        if (appState.materialSourceRank !== 'all' && node.rank !== appState.materialSourceRank && node.rank !== 'Free roam') continue;
        if (node.items.some((item) => item.itemId === itemId)) rows.push({ map, node });
      }
    }
    if (!rows.length) return '<div class="source-empty">Este material no figura en los puntos de recolección catalogados.</div>';
    return `<div class="source-quest-list">${rows.map(({ map, node }) => {
      const quantity = gatheringQuantityLabel(node.quantity);
      return `<article class="source-quest-row"><div><strong>${escapeHtml(map.name)} · ${escapeHtml(node.area)}</strong><small>${escapeHtml(gatheringRankLabel(node.rank))} · ${escapeHtml(node.type)}${node.pointCount > 1 ? ` · ${formatNumber(node.pointCount)} puntos` : ''}${quantity ? ` · ${escapeHtml(quantity)}` : ''}</small></div><button type="button" class="material-guide-link" data-open-gathering-search="${Number(itemId)}">Abrir guía</button></article>`;
    }).join('')}</div>`;
  }

  function collectMaterialSources(profile) {
    const sourcesByMonster = new Map();
    const rankPairs = appState.materialSourceRank === 'all'
      ? [['Low', 'low'], ['High', 'high']]
      : [[appState.materialSourceRank, appState.materialSourceRank === 'High' ? 'high' : 'low']];
    const addMonsterSource = (monster, rankKey, method, detail, result) => {
      const rank = rankKey === 'low' ? 'Low' : 'High';
      const groupKey = `${monster.id}:${rank}`;
      if (!sourcesByMonster.has(groupKey)) sourcesByMonster.set(groupKey, { monster, rank, rows: [] });
      sourcesByMonster.get(groupKey).rows.push({ method, detail, chance: result.chance, count: result.count });
    };
    const addDropTable = (monster, table, rankKey, method, detail) => {
      for (const result of itemResultsForRank(table?.[rankKey], rankKey)) addMonsterSource(monster, rankKey, method, detail, result);
    };

    for (const monster of DATA.monsterDrops || []) {
      for (const [, rankKey] of rankPairs) {
        for (const zone of monster.carves || []) addDropTable(monster, zone, rankKey, 'Tallado', `${zone.name} · ${zone.count ?? 1} intentos`);
        for (const part of monster.breakables || []) addDropTable(monster, part, rankKey, 'Rotura', part.name);
        addDropTable(monster, monster.capture, rankKey, 'Captura', monster.capture?.health != null ? `Listo para captura: ${monster.capture.health}% de vida` : 'Recompensa de captura');
        addDropTable(monster, monster.shiny, rankKey, 'Brillo', monster.shiny?.action && monster.shiny.action !== 'Something' ? `Acción: ${monster.shiny.action}` : 'Objeto de brillo');
        for (const variant of monster.variants || []) {
          for (const zone of variant.carves || []) addDropTable(monster, zone, rankKey, 'Tallado', `${variant.name} · ${zone.name} · ${zone.count ?? 1} intentos`);
          addDropTable(monster, variant.shiny, rankKey, 'Brillo', `${variant.name} · objeto de brillo`);
        }
      }
    }

    const monsterGroups = [...sourcesByMonster.values()].sort((a, b) => a.monster.name.localeCompare(b.monster.name) || (a.rank === 'Low' ? -1 : 1));
    const monsterIds = new Set(monsterGroups.map((group) => group.monster.id));
    const monsterMarkup = monsterGroups.length ? monsterGroups.map((group) => {
      const rows = group.rows.sort((a, b) => a.method.localeCompare(b.method) || String(a.detail).localeCompare(String(b.detail)) || (b.chance || 0) - (a.chance || 0));
      return `<details class="source-drop-group"><summary><span><strong>${escapeHtml(group.monster.name)}</strong><small>${escapeHtml(MONSTER_TYPE_LABELS[group.monster.type] || group.monster.type || 'Especie')}</small></span><span class="source-rank">${escapeHtml(QUEST_RANK_LABELS[group.rank])} · ${rows.length} resultado${rows.length === 1 ? '' : 's'}</span></summary><div class="source-drop-rows">${rows.map((row) => `<div class="source-drop-row"><strong>${escapeHtml(row.method)}</strong><span>${escapeHtml(row.detail || '')}</span><b>${Number.isFinite(row.chance) ? `${formatNumber(row.chance)}%` : '—'}${row.count > 1 ? ` · ×${formatNumber(row.count)}` : ''}</b></div>`).join('')}</div></details>`;
    }).join('') : '<div class="source-empty">No hay resultados de monstruo para este material en las tablas incluidas.</div>';

    const questSources = [];
    for (const quest of DATA.quests) {
      if (appState.materialSourceRank !== 'all' && quest.rank !== appState.materialSourceRank) continue;
      for (const reward of quest.secondaryRewards || []) {
        if (reward.itemId === appState.materialSourceItemId) questSources.push({ quest, reward, subquest: false });
      }
      for (const [index, subquest] of (quest.subquests || []).entries()) {
        for (const reward of subquest.secondaryRewards || []) {
          if (reward.itemId === appState.materialSourceItemId) questSources.push({ quest, reward, subquest: true, subquestIndex: index + 1 });
        }
      }
    }
    const questMarkup = questSources.length ? `<div class="source-quest-list">${questSources.sort((a, b) => (a.quest.rank === b.quest.rank ? a.quest.name.localeCompare(b.quest.name) : a.quest.rank === 'Low' ? -1 : 1)).map(({ quest, reward, subquest, subquestIndex }) => {
      const status = questSaveStatus(profile, quest);
      return `<article class="source-quest-row"><div><strong>${escapeHtml(quest.name)}${subquest ? ` · objetivo secundario ${subquestIndex}` : ''}</strong><small>${escapeHtml(QUEST_REGION_LABELS[quest.region] || quest.region)} · ${escapeHtml(QUEST_RANK_LABELS[quest.rank] || quest.rank)}${quest.location ? ` · ${escapeHtml(quest.location)}` : ''} · ${escapeHtml(status.label)}</small></div><span>${formatNumber(reward.chance)}% · ×${formatNumber(reward.count)}</span></article>`;
    }).join('')}</div>` : '<div class="source-empty">No hay recompensas secundarias de misión para este material en las tablas incluidas.</div>';

    const objectiveQuests = DATA.quests.filter((quest) => ['hunt', 'capture', 'slay'].includes(quest.goal)
      && Object.keys(quest.targets || {}).some((id) => monsterIds.has(Number(id)))
      && (appState.materialSourceRank === 'all' || quest.rank === appState.materialSourceRank));
    const objectiveMarkup = objectiveQuests.length ? `<div class="source-quest-list">${objectiveQuests.sort((a, b) => (a.rank === b.rank ? a.name.localeCompare(b.name) : a.rank === 'Low' ? -1 : 1)).map((quest) => {
      const targets = Object.entries(quest.targets || {}).filter(([id]) => monsterIds.has(Number(id))).map(([id, count]) => `${escapeHtml(MONSTER_NAMES.get(Number(id)) || `Especie ${id}`)}${count > 1 ? ` ×${formatNumber(count)}` : ''}`).join(', ');
      const status = questSaveStatus(profile, quest);
      return `<article class="source-quest-row"><div><strong>${escapeHtml(quest.name)}</strong><small>${escapeHtml(QUEST_REGION_LABELS[quest.region] || quest.region)} · ${escapeHtml(QUEST_RANK_LABELS[quest.rank] || quest.rank)} · ${escapeHtml(targets)} · ${escapeHtml(status.label)}</small></div><span>${formatNumber(quest.hrp || 0)} HRP</span></article>`;
    }).join('')}</div>` : '<div class="source-empty">No aparecen misiones catalogadas con estos monstruos como objetivo principal.</div>';
    const recipeMarkup = renderWeaponRecipeSources(appState.materialSourceItemId);
    const gatheringMarkup = renderGatheringMaterialSources(appState.materialSourceItemId);
    const itemName = ITEM_NAMES.get(appState.materialSourceItemId) || `Objeto ${hex(appState.materialSourceItemId)}`;
    return `<div class="source-result-heading"><div><h4>${escapeHtml(itemName)}</h4><span>En el baúl: ${formatNumber(profile.itemCounts.get(appState.materialSourceItemId) || 0)}</span></div><button type="button" class="material-guide-link" data-clear-material-source>Limpiar selección</button></div><div class="source-result-section"><h5>Botín de monstruos</h5><p>Porcentaje y cantidad por resultado, según la tabla indicada.</p>${monsterMarkup}</div>${recipeMarkup}<div class="source-result-section"><h5>Recompensas secundarias de misión</h5><p>Se muestran todos los resultados de cada tabla; su chance no garantiza que salga el objeto.</p>${questMarkup}</div><div class="source-result-section"><h5>Recolección por mapa</h5><p>Área y tipo de punto de la guía; no hay coordenadas ni porcentajes por material.</p>${gatheringMarkup}</div>${monsterIds.size ? `<div class="source-result-section"><h5>Misiones con estos monstruos como objetivo</h5><p>Sirve para elegir una misión de caza; no indica que esté desbloqueada.</p>${objectiveMarkup}</div>` : ''}`;
  }

  function renderMaterialSources(profile) {
    const search = appState.materialSourceSearch.trim().toLocaleLowerCase('es');
    const selected = DATA.items.find((item) => item.id === appState.materialSourceItemId);
    let matches;
    if (search) {
      matches = DATA.items.filter((item) => item.name.toLocaleLowerCase('es').includes(search))
        .sort((a, b) => Number(b.name.toLocaleLowerCase('es').startsWith(search)) - Number(a.name.toLocaleLowerCase('es').startsWith(search)) || a.name.localeCompare(b.name))
        .slice(0, 24).map((item) => ({ item, missing: null }));
    } else {
      const needed = new Map();
      for (const goal of appState.weaponShoppingList) {
        for (const requirement of goal.requirements) needed.set(requirement.id, (needed.get(requirement.id) || 0) + requirement.required * goal.copies);
      }
      matches = [...needed.entries()].map(([id, required]) => ({ item: DATA.items.find((entry) => entry.id === id), missing: Math.max(0, required - (profile.itemCounts.get(id) || 0)) }))
        .filter((entry) => entry.item && entry.missing > 0)
        .sort((a, b) => b.missing - a.missing || a.item.name.localeCompare(b.item.name))
        .slice(0, 12);
    }
    const matchMarkup = matches.length ? matches.map(({ item, missing }) => `<button type="button" class="source-item-button ${selected?.id === item.id ? 'selected' : ''}" data-material-source-pick="${item.id}"><strong>${escapeHtml(item.name)}</strong><small>${missing == null ? `En baúl: ${formatNumber(profile.itemCounts.get(item.id) || 0)}` : `Faltan: ${formatNumber(missing)}`}</small></button>`).join('')
      : search ? '<div class="source-empty">No encontré materiales con ese nombre.</div>'
        : '<div class="source-empty">Escribe un nombre o agrega una ruta al plan de armas para ver aquí tus faltantes.</div>';
    $('#materialSourceMatches').innerHTML = matchMarkup;
    $('#materialSourceResults').innerHTML = selected
      ? collectMaterialSources(profile)
      : '<div class="source-empty">Elige un material de los resultados para ver sus fuentes conocidas.</div>';
  }

  function openMaterialSource(itemId) {
    const item = DATA.items.find((entry) => entry.id === Number(itemId));
    const profile = currentProfile();
    if (!item || !profile) return;
    appState.materialSourceItemId = item.id;
    appState.materialSourceSearch = item.name;
    $('#materialSourceSearch').value = item.name;
    showView('materials');
    renderMaterialSources(profile);
    $('#materialSourcePanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
    $('#materialSourceResults').focus({ preventScroll: true });
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
      const profile = currentProfile();
      if (profile) renderMaterialSources(profile);
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
    root.innerHTML = `<section class="weapon-shopping panel"><div class="panel-heading"><div><h3>Lista de materiales para tus armas</h3><div class="panel-subtitle">${formatNumber(goals.reduce((sum, goal) => sum + goal.copies, 0))} copias · ${formatNumber(rows.length)} materiales distintos · cantidades del baúl descontadas una sola vez</div></div><button class="button button-secondary" type="button" data-clear-weapon-goals>Vaciar lista</button></div><div class="weapon-goals">${goalMarkup}</div><div class="weapon-shopping-summary"><span class="tag ${missingUnits === 0 ? 'good' : 'warn'}" role="status" aria-live="polite">${missingUnits === 0 ? 'Tienes todos los materiales' : `Te faltan ${formatNumber(missingUnits)} unidades`}</span><span>El cálculo usa el baúl del cazador seleccionado; no cuenta objetos de la bolsa.</span></div><div class="table-wrap weapon-material-table"><table><thead><tr><th>Material</th><th class="numeric">Total para objetivos</th><th class="numeric">En baúl</th><th class="numeric">Faltan</th></tr></thead><tbody>${rows.map((row) => `<tr><td>${escapeHtml(row.name)} <button type="button" class="material-guide-link" data-material-source-pick="${row.id}">Buscar fuentes</button></td><td class="numeric">${formatNumber(row.required)}</td><td class="numeric">${formatNumber(row.owned)}</td><td class="numeric ${row.missing ? 'number-negative' : 'number-positive'}">${formatNumber(row.missing)}</td></tr>`).join('')}</tbody></table></div><p class="small-note">La lista se guarda en este equipo, separada de la partida. Solo se incluyen recetas de armas del catálogo; los costos de forja de armaduras no están disponibles.</p></section>`;
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

  function snapshotMatchesProfile(snapshot, profile) {
    return snapshot.sourceId === (profile.sourceId || '')
      && snapshot.fileName.toLowerCase() === profile.fileName.toLowerCase()
      && snapshot.slot === profile.slot
      && snapshot.characterId === profile.characterId;
  }

  function snapshotSource(profile) {
    return `${profile.fileName} · registro ${profile.slot + 1} · ID interno ${hex(profile.characterId)}`;
  }

  function snapshotTimestamp(value) {
    return new Intl.DateTimeFormat('es-UY', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  }

  function makeProgressSnapshot(profile, label) {
    const id = globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    return {
      version: 1,
      id,
      label: String(label || '').trim().slice(0, 64) || `Punto RC ${profile.rank}`,
      capturedAt: new Date().toISOString(),
      sourceId: profile.sourceId || '',
      fileName: profile.fileName,
      slot: profile.slot,
      characterId: profile.characterId,
      rank: profile.rank,
      points: profile.points,
      zenny: profile.zenny,
      completed: [...profile.completed].sort((a, b) => a - b),
      items: [...profile.itemCounts.entries()].sort(([a], [b]) => a - b),
    };
  }

  function saveProgressSnapshot() {
    const profile = currentProfile();
    if (!profile) return;
    const snapshot = makeProgressSnapshot(profile, $('#snapshotLabel').value);
    const matching = appState.progressSnapshots.filter((entry) => snapshotMatchesProfile(entry, profile));
    const otherProfiles = appState.progressSnapshots.filter((entry) => !snapshotMatchesProfile(entry, profile));
    const next = [snapshot, ...matching.slice(0, MAX_PROGRESS_SNAPSHOTS_PER_PROFILE - 1), ...otherProfiles]
      .slice(0, MAX_PROGRESS_SNAPSHOTS_TOTAL);
    if (!persistProgressSnapshots(next)) {
      notify('No se pudo guardar el punto de control. Revisa el espacio disponible de la app.');
      return;
    }
    appState.progressSnapshots = next;
    appState.historyBaselineId = matching[0]?.id || '';
    $('#snapshotLabel').value = '';
    renderProgressHistory(profile);
    notify(matching.length ? 'Punto de control guardado; quedó seleccionado el anterior para comparar.' : 'Punto de control guardado en este equipo.');
  }

  function deleteProgressSnapshot(snapshotId) {
    const snapshot = appState.progressSnapshots.find((entry) => entry.id === snapshotId);
    const profile = currentProfile();
    if (!snapshot || !profile || !snapshotMatchesProfile(snapshot, profile)) return;
    const next = appState.progressSnapshots.filter((entry) => entry.id !== snapshotId);
    if (!persistProgressSnapshots(next)) {
      notify('No se pudo borrar el punto de control local.');
      return;
    }
    appState.progressSnapshots = next;
    if (appState.historyBaselineId === snapshotId) appState.historyBaselineId = '';
    renderProgressHistory(profile);
    notify('Punto de control borrado de este equipo.');
  }

  function renderProgressHistory(profile) {
    const snapshots = appState.progressSnapshots
      .filter((snapshot) => snapshotMatchesProfile(snapshot, profile))
      .sort((a, b) => Date.parse(b.capturedAt) - Date.parse(a.capturedAt));
    const baseline = snapshots.find((snapshot) => snapshot.id === appState.historyBaselineId) || snapshots[0] || null;
    appState.historyBaselineId = baseline?.id || '';
    const selectOptions = snapshots.map((snapshot) => `<option value="${escapeHtml(snapshot.id)}" ${snapshot.id === appState.historyBaselineId ? 'selected' : ''}>${escapeHtml(snapshot.label)} · ${escapeHtml(snapshotTimestamp(snapshot.capturedAt))} · RC ${snapshot.rank}</option>`).join('');
    let comparison = '<div class="history-empty">Todavía no hay un punto de control para este cazador. Guarda uno ahora y vuelve a cargar el save después de jugar para comparar los cambios.</div>';

    if (baseline) {
      const oldCompleted = new Set(baseline.completed);
      const newCompleted = profile.completed;
      const addedQuests = [...newCompleted].filter((id) => !oldCompleted.has(id)).sort((a, b) => questTitle(a).localeCompare(questTitle(b)));
      const removedQuests = [...oldCompleted].filter((id) => !newCompleted.has(id)).sort((a, b) => questTitle(a).localeCompare(questTitle(b)));
      const oldItems = new Map(baseline.items);
      const itemIds = new Set([...oldItems.keys(), ...profile.itemCounts.keys()]);
      const changedItems = [...itemIds].map((id) => ({
        id,
        name: ITEM_NAMES.get(id) || `Objeto ${hex(id)}`,
        before: oldItems.get(id) || 0,
        now: profile.itemCounts.get(id) || 0,
      })).map((item) => ({ ...item, delta: item.now - item.before })).filter((item) => item.delta !== 0)
        .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta) || a.name.localeCompare(b.name));
      const deltaLabel = (value) => `${value > 0 ? '+' : ''}${formatNumber(value)}`;
      const stat = (label, value, delta, tone = '') => `<article class="stat-card"><div class="stat-label">${label}</div><div class="stat-value">${value}</div><div class="stat-detail ${tone}">${delta}</div></article>`;
      const questList = (ids, emptyText, tone) => ids.length
        ? `<ul class="history-change-list ${tone}">${ids.map((id) => `<li>${escapeHtml(questTitle(id))}</li>`).join('')}</ul>`
        : `<p class="history-no-changes">${emptyText}</p>`;
      const itemTable = changedItems.length
        ? `<div class="table-wrap history-table-wrap"><table><thead><tr><th>Objeto del baúl</th><th class="numeric">Antes</th><th class="numeric">Ahora</th><th class="numeric">Diferencia neta</th></tr></thead><tbody>${changedItems.map((item) => `<tr><td>${escapeHtml(item.name)} <small>${hex(item.id)}</small></td><td class="numeric">${formatNumber(item.before)}</td><td class="numeric">${formatNumber(item.now)}</td><td class="numeric ${item.delta > 0 ? 'number-positive' : 'number-negative'}">${deltaLabel(item.delta)}</td></tr>`).join('')}</tbody></table></div>`
        : '<div class="history-no-changes">No cambiaron las cantidades registradas en el baúl.</div>';
      comparison = `<div class="history-selected"><label for="historyBaseline">Comparar el save actual con<select id="historyBaseline" ${snapshots.length ? '' : 'disabled'}>${selectOptions}</select></label><span>Guardado: ${escapeHtml(snapshotTimestamp(baseline.capturedAt))}</span></div><div class="history-stats">${stat('RC actual', `RC ${profile.rank}`, `Punto guardado: RC ${baseline.rank} · cambio ${deltaLabel(profile.rank - baseline.rank)}`)}${stat('HRP actual', formatNumber(profile.points), `Punto guardado: ${formatNumber(baseline.points)} · cambio ${deltaLabel(profile.points - baseline.points)}`)}${stat('Zenny actual', formatNumber(profile.zenny), `Punto guardado: ${formatNumber(baseline.zenny)} · cambio ${deltaLabel(profile.zenny - baseline.zenny)}`)}${stat('Misiones nuevas', formatNumber(addedQuests.length), `${formatNumber(removedQuests.length)} dejaron de figurar como completadas`, addedQuests.length ? 'number-positive' : '')}${stat('Tipos de objeto cambiados', formatNumber(changedItems.length), 'Diferencias en el baúl')}</div><div class="history-change-grid"><section><h4>Misiones que ahora figuran completadas</h4>${questList(addedQuests, 'Ninguna misión nueva registrada.', 'history-added')}</section><section><h4>Misiones que ya no figuran completadas</h4>${questList(removedQuests, 'No desaparecieron banderas de misión.', 'history-removed')}</section></div><section class="history-items"><h4>Cambios netos del baúl</h4>${itemTable}</section><p class="small-note">Las diferencias de objetos no indican cómo se obtuvieron o usaron: el guardado puede cambiar por recolección, venta, forja o traslado entre baúl y bolsa. Comparación local basada en el registro cargado actualmente.</p>`;
    }

    $('#historyComparison').innerHTML = `<div class="panel-heading"><div><h3>Comparación</h3><div class="panel-subtitle">Actual: ${escapeHtml(snapshotSource(profile))} · el nombre del cazador no se decodifica.</div></div>${snapshots.length ? `<span class="tag">${snapshots.length} punto${snapshots.length === 1 ? '' : 's'} guardado${snapshots.length === 1 ? '' : 's'}</span>` : ''}</div>${comparison}`;
    const rows = snapshots.length
      ? snapshots.map((snapshot) => `<article class="history-entry"><div><strong>${escapeHtml(snapshot.label)}</strong><small>${escapeHtml(snapshotTimestamp(snapshot.capturedAt))} · RC ${snapshot.rank} · ${formatNumber(snapshot.points)} HRP · ${formatNumber(snapshot.completed.length)} misiones · ${formatNumber(snapshot.items.length)} objetos</small></div><button class="button button-secondary history-delete" type="button" data-delete-snapshot="${escapeHtml(snapshot.id)}" aria-label="Borrar punto de control ${escapeHtml(snapshot.label)}">Borrar</button></article>`).join('')
      : '<div class="history-empty">Los puntos de control aparecerán aquí y solo serán visibles para este registro.</div>';
    $('#historyList').innerHTML = `<div class="panel-heading"><div><h3>Puntos de control de este cazador</h3><div class="panel-subtitle">Se separan por una huella local de la carpeta, archivo, ranura e ID interno en bruto; no se almacena la ruta ni se afirma conocer el nombre guardado del cazador.</div></div></div><div class="history-entry-list">${rows}</div>`;
  }

  function armorSkills() {
    const map = new Map();
    for (const tree of DATA.skillTrees) {
      map.set(tree.key, tree);
    }
    return map;
  }
  const SKILL_TREES = armorSkills();

  function makeSetShareCode() {
    const payload = {
      version: 1,
      style: appState.armorStyle,
      pieces: Object.fromEntries(PIECE_TYPES.filter((type) => appState.set[type] != null).map((type) => [type, appState.set[type]])),
      jewels: Object.fromEntries(PIECE_TYPES.filter((type) => (appState.decorations[type] || []).some(Boolean)).map((type) => [type, appState.decorations[type].filter(Boolean)])),
    };
    const bytes = new TextEncoder().encode(JSON.stringify(payload));
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return `MH3SET1:${btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')}`;
  }

  function parseSetShareCode(rawCode) {
    const code = String(rawCode || '').trim();
    if (code.length > 16000) throw new Error('El código supera el tamaño máximo permitido.');
    if (!code.startsWith('MH3SET1:')) throw new Error('El código no es de MH3 Progress Analyzer o usa una versión no compatible.');
    const encoded = code.slice('MH3SET1:'.length).replace(/-/g, '+').replace(/_/g, '/');
    if (!encoded || !/^[A-Za-z0-9+/]+$/.test(encoded)) throw new Error('El código contiene caracteres no válidos.');
    const binary = atob(encoded + '='.repeat((4 - encoded.length % 4) % 4));
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const payload = JSON.parse(new TextDecoder().decode(bytes));
    if (payload?.version !== 1) throw new Error('Esta versión del código de set no es compatible.');
    if (!['blade', 'gunner'].includes(payload.style)) throw new Error('El código tiene un tipo de armadura no válido.');
    const nextSet = {};
    const nextDecorations = {};
    for (const type of PIECE_TYPES) {
      const rawId = payload.pieces?.[type];
      const rawJewels = payload.jewels?.[type] ?? [];
      if (!Array.isArray(rawJewels) || rawJewels.length > 20 || rawJewels.some((name) => typeof name !== 'string')) {
        throw new Error(`La lista de joyas de ${ARMOR_BY_TYPE[type]} no es válida.`);
      }
      const jewels = rawJewels.filter(Boolean);
      if (rawId == null) {
        if (jewels.length) throw new Error(`El código asigna joyas sin una pieza de ${ARMOR_BY_TYPE[type]}.`);
        continue;
      }
      const id = Number(rawId);
      const piece = ARMOR.find((entry) => entry.type === type && entry.id === id && entry[payload.style]);
      if (!Number.isSafeInteger(id) || !piece) throw new Error(`La pieza de ${ARMOR_BY_TYPE[type]} no existe en este catálogo.`);
      const decorations = jewels.map((name) => DATA.decorations.find((entry) => entry.name === name));
      if (decorations.some((decoration) => !decoration)) throw new Error(`El código contiene una joya desconocida para ${ARMOR_BY_TYPE[type]}.`);
      const usedSlots = decorations.reduce((total, decoration) => total + decoration.slotUsage, 0);
      if (usedSlots > piece.slots) throw new Error(`${piece.name} no tiene suficientes espacios para las joyas del código.`);
      nextSet[type] = id;
      if (jewels.length) nextDecorations[type] = jewels;
    }
    return { style: payload.style, set: nextSet, decorations: nextDecorations };
  }

  function updateSetShareStatus(message, isError = false) {
    const status = $('#setShareStatus');
    status.textContent = message;
    status.classList.toggle('error', isError);
  }

  function renderSetBuilder() {
    const root = $('#setBuilder');
    const armorFamily = (piece) => piece.name.replace(/\s+(?:Cap|Coat|Coil|Faulds|Greaves|Guards|Helm|Leggings|Mail|Vambraces|Vest|Earring|Bandolier|Espadrilles|Gauntlets|Girdle|Turban)(?:\+)?$/i, '').replace(/\+$/, '').trim();
    const armorStyleName = appState.armorStyle === 'gunner' ? 'Gunner' : 'Blademaster';
    root.innerHTML = PIECE_TYPES.map((type) => {
      const chosen = appState.set[type] || '';
      const options = ARMOR.filter((piece) => piece.type === type && piece[appState.armorStyle]);
      const selectedPiece = options.find((piece) => String(piece.id) === String(chosen));
      const family = selectedPiece ? armorFamily(selectedPiece) : '';
      const imageCandidates = family ? armorImageCandidates(family, armorStyleName) : [];
      const preview = selectedPiece
        ? `<div class="armor-piece-preview"><span class="armor-preview-fallback">${escapeHtml(initials(family))}</span><img loading="lazy" data-image-candidates="${escapeHtml(JSON.stringify(imageCandidates))}" alt="Vista de referencia del set ${escapeHtml(family)} ${armorStyleName}"><span>Vista del set · ${escapeHtml(family)}</span></div>`
        : '<div class="armor-piece-preview armor-preview-empty">Elige una pieza para ver su referencia visual.</div>';
      return `<div class="piece-card"><label for="piece-${type}">${ARMOR_BY_TYPE[type]}</label><select id="piece-${type}" data-piece="${type}"><option value="">Elegir pieza…</option>${options.map((piece) => `<option value="${piece.id}" ${String(piece.id) === String(chosen) ? 'selected' : ''}>${escapeHtml(piece.name)} · DEF ${piece.defense} · ${piece.slots} ran.</option>`).join('')}</select>${preview}${renderDecorationControls(type, selectedPiece)}</div>`;
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
    bindRemoteImages(root);
    renderSetSummary();
    renderSetPresets();
  }

  function renderSetPresets() {
    const root = $('#savedSetList');
    $('#savedSetCount').textContent = `${appState.savedSetPresets.length} / ${MAX_SAVED_SET_PRESETS}`;
    if (!appState.savedSetPresets.length) {
      root.innerHTML = '<div class="saved-set-empty">Aún no guardaste sets. Arma uno abajo, ponle nombre y guárdalo para volver a usarlo.</div>';
      return;
    }
    root.innerHTML = appState.savedSetPresets.map((preset) => {
      let summary = 'Este código no coincide con el catálogo disponible.';
      let valid = false;
      try {
        const parsed = parseSetShareCode(preset.code);
        const pieces = PIECE_TYPES.map((type) => ARMOR.find((piece) => piece.type === type && piece.id === parsed.set[type])).filter(Boolean);
        const jewelCount = Object.values(parsed.decorations).reduce((total, jewels) => total + jewels.length, 0);
        summary = `${parsed.style === 'blade' ? 'Espadachín' : 'Artillero'} · ${pieces.length}/5 piezas · ${jewelCount} joyas · ${pieces.map((piece) => piece.name).join(' · ') || 'sin piezas'}`;
        valid = true;
      } catch { /* el set se conserva para poder borrarlo aunque el catálogo ya no lo soporte */ }
      return `<article class="saved-set-row"><div><strong>${escapeHtml(preset.name)}</strong><small>${escapeHtml(summary)} · ${escapeHtml(snapshotTimestamp(preset.savedAt))}</small></div><div class="saved-set-actions">${valid ? `<button class="button button-secondary" type="button" data-apply-saved-set="${escapeHtml(preset.id)}">Cargar</button><button class="button button-secondary" type="button" data-share-saved-set="${escapeHtml(preset.id)}">Compartir</button>` : '<span class="tag warn">Catálogo incompatible</span>'}<button class="button button-secondary" type="button" data-delete-saved-set="${escapeHtml(preset.id)}" aria-label="Borrar set ${escapeHtml(preset.name)}">Borrar</button></div></article>`;
    }).join('');
  }

  function saveCurrentSetPreset() {
    if (!Object.keys(appState.set).length) {
      notify('Elige al menos una pieza antes de guardar un set.');
      return;
    }
    if (appState.savedSetPresets.length >= MAX_SAVED_SET_PRESETS) {
      notify(`Llegaste al límite de ${MAX_SAVED_SET_PRESETS} sets guardados. Borra uno para agregar otro.`);
      return;
    }
    const name = $('#setPresetName').value.trim().slice(0, 48);
    if (!name) {
      $('#setPresetName').focus();
      notify('Escribe un nombre para este set.');
      return;
    }
    const preset = {
      version: 1,
      id: globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`,
      name,
      savedAt: new Date().toISOString(),
      code: makeSetShareCode(),
    };
    const next = [preset, ...appState.savedSetPresets];
    if (!persistSavedSetPresets(next)) {
      notify('No se pudo guardar el set local. Revisa el espacio disponible de la app.');
      return;
    }
    appState.savedSetPresets = next;
    $('#setPresetName').value = '';
    renderSetPresets();
    notify(`Set guardado en este equipo: ${name}.`);
  }

  function applySavedSet(presetId) {
    const preset = appState.savedSetPresets.find((entry) => entry.id === presetId);
    if (!preset) return;
    try {
      const imported = parseSetShareCode(preset.code);
      appState.armorStyle = imported.style;
      appState.set = imported.set;
      appState.decorations = imported.decorations;
      $$('.style-button').forEach((button) => button.classList.toggle('active', button.dataset.style === imported.style));
      renderSetBuilder();
      notify(`Set cargado: ${preset.name}.`);
    } catch (error) {
      notify(error?.message || 'No se pudo cargar este set guardado.');
    }
  }

  function deleteSavedSet(presetId) {
    const next = appState.savedSetPresets.filter((entry) => entry.id !== presetId);
    if (next.length === appState.savedSetPresets.length) return;
    if (!persistSavedSetPresets(next)) {
      notify('No se pudo borrar el set local.');
      return;
    }
    appState.savedSetPresets = next;
    renderSetPresets();
    notify('Set borrado de este equipo.');
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
      renderGatheringGuide();
      renderMaterials(profile);
      renderSaveInspector();
      renderProgressHistory(profile);
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
    const hasProfile = Boolean(currentProfile());
    $('#emptyState').classList.toggle('hidden', hasProfile || view === 'gathering');
    $('#appContent').classList.toggle('hidden', !hasProfile && view !== 'gathering');
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
      hunts: ['GUÍA DE CAZA', 'Guía de monstruos'],
      gathering: ['GUÍA DE RECOLECCIÓN', 'Dónde encontrar materiales'],
      materials: ['BAÚL DE OBJETOS', 'Materiales'],
      save: ['DIAGNÓSTICO DE PARTIDA', 'Inspector de save'],
      history: ['PUNTOS DE CONTROL LOCALES', 'Historial de progreso'],
      sets: ['PLANIFICADOR DE EQUIPO', 'Armar set'],
    };
    if (updateTitle && names[view]) {
      $('#crumb').textContent = names[view][0];
      $('#pageTitle').textContent = names[view][1];
    }
  }

  const questGoals = [...new Set(DATA.quests.map((quest) => quest.goal).filter(Boolean))]
    .sort((a, b) => (QUEST_GOAL_LABELS[a] || a).localeCompare(QUEST_GOAL_LABELS[b] || b));
  const questLocations = [...new Set(DATA.quests.map((quest) => quest.location).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  $('#questGoal').insertAdjacentHTML('beforeend', questGoals.map((goal) => `<option value="${escapeHtml(goal)}">${escapeHtml(QUEST_GOAL_LABELS[goal] || goal)}</option>`).join(''));
  $('#questLocation').insertAdjacentHTML('beforeend', questLocations.map((location) => `<option value="${escapeHtml(location)}">${escapeHtml(location)}</option>`).join(''));
  const gatheringMaps = DATA.gathering?.maps || [];
  $('#gatheringMap').insertAdjacentHTML('beforeend', gatheringMaps.map((map) => `<option value="${escapeHtml(map.id)}">${escapeHtml(map.name)}</option>`).join(''));
  const gatheringTypes = [...new Set(gatheringMaps.flatMap((map) => map.nodes.map((node) => node.type)))].sort((a, b) => a.localeCompare(b, 'es'));
  $('#gatheringType').insertAdjacentHTML('beforeend', gatheringTypes.map((type) => `<option value="${escapeHtml(type)}">${escapeHtml(type)}</option>`).join(''));
  updateGatheringAreaOptions();
  $('#gatheringSearch').addEventListener('input', (event) => { appState.gatheringSearch = event.target.value; renderGatheringGuide(); });
  $('#gatheringMap').addEventListener('change', (event) => {
    appState.gatheringMap = event.target.value;
    appState.gatheringArea = 'all';
    updateGatheringAreaOptions();
    renderGatheringGuide();
  });
  $('#gatheringArea').addEventListener('change', (event) => { appState.gatheringArea = event.target.value; renderGatheringGuide(); });
  $('#gatheringRank').addEventListener('change', (event) => { appState.gatheringRank = event.target.value; renderGatheringGuide(); });
  $('#gatheringType').addEventListener('change', (event) => { appState.gatheringType = event.target.value; renderGatheringGuide(); });
  $('#resetGatheringFilters').addEventListener('click', () => {
    appState.gatheringSearch = '';
    appState.gatheringMap = 'all';
    appState.gatheringArea = 'all';
    appState.gatheringRank = 'all';
    appState.gatheringType = 'all';
    $('#gatheringSearch').value = '';
    $('#gatheringMap').value = 'all';
    $('#gatheringRank').value = 'all';
    $('#gatheringType').value = 'all';
    updateGatheringAreaOptions();
    renderGatheringGuide();
  });
  const updateQuestFilters = () => {
    appState.questSearch = $('#questSearch').value;
    appState.questRegion = $('#questRegion').value;
    appState.questRank = $('#questRank').value;
    appState.questLocation = $('#questLocation').value;
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
    appState.questLocation = 'all';
    appState.questGoal = 'all';
    appState.questProgression = 'all';
    appState.questStatus = 'all';
    $('#questSearch').value = '';
    $('#questRegion').value = 'all';
    $('#questRank').value = 'all';
    $('#questLocation').value = 'all';
    $('#questGoal').value = 'all';
    $('#questProgression').value = 'all';
    $('#questStatus').value = 'all';
    const profile = currentProfile();
    if (profile) renderQuestCatalog(profile);
  });

  $('#materialSourceSearch').addEventListener('input', (event) => {
    appState.materialSourceSearch = event.target.value;
    appState.materialSourceItemId = null;
    const profile = currentProfile();
    if (profile) renderMaterialSources(profile);
  });
  $('#materialSourceRank').addEventListener('change', (event) => {
    appState.materialSourceRank = event.target.value;
    const profile = currentProfile();
    if (profile) renderMaterialSources(profile);
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
  $('#saveSnapshot').addEventListener('click', saveProgressSnapshot);
  $('#snapshotLabel').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      saveProgressSnapshot();
    }
  });
  $('#saveSetPreset').addEventListener('click', saveCurrentSetPreset);
  $('#setPresetName').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      saveCurrentSetPreset();
    }
  });
  $$('.nav-item').forEach((button) => button.addEventListener('click', () => {
    const view = button.dataset.view;
    if (!currentProfile() && view !== 'gathering') {
      notify('Carga una partida para consultar el progreso. La guía de recolección está disponible sin abrir un save.');
      return;
    }
    if (view === 'gathering') renderGatheringGuide();
    showView(view);
  }));
  document.addEventListener('click', (event) => {
    const externalSource = event.target.closest('[data-open-external]');
    if (externalSource) {
      window.mh3Desktop?.openExternal(externalSource.dataset.openExternal).then((result) => {
        if (result?.error) notify(result.error);
      }).catch(() => notify('No se pudo abrir la página de la fuente.'));
      return;
    }
    const openGatheringSearch = event.target.closest('[data-open-gathering-search]');
    if (openGatheringSearch) {
      const item = DATA.items.find((entry) => entry.id === Number(openGatheringSearch.dataset.openGatheringSearch));
      if (!item) return;
      appState.gatheringSearch = item.name;
      appState.gatheringMap = 'all';
      appState.gatheringArea = 'all';
      appState.gatheringRank = 'all';
      appState.gatheringType = 'all';
      $('#gatheringSearch').value = item.name;
      $('#gatheringMap').value = 'all';
      $('#gatheringRank').value = 'all';
      $('#gatheringType').value = 'all';
      updateGatheringAreaOptions();
      renderGatheringGuide();
      showView('gathering');
      return;
    }
    const go = event.target.closest('[data-goto]');
    if (go) showView(go.dataset.goto);
    const materialSourcePick = event.target.closest('[data-material-source-pick]');
    if (materialSourcePick) {
      openMaterialSource(materialSourcePick.dataset.materialSourcePick);
      return;
    }
    if (event.target.closest('[data-clear-material-source]')) {
      appState.materialSourceItemId = null;
      appState.materialSourceSearch = '';
      $('#materialSourceSearch').value = '';
      const profile = currentProfile();
      if (profile) renderMaterialSources(profile);
      return;
    }
    const changeGoal = event.target.closest('[data-change-weapon-goal]');
    const removeGoal = event.target.closest('[data-remove-weapon-goal]');
    const removeSnapshot = event.target.closest('[data-delete-snapshot]');
    if (removeSnapshot) {
      deleteProgressSnapshot(removeSnapshot.dataset.deleteSnapshot);
      return;
    }
    const applyPreset = event.target.closest('[data-apply-saved-set]');
    if (applyPreset) {
      applySavedSet(applyPreset.dataset.applySavedSet);
      return;
    }
    const sharePreset = event.target.closest('[data-share-saved-set]');
    if (sharePreset) {
      const preset = appState.savedSetPresets.find((entry) => entry.id === sharePreset.dataset.shareSavedSet);
      if (preset) {
        $('#setShareCode').value = preset.code;
        updateSetShareStatus(`Código de “${preset.name}” listo para compartir.`);
        $('#setShareDialog').showModal();
      }
      return;
    }
    const removePreset = event.target.closest('[data-delete-saved-set]');
    if (removePreset) {
      deleteSavedSet(removePreset.dataset.deleteSavedSet);
      return;
    }
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
      renderMaterialSources(profile);
    } else if (removeGoal) {
      appState.weaponShoppingList.splice(Number(removeGoal.dataset.removeWeaponGoal), 1);
      persistWeaponShoppingList();
      renderWeaponShoppingList(profile);
      renderMaterialSources(profile);
    } else if (event.target.closest('[data-clear-weapon-goals]')) {
      appState.weaponShoppingList = [];
      persistWeaponShoppingList();
      renderWeaponShoppingList(profile);
      renderMaterialSources(profile);
    }
  });
  document.addEventListener('change', (event) => {
    if (event.target.matches('#historyBaseline')) {
      appState.historyBaselineId = event.target.value;
      const profile = currentProfile();
      if (profile) renderProgressHistory(profile);
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
  $('#shareSet').addEventListener('click', () => {
    $('#setShareCode').value = makeSetShareCode();
    updateSetShareStatus('Código actualizado con las piezas y joyas del simulador.');
    $('#setShareDialog').showModal();
  });
  $('#copySetCode').addEventListener('click', async () => {
    const field = $('#setShareCode');
    try {
      await navigator.clipboard.writeText(field.value);
      updateSetShareStatus('Código copiado. Ya puedes compartirlo.');
    } catch {
      field.focus();
      field.select();
      let copied = false;
      try { copied = document.execCommand('copy'); } catch { /* se deja el código seleccionado para copiarlo a mano */ }
      if (copied) updateSetShareStatus('Código copiado. Ya puedes compartirlo.');
      else updateSetShareStatus('No pude copiarlo automáticamente. El código quedó seleccionado para que uses Ctrl+C.', true);
    }
  });
  $('#applySetCode').addEventListener('click', () => {
    try {
      const imported = parseSetShareCode($('#setShareCode').value);
      appState.armorStyle = imported.style;
      appState.set = imported.set;
      appState.decorations = imported.decorations;
      $$('.style-button').forEach((button) => button.classList.toggle('active', button.dataset.style === imported.style));
      renderSetBuilder();
      $('#setShareDialog').close();
      notify('Set cargado en el simulador. No se modificó la partida.');
    } catch (error) {
      updateSetShareStatus(error?.message || 'No se pudo leer este código.', true);
    }
  });
  $('#closeSetShare').addEventListener('click', () => $('#setShareDialog').close());
  $('#clearSet').addEventListener('click', () => { appState.set = {}; appState.decorations = {}; renderSetBuilder(); });
})();
