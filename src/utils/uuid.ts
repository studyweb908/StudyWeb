const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Checks if a given string is a valid RFC4122 UUID.
 */
export function isValidUuid(str?: string | null): boolean {
  if (!str || typeof str !== 'string') return false;
  return UUID_REGEX.test(str.trim());
}

/**
 * Generates a standard RFC4122 v4 UUID.
 */
export function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Deterministically maps any arbitrary string (e.g. "ws-1790266444303", "local-user", "file-123")
 * to a valid RFC4122 v4-compliant UUID format.
 * If the input is already a valid UUID, it is returned trimmed.
 */
export function toValidUuid(str?: string | null): string {
  if (!str || typeof str !== 'string' || !str.trim()) {
    return '00000000-0000-4000-8000-000000000000';
  }
  const clean = str.trim();
  if (isValidUuid(clean)) {
    return clean;
  }

  // Deterministic 128-bit hash (djb2 + fnv-1a hybrid)
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  let h3 = 0x811c9dc5;
  let h4 = 0x9e3779b9;
  for (let i = clean.length - 1; i >= 0; i--) {
    const ch = clean.charCodeAt(i);
    h3 = Math.imul(h3 ^ ch, 16777619);
    h4 = Math.imul(h4 ^ ch, 2166136261);
  }

  const p1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const p2 = (h2 >>> 0).toString(16).padStart(8, '0');
  const p3 = (h3 >>> 0).toString(16).padStart(8, '0');
  const p4 = (h4 >>> 0).toString(16).padStart(8, '0');

  const hex128 = (p1 + p2 + p3 + p4).slice(0, 32);
  return `${hex128.substring(0, 8)}-${hex128.substring(8, 12)}-4${hex128.substring(13, 16)}-a${hex128.substring(17, 20)}-${hex128.substring(20, 32)}`;
}
