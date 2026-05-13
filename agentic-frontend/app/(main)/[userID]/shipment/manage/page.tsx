'use client';
import React, { useEffect, useState } from 'react';
import IntelligenceCard from '@/app/components/UI/IntelligenceCard';
import { Loader2, RefreshCw } from 'lucide-react';

export default function ManageShipments({ params }: { params: Promise<{ userID: string }> }) {
  const resolvedParams = React.use(params);
  const { userID } = resolvedParams;
  const [shipments, setShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const API = process.env.NEXT_PUBLIC_API_URL;
  const fetchShipments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/shipment/${userID}/getShipment`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      });
      const data = await res.json();
      setShipments(Object.values(data));
    } catch (err) {
      console.error("Failed to sync with Guardian Network");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async (id: number) => {
    try {
      const res = await fetch(`${API}/api/shipment/${userID}/deleteShipment/${id}`, {
        method: 'DELETE', 
        credentials: 'include',
      });
      if (res.ok) {
        setShipments(prev => prev.filter(s => s.id !== id));
      }
    } catch (err) {
      alert("Clearance failed.");
    }
  };

  useEffect(() => { fetchShipments(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Intelligence Feed</h2>
          <p className="text-slate-500 text-sm">Monitoring real-time supply chain risks and AI directives.</p>
        </div>
        <button 
          onClick={fetchShipments}
          className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors"
        >
          <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-600">
          <Loader2 className="animate-spin mb-2" size={32} />
          <p className="font-mono text-xs uppercase tracking-widest">Decrypting Secure Feed...</p>
        </div>
      ) : shipments.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-slate-900 rounded-3xl">
          <p className="text-slate-500">No active intelligence items found in your sector.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {shipments.map((s) => (
            <IntelligenceCard key={s.id} shipment={s} onClear={handleClear} />
          ))}
        </div>
      )}
    </div>
  );
}