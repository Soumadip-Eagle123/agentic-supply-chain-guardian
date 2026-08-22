'use client';

import React, { useEffect, useState } from 'react';
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
  risk?: string;
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
  risk = 'Low',
  viewContext = 'standard',
}: RoutePathProps) {
  const [roadGeometry, setRoadGeometry] = useState<[number, number][]>([]);
  const [detourGeometry, setDetourGeometry] = useState<[number, number][]>([]);
  const [pickupGeometry, setPickupGeometry] = useState<[number, number][]>([]);

  const isW2W = type === 'W2W';
  const themeColor = isW2W ? '#f97316' : '#2563eb';
  const isHighRisk = risk?.toLowerCase() === 'high';

  // 1. Fetch Main Road Driving Geometry from OSRM
  useEffect(() => {
    if (!sourceCoords || !destCoords) return;

    const fetchRoute = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${sourceCoords[1]},${sourceCoords[0]};${destCoords[1]},${destCoords[0]}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.routes && data.routes[0]) {
          // Convert GeoJSON [lon, lat] -> Leaflet [lat, lon]
          const points: [number, number][] = data.routes[0].geometry.coordinates.map(
            (c: [number, number]) => [c[1], c[0]]
          );
          setRoadGeometry(points);
        } else {
          setRoadGeometry([sourceCoords, destCoords]);
        }
      } catch (err) {
        setRoadGeometry([sourceCoords, destCoords]);
      }
    };

    fetchRoute();
  }, [sourceCoords[0], sourceCoords[1], destCoords[0], destCoords[1]]);

  // 2. Fetch Pickup Leg Geometry (Driver Base -> Origin Warehouse)
  useEffect(() => {
    if (isPickedUp || viewContext !== 'transporter' || !driverBaseCoords || !sourceCoords) {
      setPickupGeometry([]);
      return;
    }

    const fetchPickupLeg = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${driverBaseCoords[1]},${driverBaseCoords[0]};${sourceCoords[1]},${sourceCoords[0]}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.routes && data.routes[0]) {
          const points: [number, number][] = data.routes[0].geometry.coordinates.map(
            (c: [number, number]) => [c[1], c[0]]
          );
          setPickupGeometry(points);
        } else {
          setPickupGeometry([driverBaseCoords, sourceCoords]);
        }
      } catch {
        setPickupGeometry([driverBaseCoords, sourceCoords]);
      }
    };

    fetchPickupLeg();
  }, [isPickedUp, viewContext, driverBaseCoords, sourceCoords]);

  // 3. Fetch Alternate Detour Path on High Risk Hazard
  useEffect(() => {
    if (!isHighRisk || !sourceCoords || !destCoords) {
      setDetourGeometry([]);
      return;
    }

    const fetchDetour = async () => {
      try {
        // Offset waypoint to simulate detour bypassing hazard zone
        const midLat = (sourceCoords[0] + destCoords[0]) / 2 + 0.25;
        const midLng = (sourceCoords[1] + destCoords[1]) / 2 + 0.25;

        const url = `https://router.project-osrm.org/route/v1/driving/${sourceCoords[1]},${sourceCoords[0]};${midLng},${midLat};${destCoords[1]},${destCoords[0]}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.routes && data.routes[0]) {
          const points: [number, number][] = data.routes[0].geometry.coordinates.map(
            (c: [number, number]) => [c[1], c[0]]
          );
          setDetourGeometry(points);
        }
      } catch {
        setDetourGeometry([]);
      }
    };

    fetchDetour();
  }, [isHighRisk, sourceCoords[0], sourceCoords[1], destCoords[0], destCoords[1]]);

  // Pre-pickup Display
  if (!isPickedUp) {
    if (viewContext === 'transporter' && driverBaseCoords) {
      return (
        <>
          {pickupGeometry.length > 1 && (
            <Polyline
              positions={pickupGeometry}
              pathOptions={{ color: '#a855f7', weight: 4, dashArray: '6, 6' }}
            >
              <Popup>
                <div className="text-xs font-sans">
                  <p className="font-bold text-purple-600">Pickup Leg</p>
                  <p className="text-slate-600">En route from driver depot to origin warehouse</p>
                </div>
              </Popup>
            </Polyline>
          )}

          <Marker position={driverBaseCoords} icon={depotIcon}>
            <Popup><span className="text-xs font-sans font-bold">Driver Base Depot</span></Popup>
          </Marker>

          <Marker position={driverBaseCoords} icon={driverIcon}>
            <Popup><span className="text-xs font-sans font-bold">Driver Awaiting Collection</span></Popup>
          </Marker>
        </>
      );
    }

    return (
      <Polyline
        positions={roadGeometry.length > 0 ? roadGeometry : [sourceCoords, destCoords]}
        pathOptions={{ color: '#64748b', weight: 2.5, dashArray: '5, 8', opacity: 0.4 }}
      />
    );
  }

  // Slicing Road Coordinates according to transit_step
  if (roadGeometry.length === 0) return null;

  const totalPoints = roadGeometry.length;
  const targetIndex = Math.min(
    Math.floor((step / 10) * (totalPoints - 1)),
    totalPoints - 1
  );

  const coveredRoad = roadGeometry.slice(0, targetIndex + 1);
  const remainingRoad = roadGeometry.slice(targetIndex);
  const currentRiderCoords = roadGeometry[targetIndex] || sourceCoords;

  return (
    <>
      {/* Covered Distance along Real Roadway */}
      {step > 0 && coveredRoad.length > 1 && (
        <Polyline
          positions={coveredRoad}
          pathOptions={{ color: themeColor, weight: 5, opacity: 0.95, lineJoin: 'round' }}
        >
          <Popup>
            <div className="font-sans text-xs">
              <p className="font-bold text-blue-600 uppercase">Covered Roadway</p>
              <p className="text-slate-700">Progress: {step}/10 ({step * 10}%)</p>
              <p className="text-slate-500">{label}</p>
            </div>
          </Popup>
        </Polyline>
      )}

      {/* Remaining Distance along Real Roadway */}
      {step < 10 && remainingRoad.length > 1 && (
        <Polyline
          positions={remainingRoad}
          pathOptions={{ color: '#64748b', weight: 2.5, dashArray: '6, 8', opacity: 0.45 }}
        />
      )}

      {/* Visual Hazard Reroute Path (Amber Dashed) */}
      {isHighRisk && detourGeometry.length > 1 && (
        <Polyline
          positions={detourGeometry}
          pathOptions={{ color: '#f59e0b', weight: 3.5, dashArray: '6, 6', opacity: 0.85 }}
        >
          <Popup>
            <div className="font-sans text-xs">
              <p className="font-bold text-amber-500 uppercase">AI Hazard Detour Suggested</p>
              <p className="text-slate-600">Alternate highway corridor avoiding incident zone.</p>
            </div>
          </Popup>
        </Polyline>
      )}

      {/* Live Transporter Marker Snapped to Road Coordinate */}
      {step > 0 && step < 10 && (
        <Marker position={currentRiderCoords} icon={driverIcon}>
          <Popup>
            <div className="font-sans text-xs">
              <p className="font-bold text-blue-600">Live Delivery Vehicle</p>
              <p className="text-slate-700">Checkpoint: {step}/10 ({step * 10}%)</p>
              <p className="text-slate-500">{label}</p>
            </div>
          </Popup>
        </Marker>
      )}
    </>
  );
}