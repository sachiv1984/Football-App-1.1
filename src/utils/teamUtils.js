// src/utils/teamUtils.js

export function normalizeTeamName(name) {
  if (!name) return '';
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}
