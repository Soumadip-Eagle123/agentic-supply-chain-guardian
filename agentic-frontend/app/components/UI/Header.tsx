'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import Link from 'next/dist/client/link';

export default function Header() {
  const router = useRouter();

  const handleGlobalReset = async () => {
    const role = Cookies.get('role');
    const endpoint = role === 'warehouse' ? 'warehouse' : 'user';
    const API = process.env.NEXT_PUBLIC_API_URL;

    try {
      await fetch(`${API}/api/auth/logout/${endpoint}`, {
        method: 'GET',
        credentials: 'include'
      });
    } catch (e) { console.error("Logout sync failed"); }

    Cookies.remove('userID');
    Cookies.remove('role');
    router.push('/');
  };

  return (
    <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <button onClick={handleGlobalReset} className="flex items-center gap-3 group transition-all">
          <div className="w-8 h-8 bg-blue-600 rounded-lg shadow-[0_0_15px_rgba(37,99,235,0.5)] flex items-center justify-center font-bold text-white group-hover:rotate-90 transition-transform">
            G
          </div>
          <h1 className="text-xl font-bold tracking-tighter text-white uppercase group-hover:text-blue-500 transition-colors">
            Agentic <span className="text-blue-500 group-hover:text-white">Guardian</span>
          </h1>
        </button>
        <div className="text-[10px] font-mono text-orange-600 uppercase tracking-[0.2em]">
          <Link href="https://github.com/Soumadip-Eagle123" className="hover:text-blue-500 transition-colors" target="_blank">Github Repo</Link>
        </div>
      </div>
    </header>
  );
}