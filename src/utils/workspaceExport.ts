import { Workspace, WorkspaceFile } from '../components/Dashboard/WorkspaceTypes';

const DEFAULT_DEMO_FILE_IDS = new Set([
  '11111111-1111-4111-8111-111111111101',
  '11111111-1111-4111-8111-111111111102',
  '22222222-2222-4222-8222-222222222201',
  '33333333-3333-4333-8333-333333333301'
]);

const DEFAULT_DEMO_FILE_NAMES = new Set([
  'newton_laws_and_friction_formulae.pdf',
  'rotational_dynamics_summary.pdf',
  'fundamental_theorems_of_calculus.pdf',
  'nucleophilic_substitution_mechanisms.pdf'
]);

export function isUserUploadedFile(file: WorkspaceFile | any): boolean {
  if (!file) return false;
  const id = String(file.id || '').trim().toLowerCase();
  const name = String(file.name || '').trim().toLowerCase();
  if (DEFAULT_DEMO_FILE_IDS.has(id) || DEFAULT_DEMO_FILE_NAMES.has(name)) {
    return false;
  }
  return true;
}

export interface UserExportSummary {
  totalFiles: number;
  pdfsAndDocs: WorkspaceFile[];
  videosAndLinks: WorkspaceFile[];
  imagesAndDiagrams: WorkspaceFile[];
  pdfsCount: number;
  videosCount: number;
  linksCount: number;
  imagesCount: number;
}

/**
 * Summarizes ONLY the study materials that the user has uploaded in the current workspace.
 * Excludes any AI Tutor chats and built-in sample/demo files.
 */
export function getUserWorkspaceDataSummary(workspace: Workspace): UserExportSummary {
  const userFiles = (workspace?.files || []).filter(isUserUploadedFile);

  const pdfsAndDocs: WorkspaceFile[] = [];
  const videosAndLinks: WorkspaceFile[] = [];
  const imagesAndDiagrams: WorkspaceFile[] = [];
  let videosCount = 0;
  let linksCount = 0;

  userFiles.forEach(f => {
    const t = String(f.type || '').toLowerCase();
    const n = String(f.name || '').toLowerCase();
    if (t.includes('video') || t.includes('audio')) {
      videosAndLinks.push(f);
      videosCount++;
    } else if (t.includes('url') || t.includes('link') || (f.url && /^https?:\/\//i.test(f.url))) {
      videosAndLinks.push(f);
      linksCount++;
    } else if (t.includes('image') || /\.(png|jpg|jpeg|webp|gif|svg)$/i.test(n)) {
      imagesAndDiagrams.push(f);
    } else {
      pdfsAndDocs.push(f);
    }
  });

  return {
    totalFiles: userFiles.length,
    pdfsAndDocs,
    videosAndLinks,
    imagesAndDiagrams,
    pdfsCount: pdfsAndDocs.length,
    videosCount,
    linksCount,
    imagesCount: imagesAndDiagrams.length
  };
}

// ============================================================================
// Standard PKZIP Builder & Extractor (Zero external dependencies)
// ============================================================================

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC32_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export interface ZipEntryInput {
  path: string;
  data: Uint8Array;
}

export function createZipArchive(entries: ZipEntryInput[]): Uint8Array {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  const now = new Date();
  const dosTime =
    ((now.getHours() & 0x1f) << 11) |
    ((now.getMinutes() & 0x3f) << 5) |
    ((Math.floor(now.getSeconds() / 2)) & 0x1f);
  const dosDate =
    (((Math.max(1980, now.getFullYear()) - 1980) & 0x7f) << 9) |
    (((now.getMonth() + 1) & 0x0f) << 5) |
    (now.getDate() & 0x1f);

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.path);
    const data = entry.data;
    const crc = crc32(data);
    const size = data.length;

    // Local file header (30 bytes + file name)
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(localHeader.buffer);
    lv.setUint32(0, 0x04034b50, true); // Local file header signature
    lv.setUint16(4, 20, true);         // Version needed to extract (2.0)
    lv.setUint16(6, 0x0800, true);     // General purpose bit flag (UTF-8)
    lv.setUint16(8, 0, true);          // Compression method: 0 (Store)
    lv.setUint16(10, dosTime, true);
    lv.setUint16(12, dosDate, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, size, true);      // Compressed size
    lv.setUint32(22, size, true);      // Uncompressed size
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);         // Extra field length
    localHeader.set(nameBytes, 30);

    localParts.push(localHeader, data);

    // Central directory file header (46 bytes + file name)
    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(centralHeader.buffer);
    cv.setUint32(0, 0x02014b50, true); // Central directory signature
    cv.setUint16(4, 20, true);         // Version made by
    cv.setUint16(6, 20, true);         // Version needed
    cv.setUint16(8, 0x0800, true);     // UTF-8 flag
    cv.setUint16(10, 0, true);         // Compression method: 0 (Store)
    cv.setUint16(12, dosTime, true);
    cv.setUint16(14, dosDate, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, size, true);
    cv.setUint32(24, size, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);         // Extra length
    cv.setUint16(32, 0, true);         // Comment length
    cv.setUint16(34, 0, true);         // Disk number
    cv.setUint16(36, 0, true);         // Internal attrs
    cv.setUint32(38, 0, true);         // External attrs
    cv.setUint32(42, offset, true);    // Relative offset of local header
    centralHeader.set(nameBytes, 46);

    centralParts.push(centralHeader);
    offset += localHeader.length + data.length;
  }

  const centralSize = centralParts.reduce((acc, p) => acc + p.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);   // End of central directory signature
  ev.setUint16(4, 0, true);            // Number of this disk
  ev.setUint16(6, 0, true);            // Disk where central directory starts
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);      // Offset of start of central directory
  ev.setUint16(20, 0, true);           // Comment length

  const totalLength = offset + centralSize + eocd.length;
  const out = new Uint8Array(totalLength);
  let pos = 0;
  for (const part of localParts) {
    out.set(part, pos);
    pos += part.length;
  }
  for (const part of centralParts) {
    out.set(part, pos);
    pos += part.length;
  }
  out.set(eocd, pos);
  return out;
}

