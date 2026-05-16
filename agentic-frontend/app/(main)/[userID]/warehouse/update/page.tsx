'use client';
import React, { useState } from 'react';
import { PackagePlus, Loader2, CheckCircle } from 'lucide-react';

export default function UpdateInventory({ params }: { params: Promise<{ userID: string }> }) {
  const { userID } = React.use(params);
  const [formData, setFormData] = useState({
    product_name: '',
    quantity: '',
    min_threshold: '10',
    category: 'General'
  });
  const [status, setStatus] = useState({ loading: false, message: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus({ loading: true, message: '' });
    const API = process.env.NEXT_PUBLIC_API_URL;

    try {
      const res = await fetch(`${API}/api/inventory/${userID}/stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', 
        body: JSON.stringify({
          ...formData,
          quantity: Number(formData.quantity),
          min_threshold: Number(formData.min_threshold)
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setStatus({ loading: false, message: data.Success });
        setFormData({ product_name: '', quantity: '', min_threshold: '10', category: 'General' });
      }
    } catch (err) {
      setStatus({ loading: false, message: 'Sync failed. Check network status.' });
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h2 className="text-2xl font-bold text-white">Stock Acquisition</h2>
        <p className="text-slate-500 text-sm">Synchronize batch arrivals with the Guardian Command Center.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="text-[10px] font-mono text-slate-500 uppercase mb-2 block tracking-widest">Product Identifier</label>
            <input
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
              placeholder="e.g. Solar Cells"
              value={formData.product_name}
              onChange={(e) => setFormData({...formData, product_name: e.target.value})}
            />
          </div>

          <div className="col-span-2">
            <label className="text-[10px] font-mono text-slate-500 uppercase mb-2 block tracking-widest">Sector/Category</label>
            <input
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
              placeholder="e.g. Energy Components"
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value})}
            />
          </div>
          
          <div>
            <label className="text-[10px] font-mono text-slate-500 uppercase mb-2 block tracking-widest">Batch Units</label>
            <input
              type="number" required min="1"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
              value={formData.quantity}
              onChange={(e) => setFormData({...formData, quantity: e.target.value})}
            />
          </div>
          <div>
            <label className="text-[10px] font-mono text-slate-500 uppercase mb-2 block tracking-widest">Safety Threshold</label>
            <input
              type="number" required min="1"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
              value={formData.min_threshold}
              onChange={(e) => setFormData({...formData, min_threshold: e.target.value})}
            />
          </div>
        </div>

        {status.message && (
          <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-400/10 p-3 rounded-lg border border-emerald-400/20">
            <CheckCircle size={14} /> {status.message}
          </div>
        )}

        <button
          disabled={status.loading}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl flex justify-center items-center gap-2 transition-all disabled:opacity-50"
        >
          {status.loading ? <Loader2 className="animate-spin" /> : <PackagePlus size={18} />}
          AUGMENT WAREHOUSE STATE
        </button>
      </form>
    </div>
  );
}