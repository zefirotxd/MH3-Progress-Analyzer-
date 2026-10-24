import { readFile, writeFile } from 'node:fs/promises';
import { createJiti } from 'jiti';

const sourceUrl = new URL('../src/data-catalog.json', import.meta.url);
const catalog = JSON.parse(await readFile(sourceUrl, 'utf8'));
const jiti = createJiti(import.meta.url);
const [armorModule, weaponModule] = await Promise.all([
  jiti.import('mh3-data/armor'),
  jiti.import('mh3-data/weapons'),
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

await writeFile(sourceUrl, `${JSON.stringify(catalog, null, 2)}\n`);
console.log(`Catálogo actualizado: ${catalog.weapons.length} armas, ${torsoUpIds.size} piezas con Torso Up.`);
