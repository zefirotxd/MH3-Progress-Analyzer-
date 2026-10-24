import { readFile, writeFile } from 'node:fs/promises';
import { createJiti } from 'jiti';

const sourceUrl = new URL('../src/data-catalog.json', import.meta.url);
const catalog = JSON.parse(await readFile(sourceUrl, 'utf8'));
const jiti = createJiti(import.meta.url);
const [armorModule, weaponModule, monsterModule, questModule] = await Promise.all([
  jiti.import('mh3-data/armor'),
  jiti.import('mh3-data/weapons'),
  jiti.import('mh3-data/monsters'),
  jiti.import('mh3-data/quests'),
]);

const upstreamArmor = Object.values(armorModule.ArmorData).flat();
const torsoUpIds = new Set(upstreamArmor.filter((piece) => piece.torsoUp).map((piece) => `${piece.type}:${piece.id}`));
catalog.armor = catalog.armor.map((piece) => {
  const normalized = { ...piece };
  if (torsoUpIds.has(`${piece.type}:${piece.id}`)) normalized.torsoUp = true;
  else delete normalized.torsoUp;
  return normalized;
});

const weaponClasses = [
  ['Great Sword', weaponModule.GreatSword.GreatSwords],
  ['Hammer', weaponModule.Hammer.Hammers],
  ['Lance', weaponModule.Lance.Lances],
  ['Longsword', weaponModule.Longsword.Longswords],
  ['Switch Axe', weaponModule.SwitchAxe.SwitchAxes],
  ['Sword and Shield', weaponModule.SwordAndShield.SwordAndShields],
];
const weaponFields = [
  'id', 'type', 'name', 'description', 'attack', 'secondaryDamageType', 'secondaryAttack',
  'awaken', 'sharpness', 'sharpnessUp', 'affinity', 'slots', 'rarity', 'price', 'defense',
  'upgradesFrom', 'upgradesTo', 'create',
];
catalog.weapons = weaponClasses.flatMap(([, weapons]) => weapons.map((weapon) => Object.fromEntries(
  weaponFields.filter((field) => weapon[field] !== undefined).map((field) => [field, weapon[field]]),
)));

const upstreamMonsters = [...Object.values(monsterModule.LargeMonsterData), ...Object.values(monsterModule.SmallMonsterData)]
  .flat()
  .sort((a, b) => a.id - b.id);
const monsterFields = ['id', 'name', 'type', 'description', 'threat', 'monsterStates', 'status'];
catalog.monsters = upstreamMonsters.map((monster) => Object.fromEntries(
  monsterFields.filter((field) => monster[field] !== undefined).map((field) => [field, monster[field]]),
));
const dropFields = ['id', 'name', 'type', 'carves', 'breakables', 'capture', 'shiny', 'variants'];
catalog.monsterDrops = upstreamMonsters.map((monster) => Object.fromEntries(
  dropFields.filter((field) => monster[field] !== undefined).map((field) => [field, monster[field]]),
));

const upstreamQuests = [questModule.VillageQuestData, questModule.CityQuestData]
  .flatMap((mode) => [
    ...Object.values(mode.starLevels).flat(),
    ...mode.arena,
    ...mode.events,
  ]);
const questsById = new Map(upstreamQuests.map((quest) => [quest.id, quest]));
const localQuestsById = new Map(catalog.quests.map((quest) => [quest.id, quest]));
const questFields = [
  'id', 'name', 'region', 'rank', 'type', 'goal', 'client', 'contract', 'time', 'location',
  'randomspawn', 'reward', 'ko', 'hrp', 'secondaryRewards', 'targets', 'bosses', 'subquests',
];
catalog.quests = [...new Set([...localQuestsById.keys(), ...questsById.keys()])]
  .sort((a, b) => a - b)
  .map((id) => {
    const local = localQuestsById.get(id) || {};
    const upstream = questsById.get(id);
    if (!upstream) return local;
    return {
      ...local,
      ...Object.fromEntries(questFields.filter((field) => upstream[field] !== undefined).map((field) => [field, upstream[field]])),
    };
  });

catalog.dataSources = {
  mh3Data: {
    name: 'mh3-data',
    version: '2.0.2',
    url: 'https://github.com/maliciousbanjo/mh3-data',
    limitations: [
      'Quest data includes only a partial set of online arena and event quests.',
      'Quest boss-spawn data was derived from a public quest editor and is marked as flawed by its source.',
      'The underlying historical dataset was partially recovered from an archived website.',
    ],
  },
};

await writeFile(sourceUrl, `${JSON.stringify(catalog, null, 2)}\n`);
console.log(`Catálogo actualizado: ${catalog.weapons.length} armas, ${catalog.monsters.length} monstruos, ${catalog.monsterDrops.length} tablas de materiales, ${catalog.quests.length} misiones, ${torsoUpIds.size} piezas con Torso Up.`);
