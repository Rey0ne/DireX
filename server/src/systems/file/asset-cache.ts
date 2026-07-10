/* === File System — Local Asset Cache ===
 * Downloads external CDN assets to local disk so they survive:
 * - Network changes (WiFi switch, firewall)
 * - CDN tempfile expiry
 * - Server restarts
 *
 * Pattern: external URL → data/output/ → /api/output/ local path
 * Based on the Tripo3D downloadModel pattern (tripo-provider.ts:233)
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const OUTPUT_DIR = path.join(process.cwd(), 'data', 'output');
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// ── Helpers ──────────────────────────────────────

function extFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const basename = path.basename(u.pathname);
    const ext = path.extname(basename).toLowerCase();
    if (ext && ext.length <= 5) return ext;
  } catch {}
  return '';
}

function contentTypeToExt(contentType: string | null): string {
  if (!contentType) return '';
  const mimeMap: Record<string, string> = {
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'video/mp4': '.mp4',
    'video/webm': '.webm',
    'audio/mpeg': '.mp3',
    'audio/mp3': '.mp3',
    'audio/wav': '.wav',
    'audio/ogg': '.ogg',
  };
  // Strip charset suffix: "image/png; charset=utf-8" → "image/png"
  const baseType = (contentType || '').split(';')[0].trim();
  return mimeMap[baseType] || '';
}

function randomId(len: number): string {
  return crypto.randomBytes(Math.ceil(len / 2)).toString('hex').slice(0, len);
}

// ── Public API ───────────────────────────────────

/** Download a single external URL to local disk. Returns local /api/output/ path or null on failure. */
export async function downloadAsset(url: string): Promise<string | null> {
  // Skip if already a local path
  if (url.startsWith('/api/')) return url;

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'DireX/1.0 (asset-cache)' },
      signal: AbortSignal.timeout(60_000), // 60s timeout
    });

    if (!response.ok) {
      console.warn(`[asset-cache] Download failed: HTTP ${response.status} for ${url.slice(0, 80)}`);
      return null;
    }

    const contentType = response.headers.get('content-type');
    let ext = extFromUrl(url) || contentTypeToExt(contentType);

    // Fallback: try to sniff from buffer
    if (!ext) {
      const buffer = Buffer.from(await response.arrayBuffer());
      ext = sniffExt(buffer);
      const filename = `asset_${Date.now()}_${randomId(8)}${ext}`;
      const dest = path.join(OUTPUT_DIR, filename);
      fs.writeFileSync(dest, buffer);
      console.log(`[asset-cache] Cached ${(buffer.length / 1024).toFixed(0)}KB → ${filename}`);
      return `/api/output/${filename}`;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const filename = `asset_${Date.now()}_${randomId(8)}${ext}`;
    const dest = path.join(OUTPUT_DIR, filename);
    fs.writeFileSync(dest, buffer);
    console.log(`[asset-cache] Cached ${(buffer.length / 1024).toFixed(0)}KB → ${filename}`);
    return `/api/output/${filename}`;
  } catch (err: any) {
    console.warn(`[asset-cache] Failed to download ${url.slice(0, 80)}: ${err.message?.slice(0, 80) || err}`);
    return null;
  }
}

/** Download all asset URLs from a generation result, returning local paths. */
export async function cacheGenerationResult(
  assetUrls: string[],
): Promise<{ localUrls: string[]; failed: string[] }> {
  if (!assetUrls || assetUrls.length === 0) {
    return { localUrls: [], failed: [] };
  }

  const localUrls: string[] = [];
  const failed: string[] = [];

  // Download in parallel with individual error isolation
  const results = await Promise.allSettled(
    assetUrls.map(url => downloadAsset(url)),
  );

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === 'fulfilled' && result.value) {
      localUrls.push(result.value);
    } else {
      console.warn(`[asset-cache] Asset ${i} failed, using original URL`);
      localUrls.push(assetUrls[i]); // Keep original URL as fallback
      failed.push(assetUrls[i]);
    }
  }

  if (failed.length > 0) {
    console.log(`[asset-cache] Cached ${localUrls.length - failed.length}/${assetUrls.length} assets (${failed.length} kept as external URLs)`);
  }

  return { localUrls, failed };
}

// ── File type sniffing ───────────────────────────

function sniffExt(buffer: Buffer): string {
  // Magic bytes for common formats
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return '.jpg';
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return '.png';
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) return '.gif';
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) return '.webp';
  if (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) return '.mp3';
  if (buffer[0] === 0x00 && buffer[1] === 0x00 && buffer[2] === 0x00) {
    // Could be mp4 (ftyp box at offset 4)
    if (buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70) return '.mp4';
  }
  return '.bin';
}
