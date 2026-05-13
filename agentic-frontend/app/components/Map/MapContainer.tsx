'use client';
import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import RoutePath from './RoutePath';

const whIcon = L.icon({ 
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/2271/2271068.png', 
  iconSize: [30, 30],
  iconAnchor: [15, 15] // Centers the icon on the coordinate
});
const bizIcon = L.icon({ 
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/5973/5973800.png', 
  iconSize: [30, 30],
  iconAnchor: [15, 15] 
});

export default function MapContainerComponent({ shipments }: { shipments: any[] }) {
  const defaultCenter: [number, number] = [20.5937, 78.9629];

  return (
    <MapContainer center={defaultCenter} zoom={5} className="h-150 w-full grayscale-[0.6] invert-[0.05] z-0">
      <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
      
      {shipments.map((s) => {
        if (!s.source_coords || !s.dest_coords) return null;

        return (
          <React.Fragment key={s.id}>
            {/* Warehouse Marker */}
            <Marker position={s.source_coords} icon={whIcon}>
              <Popup>
                <div className="text-xs">
                  <p className="font-bold border-b border-slate-200 mb-1">ORIGIN HUB</p>
                  <p>{s.source}</p>
                </div>
              </Popup>
            </Marker>

            <Marker position={s.dest_coords} icon={bizIcon}>
              <Popup>
                <div className="text-xs">
                  <p className="font-bold border-b border-slate-200 mb-1">DESTINATION TERMINAL</p>
                  <p>{s.destination}</p>
                </div>
              </Popup>
            </Marker>

            <RoutePath
              positions={[s.source_coords, s.dest_coords]}
              type={s.shipment_type}
              label={`${s.product_name}: ${s.quantity} units`}
            />
          </React.Fragment>
        );
      })}
    </MapContainer>
  );
}