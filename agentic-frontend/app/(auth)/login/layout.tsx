'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function LoginRoleLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800 text-center">
        <Link
          href="/login/user"
          className={`py-2 text-[10px] sm:text-xs font-bold rounded-md transition-all ${
            pathname === '/login/user' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          STORE/USER
        </Link>
        <Link
          href="/login/warehouse"
          className={`py-2 text-[10px] sm:text-xs font-bold rounded-md transition-all ${
            pathname === '/login/warehouse' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          WAREHOUSE
        </Link>
        <Link
          href="/login/transporter"
          className={`py-2 text-[10px] sm:text-xs font-bold rounded-md transition-all ${
            pathname === '/login/transporter' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          TRANSPORTER
        </Link>
      </div>
      {children}
    </div>
  );
}