'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Cookies from 'js-cookie';
import { 
  ShieldAlert, 
  ShieldCheck, 
  ShieldMinus, 
  X, 
  Mail, 
  Edit2, 
  CheckCircle2, 
  Loader2, 
  Truck, 
  Clock 
} from 'lucide-react';

interface ShipmentProps {
  shipment: {
    id: number;
    sourceID?: number;
    userID?: number;
    product_name: string;
    quantity: number;
    source: string;
    destination: string;
    risk: string;
    ai_action: string;
    status: string;
    shipment_type?: string;
    accepted_by_origin?: boolean;
    is_w2w_confirmed?: boolean;
    transit_step?: number;
  };
  onClear: (id: number) => void;
  onRefresh?: () => void;
}

export default function IntelligenceCard({ shipment, onClear, onRefresh }: ShipmentProps) {
  const params = useParams();
  const currentUserID = Number(params.userID);
  const userRole = Cookies.get('role');
  const [isAccepting, setIsAccepting] = useState(false);

  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  const isHighRisk = shipment.risk?.toLowerCase() === 'high';
  const isMediumRisk = shipment.risk?.toLowerCase() === 'medium';

  const isPendingAcceptance = shipment.accepted_by_origin === false;
  const isSourceWarehouse = userRole === 'warehouse' && shipment.sourceID === currentUserID;

  const handleAcceptOrder = async () => {
    setIsAccepting(true);
    const endpoint = shipment.shipment_type === 'W2W' 
      ? `${API}/api/shipment/${currentUserID}/confirm-w2w`
      : `${API}/api/shipment/${currentUserID}/accept-order`;

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ shipmentID: shipment.id })
      });

      if (res.ok) {
        if (onRefresh) onRefresh();
      } else {
        const data = await res.json();
        alert(data.error || "Acceptance failed");
      }
    } catch (e) {
      alert("Network communication failure with Central Hub.");
    } finally {
      setIsAccepting(false);
    }
  };

  const riskStyles = isHighRisk
    ? 'border-red-500/50 bg-red-500/5 text-red-400'
    : isMediumRisk
    ? 'border-orange-500/50 bg-orange-500/5 text-orange-400'
    : 'border-emerald-500/50 bg-emerald-500/5 text-emerald-400';

  return (
    <div className={`relative group border rounded-2xl p-6 transition-all hover:shadow-[0_0_20px_rgba(0,0,0,0.3)] ${riskStyles}`}>
      
      {/* Actions */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <Link
          href={`/${currentUserID}/shipment/manage/${shipment.id}/update`}
          className="p-1.5 rounded-lg bg-slate-900/50 text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all opacity-0 group-hover:opacity-100"
          title="Modify Status"
        >
          <Edit2 size={16} />
        </Link>
        <button
          onClick={() => onClear(shipment.id)}
          className="p-1.5 rounded-lg bg-slate-900/50 text-slate-500 hover:text-white hover:bg-red-500/20 transition-all opacity-0 group-hover:opacity-100"
          title="Clear from View"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex items-start gap-4">
        <div className="p-3 rounded-xl bg-slate-900/80">
          {isHighRisk ? <ShieldAlert size={24} /> : isMediumRisk ? <ShieldMinus size={24} /> : <ShieldCheck size={24} />}
        </div>

        <div className="flex-1 space-y-3">
          <div className="flex justify-between items-center pr-16">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white">{shipment.product_name}</h3>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 uppercase">
                {shipment.shipment_type || 'W2B'}
              </span>
            </div>
            <span className="text-[10px] font-mono uppercase tracking-tighter opacity-60">ID: #{shipment.id}</span>
          </div>

          <p className="text-sm opacity-80">
            Deploying <span className="font-bold text-white">{shipment.quantity} units</span> from <span className="text-blue-400 font-medium">{shipment.source}</span> to <span className="text-emerald-400 font-medium">{shipment.destination}</span>.
          </p>

          {/* AI Intelligence Directive */}
          <div className="bg-slate-950/50 p-3 rounded-lg border border-white/5 space-y-1">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest opacity-50">
              <Mail size={12} /> AI Intelligence Action
            </div>
            <p className="text-xs italic leading-relaxed text-slate-300">
              "{shipment.ai_action}"
            </p>
          </div>

          {/* Live Checkpoint & Status Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/5 text-[10px] font-mono uppercase tracking-wider">
            <div className="flex items-center gap-4">
              <span>Risk: <b className="underline">{shipment.risk}</b></span>
              <span className="flex items-center gap-1.5">
                <Clock size={12} className="text-slate-400" />
                Status: <b className="text-white">{shipment.status}</b>
              </span>
            </div>

            {shipment.transit_step !== undefined && (
              <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded-md border border-slate-800 text-blue-400">
                <Truck size={12} />
                <span>Vector Progress: <b>{shipment.transit_step}/10</b></span>
              </div>
            )}
          </div>

          {/* Conditional Accept & Dispatch Action for Origin Warehouse */}
          {isPendingAcceptance && isSourceWarehouse && (
            <div className="mt-4 pt-3 border-t border-dashed border-slate-800 flex items-center justify-between bg-blue-950/20 p-3 rounded-xl">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-blue-400 uppercase">Incoming Dispatch Request</p>
                <p className="text-[10px] text-slate-400">Confirm order to deduct inventory and assign transporter.</p>
              </div>
              <button
                onClick={handleAcceptOrder}
                disabled={isAccepting}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 text-xs transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] disabled:opacity-50"
              >
                {isAccepting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                ACCEPT & DISPATCH
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}