function base64ToUint8Array(base64: string): Uint8Array {
  const cleaned = base64.includes(',') ? base64.split(',')[1] : base64;
  const binary = atob(cleaned.trim());
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const sub = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(sub));
  }
  return btoa(binary);
}

function getExtensionForFile(file: WorkspaceFile): string {
  const existingExtMatch = (file.name || '').match(/\.([a-zA-Z0-9]{2,5})$/);
  if (existingExtMatch) return `.${existingExtMatch[1].toLowerCase()}`;

  const mime = (file.fileMimeType || '').toLowerCase();
  const type = (file.type || '').toLowerCase();
  if (mime.includes('pdf') || type === 'pdf') return '.pdf';
  if (mime.includes('png')) return '.png';
  if (mime.includes('webp')) return '.webp';
  if (mime.includes('jpeg') || mime.includes('jpg') || type === 'image') return '.jpg';
  if (mime.includes('mp4') || type === 'video') return '.mp4';
  if (mime.includes('mpeg') || mime.includes('mp3') || type === 'audio') return '.mp3';
  if (type === 'ppt') return '.pptx';
  if (type === 'excel') return '.xlsx';
  return '.md';
}

function buildFileMarkdownNotes(file: WorkspaceFile): string {
  const lines: string[] = [
    `# ${file.name}`,
    `**Type:** ${String(file.type || 'Document').toUpperCase()}`,
    file.uploadDate ? `**Uploaded:** ${file.uploadDate}` : '',
    file.size ? `**Size:** ${file.size}` : '',
    file.url && !String(file.url).startsWith('data:') ? `**Source URL:** ${file.url}` : '',
    '',
    file.summary ? `## Summary\n${file.summary}\n` : '',
    Array.isArray(file.highlights) && file.highlights.length > 0
      ? `## Key Takeaways & Highlights\n${file.highlights.map(h => `- ${h}`).join('\n')}\n`
      : '',
    Array.isArray(file.formulas) && file.formulas.length > 0
      ? `## Formulas\n${file.formulas.map(fm => `- ${fm}`).join('\n')}\n`
      : '',
    (file.transcription || file.contentText)
      ? `## Extracted Content & Study Notes\n${file.transcription || file.contentText}\n`
      : ''
  ].filter(Boolean);

  return lines.join('\n');
}

