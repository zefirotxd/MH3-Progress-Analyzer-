# Monster Hunter Tri save format (read-only notes)

This analyzer targets the European OceanTriRecomp save directory:

```text
saves/nand/title/00010000/524d4850/data/nocopy/data00..data05
```

## Confirmed outer file layout

The facts below are corroborated by the OceanTriRecomp runtime's `code/runtime/src/save_data.cpp`, `code/runtime/include/save_data.h`, and `code/runtime/src/launcher_support.cpp`:

| Offset | Size | Meaning |
| --- | ---: | --- |
| `0x00` | 4 | In-use flags. The game treats any nonzero value as in use. |
| `0x04` | 4 | Big-endian sum of bytes from `0x08` through the end of the `0x14000`-byte file. |
| `0x08` | — | File signature (`FILE1` through `FILE6` in the observed six data files). |
| `0x48` | — | Beginning of the character records. |
| `0x48 + n * 0x6000` | `0x6000` | Character record `n`, for `n = 0..2`. |

The runtime validates the file size, nonzero flags, checksum and nonzero character-record marker before loading a character. The analyzer never writes or repairs saves.

## Fields currently interpreted by the analyzer

Offsets below are relative to a character record:

| Offset | Size | Interpretation |
| --- | ---: | --- |
| `0x0018` | 4 | Zenny, signed big-endian integer. |
| `0x001C` | 4 | Character ID field copied by the runtime. Shown only as a raw identifier until its user-facing meaning is established. |
| `0x0180` | `800 * 4` | Item-box slots, each `{u16 item ID, s16 quantity}` in big-endian order. |
| `0x3920` | 8 | Four 16-bit words copied by the runtime; not yet decoded in this analyzer. |
| `0x3DE0` | 4 | HRP, unsigned big-endian integer. |
| `0x3DE4` | 2 | Hunter rank, unsigned big-endian integer. |
| `0x512C` | bitset | Quest completion flags, matched against the 160-ID index table extracted from the European executable. |

The active profile's rank and HRP are displayed separately: rank is stored directly, while the progress bar compares HRP against the rank thresholds extracted from the European game executable.

## Known limits and next validation targets

- The decoded quest flags establish completion state, not how many times a monster was hunted or captured.
- The save reader does not yet decode the hunter's display name, play time, equipment, weapon box, pouch, village resources, or villager-request state.
- The item box is distinct from the hunter's carried pouch; current material counts only describe the item box.
- Before adding more fields, compare two saves created by the game with exactly one in-game value changed and confirm the candidate offset against the game code or a second independent save.
- Files that are malformed, wrong-sized, have an unexpected signature, or a bad checksum must be reported as invalid, never silently treated as empty.
