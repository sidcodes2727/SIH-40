import React, { useState, useEffect } from 'react';
import Map, { NavigationControl } from 'react-map-gl/maplibre';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer } from '@deck.gl/layers';
import { ArrowLeft } from 'lucide-react';
import maplibregl from 'maplibre-gl';
import { API_BASE } from '../config';

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json';

const INITIAL_VIEW_STATE = {
  longitude: 80,
  latitude: 22,
  zoom: 4,
  pitch: 0,
  bearing: 0,
};

const fallbackData = [
  { id: 1, depth: 10, pressure: 5, temperature: 20 },
  { id: 2, depth: 20, pressure: 10, temperature: 25 },
  { id: 3, depth: 15, pressure: 7, temperature: 30 },
];

export default function OceanMap({ setActivePage }) {
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
  const [data, setData] = useState([]);
  const [hoverInfo, setHoverInfo] = useState(null); // {x,y,coordinate,object}

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(`${API_BASE}/depth`);
        const rawData = await response.json();

        console.log('Fetched data sample:', rawData[0]);

        if (rawData.length && rawData[0].latitude != null && rawData[0].longitude != null) {
          const cleaned = rawData
            .filter(
              (d) =>
                d.latitude != null &&
                d.longitude != null &&
                Math.abs(d.latitude) <= 90 &&
                Math.abs(d.longitude) <= 360 &&
                Number.isFinite(Number(d.depth))
            )
            .map((d) => ({
              ...d,
              longitude: d.longitude > 180 ? d.longitude - 360 : d.longitude,
            }));

          if (cleaned.length) {
            const avgLat =
              cleaned.reduce((sum, d) => sum + d.latitude, 0) / cleaned.length;
            const avgLon =
              cleaned.reduce((sum, d) => sum + d.longitude, 0) / cleaned.length;
            setViewState((v) => ({
              ...v,
              latitude: avgLat,
              longitude: avgLon,
              zoom: 6,
            }));
          }
          setData(cleaned);
        } else {
          setData(fallbackData);
        }
      } catch (e) {
        console.error('Error fetching data:', e);
        setData(fallbackData);
      }
    }
    fetchData();
  }, []);

  const layers = [
    new ScatterplotLayer({
      id: 'depth-points',
      data: data,
      pickable: true,
      stroked: true,
      filled: true,
      opacity: 0.8,
      radiusScale: 10,
      radiusMinPixels: 5,
      radiusMaxPixels: 50,
      getPosition: (d) => [d.longitude, d.latitude],
      getRadius: () => 6,
      getFillColor: (d) => {
        const z = Number(d.depth);
        if (!Number.isFinite(z)) return [150, 150, 150];
        // Shallow -> bright cyan, Deep -> dark blue
        const t = Math.max(0, Math.min(1, z / 5000));
        const r = 0;
        const g = Math.floor(200 - 120 * t);
        const b = Math.floor(255 - 80 * t);
        return [r, g, b];
      },
      onHover: (info) => {
        if (!info || !info.coordinate || !info.object) {
          setHoverInfo(null);
          return;
        }
        setHoverInfo({ x: info.x, y: info.y, coordinate: info.coordinate, object: info.object });
      },
    }),
  ];

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden', position: 'relative' }}>
      {/* Back to Home Button */}
      <button
        onClick={() => setActivePage('Home')}
        className="absolute top-4 left-4 z-10 flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md hover:bg-white/20 text-white rounded-lg border border-white/20 transition-all duration-300"
      >
        <ArrowLeft size={18} />
        Back to Home
      </button>

      <DeckGL
        initialViewState={viewState}
        controller={true}
        layers={layers}
        onViewStateChange={({ viewState }) => setViewState(viewState)}
      >
        <Map
          reuseMaps
          mapLib={maplibregl}
          mapStyle={MAP_STYLE}
          {...viewState}
          onMove={(evt) => setViewState(evt.viewState)}
        >
          <NavigationControl position="top-left" />
        </Map>
      </DeckGL>
      {hoverInfo && (
        <div
          style={{
            position: 'absolute',
            left: Math.min(Math.max(8, hoverInfo.x + 12), window.innerWidth - 240),
            top: Math.min(Math.max(8, hoverInfo.y + 12), window.innerHeight - 120)
          }}
          className="card p-3 text-sm"
        >
          <div className="text-white/80 mb-1">
            Lat {hoverInfo.coordinate[1].toFixed(3)}, Lon {hoverInfo.coordinate[0].toFixed(3)}
          </div>
          {hoverInfo.object && hoverInfo.object.depth != null ? (
            <div className="text-white/75">Depth: <span className="text-cyan-300 font-semibold">{Number(hoverInfo.object.depth).toFixed(0)}</span> m</div>
          ) : (
            <div className="text-white/60">No point under cursor</div>
          )}
        </div>
      )}
    </div>
  );
}
