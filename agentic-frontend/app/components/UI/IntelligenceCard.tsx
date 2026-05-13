'use client';
import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation'; // Add this hook to get the userID
import { ShieldAlert, ShieldCheck, ShieldMinus, X, Mail, Edit2 } from 'lucide-react';

interface ShipmentProps {
  shipment: {
    id: number;
    product_name: string;
    quantity: number;
    source: string;
    destination: string;
    risk: string;
    ai_action: string;
    status: string;
  };
  onClear: (id: number) => void;
}

export default function IntelligenceCard({ shipment, onClear }: ShipmentProps) {
  const params = useParams();
  const userID = params.userID; 

  const isHighRisk = shipment.risk?.toLowerCase() === 'high';
  const isMediumRisk = shipment.risk?.toLowerCase() === 'medium';

  const riskStyles = isHighRisk
    ? 'border-red-500/50 bg-red-500/5 text-red-400'
    : isMediumRisk
    ? 'border-orange-500/50 bg-orange-500/5 text-orange-400'
    : 'border-emerald-500/50 bg-emerald-500/5 text-emerald-400';

  return (
    <div className={`relative group border rounded-2xl p-6 transition-all hover:shadow-[0_0_20px_rgba(0,0,0,0.3)] ${riskStyles}`}>
    
      <Link
        href={`/${userID}/shipment/manage/${shipment.id}/update`}
        className="absolute top-4 right-12 p-1.5 rounded-lg bg-slate-900/50 text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all opacity-0 group-hover:opacity-100"
        title="Modify Status"
      >
        <Edit2 size={16} />
      </Link>
      <button 
        onClick={() => onClear(shipment.id)}
        className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-900/50 text-slate-500 hover:text-white hover:bg-red-500/20 transition-all opacity-0 group-hover:opacity-100"
      >
        <X size={16} />
      </button>

      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-xl bg-slate-900/80`}>
          {isHighRisk ? <ShieldAlert size={24} /> : isMediumRisk ? <ShieldMinus size={24} /> : <ShieldCheck size={24} />}
        </div>
        
        <div className="flex-1">
          <div className="flex justify-between items-center mb-1">
            <h3 className="text-lg font-bold text-white">{shipment.product_name}</h3>
            <span className="text-[10px] font-mono uppercase tracking-tighter opacity-60">ID: #{shipment.id}</span>
          </div>
          
          <p className="text-sm opacity-80 mb-4">
            Deploying <span className="font-bold text-white">{shipment.quantity} units</span> from {shipment.source} to {shipment.destination}.
          </p>

          <div className="space-y-3">
            <div className="bg-slate-950/50 p-3 rounded-lg border border-white/5">
              <div className="flex items-center gap-2 mb-1 text-[10px] font-bold uppercase tracking-widest opacity-50">
                <Mail size={12} /> AI Intelligence Action
              </div>
              <p className="text-xs italic leading-relaxed text-slate-300">
                "{shipment.ai_action}"
              </p>
            </div>
            
            <div className="flex items-center gap-4 text-[10px] font-mono uppercase tracking-widest">
              <span>Risk: <b className="underline">{shipment.risk}</b></span>
              <span>Status: <b className="text-white">{shipment.status}</b></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}