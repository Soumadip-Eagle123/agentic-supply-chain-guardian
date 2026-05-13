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
  User 
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

  useEffect(() => {
    const userRole = Cookies.get('role');
    setRole(userRole || 'user');
  }, []);


  const handleLogout = async () => {
    const logoutPath = role === 'warehouse' ? 'warehouse' : 'user';
    const API = process.env.NEXT_PUBLIC_API_URL;
    await fetch(`${API}/api/auth/logout/${logoutPath}`, 
      {
        method: 'GET',
        credentials: 'include',
      }
    );
    Cookies.remove('userID');
    Cookies.remove('role');
    router.push('/login/user');
  };
  const navItems = [
    { 
      name: 'Intelligence Feed', 
      href: `/${userID}/shipment/manage`, 
      icon: LayoutDashboard,
      show: true 
    },
    { 
      name: 'Global Tracker', 
      href: `/${userID}/shipment/track`, 
      icon: MapIcon,
      show: true 
    },
    { 
      name: 'Initiate Dispatch', 
      href: `/${userID}/shipment/send`, 
      icon: Send,
      show: role === 'user' 
    },
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
    },
  ];

  return (
    <div className="flex h-[calc(100vh-65px)] overflow-hidden">
      {/* SIDEBAR */}
      <aside className="w-64 border-r border-slate-800 bg-slate-900/20 backdrop-blur-sm p-4 flex flex-col">
        <div className="mb-8 px-4">
          <div className="flex items-center gap-3 py-2 px-3 bg-slate-800/50 rounded-xl border border-slate-700">
            <div className="p-2 bg-blue-600/20 rounded-lg text-blue-400">
              <User size={18} />
            </div>
            <div>
              <p className="text-[10px] font-mono text-slate-500 uppercase leading-none mb-1">Authenticated</p>
              <p className="text-sm font-bold text-white truncate w-32">{role === 'warehouse' ? 'HUB MANAGER' : 'LOGISTICS OP'}</p>
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
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
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
            <span className="font-medium text-sm">Terminate Session</span>
          </button>
          <div className="px-4 py-2">
            <p className="text-[9px] font-mono text-slate-600 uppercase tracking-widest text-center">Guardian Node: {userID}</p>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-slate-950 p-8">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}