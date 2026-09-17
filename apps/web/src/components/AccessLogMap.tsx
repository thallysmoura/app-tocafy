'use client';

import { useEffect } from 'react';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// O bundler do Next quebra os caminhos padrão dos ícones do Leaflet — precisa
// apontar manualmente pros assets importados.
const icon = L.icon({
  iconUrl: markerIcon.src,
  iconRetinaUrl: markerIcon2x.src,
  shadowUrl: markerShadow.src,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export type AccessLogPoint = {
  id: string;
  latitude: number;
  longitude: number;
  city: string | null;
  country: string | null;
  success: boolean;
  createdAt: string;
};

export default function AccessLogMap({ points }: { points: AccessLogPoint[] }) {
  useEffect(() => {
    L.Marker.prototype.options.icon = icon;
  }, []);

  if (points.length === 0) return null;

  const center: [number, number] = [points[0].latitude, points[0].longitude];

  return (
    <MapContainer center={center} zoom={4} scrollWheelZoom={false} className="h-72 w-full rounded-lg">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {points.map((p) => (
        <Marker key={p.id} position={[p.latitude, p.longitude]} icon={icon}>
          <Popup>
            {p.success ? 'Login bem-sucedido' : 'Tentativa falha'}
            <br />
            {[p.city, p.country].filter(Boolean).join(', ') || 'Local desconhecido'}
            <br />
            {new Date(p.createdAt).toLocaleString('pt-BR')}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
