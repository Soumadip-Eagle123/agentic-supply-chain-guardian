'use client';

import React, { useEffect, useState, use } from 'react';
import { Truck, Navigation, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react';

export default function TransporterPortal({ params }: { params: Promise<{ userID: string }> }) {
  const { userID } = use(params);
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRun, setSelectedRun] = useState<any | null>(null);
  const [step, setStep] = useState<number>(1);
  const [hazard, setHazard] = useState<string>('');
  const [statusMsg, setStatusMsg] = useState<string>('');

  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  const fetchRuns = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/transporter/${userID}/runs`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setRuns(data);
        if (data.length > 0 && !selectedRun) {
          setSelectedRun(data[0]);
          setStep(data[0].transit_step || 1);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, [userID]);

  const handleStepSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRun) return;

    setStatusMsg('Broadcasting telematics update to Neural Grid...');
    try {
      const res = await fetch(`${API}/api/transporter/${userID}/update-step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          shipmentID: selectedRun.id,
          step: step,
          hazard_report: hazard || undefined
        })
      });

      if (res.ok) {
        setStatusMsg(`Checkpoint ${step}/10 synchronized.`);
        fetchRuns();
      } else {
        setStatusMsg('Update rejected by Command Center.');
      }
    } catch (err) {
      setStatusMsg('Network failure.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-mono text-xs">
      <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
        <Truck className="text-blue-500 animate-pulse" size={28} />
        <div>
          <h1 className="text-base font-bold text-white uppercase">Transporter Transit Cockpit</h1>
          <p className="text-slate-500 text-[11px]">Assigned Driver ID #{userID} • Geodesic Dispatch Telemetry</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Run Selection */}
        <div className="space-y-3">
          <h2 className="text-slate-400 font-bold uppercase tracking-wider">Assigned Cargo Vectors</h2>
          {runs.map((r) => (
            <button
              key={r.id}
              onClick={() => { setSelectedRun(r); setStep(r.transit_step || 1); }}
              className={`w-full text-left p-4 rounded-xl border transition-all ${
                selectedRun?.id === r.id 
                  ? 'border-blue-500 bg-blue-500/10 text-white' 
                  : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold uppercase text-white">{r.product_name}</span>
                <span className="text-[10px] bg-slate-900 px-2 py-0.5 rounded">#{r.id}</span>
              </div>
              <p className="text-[10px] text-slate-500 truncate">{r.source} ➔ {r.destination}</p>
              <div className="mt-2 flex items-center justify-between text-[10px]">
                <span className="text-blue-400 font-bold">Progress: {r.transit_step}/10</span>
                <span className="uppercase text-slate-400">{r.status}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Checkpoint Slider & Hazard Form */}
        <div className="md:col-span-2 bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-6">
          {selectedRun ? (
            <form onSubmit={handleStepSubmit} className="space-y-6">
              <div>
                <span className="text-slate-500 uppercase tracking-widest text-[10px]">Active Vector</span>
                <h3 className="text-lg font-bold text-white mt-1">
                  {selectedRun.product_name} ({selectedRun.quantity} Units)
                </h3>
                <p className="text-slate-400 text-xs mt-0.5">{selectedRun.source} to {selectedRun.destination}</p>
              </div>

              {/* Step Progress 1/10 to 10/10 */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Navigation size={14} className="text-blue-400" />
                    Trip Segment Progress: <span className="text-blue-400 text-sm">{step}/10</span>
                  </label>
                  <span className="text-[10px] text-slate-500">
                    {step === 10 ? '🏁 Final Delivery Hub' : step === 0 ? 'Origin Depot' : `En Route Checkpoint #${step}`}
                  </span>
                </div>

                <input
                  type="range"
                  min="1"
                  max="10"
                  value={step}
                  onChange={(e) => setStep(Number(e.target.value))}
                  className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />

                <div className="flex justify-between text-[9px] text-slate-600 px-1">
                  {[...Array(10)].map((_, idx) => (
                    <span key={idx + 1} className={step === idx + 1 ? 'text-blue-400 font-bold' : ''}>
                      {idx + 1}/10
                    </span>
                  ))}
                </div>
              </div>

              {/* Dynamic Hazard Log */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle size={14} className="text-amber-500" />
                  Route Hazard / Incident Telemetry (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Flash Flooding on NH-44 / Severe Axle Delay"
                  value={hazard}
                  onChange={(e) => setHazard(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-blue-500 outline-none"
                />
              </div>

              {statusMsg && (
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-lg flex items-center gap-2">
                  <CheckCircle size={14} /> {statusMsg}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(37,99,235,0.2)] transition-all uppercase tracking-wider"
              >
                Log Transit Checkpoint <ArrowRight size={16} />
              </button>
            </form>
          ) : (
            <p className="text-slate-500 text-center py-20">No active cargo run selected.</p>
          )}
        </div>
      </div>
    </div>
  );
}