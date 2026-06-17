/* === Database — JSON File Store === */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../../../data');

export function readJSON(filePath: string): any {
  try {
    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(DATA_DIR, path.basename(filePath));
    if (!fs.existsSync(fullPath)) return {};
    return JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
  } catch { return {}; }
}

export function writeJSON(filePath: string, data: any): void {
  const fullPath = path.isAbsolute(filePath) ? filePath : path.join(DATA_DIR, path.basename(filePath));
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(fullPath, JSON.stringify(data, null, 2), 'utf-8');
}

/** 备份文件（保留最近 maxBackups 个） */
export function backupJSON(filePath: string, maxBackups = 20): string | null {
  const fullPath = path.isAbsolute(filePath) ? filePath : path.join(DATA_DIR, path.basename(filePath));
  if (!fs.existsSync(fullPath)) return null;
  const dir = path.dirname(fullPath);
  const base = path.basename(filePath, '.json');
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupName = `${base}.${ts}.bak`;
  const backupPath = path.join(dir, backupName);
  fs.copyFileSync(fullPath, backupPath);
  // 清理旧备份
  const files = fs.readdirSync(dir).filter(f => f.startsWith(base + '.') && f.endsWith('.bak')).sort();
  while (files.length > maxBackups) {
    fs.unlinkSync(path.join(dir, files.shift()!));
  }
  return backupPath;
}
