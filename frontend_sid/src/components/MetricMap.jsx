import React, { useEffect, useMemo, useState } from 'react';
import Map from 'react-map-gl/maplibre';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer, GeoJsonLayer } from '@deck.gl/layers';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import maplibregl from 'maplibre-gl';
import { loadScales } from '../config/scales';

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json';

const INITIAL_VIEW_STATE = { longitude: 0, latitude: 0, zoom: 2, pitch: 0, bearing: 0 };

// Natural Earth (land polygons) – used as a mask so heatmap stays over water.
// Coarse but light. If this URL ever fails, swap to 50m: ne_50m_land.geojson
const LAND_GEOJSON_URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson';

// Single shared color ramp for all metrics (match the temperature palette)
function getColor(value, metric, spec) {
  if (value == null || !spec) return [180, 180, 180];
  const t = Math.max(0, Math.min(1, (value - spec.min) / (spec.max - spec.min)));
  const r = Math.floor(30 + 225 * t);
  const g = Math.floor(80 + 120 * t);
  const b = Math.floor(220 - 200 * t);
  return [r, g, b];
}

// Legend specification per metric (pulled from central scales)
function getLegendSpec(metric) {
  const scales = loadScales();
  const s = scales[metric];
  if (!s) return { min: 0, max: 1, unit: '', label: metric };
  return { min: s.min, max: s.max, unit: s.unit, label: s.label };
}

function toRgb(c) {
  const [r, g, b] = c;
  return `rgb(${r}, ${g}, ${b})`;
}

// Temperature-like color range (blue -> red) for HeatmapLayer (RGBA)
const TEMP_RANGE = [
  [30, 80, 220, 255],
  [60, 100, 200, 255],
  [90, 120, 180, 255],
  [130, 140, 150, 255],
  [170, 160, 120, 255],
  [200, 175, 90, 255],
  [230, 190, 60, 255],
  [255, 200, 20, 255]
];

export default function MetricMap({ metric = 'salinity' }) {
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);
  const [hoverInfo, setHoverInfo] = useState(null); // {x,y,coordinate,object}
  const [land, setLand] = useState(null);

  // Load measurement points
  useEffect(() => {
    async function load() {
      try {
        setError(null);
        const res = await fetch(`http://localhost:3000/${metric}`);
        const data = await res.json();
        const toNum = (v) => {
          const n = Number(v);
          return Number.isFinite(n) ? n : null;
        };
        const normalized = (Array.isArray(data) ? data : [])
          .map((d) => ({
            ...d,
            latitude: toNum(d.latitude),
            longitude: toNum(d.longitude),
            value: toNum(d[metric])
          }))
          .filter((d) => d.latitude != null && d.longitude != null && d.value != null && Math.abs(d.latitude) <= 90 && Math.abs(d.longitude) <= 360);
        setRows(normalized);
        if (normalized.length) {
          const avgLat = normalized.reduce((s, d) => s + d.latitude, 0) / normalized.length;
          const avgLon = normalized.reduce((s, d) => s + (d.longitude > 180 ? d.longitude - 360 : d.longitude), 0) / normalized.length;
          setViewState(v => ({ ...v, latitude: avgLat, longitude: avgLon, zoom: 3 }));
        }
      } catch (e) {
        setError(e.message || 'Failed to load');
      }
    }
    load();
  }, [metric]);

  // Load land polygons for masking (once)
  useEffect(() => {
    let cancelled = false;
    async function loadLand() {
      try {
        const resp = await fetch(LAND_GEOJSON_URL);
        if (!resp.ok) return;
        const gj = await resp.json();
        if (!cancelled) setLand(gj);
      } catch {}
    }
    loadLand();
    return () => { cancelled = true; };
  }, []);

  const spec = getLegendSpec(metric);
  const toLon = (lon) => (Number(lon) > 180 ? Number(lon) - 360 : Number(lon));
  const getVal = (d) => {
    const a = Number(d[metric]);
    if (Number.isFinite(a)) return a;
    const b = Number(d.value);
    return Number.isFinite(b) ? b : null;
  };
  const weightOf = (v) => {
    if (v == null) return 0;
    const t = (v - spec.min) / (spec.max - spec.min);
    return Math.max(0, Math.min(1, t));
  };

  // Heatmap layer (continuous field) + contour isolines + black measurement dots
  const layers = useMemo(() => {
    const heat = rows.length > 1 ? new HeatmapLayer({
      id: `${metric}-heat`,
      data: rows,
      getPosition: (d) => [toLon(d.longitude), Number(d.latitude)],
      getWeight: (d) => weightOf(getVal(d)),
      radiusPixels: Math.max(18, Math.min(90, Math.round(18 * (viewState?.zoom || 2)))),
      intensity: 1.0,
      threshold: 0.05,
      colorRange: TEMP_RANGE,
      // Cap the offscreen texture to avoid huge allocations on some GPUs / HiDPI
      weightsTextureSize: 512,
    }) : null;

    // Contours disabled on this GPU to avoid WebGL allocation issues. Re‑enable later if stable.
    const contours = null;

    const points = new ScatterplotLayer({
      id: `${metric}-points`,
      data: rows,
      pickable: true,
      opacity: 0.95,
      radiusScale: 10,
      radiusMinPixels: 2,
      radiusMaxPixels: 24,
      getPosition: (d) => [toLon(d.longitude), Number(d.latitude)],
      getRadius: () => 3.5,
      getFillColor: () => [0, 0, 0, 255],
      getLineColor: () => [255, 255, 255, 200],
      lineWidthMinPixels: 0.6,
      onHover: (info) => {
        if (!info || !info.coordinate || !info.object) {
          setHoverInfo(null);
          return;
        }
        setHoverInfo({ x: info.x, y: info.y, coordinate: info.coordinate, object: info.object });
      },
    });

    // Land mask on top: paint land polygons with an opaque dark fill so the heatmap doesn't show on land
    const landMask = land ? new GeoJsonLayer({
      id: 'land-mask',
      data: land,
      stroked: false,
      filled: true,
      getFillColor: [14, 18, 24, 255], // close to basemap land color
      parameters: { depthTest: false },
      pickable: false
    }) : null;

    // Draw order matters: heat -> contours -> points -> land mask (mask above heat)
    return [heat, contours, points, landMask].filter(Boolean);
  }, [rows, metric, land, viewState]);

  // Legend gradient background computed from getColor mapping
  const legend = useMemo(() => {
    const steps = 12; // number of color stops
    const stops = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const value = spec.min + t * (spec.max - spec.min);
const color = toRgb(getColor(value, metric, spec));
      const pct = Math.round(t * 100);
      stops.push(`${color} ${pct}%`);
    }
    const gradient = `linear-gradient(90deg, ${stops.join(', ')})`;
    const mid = (spec.min + spec.max) / 2;
    return { ...spec, gradient, mid };
  }, [metric, spec.min, spec.max]);

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      <DeckGL
        initialViewState={viewState}
        controller
        layers={layers}
        onViewStateChange={({ viewState }) => setViewState(viewState)}
        useDevicePixels={1}
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
