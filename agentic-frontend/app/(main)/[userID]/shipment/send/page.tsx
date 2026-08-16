'use client';
import React, { useState, useEffect, use } from 'react';
import { Send, Loader2, Info, Package } from 'lucide-react';

export default function SendShipment({ params }: { params: Promise<{ userID: string }> }) {
  const resolvedParams = use(params);
  const { userID } = resolvedParams;
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const [formData, setFormData] = useState({ product: '', qty: '', warehouseID: '' });
  const [loading, setLoading] = useState(false);
  const [fetchingStock, setFetchingStock] = useState(false);

  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  // 1. Fetch Warehouses on Mount
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

  // 2. Fetch inventory: warehouse-specific or global fallback
  useEffect(() => {
    const fetchInventoryForSelection = async () => {
      setFetchingStock(true);
      try {
        if (formData.warehouseID) {
          const res = await fetch(`${API}/api/inventory/${formData.warehouseID}/stock`, {
            credentials: 'include'
          });
          if (res.ok) {
            const data = await res.json();
            const formatted = Array.isArray(data) ? data : Object.values(data);
            setAvailableProducts(formatted.filter((item: any) => item.current_stock > 0));
          }
        } else {
          // If no warehouse selected, fetch all cataloged items from global matrix
          const res = await fetch(`${API}/api/shipment/global-matrix`, {
            credentials: 'include'
          });
          if (res.ok) {
            const data = await res.json();
            setAvailableProducts(data.inventory || []);
          }
        }
      } catch (err) {
        console.error("Failed to load inventory:", err);
      } finally {
        setFetchingStock(false);
      }
    };

    fetchInventoryForSelection();
  }, [formData.warehouseID, API]);

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
        alert("Shipment Dispatched & Corridor Risk Analyzed.");
        setFormData({ product: '', qty: '', warehouseID: '' });
      } else {
        const errorData = await res.json();
        alert(errorData.error || errorData.Error || "Dispatch Failed");
      }
    } catch (err) {
      alert("Network Error: Could not reach Guardian Command Center.");
    } finally {
      setLoading(false);
    }
  };

  const selectedProductItem = availableProducts.find(
    (p) => p.product_name === formData.product && (formData.warehouseID ? p.warehouseID === Number(formData.warehouseID) : true)
  );

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="border-b border-slate-800 pb-4">
        <h2 className="text-2xl font-bold text-white">Initiate Dispatch</h2>
        <p className="text-slate-500 text-sm">Select an origin warehouse and choose in-stock catalog items to dispatch.</p>
      </div>

      <form onSubmit={handleDispatch} className="space-y-6 bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl">
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-mono text-slate-500 uppercase mb-2 block tracking-widest">
              Origin Warehouse Hub
            </label>
            <select
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-blue-500 outline-none cursor-pointer"
              value={formData.warehouseID}
              onChange={(e) => setFormData({ ...formData, warehouseID: e.target.value, product: '' })}
              required
            >
              <option value="">Select Origin Point...</option>
              {warehouses.map(wh => (
                <option key={wh.userID} value={wh.userID}>
                  {wh.username} (Hub #{wh.userID})
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                Select Available Product
              </label>
              {selectedProductItem && (
                <span className="text-xs font-mono text-blue-400">
                  Available: <b>{selectedProductItem.current_stock} Units</b>
                </span>
              )}
            </div>

            <div className="relative">
              <select
                disabled={fetchingStock || availableProducts.length === 0}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-blue-500 outline-none cursor-pointer disabled:opacity-50"
                value={formData.product}
                onChange={(e) => setFormData({ ...formData, product: e.target.value })}
                required
              >
                <option value="">
                  {fetchingStock ? "Loading inventory..." : availableProducts.length === 0 ? "No inventory items cataloged" : "Choose item..."}
                </option>
                {Array.from(new Set(availableProducts.map((p) => p.product_name))).map((prodName) => {
                  const item = availableProducts.find((p) => p.product_name === prodName);
                  return (
                    <option key={prodName} value={prodName}>
                      {prodName} {item ? `(${item.current_stock} in stock)` : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-mono text-slate-500 uppercase mb-2 block tracking-widest">
              Unit Quantity
            </label>
            <input
              type="number"
              min="1"
              max={selectedProductItem ? selectedProductItem.current_stock : undefined}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
              placeholder="0"
              value={formData.qty}
              onChange={(e) => setFormData({ ...formData, qty: e.target.value })}
              required
            />
          </div>
        </div>

        <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg flex gap-3">
          <Info className="text-blue-500 shrink-0" size={18} />
          <p className="text-[10px] text-slate-400 leading-relaxed uppercase tracking-tight">
            Upon dispatch, automated route screening will review regional weather and road advisories to calculate optimal delivery safety.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading || !formData.warehouseID || !formData.product}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl flex justify-center items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(37,99,235,0.2)]"
        >
          {loading ? <Loader2 className="animate-spin" /> : <Send size={18} />}
          {loading ? 'ANALYZING CORRIDOR SAFETY...' : 'CONFIRM DISPATCH'}
        </button>
      </form>
    </div>
  );
}