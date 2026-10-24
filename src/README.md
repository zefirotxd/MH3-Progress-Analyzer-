# Bundled catalog data

`data-catalog.json` is the normalized, bundled Monster Hunter Tri catalog used by the offline app. Its item, quest, monster, armor, skill, decoration and weapon records were normalized from [`mh3-data` 2.0.2](https://github.com/maliciousbanjo/mh3-data), with the save-reference quest index and HR thresholds added from the European OceanTriRecomp executable. The snapshot includes weapon crafting and upgrade recipes plus the `Torso Up` armor flag. See `../THIRD-PARTY-LICENSES.txt` for the upstream MIT notice.

The catalog is checked into the repository so a normal build does not need network access to generate game data. Run `npm run build:data` to emit the browser/Electron bundle `data.js` from this JSON source. Maintainers with dependencies installed can refresh the upstream snapshot using `npm run sync:data`, then rebuild it.

Do not add personal save files or character data to this directory.
