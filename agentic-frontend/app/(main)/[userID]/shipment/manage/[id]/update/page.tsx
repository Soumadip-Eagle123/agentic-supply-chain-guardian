'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Edit3, Loader2, CheckCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function UpdateShipment({ params }: { params: Promise<{ userID: string, id: string }> }) {
  // Use React.use() to correctly resolve params in Next.js 15+ [cite: 6834, 10455]
  const resolvedParams = React.use(params);
  const { userID, id } = resolvedParams;
  const [status, setStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();
  const API = process.env.NEXT_PUBLIC_API_URL;

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage('');

    try {
      // CRITICAL FIX: Ensure 'credentials: include' is used for session handshake [cite: 6838, 10459]
      const res = await fetch(`${API}/api/shipment/${userID}/statusChange`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: id,
          status: status
        }),
      });

      const data = await res.json();

      if (res.ok) {
        // Changing status triggers Llama 3 re-analysis of route risk [cite: 5316, 11036, 11318]
        setMessage('Status updated. AI Agent is re-evaluating route risk...');
        setTimeout(() => {
          router.push(`/${userID}/shipment/manage`);
        }, 2000);
      } else {
        setMessage(data.Error || 'Update failed.');
      }
    } catch (err) {
      setMessage('Network error. Could not reach Command Center.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <Link 
        href={`/${userID}/shipment/manage`}
        className="flex items-center gap-2 text-xs font-mono text-slate-500 hover:text-blue-400 transition-colors"
      >
        <ArrowLeft size={14} /> RETURN TO FEED
      </Link>

      <div className="border-b border-slate-800 pb-4">
        <h2 className="text-2xl font-bold text-white">Modify Transit State</h2>
        <p className="text-slate-500 text-sm">Update the operational status for Shipment #{id}.</p>
      </div>

      <form onSubmit={handleUpdate} className="bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-6">
        <div>
          <label className="text-[10px] font-mono text-slate-500 uppercase mb-3 block tracking-widest">
            Update Status Vector
          </label>
          <select 
            required
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:border-blue-500 outline-none appearance-none cursor-pointer"
          >
            <option value="" disabled>Select new status...</option>
            <option value="In Transit">In Transit</option>
            <option value="Held at Customs">Held at Customs</option>
            <option value="Delayed - Weather">Delayed - Weather</option>
            <option value="Out for Delivery">Out for Delivery</option>
            <option value="Delivered">Delivered</option>
          </select>
        </div>

        {message && (
          <div className={`flex items-center gap-2 text-xs p-4 rounded-xl border ${
            message.includes('updated') 
              ? 'text-emerald-400 bg-emerald-400/5 border-emerald-400/20' 
              : 'text-red-400 bg-red-400/5 border-red-400/20'
          }`}>
            {message.includes('updated') ? <CheckCircle size={16} /> : null}
            {message}
          </div>
        )}

        <button 
          disabled={isSubmitting || !status}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl flex justify-center items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(37,99,235,0.2)]"
        >
          {isSubmitting ? <Loader2 className="animate-spin" /> : <Edit3 size={18} />}
          {isSubmitting ? 'RE-EVALUATING RISK...' : 'PUSH STATUS UPDATE'}
        </button>
      </form>

      <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl">
        <p className="text-[10px] text-slate-500 leading-relaxed uppercase font-mono tracking-tight">
          <span className="text-blue-500 font-bold">Note:</span> Changing the status triggers an automatic re-analysis by the Llama 3 Agent[cite: 5316, 11036]. This may update the Risk Level and Recommended AI Action in your Intelligence Feed[cite: 5317, 11037].
        </p>
      </div>
    </div>
  );
}