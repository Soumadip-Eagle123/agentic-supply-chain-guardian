'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Send,
  Package,
  Map as MapIcon,
  LogOut,
  Activity,
  User,
  Truck,
  FileText,
  Boxes
} from 'lucide-react';
import Cookies from 'js-cookie';

export default function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ userID: string }>;
}) {
  const resolvedParams = React.use(params);
  const { userID } = resolvedParams;
  const router = useRouter();
  const pathname = usePathname();
  const [role, setRole] = useState<string | null>(null);
  const [username, setUsername] = useState<string>('');

  useEffect(() => {
    const userRole = Cookies.get('role');
    setRole(userRole || 'user');

    const fetchUserData = async () => {
      const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      try {
        const res = await fetch(`${API}/api/auth/me`, {
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          setUsername(data.username || `User #${userID}`);
        } else {
          setUsername(`User #${userID}`);
        }
      } catch (err) {
        setUsername(`User #${userID}`);
      }
    };

    fetchUserData();
  }, [userID]);

  const handleLogout = async () => {
    const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    try {
      await fetch(`${API}/api/auth/logout/${role || 'user'}`, {
        method: 'GET',
        credentials: 'include',
      });
    } catch (err) {
      console.error("Logout cleanup failed");
    }
    Cookies.remove('userID');
    Cookies.remove('role');
    router.push('/login/user');
  };

  const navItems = [
    // 1. Transporter-Only Cockpit
    {
      name: 'Delivery Cockpit',
      href: `/${userID}/transporter`,
      icon: Truck,
      show: role === 'transporter'
    },
    // 2. Shared Operations (Store & Warehouse)
    {
      name: 'Shipment Tracker',
      href: `/${userID}/shipment/manage`,
      icon: LayoutDashboard,
      show: role === 'user' || role === 'warehouse'
    },
    {
      name: 'Network Inventory',
      href: `/${userID}/global-inventory`,
      icon: Boxes,
      show: role === 'user' || role === 'warehouse'
    },
    {
      name: 'Live Corridor Map',
      href: `/${userID}/shipment/track`,
      icon: MapIcon,
      show: role === 'user' || role === 'warehouse'
    },
    {
      name: 'Safety Guidelines',
      href: `/${userID}/knowledge`,
      icon: FileText,
      show: role === 'user' || role === 'warehouse'
    },
    // 3. Store-Only Action
    {
      name: 'Initiate Dispatch',
      href: `/${userID}/shipment/send`,
      icon: Send,
      show: role === 'user'
    },
    // 4. Warehouse-Only Inventory Controls
    {
      name: 'Stock Monitor',
      href: `/${userID}/warehouse/monitor`,
      icon: Activity,
      show: role === 'warehouse'
    },
    {
      name: 'Update Inventory',
      href: `/${userID}/warehouse/update`,
      icon: Package,
      show: role === 'warehouse'
    }
  ];

  return (
    <div className="flex h-[calc(100vh-65px)] overflow-hidden bg-transparent">
      <aside className="w-64 border-r border-slate-800 bg-slate-900/40 backdrop-blur-md p-4 flex flex-col z-20">
        <div className="mb-8 px-4">
          <div className="flex items-center gap-3 py-2 px-3 bg-slate-800/40 rounded-xl border border-slate-700/50">
            <div className="p-2 bg-blue-600/20 rounded-lg text-blue-400">
              <User size={18} />
            </div>
            <div className="overflow-hidden">
              <p className="text-[9px] font-mono text-slate-500 uppercase leading-none mb-1 tracking-widest">Account Role</p>
              <p className="text-sm font-bold text-white truncate uppercase tracking-tight">
                {role === 'warehouse' 
                  ? 'Warehouse Manager' 
                  : role === 'transporter' 
                  ? 'Transporter Driver' 
                  : 'Store Manager'}
              </p>
            </div>
          </div>
        </div>

        <nav className="space-y-1 flex-1">
          {navItems.filter(item => item.show).map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 border ${
                  isActive
                    ? 'bg-blue-600/10 text-blue-400 border-blue-600/20 shadow-[0_0_15px_rgba(37,99,235,0.1)]'
                    : 'text-slate-400 border-transparent hover:bg-slate-800/40 hover:text-slate-200'
                }`}
              >
                <item.icon size={18} className={isActive ? 'text-blue-400' : 'text-slate-500'} />
                <span className="font-medium text-sm">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="pt-4 border-t border-slate-800 space-y-2">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-all group"
          >
            <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium text-sm uppercase tracking-wider">Terminate Session</span>
          </button>
          
          <div className="px-4 py-1 text-center">
            <p className="text-[11px] font-sans font-medium text-slate-400 truncate">
              User: <span className="text-white font-bold">{username || `User #${userID}`}</span>
            </p>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-8 bg-transparent relative z-10">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}