function buildZipEntriesForFiles(files: WorkspaceFile[], workspaceName: string): ZipEntryInput[] {
  const encoder = new TextEncoder();
  const entries: ZipEntryInput[] = [];
  const usedPaths = new Set<string>();

  const uniquePath = (basePath: string): string => {
    if (!usedPaths.has(basePath)) {
      usedPaths.add(basePath);
      return basePath;
    }
    const dotIdx = basePath.lastIndexOf('.');
    const stem = dotIdx !== -1 ? basePath.slice(0, dotIdx) : basePath;
    const ext = dotIdx !== -1 ? basePath.slice(dotIdx) : '';
    let counter = 2;
    while (usedPaths.has(`${stem}_${counter}${ext}`)) {
      counter++;
    }
    const finalPath = `${stem}_${counter}${ext}`;
    usedPaths.add(finalPath);
    return finalPath;
  };

  const manifestMaterials = files.map((file, idx) => {
    const safeBaseName = (file.name || `Material_${idx + 1}`)
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9._-]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 60) || `Material_${idx + 1}`;

    let binaryEntryPath: string | undefined;
    const rawBase64 =
      file.fileBase64 ||
      (file.url && file.url.startsWith('data:') ? file.url.split(',')[1] || '' : '');

    if (rawBase64) {
      try {
        const bytes = base64ToUint8Array(rawBase64);
        const ext = getExtensionForFile(file);
        binaryEntryPath = uniquePath(`materials/${safeBaseName}${ext}`);
        entries.push({
          path: binaryEntryPath,
          data: bytes
        });
      } catch {
        // Ignore malformed base64
      }
    }

    const mdNotes = buildFileMarkdownNotes(file);
    const notesEntryPath = uniquePath(`materials/${safeBaseName}_Study_Notes.md`);
    entries.push({
      path: notesEntryPath,
      data: encoder.encode(mdNotes)
    });

    return {
      id: file.id,
      name: file.name,
      type: file.type,
      size: file.size,
      uploadDate: file.uploadDate,
      status: 'indexed' as const,
      tags: file.tags || ['Indexed'],
      summary: file.summary,
      highlights: file.highlights,
      transcription: file.transcription,
      contentText: file.contentText || file.transcription,
      formulas: file.formulas,
      extractedDiagrams: file.extractedDiagrams,
      url: file.url && !file.url.startsWith('data:') ? file.url : undefined,
      fileMimeType: file.fileMimeType,
      binaryEntryPath,
      notesEntryPath
    };
  });

  const manifest = {
    exportedFrom: 'StudyWeb',
    version: 2,
    exportedAt: new Date().toISOString(),
    workspaceName,
    materialsCount: manifestMaterials.length,
    materials: manifestMaterials
  };

  entries.push({
    path: 'studyweb_materials_manifest.json',
    data: encoder.encode(JSON.stringify(manifest, null, 2))
  });

  return entries;
}

/**
 * Exports ONLY the materials that the user has uploaded in the active workspace
 * into a single `.zip` archive. Excludes AI Tutor chats and sample files.
 */
export function exportAllUserWorkspaceDataAtOnce(
  activeWorkspace: Workspace
): { exportedCount: number; exportedItemsCount: number; filesCount: number; fileName: string } {
  const uploadedFiles = (activeWorkspace?.files || []).filter(isUserUploadedFile);
  const dateSlug = new Date().toISOString().split('T')[0];
  const safeWsSlug = (activeWorkspace?.name || 'Workspace')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40) || 'Workspace';

  const zipEntries = buildZipEntriesForFiles(uploadedFiles, activeWorkspace?.name || 'Workspace');
  const zipBytes = createZipArchive(zipEntries);
  const zipFileName = `StudyWeb_Workspace_${safeWsSlug}_${dateSlug}.zip`;

  triggerBinaryDownload(zipBytes, zipFileName, 'application/zip');

  return {
    exportedCount: uploadedFiles.length,
    exportedItemsCount: uploadedFiles.length,
    filesCount: uploadedFiles.length,
    fileName: zipFileName
  };
}

