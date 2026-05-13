'use client';
import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const GlobalMap = dynamic(() => import('@/app/components/Map/MapContainer'), { 
  ssr: false,
  loading: () => (
    <div className="h-150 w-full bg-slate-900 animate-pulse rounded-2xl flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="animate-spin text-blue-500 mx-auto mb-2" size={40} />
        <p className="font-mono text-xs text-slate-500 uppercase tracking-widest">Booting Satellite Uplink...</p>
      </div>
    </div>
  )
});

export default function TrackingPortal({ params }: { params: Promise<{ userID: string }> }) {
  const { userID } = React.use(params);
  const [shipments, setShipments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const syncNetwork = async () => {
      setIsLoading(true);
      try {
        const API = process.env.NEXT_PUBLIC_API_URL;
        
        const res = await fetch(`${API}/api/shipment/${userID}/getShipment`, {
            method: 'GET',
            credentials: 'include', 
            headers: {
                'Accept': 'application/json'
            }
        });

        if (res.ok) {
            const data = await res.json();
            setShipments(Object.values(data));
        } else {
            console.error("Neural Link Rejected: Status", res.status);
        }
      } catch (err) {
        console.error("Global Sync Failure:", err);
      } finally {
        setIsLoading(false);
      }
    };
    syncNetwork();
  }, [userID]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Global Logistics View</h2>
          <p className="text-slate-500 text-sm">Visualizing active transit vectors across the network.</p>
        </div>
        <div className="flex items-center gap-4 text-[10px] font-mono">
          <div className="flex items-center gap-2">
            <span className="w-3 h-0.5 bg-blue-500"></span> 
            <span className="text-slate-400">WAREHOUSE-TO-BUSINESS</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-0.5 border-t border-dashed border-orange-500"></span> 
            <span className="text-slate-400">W2W (AI REBALANCE)</span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative min-h-150 bg-slate-900">
        {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center z-10 bg-slate-950/50 backdrop-blur-sm">
                <Loader2 className="animate-spin text-blue-500" size={32} />
            </div>
        ) : null}
        
        <GlobalMap shipments={shipments} />
        
        {shipments.length === 0 && !isLoading && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-slate-500 font-mono text-xs uppercase tracking-widest bg-slate-950/80 px-4 py-2 rounded-full border border-slate-800">
                    No active transit vectors detected in this sector.
                </p>
            </div>
        )}
      </div>
    </div>
  );
}