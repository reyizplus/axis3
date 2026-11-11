import * as fs from 'fs';
import * as path from 'path';

export const LOG_DIR = process.env.LOG_FILE_DIR || path.join(process.cwd(), 'logs');
export const APP_LOG = path.join(LOG_DIR, 'app.log');
export const ACTIVITY_LOG = path.join(LOG_DIR, 'activity.log');
export const ERROR_LOG = path.join(LOG_DIR, 'error.log');

const MAX_LOG_SIZE_BYTES = 10 * 1024 * 1024; // 10MB per file

function ensureDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function rotateIfNeeded(filePath: string) {
  try {
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      if (stats.size > MAX_LOG_SIZE_BYTES) {
        const rotated = `${filePath}.${Date.now()}.bak`;
        fs.renameSync(filePath, rotated);
        // Keep only last 3 rotated files
        const dir = path.dirname(filePath);
        const base = path.basename(filePath);
        const backups = fs.readdirSync(dir)
          .filter(f => f.startsWith(base) && f.endsWith('.bak'))
          .sort()
          .reverse();
        if (backups.length > 3) {
          for (const old of backups.slice(3)) {
            fs.unlinkSync(path.join(dir, old));
          }
        }
      }
    }
  } catch {}
}

export function appendLog(message: string, file: string = APP_LOG) {
  try {
    ensureDir();
    rotateIfNeeded(file);
    fs.appendFileSync(file, message + '\n');
  } catch {
    // silently fail
  }
}

export function appendActivityLog(entry: Record<string, unknown>) {
  try {
    ensureDir();
    rotateIfNeeded(ACTIVITY_LOG);
    const line = JSON.stringify({ ...entry, timestamp: entry.timestamp || new Date().toISOString() });
    fs.appendFileSync(ACTIVITY_LOG, line + '\n');
  } catch {
    // silently fail
  }
}

export function readLogFile(lines: number = 100, file: string = APP_LOG): string[] {
  try {
    if (!fs.existsSync(file)) return [];
    const content = fs.readFileSync(file, 'utf-8');
    const allLines = content.split('\n').filter(Boolean);
    return allLines.slice(-lines);
  } catch {
    return [];
  }
}

export function readActivityLogs(userId?: string, limit: number = 5): Record<string, unknown>[] {
  try {
    if (!fs.existsSync(ACTIVITY_LOG)) return [];
    const content = fs.readFileSync(ACTIVITY_LOG, 'utf-8');
    const entries: Record<string, unknown>[] = [];
    for (const line of content.split('\n').filter(Boolean)) {
      try {
        const entry = JSON.parse(line);
        if (!userId || entry.user_id === userId) {
          entries.push(entry);
        }
      } catch {
        // skip malformed lines
      }
    }
    entries.sort((a, b) => {
      const ta = (a.timestamp || '') as string;
      const tb = (b.timestamp || '') as string;
      return tb.localeCompare(ta);
    });
    return entries.slice(0, limit);
  } catch {
    return [];
  }
}
