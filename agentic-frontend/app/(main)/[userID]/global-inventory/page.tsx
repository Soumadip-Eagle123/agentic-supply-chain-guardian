'use client';

import React, { useEffect, useState } from 'react';
import { Warehouse, RefreshCw, AlertTriangle, CheckCircle, Package, Filter, Boxes } from 'lucide-react';

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

  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

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
          console.error("Could not fetch inventory ledger.");
        }
      } catch (err) {
        console.error("Network inventory fetch failure:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUnifiedDataMatrix();
  }, [refreshTrigger, API]);

  const uniqueProducts = Array.from(
    new Set(inventoryPool.map(item => item.product_name))
  ).sort();

  const filteredInventory = inventoryPool.filter((item) => {
    const matchesWarehouse = selectedWarehouseId === 'ALL' || String(item.warehouseID) === selectedWarehouseId;
    const matchesProduct = selectedProduct === 'ALL' || item.product_name === selectedProduct;
    return matchesWarehouse && matchesProduct;
  });

  return (
    <div className="p-2 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <Boxes className="text-blue-500" size={26} />
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Network Inventory Stock</h1>
            <p className="text-slate-400 text-xs mt-0.5">Live stock availability across all registered warehouse hubs.</p>
          </div>
        </div>
        <button
          onClick={() => setRefreshTrigger(p => p + 1)}
          className="flex items-center gap-2 self-start bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl px-4 py-2 text-xs font-bold transition-all text-slate-200"
        >
          <RefreshCw size={14} className={loading ? "animate-spin text-blue-400" : ""} />
          REFRESH STOCK
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-900/40 p-4 border border-slate-800 rounded-2xl">
        <div className="relative flex items-center gap-2">
          <Package className="text-slate-500 shrink-0" size={16} />
          <select
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-slate-100 font-medium focus:outline-none focus:border-blue-500 transition-all cursor-pointer text-xs"
          >
            <option value="ALL">FILTER BY PRODUCT: ALL PRODUCTS</option>
            {uniqueProducts.map((prodName) => (
              <option key={prodName} value={prodName}>
                {prodName}
              </option>
            ))}
          </select>
        </div>

        <div className="relative flex items-center gap-2">
          <Filter className="text-slate-500 shrink-0" size={16} />
          <select
            value={selectedWarehouseId}
            onChange={(e) => setSelectedWarehouseId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-slate-100 font-medium focus:outline-none focus:border-blue-500 transition-all cursor-pointer text-xs"
          >
            <option value="ALL">FILTER BY LOCATION: ALL WAREHOUSES</option>
            {warehouseList.map((wh) => (
              <option key={wh.userID} value={wh.userID}>
                {wh.username} (Hub #{wh.userID})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Cards Grid */}
      {loading ? (
        <div className="p-20 text-center space-y-3 bg-slate-900/10 border border-slate-900 rounded-2xl">
          <RefreshCw size={24} className="animate-spin text-blue-500 mx-auto" />
          <p className="text-slate-500 text-xs">Loading network stock levels...</p>
        </div>
      ) : filteredInventory.length === 0 ? (
        <div className="p-16 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-950/40">
          <AlertTriangle className="text-amber-500/60 mx-auto mb-2" size={24} />
          <p className="text-slate-300 font-bold text-sm">No Stock Matches Found</p>
          <p className="text-slate-500 text-xs mt-1">Try selecting a different product or warehouse filter.</p>
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
                className={`border rounded-2xl p-5 bg-slate-900/40 backdrop-blur-md flex flex-col justify-between transition-all duration-200 group ${
                  isCritical ? 'border-red-500/40 bg-red-950/10' : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 text-[10px]">
                    <span className="bg-slate-950 border border-slate-800 text-slate-400 font-bold px-2 py-0.5 rounded uppercase">
                      {item.category}
                    </span>
                    <div>
                      {isCritical ? (
                        <span className="text-red-400 flex items-center gap-1 font-bold">
                          <AlertTriangle size={12} /> LOW STOCK
                        </span>
                      ) : (
                        <span className="text-emerald-400 flex items-center gap-1 font-bold">
                          <CheckCircle size={12} /> IN STOCK
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-white tracking-tight">
                    {item.product_name}
                  </h3>

                  <div className="flex items-center gap-1.5 text-xs text-slate-400 pt-1">
                    <Warehouse size={13} className="text-blue-400" />
                    <span className="font-medium text-slate-300">
                      {item.warehouse_name}
                    </span>
                  </div>
                </div>

                <div className="mt-5 space-y-2 pt-3 border-t border-slate-800/80">
                  <div className="flex justify-between items-baseline text-xs font-mono">
                    <span className="text-slate-500">Available Units:</span>
                    <span className={`font-bold text-sm ${isCritical ? 'text-red-400' : 'text-blue-400'}`}>
                      {item.current_stock.toLocaleString()}
                    </span>
                  </div>

                  <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isCritical ? 'bg-red-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${occupancyPercentage}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>Min Safety: {item.min_threshold}</span>
                    <span>Status: {isCritical ? 'Restock Triggered' : 'Healthy'}</span>
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