import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { API_BASE } from '../services/api';

export interface MapImage {
  id?: number;
  url: string;          // ruta relativa (/uploads/...) o absoluta (blob:/data:)
  descripcion?: string;
  lat: number | null;
  lng: number | null;
}

interface Props {
  /** Centro inicial [lat, lng] cuando no hay emergencia marcada */
  center?: [number, number];
  zoom?: number;
  /** Ubicación de la emergencia */
  emergencia: { lat: number; lng: number } | null;
  /** Si se provee, el mapa es editable: clic coloca/mueve el marcador */
  onEmergenciaChange?: (pos: { lat: number; lng: number }) => void;
  /** Imágenes posicionadas sobre el mapa */
  images?: MapImage[];
  /** Si se provee, las imágenes con posición se pueden arrastrar */
  onImageMove?: (index: number, pos: { lat: number; lng: number }) => void;
  height?: string;
}

// Cochabamba, Bolivia por defecto
const DEFAULT_CENTER: [number, number] = [-17.3935, -66.157];

function resolveUrl(url: string): string {
  if (/^(blob:|data:|https?:)/.test(url)) return url;
  return `${API_BASE}${url}`;
}

function emergenciaIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:34px;height:34px;border-radius:50% 50% 50% 0;
      background:#C41E1E;transform:rotate(-45deg);
      border:3px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,.4);
      display:flex;align-items:center;justify-content:center;">
      <span style="transform:rotate(45deg);font-size:16px;line-height:1;">🚨</span>
    </div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -34],
  });
}

function imageIcon(url: string) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:46px;height:46px;border-radius:8px;overflow:hidden;
      border:3px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,.4);background:#000;">
      <img src="${resolveUrl(url)}" style="width:100%;height:100%;object-fit:cover;display:block;" />
    </div>`,
    iconSize: [46, 46],
    iconAnchor: [23, 23],
    popupAnchor: [0, -24],
  });
}

export default function EmergenciaMap({
  center = DEFAULT_CENTER,
  zoom = 14,
  emergencia,
  onEmergenciaChange,
  images = [],
  onImageMove,
  height = '420px',
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const emergMarkerRef = useRef<L.Marker | null>(null);
  const imgMarkersRef = useRef<L.Marker[]>([]);
  // Refs vivos para usar dentro de los handlers de Leaflet
  const onChangeRef = useRef(onEmergenciaChange);
  const onMoveRef = useRef(onImageMove);
  onChangeRef.current = onEmergenciaChange;
  onMoveRef.current = onImageMove;

  // ── Inicializar mapa una sola vez ──
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: emergencia ? [Number(emergencia.lat), Number(emergencia.lng)] : center,
      zoom,
      scrollWheelZoom: true,
    });

    // Capa satelital HD gratuita — Esri World Imagery
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 19,
        attribution:
          'Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
      }
    ).addTo(map);

    // Etiquetas de calles/lugares por encima del satélite (referencia)
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 19, opacity: 0.9 }
    ).addTo(map);

    map.on('click', (e: L.LeafletMouseEvent) => {
      if (onChangeRef.current) {
        onChangeRef.current({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    });

    mapRef.current = map;
    // Recalcular tamaño tras montar (evita tiles grises)
    setTimeout(() => map.invalidateSize(), 200);

    return () => {
      map.remove();
      mapRef.current = null;
      emergMarkerRef.current = null;
      imgMarkersRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Marcador de emergencia ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (emergencia && Number.isFinite(Number(emergencia.lat)) && Number.isFinite(Number(emergencia.lng))) {
      const latlng: L.LatLngExpression = [Number(emergencia.lat), Number(emergencia.lng)];
      if (!emergMarkerRef.current) {
        const m = L.marker(latlng, {
          icon: emergenciaIcon(),
          draggable: !!onEmergenciaChange,
          zIndexOffset: 1000,
        }).addTo(map);
        m.bindPopup('📍 Ubicación de la emergencia');
        m.on('dragend', () => {
          const p = m.getLatLng();
          onChangeRef.current?.({ lat: p.lat, lng: p.lng });
        });
        emergMarkerRef.current = m;
      } else {
        emergMarkerRef.current.setLatLng(latlng);
      }
    } else if (emergMarkerRef.current) {
      map.removeLayer(emergMarkerRef.current);
      emergMarkerRef.current = null;
    }
  }, [emergencia, onEmergenciaChange]);

  // ── Marcadores de imágenes ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    imgMarkersRef.current.forEach(m => map.removeLayer(m));
    imgMarkersRef.current = [];

    images.forEach((img, idx) => {
      if (img.lat == null || img.lng == null) return;
      if (!Number.isFinite(Number(img.lat)) || !Number.isFinite(Number(img.lng))) return;
      const m = L.marker([Number(img.lat), Number(img.lng)], {
        icon: imageIcon(img.url),
        draggable: !!onImageMove,
      }).addTo(map);
      const full = resolveUrl(img.url);
      m.bindPopup(
        `<div style="text-align:center;max-width:240px;">
          <img src="${full}" style="width:100%;border-radius:6px;display:block;margin-bottom:6px;" />
          ${img.descripcion ? `<div style="font-size:13px;color:#334155;">${img.descripcion}</div>` : ''}
        </div>`
      );
      m.on('dragend', () => {
        const p = m.getLatLng();
        onMoveRef.current?.(idx, { lat: p.lat, lng: p.lng });
      });
      imgMarkersRef.current.push(m);
    });
  }, [images, onImageMove]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height, borderRadius: 12, overflow: 'hidden', border: '1px solid #E2E8F0', zIndex: 0 }}
    />
  );
}
