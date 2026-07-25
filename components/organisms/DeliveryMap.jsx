'use client';
import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const shopIcon = new L.DivIcon({
  className: 'custom-icon',
  html: '<div style="background:#a855f7;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 0 15px #a855f7"><svg viewBox="0 0 24 24" width="18" height="18" fill="white"><path d="M12 2L2 22h20L12 2z"/></svg></div>',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

const userIcon = new L.DivIcon({
  className: 'custom-icon',
  html: '<div style="background:#3b82f6;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 0 10px #3b82f6"><svg viewBox="0 0 24 24" width="14" height="14" fill="white"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/></svg></div>',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

const motorcycleIcon = new L.DivIcon({
  className: 'custom-icon',
  html: '<div style="font-size:30px">🏍️</div>',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

function getTotalDistance(points) {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += L.latLng(points[i-1][0], points[i-1][1]).distanceTo(L.latLng(points[i][0], points[i][1]));
  }
  return total;
}

function interpolate(route, targetDist) {
  if (route.length < 2) return route[0];
  let cumulative = 0;
  for (let i = 1; i < route.length; i++) {
    const a = L.latLng(route[i-1][0], route[i-1][1]);
    const b = L.latLng(route[i][0], route[i][1]);
    const segDist = a.distanceTo(b);
    if (cumulative + segDist >= targetDist) {
      const ratio = (targetDist - cumulative) / segDist;
      return [
        route[i-1][0] + (route[i][0] - route[i-1][0]) * ratio,
        route[i-1][1] + (route[i][1] - route[i-1][1]) * ratio,
      ];
    }
    cumulative += segDist;
  }
  return route[route.length - 1];
}

function AnimatedMotorcycle({ route, startTime, duration }) {
  const map = useMap();
  const [position, setPosition] = useState(route[0]);
  const animationRef = useRef();

  useEffect(() => {
    const animate = () => {
      if (!route.length) return;
      const now = Date.now();
      const elapsed = (now - startTime) / 1000;
      const progress = Math.min(elapsed / duration, 1);
      const totalDist = getTotalDistance(route);
      const targetDist = totalDist * progress;
      const newPos = interpolate(route, targetDist);
      setPosition(newPos);
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };
    animate();
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [route, startTime, duration]);

  return (
    <Marker position={position} icon={motorcycleIcon}>
      <Popup>Delivery on the way 🏍️</Popup>
    </Marker>
  );
}

export default function DeliveryMap({ order }) {
  // Shop location (could be from config)
  const shopPos = [16.8409, 96.1735]; // Example Yangon

  // User location from order's shipping address (if available)
  const userLat = order?.shipping_latitude || order?.latitude || 16.8500;
  const userLng = order?.shipping_longitude || order?.longitude || 96.1800;
  const userPos = [userLat, userLng];

  // Generate route between shop and user
  const route = [
    shopPos,
    [(shopPos[0] + userPos[0]) / 2, (shopPos[1] + userPos[1]) / 2],
    userPos,
  ];

  const showMotorcycle = order?.status === 'shipped' || order?.status === 'delivered';
  const duration = 1200; // 20 minutes in seconds
  const startTime = order?.shipping_started_at
    ? new Date(order.shipping_started_at).getTime()
    : Date.now();

  // Determine map center (midpoint)
  const center = [(shopPos[0] + userPos[0]) / 2, (shopPos[1] + userPos[1]) / 2];

  return (
    <div className="h-96 w-full rounded-2xl overflow-hidden">
      <MapContainer center={center} zoom={13} scrollWheelZoom={false} className="h-full w-full z-0">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <Marker position={shopPos} icon={shopIcon}>
          <Popup>Shop</Popup>
        </Marker>
        <Marker position={userPos} icon={userIcon}>
          <Popup>Your Location</Popup>
        </Marker>
        <Polyline positions={route} color="#a855f7" weight={3} dashArray="8" />
        {showMotorcycle && (
          <AnimatedMotorcycle route={route} startTime={startTime} duration={duration} />
        )}
      </MapContainer>
    </div>
  );
}
