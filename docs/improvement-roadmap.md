# Analyzer improvement roadmap

## Landed in the current working tree

- Show all save folders found under a selected root and ask the user to choose when more than one candidate exists. Never merge separate folders.
- Scan folders asynchronously with depth, time, directory and candidate limits; explain when the scan was bounded.
- Report file access errors, reject duplicate data filenames and skip oversized inputs before allocating their contents.
- Preserve the currently loaded analysis when a new selection is invalid, and show per-file diagnostics in the initial empty state.
- Calculate dashboard Moga story progress from the main-chain key and urgent quests instead of all catalogued village quests.
- Add keyboard focus indicators, navigation state announcements and reduced-motion support.
- Plan craft and upgrade routes for the six blademaster weapon classes. Compare all route materials with the selected hunter's item box and rank routes by missing quantities.
- Combine multiple weapon routes and copies in a local shopping list; aggregate duplicate materials, subtract the selected hunter's item-box stock only once, and retain the list between app launches.
- Browse all catalogued Moga and Loc Lac quests with name/target search and region, rank, objective, progression-role and save-flag filters. Separate incomplete trackable quests from quests with no known save flag.
- Let the user specify a manually owned starting weapon; the save parser does not claim to know the hunter's equipment.
- Add decorations to armor pieces, enforce each piece's slot budget and include their skill points in the set summary.
- Apply stacked `Torso Up` to chest armor and decorations in the armor skill simulation.
- Export/import versioned share codes for armor pieces and decorations; validate armor style, piece IDs and jewel slot usage before applying a code.
- Save local read-only progress checkpoints and compare rank, HRP, zenny, quest flags and item-box counts without retaining raw save bytes.
- Save, reload, remove and share up to 20 named armor-set presets locally; revalidate their pieces and jewel slots against the current catalog.
- Bundle all 35 monster entries with hitzones, status tolerances, carving/break/capture/shiny tables; enrich 172 quest records with map, payout and secondary-reward data from the pinned upstream source.
- Find material sources across monster reward tables and secondary quest rewards, and link weapon-list shortages directly to the source browser.
- Show every secondary-reward outcome and every matching mission; list all changed item types in checkpoint comparisons.
- Add reverse recipe lookup from an item to all weapon forging and upgrade recipes that consume it.
- Show catalogued subquest objectives, material/monster targets, zenny reward and HRP in quest details.
- Show explicit coverage notes for community-recovered data, partial event/arena quests and unavailable map gathering nodes.
- Keep upstream data snapshots committed so app builds remain offline; provide a separate maintainer sync command.

## Next improvements, ordered by user value and evidence

### 1. Make gear planning complete

- Add weapon decorations and charms only after checking their slot and point semantics against MH3 data.
- Add armor forge costs when a reliable source becomes available. The current dataset has armor statistics, but no armor recipes.

### 2. Help answer “what do I need next?”

- Add armor costs to the shopping list only when a reliable recipe source is available; the current catalog has no armor forge recipes.
- Add map gathering-node sources only after finding a reliable dataset with exact map, area, node and rank coverage; the current upstream source has none.
- Expand event/arena reward coverage only when a source can identify region/version and known omissions; keep MH3SP custom/private-server rotations separate from original-game quest records.
- Mark quest requirements for specific progression gates with explicit evidence, without implying that every incomplete quest is currently available.

### 3. Learn the save format safely

- Add a byte-level before/after inspector for controlled save-format research, separate from the decoded progress checkpoint comparison.
- Decode equipment, pouch items, Moga points, farm state, requests and Cha-Cha state only after offsets pass controlled before/after checks and a known-game comparison.
- Add synthetic regression fixtures for file flags, checksums, slots and each confirmed field. Never check in the user's personal save.
- Document region/version differences and clearly separate “confirmed”, “inferred” and “not decoded” fields.

### 4. Make repeated use easier

- Remember only the last selected folder and offer a refresh action; never persist save bytes.
- Add a recent hunters list only after a stable, validated hunter identity can be decoded from the save.
- Improve Spanish names/search aliases for items, monsters and quests while preserving the upstream English name for cross-reference.
- Add keyboard navigation and a clearer diagnostic summary for partial or invalid six-file selections.

## Evidence standard

Every decoded save field needs a file/record-relative offset, width, byte order, validation method and known-game comparison before it is shown as fact. Inferences are labeled. Catalog features carry their source and coverage limits. The app stays read-only.
