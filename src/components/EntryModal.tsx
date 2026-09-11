import React, { useState, useEffect } from 'react';
import { LedgerRecord, ITEM_CODE_MAPPING } from '../types/ledger';
import { Plus, Trash2, X, Calculator } from 'lucide-react';

interface EntryItemInput {
  itemCode: string;
  itemName: string;
  qty: string;
  rate: string;
  wChg: string;
  amount: string;
  payment: string;
  title: string;
  paymentDate: string;
  remarks: string;
}

interface EntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entries: Partial<LedgerRecord>[]) => Promise<void>;
  editingRecord?: LedgerRecord | null;
}

export const EntryModal: React.FC<EntryModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingRecord,
}) => {
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [slipNo, setSlipNo] = useState<string>('');
  const [items, setItems] = useState<EntryItemInput[]>([
    {
      itemCode: '',
      itemName: '',
      qty: '',
      rate: '',
      wChg: '',
      amount: '',
      payment: '',
      title: '',
      paymentDate: '',
      remarks: '',
    },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingRecord) {
      setDate(editingRecord.date || new Date().toISOString().split('T')[0]);
      setSlipNo(editingRecord.slipNo || '');
      setItems([
        {
          itemCode: editingRecord.itemCode || '',
          itemName: editingRecord.itemName || '',
          qty: editingRecord.qty ? String(editingRecord.qty) : '',
          rate: editingRecord.rate ? String(editingRecord.rate) : '',
          wChg: editingRecord.wChg ? String(editingRecord.wChg) : '',
          amount: editingRecord.amount ? String(editingRecord.amount) : '',
          payment: editingRecord.payment ? String(editingRecord.payment) : '',
          title: editingRecord.title || '',
          paymentDate: editingRecord.paymentDate || '',
          remarks: editingRecord.remarks || '',
        },
      ]);
    } else {
      setDate(new Date().toISOString().split('T')[0]);
      setSlipNo('');
      setItems([
        {
          itemCode: '',
          itemName: '',
          qty: '',
          rate: '',
          wChg: '',
          amount: '',
          payment: '',
          title: '',
          paymentDate: '',
          remarks: '',
        },
      ]);
    }
  }, [editingRecord, isOpen]);

  if (!isOpen) return null;

  const handleItemChange = (index: number, field: keyof EntryItemInput, value: string) => {
    setItems((prevItems) => {
      const updated = [...prevItems];
      const item = { ...updated[index], [field]: value };

      if (field === 'itemCode') {
        const upperCode = value.trim().toUpperCase();
        if (ITEM_CODE_MAPPING[upperCode]) {
          item.itemName = ITEM_CODE_MAPPING[upperCode];
        }
      }

      // Automatically compute AMOUNT from QTY, RATE, W CHG
      const qty = parseFloat(field === 'qty' ? value : item.qty) || 0;
      const rate = parseFloat(field === 'rate' ? value : item.rate) || 0;
      const wChg = parseFloat(field === 'wChg' ? value : item.wChg) || 0;

      if (qty > 0 || rate > 0 || wChg > 0) {
        item.amount = String(qty * rate + wChg);
      }

      updated[index] = item;
      return updated;
    });
  };

  const handleAddItemRow = () => {
    setItems((prev) => [
      ...prev,
      {
        itemCode: '',
        itemName: '',
        qty: '',
        rate: '',
        wChg: '',
        amount: '',
        payment: '',
        title: '',
        paymentDate: '',
        remarks: '',
      },
    ]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const recordsToSave: Partial<LedgerRecord>[] = items.map((item) => {
        const qty = parseFloat(item.qty) || 0;
        const rate = parseFloat(item.rate) || 0;
        const wChg = parseFloat(item.wChg) || 0;
        const computedAmt = qty > 0 || rate > 0 ? qty * rate + wChg : parseFloat(item.amount) || 0;

        return {
          id: editingRecord ? editingRecord.id : undefined,
          date,
          slipNo,
          itemCode: item.itemCode.trim().toUpperCase(),
          itemName: item.itemName,
          qty,
          rate,
          wChg,
          amount: computedAmt,
          payment: parseFloat(item.payment) || 0,
          title: item.title,
          paymentDate: item.paymentDate,
          remarks: item.remarks,
        };
      });

      await onSave(recordsToSave);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col my-auto text-slate-100">

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <h2 className="text-lg font-bold text-cyan-400 flex items-center gap-2">
            {editingRecord ? 'Edit Ledger Entry' : 'Add Ledger Entry'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Top Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950/60 p-4 rounded-lg border border-slate-800/80">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">
                Date *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-hidden focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">
                Slip No *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. SLIP-101"
                value={slipNo}
                onChange={(e) => setSlipNo(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-hidden focus:border-cyan-500 font-mono"
              />
            </div>
          </div>

          {/* Quick item code hint */}
          <div className="flex flex-wrap gap-2 text-xs text-slate-400 bg-slate-900/80 p-3 rounded-lg border border-slate-800">
            <span className="font-semibold text-cyan-400">Item Codes:</span>
            {Object.entries(ITEM_CODE_MAPPING).map(([code, name]) => (
              <span key={code} className="bg-slate-800 px-2 py-0.5 rounded-sm font-mono text-[11px] text-slate-300">
                <strong className="text-white">{code}</strong> → {name}
              </span>
            ))}
          </div>

          {/* Items Container */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
                Item & Payment Records
              </h3>
              {!editingRecord && (
                <button
                  type="button"
                  onClick={handleAddItemRow}
                  className="flex items-center gap-1 text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1.5 rounded-lg transition"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Another Item to Slip
                </button>
              )}
            </div>

            {items.map((item, index) => (
              <div
                key={index}
                className="bg-slate-950/40 border border-slate-800 rounded-xl p-4 space-y-4 relative"
              >
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveItemRow(index)}
                    className="absolute top-3 right-3 text-rose-400 hover:text-rose-300 p-1 rounded-lg hover:bg-rose-950/50 transition"
                    title="Remove item row"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                {/* Row 1: Item details */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      Item Code (e.g. K/V, P/O)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. K/V"
                      value={item.itemCode}
                      onChange={(e) => handleItemChange(index, 'itemCode', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm font-mono text-slate-100 uppercase focus:outline-hidden focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      Item Name (Auto-mapped)
                    </label>
                    <input
                      type="text"
                      placeholder="Mapped item name"
                      value={item.itemName}
                      onChange={(e) => handleItemChange(index, 'itemName', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-hidden focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Supply / Payment Title"
                      value={item.title}
                      onChange={(e) => handleItemChange(index, 'title', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-hidden focus:border-cyan-500"
                    />
                  </div>
                </div>

                {/* Row 2: Quantities & Rates */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      QTY
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="0"
                      value={item.qty}
                      onChange={(e) => handleItemChange(index, 'qty', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm font-mono text-slate-100 focus:outline-hidden focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      RATE
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={item.rate}
                      onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm font-mono text-slate-100 focus:outline-hidden focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      W CHG (Weight Chg)
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={item.wChg}
                      onChange={(e) => handleItemChange(index, 'wChg', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm font-mono text-slate-100 focus:outline-hidden focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-cyan-400 mb-1 flex items-center gap-1">
                      <Calculator className="w-3 h-3" /> AMOUNT
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={item.amount}
                      onChange={(e) => handleItemChange(index, 'amount', e.target.value)}
                      className="w-full bg-slate-900 border border-cyan-800/80 rounded-lg px-3 py-1.5 text-sm font-mono text-cyan-300 font-semibold focus:outline-hidden focus:border-cyan-500"
                    />
                  </div>
                </div>

                {/* Row 3: Payments & Remarks */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-emerald-400 mb-1">
                      PAYMENT
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={item.payment}
                      onChange={(e) => handleItemChange(index, 'payment', e.target.value)}
                      className="w-full bg-slate-900 border border-emerald-900/60 rounded-lg px-3 py-1.5 text-sm font-mono text-emerald-300 font-semibold focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      Payment Date
                    </label>
                    <input
                      type="date"
                      value={item.paymentDate}
                      onChange={(e) => handleItemChange(index, 'paymentDate', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-hidden focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      Remarks
                    </label>
                    <input
                      type="text"
                      placeholder="Notes or details"
                      value={item.remarks}
                      onChange={(e) => handleItemChange(index, 'remarks', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-hidden focus:border-cyan-500"
                    />
                  </div>
                </div>

              </div>
            ))}
          </div>

          {/* Footer controls */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-lg text-sm font-semibold bg-cyan-600 hover:bg-cyan-500 text-white shadow-md transition disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : editingRecord ? 'Save Changes' : 'Add Record(s)'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
