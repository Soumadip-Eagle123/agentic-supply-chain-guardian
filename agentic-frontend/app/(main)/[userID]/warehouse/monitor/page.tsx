'use client';
import React, { useEffect, useState, use } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, ArrowBigUpDash } from 'lucide-react';

interface InventoryItem {
  id: number;
  product_name: string;
  current_stock: number;
  min_threshold: number;
  category: string;
}

export default function WarehouseMonitor({ params }: { params: Promise<{ userID: string }> }) {
  // Correctly unwrap params for Next.js 15
  const { userID } = use(params);
  
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  useEffect(() => {
    if (!userID) return;

    const fetchStock = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API}/api/inventory/${userID}/stock`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
        
        const data = await res.json();
        // Handle both Array and Object responses
        const formattedData = Array.isArray(data) ? data : Object.values(data);
        setInventory(formattedData);
      } catch (err) {
        console.error("System sync failed:", err);
        setError("Failed to synchronize with Central Hub.");
      } finally {
        setLoading(false);
      }
    };

    fetchStock();
  }, [userID, API]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-4">
        <Loader2 className="animate-spin text-blue-500" size={48} />
        <span className="text-slate-500 font-mono text-xs tracking-widest animate-pulse">ESTABLISHING TELEMETRY...</span>
      </div>
    );
  }

  if (error || inventory.length === 0) {
    return (
      <div className="p-8 border border-dashed border-slate-800 rounded-2xl text-center">
        <p className="text-slate-500 font-mono text-sm">{error || "No active inventory tracks found for this Hub."}</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 p-2">
      <div className="border-l-4 border-blue-600 pl-4">
        <h2 className="text-2xl font-black text-white tracking-tighter uppercase">Warehouse Telemetry</h2>
        <p className="text-slate-500 text-xs font-mono uppercase tracking-widest">Active Hub ID: {userID}</p>
      </div>

      <div className="grid grid-cols-1 gap-12">
        {inventory.map((item) => {
          const maxScale = item.min_threshold * 10;
          const stockPercentage = Math.min((item.current_stock / maxScale) * 100, 100);
          const thresholdPercentage = (item.min_threshold / maxScale) * 100; // This is always 10%
          const isCritical = item.current_stock <= item.min_threshold;

          return (
            <div key={item.id} className="relative group">
              {/* Item Info Header */}
              <div className="flex justify-between items-end mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-100 uppercase tracking-tight">{item.product_name}</h3>
                  <span className="text-[10px] font-mono text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    {item.category}
                  </span>
                </div>
                <div className="text-right">
                  <div className={`text-3xl font-black font-mono leading-none ${isCritical ? 'text-red-500' : 'text-blue-400'}`}>
                    {item.current_stock.toLocaleString()}
                  </div>
                  <span className="text-[10px] font-mono text-slate-600 uppercase">Current Units</span>
                </div>
              </div>

              {/* The Gauge */}
              <div className="relative h-12 flex items-center">
                {/* Background Track */}
                <div className="absolute inset-0 h-4 my-auto w-full bg-slate-900 rounded-sm overflow-hidden border border-slate-800">
                  {/* Danger Zone Shading (0 to 10%) */}
                  <div 
                    className="absolute h-full bg-red-500/10 border-r border-red-500/30"
                    style={{ width: `${thresholdPercentage}%` }}
                  />
                  {/* Current Stock Level Fill */}
                  <div 
                    className={`h-full transition-all duration-1000 ease-in-out ${isCritical ? 'bg-red-600' : 'bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.3)]'}`}
                    style={{ width: `${stockPercentage}%` }}
                  />
                </div>

                {/* Threshold Marker (The "Arrow") */}
                <div 
                  className="absolute top-0 h-full flex flex-col justify-between items-center transition-all duration-500"
                  style={{ left: `${thresholdPercentage}%`, transform: 'translateX(-50%)' }}
                >
                  <div className="h-2 w-0.5 bg-red-500" />
                  <div className="group-hover:scale-110 transition-transform flex flex-col items-center">
                    <ArrowBigUpDash size={18} className="text-red-500 fill-red-500/20" />
                    <span className="text-[9px] font-bold text-red-500 whitespace-nowrap bg-black border border-red-900/50 px-1 rounded">
                      THRESHOLD: {item.min_threshold}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Scale Markings */}
              <div className="flex justify-between mt-2 px-1">
                {[0, 25, 50, 75, 100].map((mark) => (
                  <div key={mark} className="flex flex-col items-center">
                    <div className="h-1 w-px bg-slate-800 mb-1" />
                    <span className="text-[8px] font-mono text-slate-700">
                      {((maxScale * mark) / 100).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}