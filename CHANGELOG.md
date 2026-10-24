# Changelog

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
