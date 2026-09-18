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

// Pino numerado — o mesmo número da linha na lista abaixo, pra dar pra saber
// na hora qual marcador do mapa corresponde a qual entrada do log.
function numberedIcon(n: number, success: boolean) {
  const color = success ? '#1DB954' : '#EF4444';
  return L.divIcon({
    className: '',
    html: `<div style="
      width:28px;height:28px;border-radius:9999px;background:${color};
      display:flex;align-items:center;justify-content:center;
      color:#fff;font-weight:700;font-size:12px;
      border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.5);
    ">${n}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

export type AccessLogPoint = {
  id: string;
  index: number;
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

  // Enquadra automaticamente todos os pinos: se os acessos forem pertinho um
  // do outro, dá zoom pra dar pra distinguir os blocos; se estiverem espalhados
  // (cidades/países diferentes), mantém tudo visível sem forçar zoom.
  const bounds = L.latLngBounds(points.map((p) => [p.latitude, p.longitude] as [number, number]));

  return (
    // isolate cria um novo contexto de empilhamento: os z-index internos do
    // Leaflet (panes/controles chegam a 700+) ficam contidos aqui dentro e
    // não vazam por cima do header fixo do mobile ao rolar a página.
    <div className="relative isolate z-0 overflow-hidden rounded-lg">
      <MapContainer
        bounds={bounds}
        boundsOptions={{ padding: [40, 40], maxZoom: 15 }}
        scrollWheelZoom={false}
        className="h-72 w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {points.map((p) => (
          <Marker
            key={p.id}
            position={[p.latitude, p.longitude]}
            icon={numberedIcon(p.index, p.success)}
          >
            <Popup>
              #{p.index} · {p.success ? 'Login bem-sucedido' : 'Tentativa falha'}
              <br />
              {[p.city, p.country].filter(Boolean).join(', ') || 'Local desconhecido'}
              <br />
              {new Date(p.createdAt).toLocaleString('pt-BR')}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
