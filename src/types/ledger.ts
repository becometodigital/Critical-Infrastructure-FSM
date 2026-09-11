export interface LedgerRecord {
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
  runningBalance: number;
  createdAt: string;
}

export const ITEM_CODE_MAPPING: Record<string, string> = {
  'K/V': 'Port',
  'P/O': 'Olien',
  'E/TIN': 'Empty tin',
  'CAP': 'Cap',
  'L/S': 'Line serso',
  'M/S': 'Mill serso',
};

export const getItemNameFromCode = (code: string): string => {
  const upper = (code || '').trim().toUpperCase();
  return ITEM_CODE_MAPPING[upper] || upper;
};
