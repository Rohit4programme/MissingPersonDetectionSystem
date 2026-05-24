import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import clsx from 'clsx';

// Fix Leaflet default marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  label?: string;
  popup?: React.ReactNode;
  color?: 'cyan' | 'red' | 'green' | 'amber';
}

interface MapCircle {
  lat: number;
  lng: number;
  radius: number;
  color?: string;
  opacity?: number;
}

interface MapComponentProps {
  center?: [number, number];
  zoom?: number;
  markers?: MapMarker[];
  circles?: MapCircle[];
  height?: string;
  className?: string;
  onMapClick?: (lat: number, lng: number) => void;
  interactive?: boolean;
}

const colorIcons: Record<string, L.DivIcon> = {
  cyan: L.divIcon({
    className: 'custom-marker',
    html: '<div style="width:24px;height:24px;background:#00f5ff;border:3px solid #0a1628;border-radius:50%;box-shadow:0 0 10px rgba(0,245,255,0.5)"></div>',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  }),
  red: L.divIcon({
    className: 'custom-marker',
    html: '<div style="width:24px;height:24px;background:#ff3b3b;border:3px solid #0a1628;border-radius:50%;box-shadow:0 0 10px rgba(255,59,59,0.5)"></div>',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  }),
  green: L.divIcon({
    className: 'custom-marker',
    html: '<div style="width:24px;height:24px;background:#00ff88;border:3px solid #0a1628;border-radius:50%;box-shadow:0 0 10px rgba(0,255,136,0.5)"></div>',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  }),
  amber: L.divIcon({
    className: 'custom-marker',
    html: '<div style="width:24px;height:24px;background:#f59e0b;border:3px solid #0a1628;border-radius:50%;box-shadow:0 0 10px rgba(245,158,11,0.5)"></div>',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  }),
};

// Component to handle map click events
const MapClickHandler: React.FC<{ onClick?: (lat: number, lng: number) => void }> = ({ onClick }) => {
  const map = useMap();

  useEffect(() => {
    if (!onClick) return;

    const handleClick = (e: L.LeafletMouseEvent) => {
      onClick(e.latlng.lat, e.latlng.lng);
    };

    map.on('click', handleClick);
    return () => {
      map.off('click', handleClick);
    };
  }, [map, onClick]);

  return null;
};

// Component to re-center map
const MapCenterUpdater: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();

  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center[0], center[1], zoom]);

  return null;
};

const MapComponent: React.FC<MapComponentProps> = ({
  center = [40.7128, -74.006],
  zoom = 12,
  markers = [],
  circles = [],
  height = '400px',
  className,
  onMapClick,
  interactive = true,
}) => {
  const defaultIcon = useMemo(
    () =>
      L.divIcon({
        className: 'custom-marker',
        html: '<div style="width:24px;height:24px;background:#00f5ff;border:3px solid #0a1628;border-radius:50%;box-shadow:0 0 10px rgba(0,245,255,0.5)"></div>',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      }),
    []
  );

  return (
    <div className={clsx('map-container', className)} style={{ height }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        zoomControl={interactive}
        dragging={interactive}
        scrollWheelZoom={interactive}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />

        <MapCenterUpdater center={center} zoom={zoom} />
        <MapClickHandler onClick={onMapClick} />

        {/* Markers */}
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            position={[marker.lat, marker.lng]}
            icon={marker.color ? colorIcons[marker.color] || defaultIcon : defaultIcon}
          >
            {(marker.popup || marker.label) && (
              <Popup className="custom-popup">
                <div className="bg-primary-900 text-gray-100 p-2 rounded-lg min-w-[150px]">
                  {marker.popup || (
                    <p className="text-sm font-medium">{marker.label}</p>
                  )}
                </div>
              </Popup>
            )}
          </Marker>
        ))}

        {/* Circles */}
        {circles.map((circle, index) => (
          <Circle
            key={`circle-${index}`}
            center={[circle.lat, circle.lng]}
            radius={circle.radius}
            pathOptions={{
              color: circle.color || '#00f5ff',
              fillColor: circle.color || '#00f5ff',
              fillOpacity: circle.opacity || 0.1,
              weight: 1,
            }}
          />
        ))}
      </MapContainer>
    </div>
  );
};

export default MapComponent;
