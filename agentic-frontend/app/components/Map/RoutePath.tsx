'use client';
import { Polyline, Popup } from 'react-leaflet';

interface RoutePathProps {
  positions: [[number, number], [number, number]];
  type: 'W2B' | 'W2W';
  label: string;
}

export default function RoutePath({ positions, type, label }: RoutePathProps) {
  const isW2W = type === 'W2W';
  
  const pathOptions = {
    color: isW2W ? '#f97316' : '#3b82f6',
    weight: isW2W ? 2 : 4,
    dashArray: isW2W ? '10, 15' : '0',
    opacity: 0.8,
    lineJoin: 'round' as const,
  };

  return (
    <Polyline positions={positions} pathOptions={pathOptions}>
      <Popup>
        <div className="font-mono text-[10px]">
          <p className="font-bold text-slate-900 uppercase">{type} VECTOR</p>
          <p className="text-slate-600">{label}</p>
        </div>
      </Popup>
    </Polyline>
  );
}