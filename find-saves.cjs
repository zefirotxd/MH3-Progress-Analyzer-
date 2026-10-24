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

function findSaveCandidates(folder) {
  const suffix = path.join('nand', 'title', '00010000', '524d4850', 'data', 'nocopy');
  const candidates = new Map();
  const addCandidate = (directory) => {
    const absolute = path.resolve(directory);
    const files = filesIn(absolute);
    if (!files.length) return false;
    const key = absolute.toLowerCase();
    if (!candidates.has(key)) candidates.set(key, { folder: absolute, files });
    return true;
  };
  const preferred = [folder, path.join(folder, suffix), path.join(folder, 'saves', suffix)];
  for (const directory of preferred) addCandidate(directory);

  const ignored = new Set(['.git', 'node_modules', 'cache', 'graphics', 'dist', 'build', 'target', '$recycle.bin']);
  const pending = [path.resolve(folder)];
  const visited = new Set();
  while (pending.length && visited.size < 20000) {
    const current = pending.pop();
    const key = current.toLowerCase();
    if (visited.has(key)) continue;
    visited.add(key);
    addCandidate(current);
    const entries = directoryEntries(current).sort((a, b) => b.name.localeCompare(a.name));
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.isSymbolicLink() && !ignored.has(entry.name.toLowerCase())) {
        pending.push(path.join(current, entry.name));
      }
    }
  }
  return [...candidates.values()].sort((a, b) => b.files.length - a.files.length || a.folder.localeCompare(b.folder));
}

function findSaveFiles(folder) {
  return findSaveCandidates(folder)[0]?.files || [];
}

module.exports = { findSaveCandidates, findSaveFiles };
