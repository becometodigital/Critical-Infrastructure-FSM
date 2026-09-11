import { LedgerRecord } from '../types/ledger';

export interface ApiErrorResponse {
  error: string;
  message: string;
  details?: string;
  validationErrors?: any[];
}

export const LedgerApi = {
  async getLedger(): Promise<LedgerRecord[]> {
    const res = await fetch('/api/ledger');
    if (!res.ok) {
      const errJson: ApiErrorResponse = await res.json().catch(() => ({
        error: 'UNKNOWN_ERROR',
        message: `HTTP ${res.status}: Failed to load ledger data.`,
      }));
      throw new Error(errJson.message || 'Failed to fetch ledger');
    }
    return res.json();
  },

  async getSlipItems(slipNo: string): Promise<LedgerRecord[]> {
    const res = await fetch(`/api/ledger/slips/${encodeURIComponent(slipNo)}`);
    if (!res.ok) {
      const errJson: ApiErrorResponse = await res.json().catch(() => ({
        error: 'UNKNOWN_ERROR',
        message: `HTTP ${res.status}: Failed to fetch slip items.`,
      }));
      throw new Error(errJson.message || 'Failed to fetch slip items');
    }
    return res.json();
  },

  async addEntries(entries: Partial<LedgerRecord>[]): Promise<{ success: boolean; data: LedgerRecord[] }> {
    const res = await fetch('/api/ledger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entries),
    });
    if (!res.ok) {
      const errJson: ApiErrorResponse = await res.json().catch(() => ({
        error: 'UNKNOWN_ERROR',
        message: `HTTP ${res.status}: Failed to save entries.`,
      }));
      throw new Error(errJson.message || 'Failed to add entries');
    }
    return res.json();
  },

  async updateEntry(id: string, entry: Partial<LedgerRecord>): Promise<{ success: boolean; data: LedgerRecord[] }> {
    const res = await fetch(`/api/ledger/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
    if (!res.ok) {
      const errJson: ApiErrorResponse = await res.json().catch(() => ({
        error: 'UNKNOWN_ERROR',
        message: `HTTP ${res.status}: Failed to update entry.`,
      }));
      throw new Error(errJson.message || 'Failed to update entry');
    }
    return res.json();
  },

  async updateSlipGroup(slipNo: string, entries: Partial<LedgerRecord>[]): Promise<{ success: boolean; data: LedgerRecord[] }> {
    const res = await fetch(`/api/ledger/slips/${encodeURIComponent(slipNo)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entries),
    });
    if (!res.ok) {
      const errJson: ApiErrorResponse = await res.json().catch(() => ({
        error: 'UNKNOWN_ERROR',
        message: `HTTP ${res.status}: Failed to update slip group.`,
      }));
      throw new Error(errJson.message || 'Failed to update slip group');
    }
    return res.json();
  },

  async deleteEntry(id: string): Promise<{ success: boolean; data: LedgerRecord[] }> {
    const res = await fetch(`/api/ledger/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const errJson: ApiErrorResponse = await res.json().catch(() => ({
        error: 'UNKNOWN_ERROR',
        message: `HTTP ${res.status}: Failed to delete entry.`,
      }));
      throw new Error(errJson.message || 'Failed to delete entry');
    }
    return res.json();
  },

  async clearLedger(): Promise<{ success: boolean; data: LedgerRecord[] }> {
    const res = await fetch('/api/ledger', {
      method: 'DELETE',
    });
    if (!res.ok) {
      const errJson: ApiErrorResponse = await res.json().catch(() => ({
        error: 'UNKNOWN_ERROR',
        message: `HTTP ${res.status}: Failed to clear ledger.`,
      }));
      throw new Error(errJson.message || 'Failed to clear ledger');
    }
    return res.json();
  },
};
