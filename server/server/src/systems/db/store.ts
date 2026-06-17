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
