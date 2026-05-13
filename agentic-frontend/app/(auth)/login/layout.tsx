'use client';
import React from 'react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function LoginRoleLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <div className="flex gap-2 p-1 bg-slate-950 rounded-lg border border-slate-800">
        <Link
          href="/login/user"
          className={`flex-1 py-2 text-center text-xs font-bold rounded-md transition-all ${
            pathname === '/login/user' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          USER PORTAL
        </Link>
        <Link
          href="/login/warehouse"
          className={`flex-1 py-2 text-center text-xs font-bold rounded-md transition-all ${
            pathname === '/login/warehouse' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          WAREHOUSE HUB
        </Link>
      </div>
      {children}
    </div>
  );
}