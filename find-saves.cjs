const fs = require('node:fs');
const path = require('node:path');

function directoryEntries(directory) {
  try {
    return fs.readdirSync(directory, { withFileTypes: true });
  } catch {
    return [];
  }
}

function filesIn(directory) {
  return directoryEntries(directory)
    .filter((entry) => entry.isFile() && /^data0[0-5]$/i.test(entry.name))
    .map((entry) => path.join(directory, entry.name));
}

function findSaveFiles(folder) {
  const suffix = path.join('nand', 'title', '00010000', '524d4850', 'data', 'nocopy');
  const candidates = [folder, path.join(folder, suffix), path.join(folder, 'saves', suffix)];
  for (const candidate of candidates) {
    const files = filesIn(candidate);
    if (files.length) return files;
  }

  const ignored = new Set(['.git', 'node_modules', 'cache', 'graphics', 'dist', 'build', 'target', '$recycle.bin']);
  const pending = [folder];
  let visited = 0;
  while (pending.length && visited < 20000) {
    const current = pending.pop();
    visited += 1;
    const entries = directoryEntries(current);
    const files = entries
      .filter((entry) => entry.isFile() && /^data0[0-5]$/i.test(entry.name))
      .map((entry) => path.join(current, entry.name));
    if (files.length) return files;
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.isSymbolicLink() && !ignored.has(entry.name.toLowerCase())) {
        pending.push(path.join(current, entry.name));
      }
    }
  }
  return [];
}

module.exports = { findSaveFiles };
