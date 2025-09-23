import React, { useEffect, useMemo, useState } from 'react';
import Map from 'react-map-gl/maplibre';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer } from '@deck.gl/layers';
import maplibregl from 'maplibre-gl';

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json';

const INITIAL_VIEW_STATE = { longitude: 0, latitude: 0, zoom: 2, pitch: 0, bearing: 0 };

// Simple color ramps per metric
function getColor(value, metric) {
  if (value == null) return [180, 180, 180];
  switch (metric) {
    case 'salinity': {
      // 30-38 PSU mapped to cyan-blue
      const t = Math.max(0, Math.min(1, (value - 30) / 8));
      const r = 0;
      const g = Math.floor(150 + 80 * t);
      const b = Math.floor(200 + 40 * t);
      return [r, g, b];
    }
    case 'temperature': {
      // 0-30C from blue to red
      const t = Math.max(0, Math.min(1, value / 30));
      const r = Math.floor(30 + 225 * t);
      const g = Math.floor(80 + 120 * t);
      const b = Math.floor(220 - 200 * t);
      return [r, g, b];
    }
    case 'pressure': {
      // 0-1000 from teal to violet
      const t = Math.max(0, Math.min(1, value / 1000));
      const r = Math.floor(120 + 100 * t);
      const g = Math.floor(220 - 120 * t);
      const b = Math.floor(255 * t);
      return [r, g, b];
    }
    default:
      return [0, 200, 255];
  }
}

// Legend specification per metric
function getLegendSpec(metric) {
  switch (metric) {
    case 'salinity':
      return { min: 30, max: 38, unit: 'PSU', label: 'Salinity' };
    case 'temperature':
      return { min: 0, max: 30, unit: '°C', label: 'Temperature' };
    case 'pressure':
      return { min: 0, max: 1000, unit: 'dbar', label: 'Pressure' };
    default:
      return { min: 0, max: 1, unit: '', label: metric };
  }
}

function toRgb(c) {
  const [r, g, b] = c;
  return `rgb(${r}, ${g}, ${b})`;
}

export default function MetricMap({ metric = 'salinity' }) {
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);
  const [hoverInfo, setHoverInfo] = useState(null); // {x,y,coordinate,object}

  useEffect(() => {
    async function load() {
      try {
        setError(null);
        const res = await fetch(`http://localhost:3000/${metric}`);
        const data = await res.json();
        const cleaned = (Array.isArray(data) ? data : []).filter(
          d => d.latitude != null && d.longitude != null && Math.abs(d.latitude) <= 90 && Math.abs(d.longitude) <= 360
        );
        setRows(cleaned);
        if (cleaned.length) {
          const avgLat = cleaned.reduce((s, d) => s + Number(d.latitude), 0) / cleaned.length;
          const avgLon = cleaned.reduce((s, d) => s + (Number(d.longitude) > 180 ? Number(d.longitude) - 360 : Number(d.longitude)), 0) / cleaned.length;
          setViewState(v => ({ ...v, latitude: avgLat, longitude: avgLon, zoom: 3 }));
        }
      } catch (e) {
        setError(e.message || 'Failed to load');
      }
    }
    load();
  }, [metric]);

  const layer = useMemo(() => new ScatterplotLayer({
    id: `${metric}-layer`,
    data: rows,
    pickable: true,
    opacity: 0.85,
    radiusScale: 10,
    radiusMinPixels: 2,
    radiusMaxPixels: 30,
    getPosition: (d) => [Number(d.longitude) > 180 ? Number(d.longitude) - 360 : Number(d.longitude), Number(d.latitude)],
    getRadius: (d) => 4 + 2,
    getFillColor: (d) => {
      const value = Number(d[metric]) ?? Number(d.value);
      return getColor(value, metric);
    },
    onHover: (info) => {
      if (!info || !info.coordinate || !info.object) { 
        setHoverInfo(null); 
        return; 
      }
      setHoverInfo({ x: info.x, y: info.y, coordinate: info.coordinate, object: info.object });
    },
  }), [rows, metric]);

  // Legend gradient background computed from getColor mapping
  const legend = useMemo(() => {
    const spec = getLegendSpec(metric);
    const steps = 12; // number of color stops
    const stops = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const value = spec.min + t * (spec.max - spec.min);
      const color = toRgb(getColor(value, metric));
      const pct = Math.round(t * 100);
      stops.push(`${color} ${pct}%`);
    }
    const gradient = `linear-gradient(90deg, ${stops.join(', ')})`;
    const mid = (spec.min + spec.max) / 2;
    return { ...spec, gradient, mid };
  }, [metric]);

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      <DeckGL
        initialViewState={viewState}
        controller
        layers={[layer]}
        onViewStateChange={({ viewState }) => setViewState(viewState)}
      >
        <Map mapLib={maplibregl} reuseMaps mapStyle={MAP_STYLE} {...viewState} />
      </DeckGL>
      {/* Color Legend */}
      <div
        style={{ position: 'absolute', left: 12, bottom: 12, width: 260 }}
        className="card p-3"
      >
        <div className="flex items-center justify-between text-xs text-white/70 mb-2">
          <span>{legend.label} scale</span>
          <span>{legend.unit}</span>
        </div>
        <div className="h-3 w-full rounded" style={{ background: legend.gradient }} />
        <div className="flex items-center justify-between text-xs text-white/60 mt-1">
          <span>{legend.min}</span>
          <span>{legend.mid}</span>
          <span>{legend.max}</span>
        </div>
      </div>
      {hoverInfo && (
        <div
          style={{
            position: 'absolute',
            left: Math.min(Math.max(8, hoverInfo.x + 12), window.innerWidth - 240),
            top: Math.min(Math.max(8, hoverInfo.y + 12), window.innerHeight - 110),
            transition: 'transform 120ms ease, opacity 120ms ease',
            transform: 'translateY(0)'
          }}
          className="card p-3 text-sm"
        >
          <div className="text-white/80 mb-1">
            Lat {hoverInfo.coordinate[1].toFixed(3)}, Lon {hoverInfo.coordinate[0].toFixed(3)}
          </div>
          {hoverInfo.object ? (
            <div className="text-white/75">
              {metric === 'temperature' && (
                <div>Temperature: <span className="text-cyan-300 font-semibold">{Number(hoverInfo.object.temperature).toFixed(2)}</span> °C</div>
              )}
              {metric === 'salinity' && (
                <div>Salinity: <span className="text-cyan-300 font-semibold">{Number(hoverInfo.object.salinity).toFixed(2)}</span> PSU</div>
              )}
              {metric === 'pressure' && (
                <div>Pressure: <span className="text-cyan-300 font-semibold">{Number(hoverInfo.object.pressure).toFixed(2)}</span> dbar</div>
              )}
            </div>
          ) : (
            <div className="text-white/60">No point under cursor</div>
          )}
        </div>
      )}
      {error && (
        <div style={{ position: 'absolute', bottom: 12, left: 12 }} className="card p-2">
          Failed to load {metric}: {error}
        </div>
      )}
    </div>
  );
}
