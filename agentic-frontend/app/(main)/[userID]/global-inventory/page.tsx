'use client';

import React, { useEffect, useState } from 'react';
import { Layers, Warehouse, RefreshCw, AlertTriangle, CheckCircle, Package, Filter } from 'lucide-react';

interface WarehouseNode {
  userID: number;
  username: string;
}

interface GlobalInventoryItem {
  id: number;
  product_name: string;
  current_stock: number;
  min_threshold: number;
  category: string;
  restocking_needed: boolean;
  warehouseID: number;
  warehouse_name: string; 
}

export default function GlobalInventoryOverviewPortal() {
  const [warehouseList, setWarehouseList] = useState<WarehouseNode[]>([]);
  const [inventoryPool, setInventoryPool] = useState<GlobalInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('ALL');
  const [selectedProduct, setSelectedProduct] = useState<string>('ALL');
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    const fetchUnifiedDataMatrix = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API}/api/shipment/global-matrix`, {
          method: 'GET',
          credentials: 'include',
        });

        if (res.ok) {
          const data = await res.json();
          setWarehouseList(data.warehouses || []);
          setInventoryPool(data.inventory || []);
        } else {
          console.error("Ledger matrix connection rejected by gateway.");
        }
      } catch (err) {
        console.error("Distributed telemetry stack sync failure:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUnifiedDataMatrix();
  }, [refreshTrigger]);

  const uniqueProducts = Array.from(
    new Set(inventoryPool.map(item => item.product_name))
  ).sort();

  const filteredInventory = inventoryPool.filter((item) => {
    const matchesWarehouse = selectedWarehouseId === 'ALL' || String(item.warehouseID) === selectedWarehouseId;
    const matchesProduct = selectedProduct === 'ALL' || item.product_name === selectedProduct;
    return matchesWarehouse && matchesProduct;
  });

  return (
    <div className="p-6 space-y-6 font-mono text-xs text-slate-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <Layers className="text-blue-500 animate-pulse" size={24} />
          <div>
            <h1 className="text-base font-bold text-slate-100 uppercase tracking-wider">SUPABASE ALLOCATION NETWORK LEDGER</h1>
            <p className="text-slate-500 text-[11px] mt-0.5">Cross-cluster live stock monitoring ledger view for optimization mapping diagnostics.</p>
          </div>
        </div>
        <button
          onClick={() => setRefreshTrigger(p => p + 1)}
          className="flex items-center gap-2 self-start bg-slate-900 hover:bg-slate-800 border border-slate-700/60 rounded-xl px-4 py-2.5 font-bold transition-all text-slate-200"
        >
          <RefreshCw size={14} className={loading ? "animate-spin text-blue-400" : ""} />
          SYSTEM REFRESH SYNC
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-900/30 p-4 border border-slate-800/80 rounded-xl backdrop-blur-md">
        <div className="relative flex items-center gap-2">
          <Package className="text-slate-500 shrink-0" size={16} />
          <select
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-slate-100 font-bold focus:outline-none focus:border-blue-500 transition-all cursor-pointer font-mono text-[11px] uppercase tracking-wide"
          >
            <option value="ALL">筛选物料品名 (FILTER BY PRODUCT: ALL)</option>
            {uniqueProducts.map((prodName) => (
              <option key={prodName} value={prodName}>
                {prodName.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <div className="relative flex items-center gap-2">
          <Filter className="text-slate-500 shrink-0" size={16} />
          <select
            value={selectedWarehouseId}
            onChange={(e) => setSelectedWarehouseId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-slate-100 font-bold focus:outline-none focus:border-blue-500 transition-all cursor-pointer font-mono text-[11px] uppercase tracking-wide"
          >
            <option value="ALL">显示所有活动节点 (SHOW ALL DISTRIBUTION CENTERS)</option>
            {warehouseList.map((wh) => (
              <option key={wh.userID} value={wh.userID}>
                NODE #{wh.userID} — {wh.username.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="p-20 text-center space-y-3 bg-slate-900/10 border border-slate-900 rounded-xl">
          <RefreshCw size={24} className="animate-spin text-blue-500 mx-auto" />
          <p className="text-slate-500 tracking-widest text-[10px]">PULLING UNIFIED LEDGER SCHEMAS FROM DATABASE MESH CLUSTERS...</p>
        </div>
      ) : filteredInventory.length === 0 ? (
        <div className="p-16 text-center border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
          <AlertTriangle className="text-amber-500/60 mx-auto mb-2" size={24} />
          <p className="text-slate-400 font-bold uppercase tracking-wider">NO ACTIVE DATA GRIDS MATCHING THIS FILTER MATRIX</p>
          <p className="text-slate-600 text-[10px] mt-1">Try resetting your product or warehouse filters to broaden the matrix range scope.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInventory.map((item) => {
            const scaleFactor = 10;
            const dynamicMaxLimit = item.min_threshold * scaleFactor;
            const occupancyPercentage = Math.min((item.current_stock / dynamicMaxLimit) * 100, 100);
            const isCritical = item.current_stock <= item.min_threshold;

            return (
              <div 
                key={item.id} 
                className={`border rounded-xl p-4 bg-slate-950/60 flex flex-col justify-between transition-all duration-300 group ${
                  isCritical ? 'border-red-900/50 bg-red-950/5' : 'border-slate-800/80 hover:border-blue-900/40'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 text-[10px]">
                    <span className="bg-slate-900 border border-slate-800 text-slate-400 font-bold px-2 py-0.5 rounded-md uppercase">
                      {item.category}
                    </span>
                    <div>
                      {isCritical ? (
                        <span className="text-red-400 flex items-center gap-1 font-bold animate-pulse">
                          <AlertTriangle size={11} /> CRIT_LOW
                        </span>
                      ) : (
                        <span className="text-emerald-400 flex items-center gap-1 font-bold">
                          <CheckCircle size={11} /> NOMINAL
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-slate-200 tracking-tight uppercase truncate group-hover:text-blue-400 transition-colors">
                    {item.product_name}
                  </h3>

                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-2 border-t border-slate-900/80 pt-2">
                    <Warehouse size={12} className="text-blue-500/60" />
                    <span className="truncate uppercase tracking-tight font-bold text-slate-400">
                      {item.warehouse_name}
                    </span>
                  </div>
                </div>

                <div className="mt-5 space-y-2">
                  <div className="flex justify-between items-baseline text-[10px] font-mono text-slate-500">
                    <div>
                      CURRENT STOCK: <span className={`font-bold text-xs ${isCritical ? 'text-red-400' : 'text-slate-200'}`}>{item.current_stock}</span>
                    </div>
                    <div>
                      MIN BOUND: <span className="text-slate-400 font-bold">{item.min_threshold}</span>
                    </div>
                  </div>

                  <div className="w-full h-2.5 bg-slate-900 rounded-md border border-slate-800/60 p-0.5 relative overflow-hidden">
                    <div
                      className={`h-full rounded-sm transition-all duration-500 ${
                        isCritical ? 'bg-linear-to-r from-red-600 to-rose-500 animate-pulse' : 'bg-linear-to-r from-blue-600 to-indigo-500'
                      }`}
                      style={{ width: `${occupancyPercentage}%` }}
                    />
                    <div 
                      className="absolute top-0 bottom-0 w-px bg-red-500/70"
                      style={{ left: `${(item.min_threshold / dynamicMaxLimit) * 100}%` }}
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