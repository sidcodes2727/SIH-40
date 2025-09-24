// Centralized visualization scales for all maps
// Edit these values to change the color/legend ranges globally
export const SCALES = {
  temperature: { min: -2, max: 35, unit: '°C', label: 'Temperature' },
  salinity: { min: 30, max: 38, unit: 'PSU', label: 'Salinity' },
  pressure: { min: 0, max: 1000, unit: 'dbar', label: 'Pressure' },
  depth: { min: 0, max: 6000, unit: 'm', label: 'Depth' }
};

// Optionally read overrides from environment variables at build-time
function envNumber(key, fallback) {
  const v = import.meta?.env?.[key];
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function loadScales() {
  return {
    temperature: {
      ...SCALES.temperature,
      min: envNumber('VITE_TEMP_MIN', SCALES.temperature.min),
      max: envNumber('VITE_TEMP_MAX', SCALES.temperature.max)
    },
    salinity: {
      ...SCALES.salinity,
      min: envNumber('VITE_SAL_MIN', SCALES.salinity.min),
      max: envNumber('VITE_SAL_MAX', SCALES.salinity.max)
    },
    pressure: {
      ...SCALES.pressure,
      min: envNumber('VITE_PRES_MIN', SCALES.pressure.min),
      max: envNumber('VITE_PRES_MAX', SCALES.pressure.max)
    },
    depth: {
      ...SCALES.depth,
      min: envNumber('VITE_DEPTH_MIN', SCALES.depth.min),
      max: envNumber('VITE_DEPTH_MAX', SCALES.depth.max)
    }
  };
}