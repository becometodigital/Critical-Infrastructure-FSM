import React, { useState, useEffect, useMemo } from 'react';
import { LedgerRecord, ITEM_CODE_MAPPING } from './types/ledger';
import { LedgerApi } from './utils/ledgerApi';
import { EntryModal } from './components/EntryModal';
import {
  Plus,
  Search,
  Download,
  Edit2,
  Trash2,
  BookOpen,
  Filter,
  RefreshCw,
  Calendar,
  FileText,
  Tag,
  Scale,
  Trash,
} from 'lucide-react';

export function App() {
  const [records, setRecords] = useState<LedgerRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingRecord, setEditingRecord] = useState<LedgerRecord | null>(null);

  // Search & Filter state
  const [dateFilter, setDateFilter] = useState<string>('');
  const [slipFilter, setSlipFilter] = useState<string>('');
  const [itemFilter, setItemFilter] = useState<string>('');

  const loadLedgerData = async () => {
    setIsLoading(true);
    try {
      const data = await LedgerApi.getLedger();
      setRecords(data);
    } catch (err) {
      console.error('Failed to load ledger data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLedgerData();
  }, []);

  const handleSaveEntries = async (entries: Partial<LedgerRecord>[]) => {
    if (editingRecord && entries.length === 1) {
      await LedgerApi.updateEntry(editingRecord.id, entries[0]);
    } else {
      await LedgerApi.addEntries(entries);
    }
    await loadLedgerData();
  };

  const handleEdit = (record: LedgerRecord) => {
    setEditingRecord(record);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this ledger entry?')) {
      await LedgerApi.deleteEntry(id);
      await loadLedgerData();
    }
  };

  const handleClearAll = async () => {
    if (window.confirm('Are you sure you want to delete ALL ledger records? This cannot be undone.')) {
      await LedgerApi.clearLedger();
      await loadLedgerData();
    }
  };

  // Filter logic
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchDate = !dateFilter || r.date.includes(dateFilter);
      const matchSlip = !slipFilter || r.slipNo.toLowerCase().includes(slipFilter.toLowerCase());
      const matchItem =
        !itemFilter ||
        r.itemCode.toLowerCase().includes(itemFilter.toLowerCase()) ||
        r.itemName.toLowerCase().includes(itemFilter.toLowerCase());

      return matchDate && matchSlip && matchItem;
    });
  }, [records, dateFilter, slipFilter, itemFilter]);

  // Export functionality
  const handleExportCSV = () => {
    if (records.length === 0) {
      alert('No data to export.');
      return;
    }

    const headers = [
      'DATE',
      'SLIP NO',
      'ITEM CODE',
      'ITEM',
      'QTY',
      'RATE',
      'W CHG',
      'AMOUNT',
      'PAYMENT',
      'TITLE',
      'PAYMENT DATE',
      'REMARKS',
      'RUNNING BALANCE',
    ];

    const rows = filteredRecords.map((r) => [
      r.date || '',
      `"${r.slipNo || ''}"`,
      `"${r.itemCode || ''}"`,
      `"${r.itemName || ''}"`,
      r.qty || 0,
      r.rate || 0,
      r.wChg || 0,
      r.amount || 0,
      r.payment || 0,
      `"${r.title || ''}"`,
      r.paymentDate || '',
      `"${r.remarks || ''}"`,
      r.runningBalance || 0,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ledger_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Summary Metrics
  const totalAmount = useMemo(() => filteredRecords.reduce((sum, r) => sum + (r.amount || 0), 0), [filteredRecords]);
  const totalPayments = useMemo(() => filteredRecords.reduce((sum, r) => sum + (r.payment || 0), 0), [filteredRecords]);
  const latestBalance = filteredRecords.length > 0 ? filteredRecords[filteredRecords.length - 1].runningBalance : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      
      {/* Top Header */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-950/80 border border-cyan-800/60 rounded-xl text-cyan-400">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Ledger Management System
              </h1>
              <p className="text-xs text-slate-400">
                Exact balance tracking, multi-item slips & automated item mapping
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => {
                setEditingRecord(null);
                setIsModalOpen(true);
              }}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold rounded-lg shadow-md transition"
            >
              <Plus className="w-4 h-4" /> Add Ledger Entry
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center justify-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg border border-slate-700 transition"
              title="Export complete ledger to CSV"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
            {records.length > 0 && (
              <button
                onClick={handleClearAll}
                className="p-2 text-rose-400 hover:text-rose-300 bg-rose-950/30 hover:bg-rose-950/60 border border-rose-900/50 rounded-lg transition"
                title="Clear all ledger data"
              >
                <Trash className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Summary Dashboard Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Charges</div>
              <div className="text-xl font-bold font-mono text-cyan-400 mt-1">
                {totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="p-3 bg-cyan-950/40 rounded-lg text-cyan-400 border border-cyan-900/50">
              <Scale className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Payments</div>
              <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                {totalPayments.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="p-3 bg-emerald-950/40 rounded-lg text-emerald-400 border border-emerald-900/50">
              <Tag className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Current Running Balance</div>
              <div className={`text-xl font-bold font-mono mt-1 ${latestBalance >= 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {latestBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="p-3 bg-amber-950/40 rounded-lg text-amber-400 border border-amber-900/50">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <span className="flex items-center gap-1.5 text-cyan-400">
              <Filter className="w-4 h-4" /> Search & Filter Ledger
            </span>
            {(dateFilter || slipFilter || itemFilter) && (
              <button
                onClick={() => {
                  setDateFilter('');
                  setSlipFilter('');
                  setItemFilter('');
                }}
                className="text-cyan-400 hover:underline text-xs flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Clear Filters
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Filter Date */}
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                placeholder="Filter by Date"
                className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 focus:outline-hidden focus:border-cyan-500"
              />
            </div>

            {/* Filter Slip No */}
            <div className="relative">
              <FileText className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={slipFilter}
                onChange={(e) => setSlipFilter(e.target.value)}
                placeholder="Filter by Slip No..."
                className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pl-9 pr-3 py-2 text-sm font-mono text-slate-200 focus:outline-hidden focus:border-cyan-500"
              />
            </div>

            {/* Filter Item */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={itemFilter}
                onChange={(e) => setItemFilter(e.target.value)}
                placeholder="Filter by Item / Code..."
                className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 focus:outline-hidden focus:border-cyan-500"
              />
            </div>
          </div>
        </div>

        {/* Ledger Table Display */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800 whitespace-nowrap">
                <tr>
                  <th className="px-3 py-3 text-center">Date</th>
                  <th className="px-3 py-3">Slip No</th>
                  <th className="px-3 py-3">Item</th>
                  <th className="px-3 py-3 text-right">QTY</th>
                  <th className="px-3 py-3 text-right">RATE</th>
                  <th className="px-3 py-3 text-right">W CHG</th>
                  <th className="px-3 py-3 text-right text-cyan-400">AMOUNT</th>
                  <th className="px-3 py-3 text-right text-emerald-400">PAYMENT</th>
                  <th className="px-3 py-3">Title</th>
                  <th className="px-3 py-3 text-center">Payment Date</th>
                  <th className="px-3 py-3">Remarks</th>
                  <th className="px-3 py-3 text-right text-amber-400">Running Balance</th>
                  <th className="px-3 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {isLoading ? (
                  <tr>
                    <td colSpan={13} className="px-6 py-12 text-center text-slate-500 font-sans">
                      Loading ledger entries...
                    </td>
                  </tr>
                ) : filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="px-6 py-16 text-center text-slate-500 font-sans">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <BookOpen className="w-8 h-8 text-slate-600" />
                        <div className="text-sm font-medium text-slate-400">No ledger records found</div>
                        <div className="text-xs text-slate-500">
                          {records.length === 0
                            ? 'The ledger is currently empty. Click "Add Ledger Entry" to create new records.'
                            : 'No records match your search filters.'}
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-3 py-2.5 whitespace-nowrap text-slate-400 text-center font-sans">
                        {r.date}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap font-semibold text-slate-200">
                        {r.slipNo || '-'}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap font-sans">
                        <span className="font-semibold text-slate-100">{r.itemName || r.itemCode || '-'}</span>
                        {r.itemCode && (
                          <span className="ml-1.5 text-[10px] text-cyan-400 bg-cyan-950/80 px-1.5 py-0.5 rounded-sm border border-cyan-800/60 font-mono">
                            {r.itemCode}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-right">
                        {r.qty ? r.qty : '-'}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-right">
                        {r.rate ? r.rate.toFixed(2) : '-'}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-right text-slate-400">
                        {r.wChg ? r.wChg.toFixed(2) : '-'}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-right font-semibold text-cyan-400">
                        {r.amount ? r.amount.toFixed(2) : '-'}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-right font-semibold text-emerald-400">
                        {r.payment ? r.payment.toFixed(2) : '-'}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap font-sans text-slate-300">
                        {r.title || '-'}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-center font-sans text-slate-400">
                        {r.paymentDate || '-'}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap font-sans text-slate-400 max-w-xs truncate">
                        {r.remarks || '-'}
                      </td>
                      <td
                        className={`px-3 py-2.5 whitespace-nowrap text-right font-bold ${
                          r.runningBalance >= 0 ? 'text-amber-400' : 'text-emerald-400'
                        }`}
                      >
                        {r.runningBalance.toFixed(2)}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleEdit(r)}
                            className="p-1 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-sm transition"
                            title="Edit entry"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(r.id)}
                            className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-sm transition"
                            title="Delete entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      {/* Entry Modal */}
      <EntryModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingRecord(null);
        }}
        onSave={handleSaveEntries}
        editingRecord={editingRecord}
      />

    </div>
  );
}

export default App;
