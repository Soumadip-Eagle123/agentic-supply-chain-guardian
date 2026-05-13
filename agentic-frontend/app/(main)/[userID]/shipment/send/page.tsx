'use client';
import React, { useState, useEffect } from 'react';
import { Send, Loader2, Info } from 'lucide-react';

export default function SendShipment({ params }: { params: Promise<{ userID: string }> }) {
  const resolvedParams = React.use(params);
  const { userID } = resolvedParams;
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [formData, setFormData] = useState({ product: '', qty: '', warehouseID: '' });
  const [loading, setLoading] = useState(false);
  
  const API = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    const fetchHubs = async () => {
      try {
        const res = await fetch(`${API}/api/auth/warehouses`);
        if (res.ok) {
          const data = await res.json();
          setWarehouses(data);
        }
      } catch (err) {
        console.error("Failed to fetch warehouse directory:", err);
      }
    };
    fetchHubs();
  }, [API]);

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const res = await fetch(`${API}/api/shipment/${userID}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', 
        body: JSON.stringify({
          product_name: formData.product,
          quantity: Number(formData.qty),
          warehouseID: Number(formData.warehouseID)
        }),
      });

      if (res.ok) {
        alert("Guardian Intelligence: Shipment Dispatched & Risk Analyzed.");
        setFormData({ product: '', qty: '', warehouseID: '' });
      } else {
        const errorData = await res.json();
        alert(`${errorData.Error} || "Dispatch Failed"`);
      }
    } catch (err) {
      console.error("Dispatch failure.");
      alert("Network Error: Could not reach the Guardian Command Center.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="border-b border-slate-800 pb-4">
        <h2 className="text-2xl font-bold text-white">Initiate Dispatch</h2>
        <p className="text-slate-500 text-sm">Target a supply hub and deploy cargo. AI will monitor the transit vector.</p>
      </div>

      <form onSubmit={handleDispatch} className="space-y-6 bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl">
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-mono text-slate-500 uppercase mb-2 block tracking-widest">
              Target Warehouse Hub
            </label>
            <select 
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-blue-500 outline-none cursor-pointer"
              value={formData.warehouseID}
              onChange={(e) => setFormData({...formData, warehouseID: e.target.value})}
              required
            >
              <option value="">Select Origin Point...</option>
              {warehouses.map(wh => (
                <option key={wh.userID} value={wh.userID}>
                  {wh.username} (ID: {wh.userID})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-mono text-slate-500 uppercase mb-2 block tracking-widest">
              Product Identifier
            </label>
            <input 
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
              placeholder="e.g. Lithium-Ion Battery Pack"
              value={formData.product}
              onChange={(e) => setFormData({...formData, product: e.target.value})}
              required
            />
          </div>

          <div>
            <label className="text-[10px] font-mono text-slate-500 uppercase mb-2 block tracking-widest">
              Unit Quantity
            </label>
            <input 
              type="number"
              min="1"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
              placeholder="0"
              value={formData.qty}
              onChange={(e) => setFormData({...formData, qty: e.target.value})}
              required
            />
          </div>
        </div>

        <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg flex gap-3">
          <Info className="text-blue-500 shrink-0" size={18} />
          <p className="text-[10px] text-slate-400 leading-relaxed uppercase tracking-tight">
            Upon dispatch, the Guardian Agent (Llama 3) will automatically calculate the risk level and optimal route from the source warehouse to your registered location.
          </p>
        </div>

        <button 
          type="submit"
          disabled={loading || !formData.warehouseID}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl flex justify-center items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(37,99,235,0.2)]"
        >
          {loading ? <Loader2 className="animate-spin" /> : <Send size={18} />}
          {loading ? 'ANALYZING ROUTE...' : 'CONFIRM DISPATCH'}
        </button>
      </form>
    </div>
  );
}