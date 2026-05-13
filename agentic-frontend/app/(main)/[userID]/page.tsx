'use client';
import React from 'react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';

export default function UserIndex({ params }: { params: Promise<{ userID: string }> }) {
  const resolvedParams = React.use(params);
  const { userID } = resolvedParams;
  const router = useRouter();

  useEffect(() => {
    const role = Cookies.get('role');
    if (role === 'warehouse') {
      router.replace(`/${userID}/warehouse/monitor`);
    } else {
      router.replace(`/${userID}/shipment/manage`);
    }
  }, [userID, router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="font-mono text-xs text-slate-500 uppercase tracking-[0.3em]">Synching with Neural Grid...</p>
      </div>
    </div>
  );
}