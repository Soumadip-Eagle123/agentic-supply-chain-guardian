import React from 'react';
import Link from 'next/link';
import { Shield, Cpu, Activity, Zap } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-73px)] relative px-6 py-20">
      <div className="max-w-4xl w-full text-center space-y-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-[10px] font-mono tracking-widest uppercase">
          <Zap size={12} /> Neural Grid Online
        </div>
        <h2 className="text-6xl md:text-8xl font-black text-white tracking-tight uppercase leading-none">
          Autonomous <br /> <span className="text-blue-500">Supply Chain</span>
        </h2>
        <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
          The Agentic Guardian is a professional-tier logistics supervisor. Driven by Llama 3, it predicts risks, automates rebalancing, and secures your supply chain.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
          <Link href="/login/user" className="w-full sm:w-64 py-5 bg-blue-600 rounded-2xl text-white font-bold uppercase tracking-widest text-sm hover:shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all">
            Enter Portal
          </Link>
          <Link href="/signup" className="w-full sm:w-64 py-5 bg-slate-900 border border-slate-800 rounded-2xl text-slate-300 font-bold uppercase tracking-widest text-sm hover:bg-slate-800 transition-all">
            Registry Init
          </Link>
        </div>
      </div>
    </div>
  );
}