/**
 * YardFlow Map Resize, Initialization & Orientation Handling (map.js)
 */

(function(global) {
    function safeInvalidateMap(m) {
        if (!m) return;
        try {
            if (typeof m.invalidateSize === 'function') {
                m.invalidateSize();
            }
        } catch (e) {
            // Silently ignore if map container is not yet rendered or has 0 dimensions
        }
    }

    function initMaps() {
        if (typeof document === 'undefined' || typeof document.getElementById !== 'function') return;
        const mapEl = document.getElementById('map') || document.getElementById('admin-map') || document.getElementById('yardSatelliteMap');
        if (!mapEl || typeof L === 'undefined') return;
        const win = typeof window !== 'undefined' ? window : global;
        try {
            if (!win.mapInstance && !mapEl._leaflet_id) {
                win.mapInstance = L.map(mapEl.id).setView([61.4981, 23.7610], 13);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    maxZoom: 19,
                    attribution: '© OpenStreetMap'
                }).addTo(win.mapInstance);
            }
            if (win.mapInstance && typeof win.mapInstance.invalidateSize === 'function') {
                win.mapInstance.invalidateSize();
            }
            if (!win.map && win.mapInstance) {
                win.map = win.mapInstance;
            }
        } catch (err) {
            console.error('Kartan alustusvirhe:', err);
        }
    }

    function initMapResizeListeners(grid) {
        if (grid && typeof grid.on === 'function') {
            grid.on('resizestop', function(event, el) {
                if (el && (el.querySelector('#map') || el.querySelector('#admin-map') || el.querySelector('#yardSatelliteMap') || el.querySelector('#customerGeofenceMap'))) {
                    safeInvalidateMap(global.map || (typeof window !== 'undefined' ? window.map : null));
                    safeInvalidateMap(global.adminMap || (typeof window !== 'undefined' ? window.adminMap : null));
                    safeInvalidateMap(global.yardMap || (typeof window !== 'undefined' ? window.yardMap : null));
                    safeInvalidateMap(global.customerGeofenceMap || (typeof window !== 'undefined' ? window.customerGeofenceMap : null));
                    safeInvalidateMap(global.mapInstance || (typeof window !== 'undefined' ? window.mapInstance : null));
                }
            });
        }

        const resizeHandler = () => {
            safeInvalidateMap(global.map || (typeof window !== 'undefined' ? window.map : null));
            safeInvalidateMap(global.adminMap || (typeof window !== 'undefined' ? window.adminMap : null));
            safeInvalidateMap(global.yardMap || (typeof window !== 'undefined' ? window.yardMap : null));
            safeInvalidateMap(global.customerGeofenceMap || (typeof window !== 'undefined' ? window.customerGeofenceMap : null));
            safeInvalidateMap(global.mapInstance || (typeof window !== 'undefined' ? window.mapInstance : null));
        };

        if (typeof global.addEventListener === 'function') {
            global.addEventListener('resize', resizeHandler);
            global.addEventListener('orientationchange', () => {
                if (typeof setTimeout === 'function') {
                    setTimeout(resizeHandler, 300);
                }
            });
        }
    }

    const target = (typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : global));
    target.safeInvalidateMap = safeInvalidateMap;
    target.initMaps = initMaps;
    target.initMapResizeListeners = initMapResizeListeners;
    if (typeof globalThis !== 'undefined' && globalThis !== target) {
        globalThis.safeInvalidateMap = safeInvalidateMap;
        globalThis.initMaps = initMaps;
        globalThis.initMapResizeListeners = initMapResizeListeners;
    }
    if (typeof global !== 'undefined' && global !== target && global !== globalThis) {
        global.safeInvalidateMap = safeInvalidateMap;
        global.initMaps = initMaps;
        global.initMapResizeListeners = initMapResizeListeners;
    }

    if (typeof document !== 'undefined' && typeof setTimeout === 'function') {
        if (document.readyState === 'loading' && typeof document.addEventListener === 'function') {
            document.addEventListener('DOMContentLoaded', () => {
                initMaps();
                initMapResizeListeners(global.dashboardGrid);
            });
        } else {
            initMaps();
            initMapResizeListeners(global.dashboardGrid);
        }
    }
})(typeof window !== 'undefined' ? window : global);
