import fs from 'fs';
import path from 'path';
import { RawLedgerInput } from './ledgerEngine';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'ledger_store.json');
const BACKUP_FILE = path.join(DATA_DIR, 'ledger_store.json.bak');

export class CorruptedDatabaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CorruptedDatabaseError';
  }
}

export function initDatabase() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
}

export function readRawLedgerStore(): RawLedgerInput[] {
  initDatabase();
  const fileContent = fs.readFileSync(DATA_FILE, 'utf-8');
  if (!fileContent.trim()) {
    return [];
  }
  try {
    const data = JSON.parse(fileContent);
    if (!Array.isArray(data)) {
      throw new Error('Database root must be a JSON array.');
    }
    return data;
  } catch (err: any) {
    throw new CorruptedDatabaseError(
      `Ledger store file is corrupted or unreadable: ${err.message}. Original file retained at ${DATA_FILE}.`
    );
  }
}

export function saveRawLedgerStore(records: RawLedgerInput[]) {
  initDatabase();

  if (fs.existsSync(DATA_FILE)) {
    try {
      const existing = fs.readFileSync(DATA_FILE, 'utf-8');
      JSON.parse(existing);
      fs.writeFileSync(BACKUP_FILE, existing, 'utf-8');
    } catch {
      // Do not overwrite valid backup with corrupted file
    }
  }

  const tempFile = path.join(DATA_DIR, `ledger_store_${Date.now()}.tmp`);
  const payload = JSON.stringify(records, null, 2);
  fs.writeFileSync(tempFile, payload, 'utf-8');
  fs.renameSync(tempFile, DATA_FILE);
}