/**
 * Exports a single user-uploaded material as a `.zip` file.
 */
export function exportSingleUserFile(file: WorkspaceFile): void {
  const safeName = (file.name || 'Study_Material')
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .slice(0, 50) || 'Study_Material';

  const zipEntries = buildZipEntriesForFiles([file], file.name || 'Study Material');
  const zipBytes = createZipArchive(zipEntries);
  triggerBinaryDownload(zipBytes, `${safeName}_StudyWeb.zip`, 'application/zip');
}

function triggerBinaryDownload(bytes: Uint8Array, fileName: string, mimeType: string): void {
  if (typeof window === 'undefined') return;
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2500);
}

// ============================================================================
// ZIP Archive Reader & StudyWeb Material Importer
// ============================================================================

async function inflateRawBytes(compressed: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('DecompressionStream is not supported in this browser.');
  }
  const ds = new DecompressionStream('deflate-raw');
  const writer = ds.writable.getWriter();
  writer.write(compressed as unknown as BufferSource);
  writer.close();

  const reader = ds.readable.getReader();
  const chunks: Uint8Array[] = [];
  let totalLen = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      totalLen += value.length;
    }
  }
  const result = new Uint8Array(totalLen);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

export async function extractZipEntries(zipFile: File): Promise<Map<string, Uint8Array>> {
  const buffer = await zipFile.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const decoder = new TextDecoder('utf-8');
  const extracted = new Map<string, Uint8Array>();

  // Locate End of Central Directory (EOCD) signature 0x06054b50 from the end
  let eocdOffset = -1;
  const minEocdOffset = Math.max(0, bytes.length - 65557);
  for (let i = bytes.length - 22; i >= minEocdOffset; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset !== -1) {
    const totalEntries = view.getUint16(eocdOffset + 10, true);
    const centralDirOffset = view.getUint32(eocdOffset + 16, true);
    let ptr = centralDirOffset;

    for (let i = 0; i < totalEntries && ptr + 46 <= bytes.length; i++) {
      const sig = view.getUint32(ptr, true);
      if (sig !== 0x02014b50) break;

      const compressionMethod = view.getUint16(ptr + 10, true);
      const compressedSize = view.getUint32(ptr + 20, true);
      const nameLen = view.getUint16(ptr + 28, true);
      const extraLen = view.getUint16(ptr + 30, true);
      const commentLen = view.getUint16(ptr + 32, true);
      const localHeaderOffset = view.getUint32(ptr + 42, true);

      const fileName = decoder.decode(bytes.subarray(ptr + 46, ptr + 46 + nameLen));
      ptr += 46 + nameLen + extraLen + commentLen;

      if (fileName.endsWith('/') || fileName.startsWith('__MACOSX/') || fileName.includes('/.')) {
        continue;
      }

      if (localHeaderOffset + 30 > bytes.length) continue;
      const localNameLen = view.getUint16(localHeaderOffset + 26, true);
      const localExtraLen = view.getUint16(localHeaderOffset + 28, true);
      const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
      const rawSlice = bytes.subarray(dataStart, dataStart + compressedSize);

      if (compressionMethod === 0) {
        extracted.set(fileName, rawSlice);
      } else if (compressionMethod === 8) {
        try {
          const decompressed = await inflateRawBytes(rawSlice);
          extracted.set(fileName, decompressed);
        } catch (err) {
          console.warn(`Could not decompress entry ${fileName}:`, err);
        }
      }
    }
  }

  return extracted;
}

