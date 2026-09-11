export interface RawLedgerInput {
  id?: string;
  date?: string;
  slipNo?: string;
  itemCode?: string;
  itemName?: string;
  qty?: number | string;
  rate?: number | string;
  wChg?: number | string;
  amount?: number | string;
  payment?: number | string;
  title?: string;
  paymentDate?: string;
  remarks?: string;
  createdAt?: string;
}

export interface LedgerRecord {
  id: string;
  date: string; // YYYY-MM-DD
  slipNo: string;
  itemCode: string; // Normalized: K/V, P/O, E/TIN, CAP, L/S, M/S, or original
  itemName: string; // Auto-mapped if known code
  qty: number;
  rate: number;
  wChg: number;
  amount: number;
  payment: number;
  title: string;
  paymentDate: string; // YYYY-MM-DD or ""
  remarks: string;
  runningBalance: number;
  createdAt: string;
}

// Canonical Item Code Mapping
export const ITEM_CODE_MAP: Record<string, string> = {
  'K/V': 'Port',
  'P/O': 'Olien',
  'E/TIN': 'Empty tin',
  'CAP': 'Cap',
  'L/S': 'Line serso',
  'M/S': 'Mill serso',
};

// Normalize Item Code (e.g. " k/v " -> "K/V")
export function normalizeItemCode(rawCode?: string): string {
  if (!rawCode) return '';
  const trimmed = rawCode.trim().toUpperCase();
  for (const key of Object.keys(ITEM_CODE_MAP)) {
    if (key.toUpperCase() === trimmed) {
      return key;
    }
  }
  return rawCode.trim();
}

// Map item name from code; if known code, enforce canonical mapped name
export function getCanonicalItemName(code: string, userGivenName?: string): string {
  const normalized = normalizeItemCode(code);
  if (ITEM_CODE_MAP[normalized]) {
    return ITEM_CODE_MAP[normalized];
  }
  return userGivenName ? userGivenName.trim() : '';
}

// Date Normalization (handles YYYY-MM-DD, D-MMM-YY, DD/MM/YYYY, etc.)
export function normalizeDate(dateStr?: string): string {
  if (!dateStr || typeof dateStr !== 'string') {
    return new Date().toISOString().split('T')[0];
  }

  const trimmed = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const monthMap: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
  };

  const textMatch = trimmed.match(/^(\d{1,2})[-/ ]([A-Za-z]{3})[-/ ](\d{2,4})$/);
  if (textMatch) {
    const day = textMatch[1].padStart(2, '0');
    const mStr = textMatch[2].toLowerCase();
    let year = textMatch[3];
    if (year.length === 2) {
      year = `20${year}`;
    }
    if (monthMap[mStr]) {
      return `${year}-${monthMap[mStr]}-${day}`;
    }
  }

  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return trimmed;
}

// Strict Input Validator
export interface ValidationError {
  field: string;
  message: string;
}

export function validateLedgerInput(input: RawLedgerInput): { isValid: boolean; errors: ValidationError[] } {
  const errors: ValidationError[] = [];

  if (!input.date || typeof input.date !== 'string' || input.date.trim() === '') {
    errors.push({ field: 'date', message: 'Date is required.' });
  }

  const numCheck = (val: any, name: string) => {
    if (val !== undefined && val !== null && val !== '') {
      const num = Number(val);
      if (isNaN(num)) {
        errors.push({ field: name, message: `${name} must be a valid number.` });
      } else if (num < 0) {
        errors.push({ field: name, message: `${name} cannot be negative.` });
      }
    }
  };

  numCheck(input.qty, 'qty');
  numCheck(input.rate, 'rate');
  numCheck(input.wChg, 'wChg');
  numCheck(input.amount, 'amount');
  numCheck(input.payment, 'payment');

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Calculation & Processing Engine
export function processAndRecalculateLedger(records: RawLedgerInput[]): LedgerRecord[] {
  const sanitized = records.map((r) => {
    const normCode = normalizeItemCode(r.itemCode);
    const mappedName = getCanonicalItemName(normCode, r.itemName);

    const qty = Number(r.qty) || 0;
    const rate = Number(r.rate) || 0;
    const wChg = Number(r.wChg) || 0;

    const calculatedAmount = (qty > 0 || rate > 0) ? (qty * rate) + wChg : (Number(r.amount) || 0);
    const payment = Number(r.payment) || 0;

    return {
      id: r.id || `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      date: normalizeDate(r.date),
      slipNo: (r.slipNo || '').trim(),
      itemCode: normCode,
      itemName: mappedName,
      qty,
      rate,
      wChg,
      amount: calculatedAmount,
      payment,
      title: (r.title || '').trim(),
      paymentDate: r.paymentDate ? normalizeDate(r.paymentDate) : '',
      remarks: (r.remarks || '').trim(),
      runningBalance: 0,
      createdAt: r.createdAt || new Date().toISOString(),
    };
  });

  sanitized.sort((a, b) => {
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    return a.createdAt.localeCompare(b.createdAt);
  });

  let currentBalance = 0;
  return sanitized.map((entry) => {
    currentBalance = currentBalance + entry.amount - entry.payment;
    return {
      ...entry,
      runningBalance: currentBalance,
    };
  });
}
