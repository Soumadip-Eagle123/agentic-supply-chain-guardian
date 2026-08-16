'use client';

import React from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import RoutePath from './RoutePath';
import 'leaflet/dist/leaflet.css';

interface LiveTransporterMapProps {
  sourceCoords: [number, number];
  destCoords: [number, number];
  driverBaseCoords?: [number, number] | null;
  transitStep: number;
  isPickedUp?: boolean;
  label: string;
  status: string;
}

export default function LiveTransporterMap({
  sourceCoords,
  destCoords,
  driverBaseCoords,
  transitStep,
  isPickedUp = false,
  label,
  status
}: LiveTransporterMapProps) {
  const centerLat = (sourceCoords[0] + destCoords[0]) / 2;
  const centerLng = (sourceCoords[1] + destCoords[1]) / 2;

  return (
    <div className="h-72 w-full rounded-xl overflow-hidden">
      <MapContainer
        center={[centerLat, centerLng]}
        zoom={6}
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <RoutePath
          sourceCoords={sourceCoords}
          destCoords={destCoords}
          driverBaseCoords={driverBaseCoords}
          type="W2B"
          label={label}
          step={transitStep}
          isPickedUp={isPickedUp}
          status={status}
          viewContext="transporter"
        />
      </MapContainer>
    </div>
  );
}