import React from 'react';
import Link from 'next/link';
import { Activity, Edit3, ClipboardList } from 'lucide-react';

export default function WarehouseHub({ params }: { params: Promise<{ userID: string }> }) {
  const resolvedParams = React.use(params);
  const { userID } = resolvedParams;
  const actions = [
    { 
      title: 'Stock Monitor', 
      desc: 'Real-time progress bars for perishable inventory.', 
      href: `/${userID}/warehouse/monitor`, 
      icon: Activity,
      color: 'bg-green-500'
    },
    { 
      title: 'Update Inventory', 
      desc: 'Adjust stock levels and min-threshold triggers.', 
      href: `/${userID}/warehouse/update`, 
      icon: Edit3,
      color: 'bg-orange-500'
    },
  ];

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h2 className="text-2xl font-bold text-white">Warehouse Module</h2>
        <p className="text-slate-500 text-sm">Operator control for localized storage units.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {actions.map((action) => (
          <Link key={action.href} href={action.href} className="group">
            <div className="h-full p-8 bg-slate-900 border border-slate-800 rounded-2xl hover:border-slate-600 transition-all">
              <div className={`w-14 h-14 ${action.color}/10 rounded-xl flex items-center justify-center mb-6 text-white group-hover:scale-110 transition-transform`}>
                <action.icon size={28} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{action.title}</h3>
              <p className="text-slate-400 leading-relaxed">{action.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}