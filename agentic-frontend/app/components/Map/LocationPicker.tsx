'use client';

import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useState } from 'react';
import L from 'leaflet';

type Coords = [number, number];

const icon = L.icon({
  iconUrl: '/marker-icon.png',
  iconRetinaUrl: '/marker-icon-2x.png',
  shadowUrl: '/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function ClickHandler({
  position,
  setPosition,
  onLocationSelect,
}: {
  position: Coords | null;
  setPosition: React.Dispatch<React.SetStateAction<Coords | null>>;
  onLocationSelect: (coords: Coords) => void;
}) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      const next: Coords = [lat, lng];
      setPosition(next);
      onLocationSelect(next);
    },
  });

  if (!position) return null;
  return <Marker position={position} icon={icon} />;
}

export default function LocationPicker({
  onLocationSelect,
}: {
  onLocationSelect: (coords: Coords) => void;
}) {
  const [position, setPosition] = useState<Coords | null>(null);

  return (
    <div className="h-64 w-full rounded-lg overflow-hidden border border-slate-800 relative z-0">
      <MapContainer
        center={[20.5937, 78.9629]}
        zoom={4}
        className="h-full w-full"
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <ClickHandler
          position={position}
          setPosition={setPosition}
          onLocationSelect={onLocationSelect}
        />
      </MapContainer>
    </div>
  );
}

