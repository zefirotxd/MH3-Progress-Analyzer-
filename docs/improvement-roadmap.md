# Analyzer improvement roadmap

## In this version

- Explain the six-file container and profile-record validation instead of showing only a generic import error.
- Report size, expected `FILE1`–`FILE6` signature, nonzero/inactive state, checksum, and occupied character slots for every selected file.
- Show the values and offsets used for each recognized character so the user can see what the app actually read.
- Keep malformed data visible as diagnostics and skip it without writing anything to the save.

## Next, after field verification

1. Read character display name and play time from confirmed character-record fields.
2. Decode owned equipment and compare it with forge recipes/material costs; avoid presenting base armor stats as an owned set.
3. Decode pouch inventory separately from the item box.
4. Identify Moga resource points, farm state, and villager-request flags from before/after save comparisons.
5. Add a save comparison view to show only fields that changed between two local files.
6. Add automated regression fixtures made from synthetic data, never the user's personal save.

## Evidence standard

Every field must have its file/record-relative offset, width, byte order, validation method, and a known-game comparison before it is presented as fact. Inferences are labeled as such. This app remains read-only.
