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
                L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
                    maxZoom: 19,
                    attribution: '© OpenStreetMap contributors, Tiles style by HOT'
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
            const win = typeof window !== 'undefined' ? window : global;
            if (win.yardMap && typeof win.yardMap.invalidateSize === 'function') win.yardMap.invalidateSize();
            if (win.mapInstance && typeof win.mapInstance.invalidateSize === 'function') win.mapInstance.invalidateSize();
            if (win.dashboardCityMap && typeof win.dashboardCityMap.invalidateSize === 'function') win.dashboardCityMap.invalidateSize();
            if (win.map && typeof win.map.invalidateSize === 'function') win.map.invalidateSize();
            if (win.adminMap && typeof win.adminMap.invalidateSize === 'function') win.adminMap.invalidateSize();
        }, 150);
    }

    function initMapResizeListeners(grid) {
        if (grid && typeof grid.on === 'function') {
            grid.on('resizestop', function(event, el) {
                if (el && (el.querySelector('#map') || el.querySelector('#admin-map') || el.querySelector('#yardSatelliteMap') || el.querySelector('#customerGeofenceMap') || el.querySelector('#dashboardCityMap'))) {
                    safeInvalidateMap(global.map || (typeof window !== 'undefined' ? window.map : null));
                    safeInvalidateMap(global.adminMap || (typeof window !== 'undefined' ? window.adminMap : null));
                    safeInvalidateMap(global.yardMap || (typeof window !== 'undefined' ? window.yardMap : null));
                    safeInvalidateMap(global.customerGeofenceMap || (typeof window !== 'undefined' ? window.customerGeofenceMap : null));
                    safeInvalidateMap(global.dashboardCityMap || (typeof window !== 'undefined' ? window.dashboardCityMap : null));
                    safeInvalidateMap(global.mapInstance || (typeof window !== 'undefined' ? window.mapInstance : null));
                }
            });
        }

        const resizeHandler = () => {
            safeInvalidateMap(global.map || (typeof window !== 'undefined' ? window.map : null));
            safeInvalidateMap(global.adminMap || (typeof window !== 'undefined' ? window.adminMap : null));
            safeInvalidateMap(global.yardMap || (typeof window !== 'undefined' ? window.yardMap : null));
            safeInvalidateMap(global.customerGeofenceMap || (typeof window !== 'undefined' ? window.customerGeofenceMap : null));
            safeInvalidateMap(global.dashboardCityMap || (typeof window !== 'undefined' ? window.dashboardCityMap : null));
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

        if (typeof document !== 'undefined' && typeof ResizeObserver !== 'undefined') {
            try {
                const resizable = document.querySelectorAll('.map-container, .map-resizable-container');
                resizable.forEach(el => {
                    const ro = new ResizeObserver(() => {
                        resizeHandler();
                    });
                    ro.observe(el);
                });
            } catch (e) {}
        }
    }

    const target = (typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : global));
    target.safeInvalidateMap = safeInvalidateMap;
    target.initMaps = initMaps;
    target.initMapResizeListeners = initMapResizeListeners;
    target.toggleMapFullscreen = toggleMapFullscreen;
    if (typeof globalThis !== 'undefined' && globalThis !== target) {
        globalThis.safeInvalidateMap = safeInvalidateMap;
        globalThis.initMaps = initMaps;
        globalThis.initMapResizeListeners = initMapResizeListeners;
        globalThis.toggleMapFullscreen = toggleMapFullscreen;
    }
    if (typeof global !== 'undefined' && global !== target && global !== globalThis) {
        global.safeInvalidateMap = safeInvalidateMap;
        global.initMaps = initMaps;
        global.initMapResizeListeners = initMapResizeListeners;
        global.toggleMapFullscreen = toggleMapFullscreen;
    }

    if (typeof document !== 'undefined' && typeof setTimeout === 'function') {
        if (typeof document.addEventListener === 'function') {
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    const activeFullscreen = document.querySelectorAll('.map-fullscreen-active');
                    activeFullscreen.forEach(el => {
                        el.classList.remove('map-fullscreen-active');
                    });
                    const btns = document.querySelectorAll('.map-btn-fullscreen');
                    btns.forEach(b => { b.innerHTML = '⛶ Koko näyttö'; });
                    const win = typeof window !== 'undefined' ? window : global;
                    setTimeout(() => {
                        if (win.yardMap && typeof win.yardMap.invalidateSize === 'function') win.yardMap.invalidateSize();
                        if (win.mapInstance && typeof win.mapInstance.invalidateSize === 'function') win.mapInstance.invalidateSize();
                        if (win.dashboardCityMap && typeof win.dashboardCityMap.invalidateSize === 'function') win.dashboardCityMap.invalidateSize();
                    }, 150);
                }
            });
        }
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
