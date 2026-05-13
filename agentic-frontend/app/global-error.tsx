'use client';
import { ShieldAlert } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-white min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <ShieldAlert className="mx-auto text-red-600" size={64} />
          <h1 className="text-3xl font-bold tracking-tighter">CRITICAL SYSTEM FAILURE</h1>
          <p className="text-slate-500 font-mono text-xs uppercase tracking-widest leading-relaxed">
            Guardian core has entered emergency lockdown. Internal memory corruption or network blackout detected.
          </p>
          <button
            onClick={() => reset()}
            className="w-full py-4 bg-red-600 hover:bg-red-500 rounded-xl font-black tracking-widest transition-all shadow-[0_0_30px_rgba(220,38,38,0.3)]"
          >
            FORCE REBOOT SYSTEM
          </button>
        </div>
      </body>
    </html>
  );
}