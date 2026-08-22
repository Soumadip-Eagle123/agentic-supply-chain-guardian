'use client';

import React, { useEffect, useState, use } from 'react';
import dynamic from 'next/dynamic';
import {
  Truck,
  Navigation,
  CheckCircle,
  ArrowRight,
  X,
  Loader2,
  PackageCheck,
  MapPin,
  CheckCircle2,
  MessageSquare,
  ClipboardList
} from 'lucide-react';

const DynamicMap = dynamic(() => import('@/app/components/Map/LiveTransporterMap'), {
  ssr: false,
  loading: () => (
    <div className="h-72 bg-slate-950 rounded-2xl flex items-center justify-center text-slate-500 text-xs font-mono">
      Loading Live Route Map...
    </div>
  )
});

export default function TransporterPortal({ params }: { params: Promise<{ userID: string }> }) {
  const { userID } = use(params);
  const [runs, setRuns] = useState<any[]>([]);
  const [driverBase, setDriverBase] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRun, setSelectedRun] = useState<any | null>(null);
  const [step, setStep] = useState<number>(0);
  const [driverComment, setDriverComment] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<string>('');
  
  // NEW: Voice Telemetry State
  const [isListening, setIsListening] = useState<boolean>(false);

  // NEW: Preset Hazard Chips
  const hazardChips = [
    "Heavy Flooding",
    "Highway Blockade",
    "Mechanical Breakdown"
  ];

  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  const fetchRuns = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/transporter/${userID}/runs`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        const activeRuns = data.runs || [];
        setRuns(activeRuns);
        setDriverBase(data.driver_base || [28.6139, 77.2090]);

        if (activeRuns.length > 0) {
          const current = selectedRun
            ? activeRuns.find((r: any) => r.id === selectedRun.id) || activeRuns[0]
            : activeRuns[0];
          setSelectedRun(current);
          setStep(current.transit_step || 0);
        } else {
          setSelectedRun(null);
        }
      }
    } catch (e) {
      console.error("Failed to load driver runs:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, [userID]);

  const handleConfirmPickup = async () => {
    if (!selectedRun) return;
    setIsProcessing(true);
    try {
      const res = await fetch(`${API}/api/transporter/${userID}/pickup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ shipmentID: selectedRun.id })
      });
      if (res.ok) {
        setStatusMsg('Package pickup confirmed. Route tracking active.');
        await fetchRuns();
      }
    } catch (err) {
      alert("Failed to confirm pickup.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStepSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRun) return;

    setIsProcessing(true);
    try {
      const res = await fetch(`${API}/api/transporter/${userID}/manual-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          shipmentID: selectedRun.id,
          step: step,
          driver_note: driverComment || undefined
        })
      });

      const data = await res.json();
      if (res.ok) {
        setStatusMsg(data.Success || `Checkpoint ${step}/10 updated.`);
        setDriverComment('');
        await fetchRuns();
      } else {
        setStatusMsg(data.error || 'Failed to update checkpoint.');
      }
    } catch (err) {
      setStatusMsg('Connection error logging progress.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFinalizeAndPurge = async () => {
    if (!selectedRun) return;
    if (!confirm(`Confirm delivery and finalize shipment #${selectedRun.id}?`)) return;

    setIsProcessing(true);
    try {
      const res = await fetch(`${API}/api/transporter/${userID}/finalize-delivery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ shipmentID: selectedRun.id })
      });

      if (res.ok) {
        setStatusMsg('Shipment delivery confirmed and finalized.');
        setSelectedRun(null);
        await fetchRuns();
      }
    } catch (err) {
      alert("Failed to finalize delivery.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearRun = async (shipmentID: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`${API}/api/transporter/${userID}/clear/${shipmentID}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (res.ok) {
        setRuns(prev => prev.filter(r => r.id !== shipmentID));
        if (selectedRun?.id === shipmentID) setSelectedRun(null);
      }
    } catch (err) {
      alert("Clearance failed.");
    }
  };

  // NEW: Voice Recording Toggle Logic
  const toggleVoiceRecording = () => {
    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      alert("Voice input is not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onstart = () => setIsListening(true);
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setDriverComment(transcript);
    };
    
    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
    };
    
    recognition.onend = () => setIsListening(false);

    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Truck className="text-blue-500" size={24} /> Driver Delivery Cockpit
          </h1>
          <p className="text-slate-400 text-xs mt-0.5">
            Manage route progress, confirm collections, and provide live transit updates.
          </p>
        </div>
        <button
          onClick={fetchRuns}
          className="text-xs bg-slate-900 border border-slate-800 hover:border-slate-700 px-3.5 py-2 rounded-xl text-slate-300 transition-all font-medium"
        >
          Refresh Manifest
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-600 gap-2">
          <Loader2 className="animate-spin text-blue-500" size={28} />
          <span className="text-xs font-mono">Syncing manifest data...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Assigned Runs List */}
          <div className="space-y-3">
            <h2 className="text-slate-400 font-bold text-xs uppercase tracking-wider">
              Assigned Deliveries ({runs.length})
            </h2>

            {runs.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/20 space-y-2">
                <Truck size={28} className="text-slate-700 mx-auto" />
                <p className="text-slate-300 font-bold text-xs">No Deliveries Currently Assigned</p>
                <p className="text-slate-500 text-[11px]">
                  When a warehouse confirms a dispatch, it will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-155 overflow-y-auto pr-1">
                {runs.map((r) => {
                  const isSelected = selectedRun?.id === r.id;
                  const itemDelivered = r.status === 'Delivered' || r.transit_step === 10;

                  return (
                    <div
                      key={r.id}
                      onClick={() => { setSelectedRun(r); setStep(r.transit_step || 0); }}
                      className={`relative w-full p-4 rounded-2xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-500/10 text-white shadow-lg'
                          : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <button
                        onClick={(e) => handleClearRun(r.id, e)}
                        className="absolute top-3.5 right-3 p-1 rounded-lg bg-slate-950/60 text-slate-400 hover:text-white hover:bg-red-500/20 transition-all"
                        title="Dismiss run from view"
                      >
                        <X size={14} />
                      </button>

                      <div className="flex justify-between items-start mb-1 pr-6">
                        <span className="font-bold text-sm text-white truncate">{r.product_name}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 uppercase">
                          {r.shipment_type || 'W2B'}
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 truncate">{r.source} ➔ {r.destination}</p>

                      <div className="mt-3 flex items-center justify-between text-xs border-t border-slate-800/80 pt-2 font-mono">
                        <span className="text-blue-400 font-bold">Progress: {r.transit_step || 0}/10</span>
                        <span className={`text-[11px] font-sans ${itemDelivered ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}>
                          {r.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Map & Controls Area */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden p-1 shadow-lg">
              <DynamicMap
                sourceCoords={selectedRun?.source_coords || driverBase || [28.6139, 77.2090]}
                destCoords={selectedRun?.dest_coords || driverBase || [28.6139, 77.2090]}
                driverBaseCoords={driverBase}
                transitStep={selectedRun?.transit_step || 0}
                isPickedUp={selectedRun?.is_picked_up || false}
                label={selectedRun ? `${selectedRun.product_name} (${selectedRun.quantity} Units)` : "Transporter Depot"}
                status={selectedRun?.status || "Idle"}
              />
            </div>

            {selectedRun && (
              <>
                <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/60 text-slate-300">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-slate-950 shrink-0 mt-0.5 border border-slate-800 text-blue-400">
                      <ClipboardList size={18} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                        Operational Status & Dispatch Notes
                      </p>
                      <p className="text-xs leading-relaxed text-slate-200 font-mono">
                        {selectedRun.ai_action || selectedRun.status || "Package ready for transit. Follow designated corridor parameters."}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-5">
                  <div className="flex justify-between items-start border-b border-slate-800 pb-3">
                    <div>
                      <h3 className="text-base font-bold text-white">
                        {selectedRun.product_name} ({selectedRun.quantity} Units)
                      </h3>
                      <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <MapPin size={12} className="text-blue-400" /> {selectedRun.source} ➔ {selectedRun.destination}
                      </p>
                    </div>
                  </div>

                  {!selectedRun.is_picked_up ? (
                    <div className="bg-blue-950/20 border border-blue-500/30 p-5 rounded-xl space-y-3 text-center">
                      <p className="text-xs font-bold text-blue-300 uppercase">Package Awaiting Warehouse Pickup</p>
                      <p className="text-xs text-slate-400">
                        Arrive at {selectedRun.source} and click below to confirm physical collection.
                      </p>
                      <button
                        onClick={handleConfirmPickup}
                        disabled={isProcessing}
                        className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg"
                      >
                        {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <PackageCheck size={16} />}
                        CONFIRM PACKAGE PICKUP
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleStepSubmit} className="space-y-5">
                      <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-300 flex items-center gap-1.5">
                            <Navigation size={14} className="text-blue-400" />
                            Delivery Progress: <b className="text-blue-400 text-sm">{step}/10 ({step * 10}%)</b>
                          </span>
                          <span className="text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-[11px]">
                            {step === 10 ? 'Arrived at Destination' : step === 0 ? 'Picked Up at Origin' : `En Route Checkpoint ${step}`}
                          </span>
                        </div>

                        <input
                          type="range"
                          min="0"
                          max="10"
                          value={step}
                          onChange={(e) => setStep(Number(e.target.value))}
                          className="w-full h-2 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />

                        <div className="flex justify-between text-[10px] text-slate-500 px-1 font-mono">
                          {[...Array(11)].map((_, idx) => (
                            <span key={idx} className={step === idx ? 'text-blue-400 font-bold' : ''}>
                              {idx}/10
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* UPDATED: Driver Comments, Voice Mic & Hazard Chips */}
                      <div className="space-y-3 mt-4">
                        <label className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                          <MessageSquare size={14} className="text-blue-400" />
                          Driver Remarks / Hazard Report (Optional)
                        </label>
                        
                        {/* Hazard Chips */}
                        <div className="flex flex-wrap gap-2 mb-2">
                          {hazardChips.map((chip) => (
                            <button
                              key={chip}
                              type="button"
                              onClick={() => setDriverComment(chip)}
                              className="px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider bg-slate-900 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800 hover:text-white transition-colors"
                            >
                              {chip}
                            </button>
                          ))}
                        </div>

                        {/* Input & Mic Button Row */}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="e.g., Passing toll plaza / slight traffic delay"
                            value={driverComment}
                            onChange={(e) => setDriverComment(e.target.value)}
                            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:border-blue-500 outline-none font-mono"
                          />
                          <button
                            type="button"
                            onClick={toggleVoiceRecording}
                            className={`px-4 rounded-xl flex items-center justify-center transition-colors border ${
                              isListening
                                ? "bg-red-500/20 border-red-500 text-red-400 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                                : "bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white"
                            }`}
                            title="Tap to speak"
                          >
                            {isListening ? "🎙️..." : "🎤"}
                          </button>
                        </div>
                      </div>

                      {statusMsg && (
                        <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-300 rounded-lg text-xs flex items-center gap-2 font-mono">
                          <CheckCircle size={14} /> {statusMsg}
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        <button
                          type="submit"
                          disabled={isProcessing}
                          className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg disabled:opacity-50"
                        >
                          {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                          UPDATE PROGRESS & REMARKS
                        </button>

                        <button
                          type="button"
                          onClick={handleFinalizeAndPurge}
                          disabled={isProcessing}
                          className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] disabled:opacity-50"
                        >
                          {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                          CONFIRM DELIVERY & COMPLETE
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
