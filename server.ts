import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  processAndRecalculateLedger,
  validateLedgerInput,
  RawLedgerInput,
} from './src/utils/ledgerEngine';
import {
  readRawLedgerStore,
  saveRawLedgerStore,
  CorruptedDatabaseError,
} from './src/utils/ledgerStorage';

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.disable('x-powered-by');
app.use(express.json({ limit: '10mb' }));

// Middleware for Corrupted DB Protection Error Handling
function handleStoreError(res: Response, err: any) {
  if (err instanceof CorruptedDatabaseError) {
    return res.status(500).json({
      error: 'CORRUPTED_DATABASE',
      message: err.message,
      details: 'The ledger store JSON file contains invalid formatting. Operations halted to protect financial data.',
    });
  }
  return res.status(500).json({
    error: 'STORAGE_ERROR',
    message: err.message || 'An internal database storage error occurred.',
  });
}

// GET /api/ledger - Returns complete recalculated ledger
app.get('/api/ledger', (req: Request, res: Response) => {
  try {
    const rawRecords = readRawLedgerStore();
    const recalculated = processAndRecalculateLedger(rawRecords);
    res.json(recalculated);
  } catch (err) {
    handleStoreError(res, err);
  }
});

// GET /api/ledger/slips/:slipNo - Get all items belonging to a Slip No
app.get('/api/ledger/slips/:slipNo', (req: Request, res: Response) => {
  try {
    const { slipNo } = req.params;
    const rawRecords = readRawLedgerStore();
    const recalculated = processAndRecalculateLedger(rawRecords);
    const slipItems = recalculated.filter(
      (r) => r.slipNo.toLowerCase() === slipNo.trim().toLowerCase()
    );
    res.json(slipItems);
  } catch (err) {
    handleStoreError(res, err);
  }
});

// POST /api/ledger - Add single or multiple ledger entries
app.post('/api/ledger', (req: Request, res: Response) => {
  try {
    const body = req.body;
    const itemsInput: RawLedgerInput[] = Array.isArray(body) ? body : [body];

    if (itemsInput.length === 0) {
      return res.status(400).json({ error: 'INVALID_INPUT', message: 'At least one ledger entry is required.' });
    }

    // Validate all items before writing
    const allErrors: { index: number; errors: any[] }[] = [];
    itemsInput.forEach((item, index) => {
      const valResult = validateLedgerInput(item);
      if (!valResult.isValid) {
        allErrors.push({ index, errors: valResult.errors });
      }
    });

    if (allErrors.length > 0) {
      return res.status(400).json({
        error: 'VALIDATION_FAILED',
        message: 'Invalid entry input provided.',
        validationErrors: allErrors,
      });
    }

    const rawRecords = readRawLedgerStore();
    const now = new Date().toISOString();

    const newEntries: RawLedgerInput[] = itemsInput.map((item, idx) => ({
      ...item,
      id: item.id || `rec_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: item.createdAt || new Date(Date.now() + idx).toISOString(),
    }));

    const updatedRaw = [...rawRecords, ...newEntries];
    saveRawLedgerStore(updatedRaw);

    const recalculated = processAndRecalculateLedger(updatedRaw);
    res.status(201).json({ success: true, count: newEntries.length, data: recalculated });
  } catch (err) {
    handleStoreError(res, err);
  }
});

// PUT /api/ledger/slips/:slipNo - Bulk update complete slip group
app.put('/api/ledger/slips/:slipNo', (req: Request, res: Response) => {
  try {
    const targetSlipNo = req.params.slipNo.trim();
    const body = req.body;
    const updatedSlipItems: RawLedgerInput[] = Array.isArray(body) ? body : [body];

    if (updatedSlipItems.length === 0) {
      return res.status(400).json({ error: 'INVALID_INPUT', message: 'Slip payload cannot be empty.' });
    }

    // Validate items
    const allErrors: { index: number; errors: any[] }[] = [];
    updatedSlipItems.forEach((item, index) => {
      const valResult = validateLedgerInput(item);
      if (!valResult.isValid) {
        allErrors.push({ index, errors: valResult.errors });
      }
    });

    if (allErrors.length > 0) {
      return res.status(400).json({
        error: 'VALIDATION_FAILED',
        message: 'Validation failed on updated slip entries.',
        validationErrors: allErrors,
      });
    }

    const rawRecords = readRawLedgerStore();
    // Remove all existing records belonging to this slip
    const nonSlipRecords = rawRecords.filter(
      (r) => (r.slipNo || '').trim().toLowerCase() !== targetSlipNo.toLowerCase()
    );

    const now = new Date().toISOString();
    const newSlipEntries: RawLedgerInput[] = updatedSlipItems.map((item, idx) => ({
      ...item,
      slipNo: item.slipNo || targetSlipNo,
      id: item.id || `rec_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: item.createdAt || now,
    }));

    const updatedRaw = [...nonSlipRecords, ...newSlipEntries];
    saveRawLedgerStore(updatedRaw);

    const recalculated = processAndRecalculateLedger(updatedRaw);
    res.json({ success: true, count: newSlipEntries.length, data: recalculated });
  } catch (err) {
    handleStoreError(res, err);
  }
});

// PUT /api/ledger/:id - Update single entry
app.put('/api/ledger/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const rawRecords = readRawLedgerStore();
    const index = rawRecords.findIndex((e) => e.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Ledger entry not found.' });
    }

    const updatedFields: RawLedgerInput = req.body;
    const mergedInput: RawLedgerInput = {
      ...rawRecords[index],
      ...updatedFields,
      id,
    };

    const valResult = validateLedgerInput(mergedInput);
    if (!valResult.isValid) {
      return res.status(400).json({
        error: 'VALIDATION_FAILED',
        message: 'Invalid updated fields provided.',
        validationErrors: valResult.errors,
      });
    }

    rawRecords[index] = mergedInput;
    saveRawLedgerStore(rawRecords);

    const recalculated = processAndRecalculateLedger(rawRecords);
    res.json({ success: true, data: recalculated });
  } catch (err) {
    handleStoreError(res, err);
  }
});

// DELETE /api/ledger/:id - Delete single entry
app.delete('/api/ledger/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const rawRecords = readRawLedgerStore();
    const filtered = rawRecords.filter((e) => e.id !== id);

    if (filtered.length === rawRecords.length) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Ledger entry not found.' });
    }

    saveRawLedgerStore(filtered);
    const recalculated = processAndRecalculateLedger(filtered);
    res.json({ success: true, data: recalculated });
  } catch (err) {
    handleStoreError(res, err);
  }
});

// DELETE /api/ledger - Destructive Clear All with backup creation
app.delete('/api/ledger', (req: Request, res: Response) => {
  try {
    saveRawLedgerStore([]);
    res.json({ success: true, message: 'All ledger data cleared and backup preserved.', data: [] });
  } catch (err) {
    handleStoreError(res, err);
  }
});

// Start Vite / Production Static Server
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
