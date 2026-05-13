import React from 'react';
import Link from 'next/link';
import { LayoutDashboard, Send, Map } from 'lucide-react';

export default function ShipmentHub({ params }: { params: Promise<{ userID: string }> }) {
  const resolvedParams = React.use(params);
  const { userID } = resolvedParams;
  const actions = [
    { 
      title: 'Manage Network', 
      desc: 'View active shipments and AI risk analysis.', 
      href: `/${userID}/shipment/manage`, 
      icon: LayoutDashboard,
      color: 'bg-blue-500'
    },
    { 
      title: 'Initiate Dispatch', 
      desc: 'Deploy a new product shipment into the chain.', 
      href: `/${userID}/shipment/send`, 
      icon: Send,
      color: 'bg-emerald-500'
    },
    { 
      title: 'Global Tracking', 
      desc: 'Visual coordinate tracking via Leaflet satellite.', 
      href: `/${userID}/shipment/track`, 
      icon: Map,
      color: 'bg-purple-500'
    },
  ];

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h2 className="text-2xl font-bold text-white">Logistics Module</h2>
        <p className="text-slate-500 text-sm">Select an operation to begin monitoring.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {actions.map((action) => (
          <Link key={action.href} href={action.href} className="group">
            <div className="h-full p-6 bg-slate-900 border border-slate-800 rounded-2xl hover:border-slate-600 transition-all">
              <div className={`w-12 h-12 ${action.color}/10 rounded-xl flex items-center justify-center mb-4 text-white group-hover:scale-110 transition-transform`}>
                <action.icon className="text-white" size={24} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{action.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{action.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}