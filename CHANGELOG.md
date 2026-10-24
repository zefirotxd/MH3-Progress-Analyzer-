# Changelog

## 0.6.0 · guía de recolección y referencias visuales

- Add a searchable gathering guide for Moga Woods and all five quest maps, with 171 area-specific nodes and 480 item/node results from the cited MH3 guide.
- Filter gathering points by material, map, area, rank and point type; link each material back to its full source list and open the guide without loading a save.
- Restore nodes previously missed by the importer, including three-point groups, mining aliases and the Sandy Plains special-soil point; make the importer reject incomplete map coverage.
- Add optional monster icons and armor-set reference images from Monster Hunter Wiki; retain usable initials/placeholders when a remote image is unavailable and keep images out of the installer.
- Add a source link handler restricted to the HTTPS hosts used by the gathering and image references.
- Label quest secondary-reward tables with their full result count and keep every outcome visible.

## 0.5.0 · actualización grande

- Mostrar todos los resultados de cada tabla secundaria de misión como fichas separadas, quitar el recorte a cuatro entradas y abrir la guía del material al seleccionarlo.
- Añadir objetivos secundarios de misión con objetivo, materiales/monstruos, pago y HRP catalogados.
- Quitar límites de 60 misiones en las fuentes de materiales y 40 misiones objetivo, para no ocultar coincidencias.
- Añadir búsqueda inversa de recetas: al consultar un material, mostrar todas las armas que lo forjan o lo usan en una mejora, junto con cantidades y arma de origen.
- Mostrar la lista completa de objetos que cambiaron entre puntos de control del baúl.
- Mantener las advertencias de cobertura: el catálogo comunitario de eventos/arena es parcial y las recetas de armadura y la recolección por nodos no están disponibles.

## 0.4.0-preview.1 · compilación local

- Expand the offline catalog with 35 monsters, 35 material-drop tables and 172 quests; include hitzones, status tolerances, monster drops, quest payouts and secondary rewards from `mh3-data` 2.0.2.
- Add a material source finder for monster carves, breakable parts, capture, shiny drops and quest secondary rewards, with low/high-rank filters and one-click links from weapon shortages and item-box entries.
- Add a monster field guide with hitzone tables and status buildup thresholds while keeping save-flag objective counts separate from lifetime hunt counts.
- Enrich quest browsing with map, contract, zenny payout, HRP and secondary reward data; add a map filter and preserve clear warnings about partial event/arena data and quest unlock state.
- Document upstream data coverage and provenance; do not infer map gathering nodes, event availability or guaranteed rewards.

## 0.3.0-preview.6 · compilación local

- Add local progress checkpoints with RC, HRP, zenny, completed-quest flags and item-box counts; never store raw save files.
- Compare the currently loaded hunter against a checkpoint, including newly changed quest flags and net item-box differences.
- Keep up to 12 checkpoints per save record, isolate them with a local folder fingerprint plus save file, slot and raw record ID, and allow individual deletion.
- Clearly label item changes as net differences rather than inferred acquisition or use history.
- Save up to 20 named armor builds locally, reload them into the simulator, delete them, or open their validated share code.

## 0.3.0-preview.5 · compilación local

- Add versioned share codes for armor sets and decorations, with validation against the local armor style, piece slots and decoration catalog before import.
- Keep shared set data separate from save files and provide clipboard copy with a manual-copy fallback.

## 0.3.0-preview.4 · compilación local

- Add a searchable quest catalog for Moga and Loc Lac with region, rank, objective, progression-role and save-flag filters.
- Show objective targets with the best item or monster name available in the local catalog.
- Distinguish completed quests, incomplete quests with a save flag, and quests without a known save flag; do not imply that an incomplete quest is unlocked.

## 0.3.0-preview.3 · compilación local

- Add a locally stored weapon shopping list that combines material requirements across multiple forge routes and repeated copies.
- Subtract the selected hunter's item-box stock once per material and recalculate when the active hunter changes.
- Keep weapon targets adjustable or removable, recalculate against the selected hunter, and state clearly that armor forging costs are unavailable in the checked-in catalog.

## 0.3.0-preview.2 · compilación local

- Add weapon crafting and upgrade route planning for all six MH3 blademaster classes, including material shortfalls against the selected hunter's item box.
- Add decoration placement with per-piece slot limits and include decoration points in the set skill simulation.
- Apply Torso Up stacking to chest armor and decorations in the armor-set skill simulator.
- Let the save-folder scan list multiple candidates and ask which one to load instead of silently taking the first match.
- Return clear errors when a selected save file cannot be read, and reject oversized files before reading them into memory.
- Reject duplicate `data00`–`data05` names before parsing so files from different folders cannot be combined.
- Keep the last valid analysis visible after a failed import, and show a file-by-file result when the initial save is invalid.
- Make save discovery asynchronous and bounded, with a warning when the selected folder is too broad to scan completely.
- Calculate dashboard Moga progress from story keys and urgent quests, and improve keyboard and reduced-motion accessibility.
- Add an explicit upstream catalog sync command while keeping normal builds offline and reproducible from the checked-in JSON snapshot.

## 0.2.0

- Adopt the desktop analyzer in this repository.
- Add the Save Inspector view with per-file size, signature, active flags, checksum and character-record status.
- Show the exact stored profile fields used for RC, HRP, zenny, quest flags and item-box summaries.
- Document confirmed save layout, decoded offsets, limits and evidence standards.
- Include a checked-in catalog source and offline `build:data` command.
