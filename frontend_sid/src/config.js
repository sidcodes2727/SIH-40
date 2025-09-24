// Centralized API base configuration
// Supports both Vite (VITE_API_BASE) and CRA (REACT_APP_API_BASE)
// Fallbacks to same-origin or http://localhost:3001

// Optional runtime override: set window.__API_BASE__ before app loads
const winOverride = (typeof window !== 'undefined' && window.__API_BASE__) ? window.__API_BASE__ : undefined;

const defaultBase = (typeof window !== 'undefined' && window.location && window.location.origin)
  ? window.location.origin
  : 'http://localhost:3001';

export const API_BASE = (winOverride || defaultBase).replace(/\/$/, '');

export default {
  API_BASE,
};
