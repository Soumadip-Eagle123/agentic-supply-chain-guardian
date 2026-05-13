'use client';
import { useEffect } from 'react';
import { RefreshCcw, AlertOctagon } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('COMMAND_CENTER_FAULT:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 bg-slate-900/50 border border-red-900/20 rounded-3xl">
      <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 mb-6">
        <AlertOctagon size={32} />
      </div>
      <h2 className="text-xl font-bold text-white mb-2">Neural Link Decoupled</h2>
      <p className="text-slate-400 text-sm max-w-xs mb-8">
        The Command Center encountered a data stream error. The AI Agent is attempting to stabilize the connection.
      </p>
      <button
        onClick={() => reset()}
        className="flex items-center gap-2 px-6 py-3 bg-slate-100 hover:bg-white text-slate-950 font-bold rounded-xl transition-all"
      >
        <RefreshCcw size={18} /> RE-INITIALIZE INTERFACE
      </button>
    </div>
  );
}