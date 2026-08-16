'use client';

import React from 'react';
import { Polyline, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

interface RoutePathProps {
  sourceCoords: [number, number];
  destCoords: [number, number];
  driverBaseCoords?: [number, number] | null;
  type: 'W2B' | 'W2W';
  label: string;
  step?: number; // 0 to 10
  isPickedUp?: boolean;
  status: string;
  viewContext?: 'transporter' | 'standard';
}

const driverIcon = L.icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/2830/2830312.png',
  iconSize: [26, 26],
  iconAnchor: [13, 13],
  popupAnchor: [0, -13],
});

const depotIcon = L.icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

export default function RoutePath({
  sourceCoords,
  destCoords,
  driverBaseCoords,
  type,
  label,
  step = 0,
  isPickedUp = false,
  status,
  viewContext = 'standard',
}: RoutePathProps) {
  const isW2W = type === 'W2W';
  const themeColor = isW2W ? '#f97316' : '#2563eb';

  // 1. BEFORE PICKUP: Transporter vs Standard View
  if (!isPickedUp) {
    if (viewContext === 'transporter' && driverBaseCoords) {
      return (
        <>
          {/* Base Station to Origin Warehouse Leg */}
          <Polyline
            positions={[driverBaseCoords, sourceCoords]}
            pathOptions={{ color: '#a855f7', weight: 3, dashArray: '6, 6' }}
          >
            <Popup>
              <div className="text-xs font-sans">
                <p className="font-bold text-purple-600">Pickup Leg</p>
                <p className="text-slate-600">En route from driver station to origin warehouse</p>
              </div>
            </Popup>
          </Polyline>

          <Marker position={driverBaseCoords} icon={depotIcon}>
            <Popup><span className="text-xs font-sans font-bold">Driver Base Station</span></Popup>
          </Marker>

          <Marker position={driverBaseCoords} icon={driverIcon}>
            <Popup><span className="text-xs font-sans font-bold">Driver Awaiting Collection</span></Popup>
          </Marker>
        </>
      );
    }

    // Warehouse & Business map: planned route outline before pickup
    return (
      <Polyline
        positions={[sourceCoords, destCoords]}
        pathOptions={{ color: '#64748b', weight: 2, dashArray: '5, 8', opacity: 0.4 }}
      />
    );
  }

  // 2. AFTER PICKUP: Progress Interpolation from 0/10 to 10/10
  const progressRatio = Math.min(Math.max(step / 10, 0), 1);
  const currentLat = sourceCoords[0] + progressRatio * (destCoords[0] - sourceCoords[0]);
  const currentLng = sourceCoords[1] + progressRatio * (destCoords[1] - sourceCoords[1]);
  const currentRiderCoords: [number, number] = [currentLat, currentLng];

  return (
    <>
      {/* Covered Distance: Solid Highlight Line */}
      {progressRatio > 0 && (
        <Polyline
          positions={[sourceCoords, currentRiderCoords]}
          pathOptions={{ color: themeColor, weight: 4, opacity: 0.95 }}
        >
          <Popup>
            <div className="font-sans text-xs">
              <p className="font-bold text-blue-600 uppercase">Covered Distance</p>
              <p className="text-slate-700">Progress: {step}/10 ({step * 10}%)</p>
              <p className="text-slate-500">{label}</p>
            </div>
          </Popup>
        </Polyline>
      )}

      {/* Remaining Distance: Faint Dashed Line */}
      {progressRatio < 1 && (
        <Polyline
          positions={[currentRiderCoords, destCoords]}
          pathOptions={{ color: '#64748b', weight: 2, dashArray: '6, 8', opacity: 0.4 }}
        />
      )}

      {/* Live Moving Transporter Vehicle Marker */}
      {progressRatio < 1 && (
        <Marker position={currentRiderCoords} icon={driverIcon}>
          <Popup>
            <div className="font-sans text-xs">
              <p className="font-bold text-blue-600">Live Delivery Vehicle</p>
              <p className="text-slate-700">Progress: {step}/10 ({step * 10}%)</p>
              <p className="text-slate-500">{label}</p>
            </div>
          </Popup>
        </Marker>
      )}
    </>
  );
}