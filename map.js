/**
 * YardFlow Map Controller (map.js)
 * Clean rewrite with Leaflet OSM HOT & Esri World Imagery
 */

window.initYardMap = function() {
  if (typeof document === 'undefined' || typeof document.getElementById !== 'function') return;
  const mapElement = document.getElementById('map');
  if (!mapElement) return;
  if (typeof L === 'undefined') return;

  // Jos vanha kartta on olemassa, poistetaan se alta
  if (window.yardMap && typeof window.yardMap.remove === 'function') {
    window.yardMap.remove();
  }

  const street = L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap HOT'
  });

  const sat = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
    attribution: 'Tiles © Esri'
  });

  const map = L.map('map', {
    layers: [street]
  }).setView([61.4981, 23.7610], 13);

  window.yardMap = map;
  let isSat = false;

  const toggleBtn = document.getElementById('btn-toggle-basemap');
  if (toggleBtn) {
    toggleBtn.onclick = function(e) {
      if (e && e.preventDefault) e.preventDefault();
      if (!isSat) {
        map.removeLayer(street);
        map.addLayer(sat);
        toggleBtn.textContent = '🗺️ Peruskartta';
        isSat = true;
      } else {
        map.removeLayer(sat);
        map.addLayer(street);
        toggleBtn.textContent = '🛰️ Satelliitti';
        isSat = false;
      }
    };
  }
};

// Määritellään toimivat tasot
const streetLayer = (typeof L !== 'undefined') ? L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '© OpenStreetMap HOT'
}) : null;

const satLayer = (typeof L !== 'undefined') ? L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  maxZoom: 19,
  attribution: 'Tiles © Esri'
}) : null;

function initMapInstance(containerId) {
  if (typeof document === 'undefined' || typeof document.getElementById !== 'function' || typeof L === 'undefined') return null;
  const container = document.getElementById(containerId);
  if (!container) return null;

  if (containerId === 'map') {
    if (typeof window.initYardMap === 'function') {
      window.initYardMap();
      return window.yardMap;
    }
  }

  const street = L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap HOT'
  });

  const sat = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
    attribution: 'Tiles © Esri'
  });

  const map = L.map(containerId, {
    layers: [street]
  }).setView([61.4981, 23.7610], 13);

  let isSat = false;
  const toggleBtn = document.getElementById('btn-toggle-basemap');
  if (toggleBtn) {
    toggleBtn.onclick = function(e) {
      if (e && e.preventDefault) e.preventDefault();
      if (!isSat) {
        map.removeLayer(street);
        map.addLayer(sat);
        toggleBtn.textContent = '🗺️ Peruskartta';
        isSat = true;
      } else {
        map.removeLayer(sat);
        map.addLayer(street);
        toggleBtn.textContent = '🛰️ Satelliitti';
        isSat = false;
      }
    };
  }

  return map;
}

function safeInvalidateMap(m) {
  if (!m) return;
  try {
    if (typeof m.invalidateSize === 'function') {
      m.invalidateSize();
    }
  } catch (e) {}
}

function initMaps() {
  if (typeof document === 'undefined' || typeof document.getElementById !== 'function' || typeof L === 'undefined') return;
  if (document.getElementById('map') && typeof window.initYardMap === 'function') {
    window.initYardMap();
    return;
  }
  const mapEl = document.getElementById('yardSatelliteMap') || document.getElementById('admin-map');
  if (!mapEl) return;
  const win = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : global);
  try {
    if (!win.mapInstance && !mapEl._leaflet_id) {
      win.mapInstance = initMapInstance(mapEl.id);
      win.map = win.mapInstance;
      win.yardMap = win.mapInstance;
    }
  } catch (e) {
    console.error('Kartan alustusvirhe (initMaps):', e);
  }
}

function toggleMapFullscreen(mapElementId, btnEl) {
  if (typeof document === 'undefined' || typeof document.getElementById !== 'function') return;
  const el = typeof mapElementId === 'string' ? (document.getElementById(mapElementId) || document.getElementById('map')) : mapElementId;
  if (!el) return;
  const parent = el.closest('.map-fullscreen-wrapper') || el.parentElement;
  const targetEl = parent || el;
  const isFull = targetEl.classList.toggle('map-fullscreen-active');
  if (btnEl) {
    btnEl.innerHTML = isFull ? '🗗 Pienennä' : '⛶ Koko näyttö';
  }
  setTimeout(() => {
    const win = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : global);
    if (win.yardMap && typeof win.yardMap.invalidateSize === 'function') win.yardMap.invalidateSize();
    if (win.mapInstance && typeof win.mapInstance.invalidateSize === 'function') win.mapInstance.invalidateSize();
    if (win.dashboardCityMap && typeof win.dashboardCityMap.invalidateSize === 'function') win.dashboardCityMap.invalidateSize();
    if (win.map && typeof win.map.invalidateSize === 'function') win.map.invalidateSize();
    if (win.adminMap && typeof win.adminMap.invalidateSize === 'function') win.adminMap.invalidateSize();
  }, 150);
}

function initMapResizeListeners(grid) {
  const resizeHandler = () => {
    const win = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : global);
    safeInvalidateMap(win.map);
    safeInvalidateMap(win.adminMap);
    safeInvalidateMap(win.yardMap);
    safeInvalidateMap(win.customerGeofenceMap);
    safeInvalidateMap(win.dashboardCityMap);
    safeInvalidateMap(win.mapInstance);
  };

  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('resize', resizeHandler);
    window.addEventListener('orientationchange', () => {
      setTimeout(resizeHandler, 300);
    });
  }
}

// Exportit
const targetGlobal = (typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : global));
targetGlobal.streetLayer = streetLayer;
targetGlobal.satLayer = satLayer;
targetGlobal.initYardMap = window.initYardMap;
targetGlobal.initMapInstance = initMapInstance;
targetGlobal.initMaps = initMaps;
targetGlobal.safeInvalidateMap = safeInvalidateMap;
targetGlobal.toggleMapFullscreen = toggleMapFullscreen;
targetGlobal.initMapResizeListeners = initMapResizeListeners;

if (typeof globalThis !== 'undefined' && globalThis !== targetGlobal) {
  globalThis.safeInvalidateMap = safeInvalidateMap;
  globalThis.initYardMap = window.initYardMap;
  globalThis.initMapInstance = initMapInstance;
  globalThis.initMaps = initMaps;
  globalThis.toggleMapFullscreen = toggleMapFullscreen;
  globalThis.initMapResizeListeners = initMapResizeListeners;
}
if (typeof global !== 'undefined' && global !== targetGlobal && global !== globalThis) {
  global.safeInvalidateMap = safeInvalidateMap;
  global.initYardMap = window.initYardMap;
  global.initMapInstance = initMapInstance;
  global.initMaps = initMaps;
  global.toggleMapFullscreen = toggleMapFullscreen;
  global.initMapResizeListeners = initMapResizeListeners;
}

if (typeof document !== 'undefined' && typeof setTimeout === 'function') {
  const runInit = () => {
    if (typeof document.getElementById === 'function' && document.getElementById('map') && typeof window.initYardMap === 'function') {
      window.initYardMap();
    } else {
      initMaps();
    }
    initMapResizeListeners();
  };

  if (document.readyState === 'loading' && typeof document.addEventListener === 'function') {
    document.addEventListener('DOMContentLoaded', runInit);
  } else {
    runInit();
  }
}
