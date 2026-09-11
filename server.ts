import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.disable('x-powered-by');
app.use(express.json({ limit: '10mb' }));

// Item code mapping dictionary
export const ITEM_CODE_MAP: Record<string, string> = {
  'K/V': 'Port',
  'P/O': 'Olien',
  'E/TIN': 'Empty tin',
  'CAP': 'Cap',
  'L/S': 'Line serso',
  'M/S': 'Mill serso',
};

export interface LedgerEntry {
  id: string;
  date: string;
  slipNo: string;
  itemCode: string;
  itemName: string;
  qty: number;
  rate: number;
  wChg: number;
  amount: number;
  payment: number;
  title: string;
  paymentDate: string;
  remarks: string;
  createdAt: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'ledger_store.json');

// Ensure data directory exists and data file is initialized empty
function initDatabase() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: recursive_option() });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
}

function recursive_option() {
  return true;
}

function readEntries(): LedgerEntry[] {
  initDatabase();
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeEntries(entries: LedgerEntry[]) {
  initDatabase();
  fs.writeFileSync(DATA_FILE, JSON.stringify(entries, null, 2), 'utf-8');
}

// Compute proper item name, amount, and running balances sequentially
export function processAndRecalculateLedger(entries: LedgerEntry[]): (LedgerEntry & { runningBalance: number })[] {
  // Sort entries chronologically by date, then by creation timestamp
  const sorted = [...entries].sort((a, b) => {
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    return a.createdAt.localeCompare(b.createdAt);
  });

  let currentBalance = 0;
  return sorted.map((entry) => {
    // Determine mapped item name if code matches
    const mappedName = ITEM_CODE_MAP[entry.itemCode.trim().toUpperCase()] || entry.itemName || '';

    // Amount calculation: (QTY * RATE) + W CHG
    const qty = Number(entry.qty) || 0;
    const rate = Number(entry.rate) || 0;
    const wChg = Number(entry.wChg) || 0;
    const calculatedAmount = (qty > 0 || rate > 0) ? (qty * rate) + wChg : (Number(entry.amount) || 0);

    const payment = Number(entry.payment) || 0;
    currentBalance = currentBalance + calculatedAmount - payment;

    return {
      ...entry,
      itemName: mappedName,
      amount: calculatedAmount,
      payment: payment,
      runningBalance: currentBalance,
    };
  });
}

// API Routes
app.get('/api/ledger', (req: Request, res: Response) => {
  const rawEntries = readEntries();
  const processed = processAndRecalculateLedger(rawEntries);
  res.json(processed);
});

app.post('/api/ledger', (req: Request, res: Response) => {
  const rawEntries = readEntries();
  const body = req.body;
  const newItems: LedgerEntry[] = Array.isArray(body) ? body : [body];

  const now = new Date().toISOString();
  const addedEntries: LedgerEntry[] = [];

  for (const item of newItems) {
    const itemCode = (item.itemCode || '').trim().toUpperCase();
    const mappedName = ITEM_CODE_MAP[itemCode] || item.itemName || '';
    const qty = Number(item.qty) || 0;
    const rate = Number(item.rate) || 0;
    const wChg = Number(item.wChg) || 0;
    const amount = (qty > 0 || rate > 0) ? (qty * rate) + wChg : (Number(item.amount) || 0);

    const newEntry: LedgerEntry = {
      id: item.id || `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      date: item.date || new Date().toISOString().split('T')[0],
      slipNo: item.slipNo || '',
      itemCode: itemCode,
      itemName: mappedName,
      qty,
      rate,
      wChg,
      amount,
      payment: Number(item.payment) || 0,
      title: item.title || '',
      paymentDate: item.paymentDate || '',
      remarks: item.remarks || '',
      createdAt: item.createdAt || now,
    };
    addedEntries.push(newEntry);
  }

  const updatedRaw = [...rawEntries, ...addedEntries];
  writeEntries(updatedRaw);

  const processed = processAndRecalculateLedger(updatedRaw);
  res.status(201).json({ success: true, count: addedEntries.length, data: processed });
});

app.put('/api/ledger/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const rawEntries = readEntries();
  const index = rawEntries.findIndex((e) => e.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Entry not found' });
  }

  const updatedData = req.body;
  const itemCode = (updatedData.itemCode !== undefined ? updatedData.itemCode : rawEntries[index].itemCode).trim().toUpperCase();
  const mappedName = ITEM_CODE_MAP[itemCode] || updatedData.itemName || rawEntries[index].itemName || '';
  const qty = Number(updatedData.qty !== undefined ? updatedData.qty : rawEntries[index].qty) || 0;
  const rate = Number(updatedData.rate !== undefined ? updatedData.rate : rawEntries[index].rate) || 0;
  const wChg = Number(updatedData.wChg !== undefined ? updatedData.wChg : rawEntries[index].wChg) || 0;
  const amount = (qty > 0 || rate > 0) ? (qty * rate) + wChg : (Number(updatedData.amount !== undefined ? updatedData.amount : rawEntries[index].amount) || 0);

  rawEntries[index] = {
    ...rawEntries[index],
    ...updatedData,
    id,
    itemCode,
    itemName: mappedName,
    qty,
    rate,
    wChg,
    amount,
    payment: Number(updatedData.payment !== undefined ? updatedData.payment : rawEntries[index].payment) || 0,
  };

  writeEntries(rawEntries);
  const processed = processAndRecalculateLedger(rawEntries);
  res.json({ success: true, data: processed });
});

app.delete('/api/ledger/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const rawEntries = readEntries();
  const filtered = rawEntries.filter((e) => e.id !== id);

  if (filtered.length === rawEntries.length) {
    return res.status(404).json({ error: 'Entry not found' });
  }

  writeEntries(filtered);
  const processed = processAndRecalculateLedger(filtered);
  res.json({ success: true, data: processed });
});

app.delete('/api/ledger', (req: Request, res: Response) => {
  writeEntries([]);
  res.json({ success: true, message: 'Ledger cleared', data: [] });
});

// Start Vite / Static handling
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Ledger Server running on port ${PORT}`);
  });
}

startServer();
