'use client';
import React, { useEffect, useState } from 'react';
import { Package, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';

interface InventoryItem {
  id: number;
  product_name: string;
  current_stock: number;
  min_threshold: number;
  category: string;
  restocking_needed: boolean;
}

export default function WarehouseMonitor({ params }: { params: Promise<{ userID: string }> }) {
  const resolvedParams = React.use(params);
  const { userID } = resolvedParams;
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const API = process.env.NEXT_PUBLIC_API_URL;
  useEffect(() => {
    const fetchStock = async () => {
      try {
        const res = await fetch(`${API}/api/inventory/${userID}/stock`, {
            method: 'GET',
            credentials: 'include',
        });
        const data = await res.json();
        setInventory(Array.isArray(data) ? data : Object.values(data));
      } catch (err) {
        console.error("System sync failed.");
      } finally {
        setLoading(false);
      }
    };
    fetchStock();
  }, [userID]);

  return (
    <div className="space-y-8">
      <div className="border-b border-slate-800 pb-4">
        <h2 className="text-2xl font-bold text-white">Stock Level Monitor</h2>
        <p className="text-slate-500 text-sm">Real-time telemetry for localized warehouse inventory.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-500" size={40} /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {inventory.map((item) => {
            const percentage = Math.min((item.current_stock / (item.min_threshold * 2)) * 100, 100);
            const isCritical = item.current_stock <= item.min_threshold;

            return (
              <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white">{item.product_name}</h3>
                    <p className="text-[10px] font-mono text-slate-500 uppercase">{item.category}</p>
                  </div>
                  {isCritical ? (
                    <div className="flex items-center gap-1 text-red-500 text-[10px] font-bold animate-pulse">
                      <AlertTriangle size={14} /> RESTOCK REQUIRED
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-emerald-500 text-[10px] font-bold">
                      <CheckCircle2 size={14} /> OPTIMAL
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400">Current: {item.current_stock}</span>
                    <span className="text-slate-500">Threshold: {item.min_threshold}</span>
                  </div>
                  {/* Progress Bar */}
                  <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ${isCritical ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-blue-500'}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}