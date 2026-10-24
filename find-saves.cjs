const fs = require('node:fs/promises');
const path = require('node:path');

const SAVE_FILE_PATTERN = /^data0[0-5]$/i;
const MAX_SCANNED_DIRECTORIES = 8000;
const MAX_QUEUED_DIRECTORIES = 20000;
const MAX_SCAN_DEPTH = 16;
const MAX_SCAN_TIME_MS = 8000;
const MAX_CANDIDATES = 100;
const IGNORED_DIRECTORIES = new Set([
  '.git', 'node_modules', 'cache', 'graphics', 'dist', 'build', 'target', '$recycle.bin',
  'system volume information', '$windows.~bt',
]);

async function readDirectory(directory) {
  try {
    return await fs.readdir(directory, { withFileTypes: true });
  } catch {
    return [];
  }
}

async function findSaveCandidates(folder) {
  const root = path.resolve(folder);
  const discovered = new Map();
  const visited = new Set();
  const pending = [{ directory: root, depth: 0 }];
  const startedAt = Date.now();
  let scanLimited = false;

  while (pending.length) {
    if (visited.size >= MAX_SCANNED_DIRECTORIES || Date.now() - startedAt >= MAX_SCAN_TIME_MS) {
      scanLimited = true;
      break;
    }

    const { directory, depth } = pending.pop();
    const normalized = path.resolve(directory).toLowerCase();
    if (visited.has(normalized)) continue;
    visited.add(normalized);

    const entries = await readDirectory(directory);
    const files = entries
      .filter((entry) => entry.isFile() && SAVE_FILE_PATTERN.test(entry.name))
      .map((entry) => path.join(directory, entry.name));
    if (files.length) discovered.set(normalized, { folder: path.resolve(directory), files });

    const childDirectories = entries
      .filter((entry) => entry.isDirectory() && !entry.isSymbolicLink() && !IGNORED_DIRECTORIES.has(entry.name.toLowerCase()))
      .sort((a, b) => b.name.localeCompare(a.name));
    if (depth >= MAX_SCAN_DEPTH) {
      if (childDirectories.length) scanLimited = true;
      continue;
    }
    for (const entry of childDirectories) {
      if (pending.length >= MAX_QUEUED_DIRECTORIES) {
        scanLimited = true;
        break;
      }
      pending.push({ directory: path.join(directory, entry.name), depth: depth + 1 });
    }
  }

  const ranked = [...discovered.values()].sort((a, b) => b.files.length - a.files.length || a.folder.localeCompare(b.folder));
  if (ranked.length > MAX_CANDIDATES) scanLimited = true;
  return {
    candidates: ranked.slice(0, MAX_CANDIDATES),
    scanLimited,
    scannedDirectories: visited.size,
  };
}

async function findSaveFiles(folder) {
  const result = await findSaveCandidates(folder);
  return result.candidates[0]?.files || [];
}

module.exports = { findSaveCandidates, findSaveFiles };
