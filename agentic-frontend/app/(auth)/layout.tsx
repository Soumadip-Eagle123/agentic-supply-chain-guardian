'use client';
import React from 'react';

import Link from 'next/link';
import { useSelectedLayoutSegment } from 'next/navigation';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const segment = useSelectedLayoutSegment();

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-65px)]">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex border-b border-slate-800">
          <Link
            href="/login/user"
            className={`flex-1 py-4 text-center text-sm font-semibold transition-colors ${
              segment === 'login' || segment === null ? 'bg-blue-600/10 text-blue-500 border-b-2 border-blue-500' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            LOGIN
          </Link>
          <Link
            href="/signup"
            className={`flex-1 py-4 text-center text-sm font-semibold transition-colors ${
              segment === 'signup' ? 'bg-blue-600/10 text-blue-500 border-b-2 border-blue-500' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            SIGNUP
          </Link>
        </div>

        <div className="p-8">
          {children}
        </div>
      </div>
    </div>
  );
}