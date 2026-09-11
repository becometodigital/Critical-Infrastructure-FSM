import { LedgerRecord } from '../types/ledger';

export const LedgerApi = {
  async getLedger(): Promise<LedgerRecord[]> {
    const res = await fetch('/api/ledger');
    if (!res.ok) throw new Error('Failed to fetch ledger');
    return res.json();
  },

  async addEntries(entries: Partial<LedgerRecord>[]): Promise<{ success: boolean; data: LedgerRecord[] }> {
    const res = await fetch('/api/ledger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entries),
    });
    if (!res.ok) throw new Error('Failed to add entries');
    return res.json();
  },

  async updateEntry(id: string, entry: Partial<LedgerRecord>): Promise<{ success: boolean; data: LedgerRecord[] }> {
    const res = await fetch(`/api/ledger/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
    if (!res.ok) throw new Error('Failed to update entry');
    return res.json();
  },

  async deleteEntry(id: string): Promise<{ success: boolean; data: LedgerRecord[] }> {
    const res = await fetch(`/api/ledger/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete entry');
    return res.json();
  },

  async clearLedger(): Promise<{ success: boolean; data: LedgerRecord[] }> {
    const res = await fetch('/api/ledger', {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to clear ledger');
    return res.json();
  },
};