function inferMimeTypeFromFileName(name: string): string {
  const ext = (name.split('.').pop() || '').toLowerCase();
  switch (ext) {
    case 'pdf':
      return 'application/pdf';
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'webp':
      return 'image/webp';
    case 'mp3':
      return 'audio/mpeg';
    case 'wav':
      return 'audio/wav';
    case 'mp4':
      return 'video/mp4';
    case 'webm':
      return 'video/webm';
    case 'doc':
      return 'application/msword';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'ppt':
      return 'application/vnd.ms-powerpoint';
    case 'pptx':
      return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    case 'csv':
      return 'text/csv';
    case 'md':
      return 'text/markdown';
    default:
      return 'text/plain';
  }
}

export interface ParsedZipWorkspaceImport {
  restoredWorkspaceFiles: WorkspaceFile[];
  standaloneFiles: File[];
}

/**
 * Parses an uploaded `.zip` file.
 * - If it was exported from StudyWeb (contains `studyweb_materials_manifest.json`),
 *   restores the full `WorkspaceFile[]` items (including binary data and extracted notes).
 * - If it is a general `.zip` archive containing PDFs, documents, images, text, audio, or video,
 *   returns them as `File[]` objects so StudyWeb can analyze and index each file into the workspace.
 */
export async function parseWorkspaceZipFile(zipFile: File): Promise<ParsedZipWorkspaceImport> {
  const entries = await extractZipEntries(zipFile);
  const decoder = new TextDecoder('utf-8');
  const restoredWorkspaceFiles: WorkspaceFile[] = [];
  const standaloneFiles: File[] = [];

  const manifestBytes = entries.get('studyweb_materials_manifest.json');
  if (manifestBytes) {
    try {
      const manifest = JSON.parse(decoder.decode(manifestBytes));
      if (Array.isArray(manifest?.materials)) {
        for (const item of manifest.materials) {
          let fileBase64: string | undefined = item.fileBase64;
          let fileMimeType: string | undefined = item.fileMimeType;
          let dataUrl: string | undefined = item.url;

          if (item.binaryEntryPath && entries.has(item.binaryEntryPath)) {
            const binBytes = entries.get(item.binaryEntryPath)!;
            fileMimeType = fileMimeType || inferMimeTypeFromFileName(item.binaryEntryPath);
            fileBase64 = uint8ArrayToBase64(binBytes);
            dataUrl = `data:${fileMimeType};base64,${fileBase64}`;
          }

          restoredWorkspaceFiles.push({
            id: item.id || `file-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            name: item.name || 'Imported Study Material',
            type: item.type || 'doc',
            size: item.size || 'Imported from ZIP',
            uploadDate: item.uploadDate || new Date().toISOString().split('T')[0],
            status: 'indexed',
            tags: Array.isArray(item.tags) && item.tags.length > 0 ? item.tags : ['Indexed', 'Imported'],
            summary: item.summary || '',
            highlights: Array.isArray(item.highlights) ? item.highlights : [],
            transcription: item.transcription || item.contentText || '',
            contentText: item.contentText || item.transcription || '',
            formulas: Array.isArray(item.formulas) ? item.formulas : undefined,
            extractedDiagrams: item.extractedDiagrams,
            url: dataUrl,
            fileBase64,
            fileMimeType
          });
        }
        return { restoredWorkspaceFiles, standaloneFiles: [] };
      }
    } catch (err) {
      console.warn('Failed to parse studyweb_materials_manifest.json from ZIP:', err);
    }
  }

  // Otherwise, treat as a standard ZIP containing study files
  const supportedExts = new Set([
    'pdf', 'doc', 'docx', 'ppt', 'pptx', 'txt', 'md', 'csv',
    'jpg', 'jpeg', 'png', 'webp', 'mp3', 'wav', 'mp4', 'webm'
  ]);

  entries.forEach((data, path) => {
    const cleanFileName = path.split('/').pop() || path;
    const ext = (cleanFileName.split('.').pop() || '').toLowerCase();
    if (!supportedExts.has(ext) || data.length === 0) return;

    const mime = inferMimeTypeFromFileName(cleanFileName);
    const fileObj = new File([data.buffer as ArrayBuffer], cleanFileName, { type: mime });
    standaloneFiles.push(fileObj);
  });

  return { restoredWorkspaceFiles, standaloneFiles };
}
