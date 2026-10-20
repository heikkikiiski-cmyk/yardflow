/**
 * YardFlow Map Resize, Initialization & Orientation Handling (map.js)
 */

// Määritellään toimivat tasot
const streetLayer = (typeof L !== 'undefined') ? L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '© OpenStreetMap contributors, Tiles style by HOT'
}) : null;

const satLayer = (typeof L !== 'undefined') ? L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  maxZoom: 19,
  attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
}) : null;

// Alustetaan kartta aina oletustasolla
function initMapInstance(containerId) {
  if (typeof document === 'undefined' || typeof L === 'undefined') return null;
  const container = document.getElementById(containerId);
  if (!container) return null;

  const map = L.map(containerId, {
    layers: streetLayer ? [streetLayer] : []
  }).setView([61.4981, 23.7610], 13);

  let currentBase = 'street';

  // Yhtenäinen painike kartan yläpuolella (#btn-toggle-basemap)
  const toggleBtn = document.getElementById('btn-toggle-basemap');
  if (toggleBtn) {
    // Poistetaan mahdolliset vanhat kuuntelijat kloonaamalla
    const newBtn = toggleBtn.cloneNode(true);
    toggleBtn.parentNode.replaceChild(newBtn, toggleBtn);

    newBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (currentBase === 'street') {
        if (streetLayer) map.removeLayer(streetLayer);
        if (satLayer) map.addLayer(satLayer);
        currentBase = 'sat';
        newBtn.innerHTML = '🗺️ Peruskartta';
      } else {
        if (satLayer) map.removeLayer(satLayer);
        if (streetLayer) map.addLayer(streetLayer);
        currentBase = 'street';
        newBtn.innerHTML = '🛰️ Satelliitti';
      }
    });
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
    if (typeof document === 'undefined' || typeof L === 'undefined') return;
    const mapEl = document.getElementById('yardSatelliteMap') || document.getElementById('map') || document.getElementById('admin-map');
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
    if (typeof document === 'undefined') return;
    const el = typeof mapElementId === 'string' ? document.getElementById(mapElementId) : mapElementId;
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
targetGlobal.initMapInstance = initMapInstance;
targetGlobal.initMaps = initMaps;
targetGlobal.safeInvalidateMap = safeInvalidateMap;
targetGlobal.toggleMapFullscreen = toggleMapFullscreen;
targetGlobal.initMapResizeListeners = initMapResizeListeners;

if (typeof globalThis !== 'undefined' && globalThis !== targetGlobal) {
    globalThis.safeInvalidateMap = safeInvalidateMap;
    globalThis.initMapInstance = initMapInstance;
    globalThis.initMaps = initMaps;
    globalThis.toggleMapFullscreen = toggleMapFullscreen;
    globalThis.initMapResizeListeners = initMapResizeListeners;
}
if (typeof global !== 'undefined' && global !== targetGlobal && global !== globalThis) {
    global.safeInvalidateMap = safeInvalidateMap;
    global.initMapInstance = initMapInstance;
    global.initMaps = initMaps;
    global.toggleMapFullscreen = toggleMapFullscreen;
    global.initMapResizeListeners = initMapResizeListeners;
}

if (typeof document !== 'undefined' && typeof setTimeout === 'function') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initMaps();
            initMapResizeListeners();
        });
    } else {
        initMaps();
        initMapResizeListeners();
    }
}
