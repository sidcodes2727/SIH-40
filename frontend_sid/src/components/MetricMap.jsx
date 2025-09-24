import React, { useEffect, useMemo, useState } from 'react';
import Map from 'react-map-gl/maplibre';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer, GeoJsonLayer } from '@deck.gl/layers';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import maplibregl from 'maplibre-gl';
import { API_BASE } from '../config';

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json';

const INITIAL_VIEW_STATE = { longitude: 0, latitude: 0, zoom: 2, pitch: 0, bearing: 0 };

// Natural Earth (land polygons) – used as a mask so heatmap stays over water
const LAND_GEOJSON_URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson';


function getColor(value, metric) {
  if (!Number.isFinite(value)) value = 0;
  switch (metric) {
    case 'salinity': {
      
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
  const [land, setLand] = useState(null); // Natural Earth land polygons

  useEffect(() => {
    async function load() {
      try {
        setError(null);
        const res = await fetch(`${API_BASE}/${metric}`);
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

  // Load land polygons once for masking by overdrawing
  useEffect(() => {
    let cancelled = false;
    async function loadLand() {
      try {
        const resp = await fetch(LAND_GEOJSON_URL);
        if (!resp.ok) return;
        const gj = await resp.json();
        if (!cancelled) setLand(gj);
      } catch (_) {}
    }
    loadLand();
    return () => { cancelled = true; };
  }, []);

  // Build a robust 6-stop RGBA color range for the heatmap
  const heatColors = useMemo(() => {
    const spec = getLegendSpec(metric);
    const values = [
      spec.min,
      spec.min + (spec.max - spec.min) * 0.2,
      spec.min + (spec.max - spec.min) * 0.4,
      spec.min + (spec.max - spec.min) * 0.6,
      spec.min + (spec.max - spec.min) * 0.8,
      spec.max
    ];
    return values.map(v => {
      const [r, g, b] = getColor(v, metric);
      return [r, g, b, 255];
    });
  }, [metric]);

  // Temperature-like color range (blue -> red) for HeatmapLayer (RGBA)
  const TEMP_RANGE = useMemo(() => ([
    [30, 80, 220, 255],
    [60, 100, 200, 255],
    [90, 120, 180, 255],
    [130, 140, 150, 255],
    [170, 160, 120, 255],
    [200, 175, 90, 255],
    [230, 190, 60, 255],
    [255, 200, 20, 255]
  ]), []);

  // Heatmap layer for continuous surface
  const heatmapLayer = useMemo(() => new HeatmapLayer({
    id: `${metric}-heat`,
    data: rows,
    getPosition: (d) => [Number(d.longitude) > 180 ? Number(d.longitude) - 360 : Number(d.longitude), Number(d.latitude)],
    getWeight: (d) => {
      const raw = d[metric] ?? d.value;
      const v = Number.isFinite(Number(raw)) ? Number(raw) : 0;
      // Normalize per metric range to keep brightness comparable
      const spec = getLegendSpec(metric);
      const t = Math.max(0, Math.min(1, (v - spec.min) / (spec.max - spec.min || 1)));
      return 1 + t; // emphasize higher values slightly
    },
    radiusPixels: Math.max(18, Math.min(90, Math.round(18 * (viewState?.zoom || 2)))),
    intensity: 1.0,
    threshold: 0.05,
    colorRange: TEMP_RANGE,
    weightsTextureSize: 512,
  }), [rows, metric, viewState, TEMP_RANGE]);

  // Black dot markers for actual coordinates
  const pointsLayer = useMemo(() => new ScatterplotLayer({
    id: `${metric}-points`,
    data: rows,
    pickable: true,
    opacity: 0.95,
    radiusScale: 10,
    radiusMinPixels: 3,
    radiusMaxPixels: 30,
    getPosition: (d) => [Number(d.longitude) > 180 ? Number(d.longitude) - 360 : Number(d.longitude), Number(d.latitude)],
    getRadius: () => 4,
    getFillColor: [0, 0, 0], // black dots
    getLineColor: [255, 255, 255],
    lineWidthUnits: 'pixels',
    stroked: true,
    lineWidthMinPixels: 0.5,
    onHover: (info) => {
      if (!info || !info.coordinate || !info.object) {
        setHoverInfo(null);
        return;
      }
      setHoverInfo({ x: info.x, y: info.y, coordinate: info.coordinate, object: info.object });
    },
  }), [rows, metric]);

  // Land mask layer (overdraw on top to hide heat on land)
  const landMask = useMemo(() => {
    if (!land) return null;
    return new GeoJsonLayer({
      id: 'land-mask',
      data: land,
      stroked: false,
      filled: true,
      getFillColor: [14, 18, 24, 255], // close to basemap land color
      parameters: { depthTest: false },
      pickable: false,
    });
  }, [land]);

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
        layers={[heatmapLayer, pointsLayer, landMask].filter(Boolean)}
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
                <div>Temperature: <span className="text-cyan-300 font-semibold">{(Number.isFinite(Number(hoverInfo.object.temperature)) ? Number(hoverInfo.object.temperature) : 0).toFixed(2)}</span> °C</div>
              )}
              {metric === 'salinity' && (
                <div>Salinity: <span className="text-cyan-300 font-semibold">{(Number.isFinite(Number(hoverInfo.object.salinity)) ? Number(hoverInfo.object.salinity) : 0).toFixed(2)}</span> PSU</div>
              )}
              {metric === 'pressure' && (
                <div>Pressure: <span className="text-cyan-300 font-semibold">{(Number.isFinite(Number(hoverInfo.object.pressure)) ? Number(hoverInfo.object.pressure) : 0).toFixed(2)}</span> dbar</div>
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
