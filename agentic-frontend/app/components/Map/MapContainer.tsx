'use client';
import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import RoutePath from './RoutePath';

const whIcon = L.icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/2271/2271068.png',
  iconSize: [30, 30],
  iconAnchor: [15, 15]
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
            {/* Origin Warehouse Marker */}
            <Marker position={s.source_coords} icon={whIcon}>
              <Popup>
                <div className="text-xs font-sans">
                  <p className="font-bold border-b border-slate-200 mb-1 text-slate-800">ORIGIN HUB</p>
                  <p className="text-slate-600">{s.source}</p>
                </div>
              </Popup>
            </Marker>

            {/* Destination Terminal Marker */}
            <Marker position={s.dest_coords} icon={bizIcon}>
              <Popup>
                <div className="text-xs font-sans">
                  <p className="font-bold border-b border-slate-200 mb-1 text-slate-800">DESTINATION TERMINAL</p>
                  <p className="text-slate-600">{s.destination}</p>
                </div>
              </Popup>
            </Marker>

            {/* Dynamic Step-Interpolated Route */}
            <RoutePath
              sourceCoords={s.source_coords}
              destCoords={s.dest_coords}
              type={s.shipment_type || 'W2B'}
              label={`${s.product_name}: ${s.quantity} units`}
              step={s.transit_step || 0}
              isPickedUp={Boolean(s.is_picked_up || s.transit_step > 0)}
              status={s.status}
              viewContext="standard"
            />
          </React.Fragment>
        );
      })}
    </MapContainer>
  );
}