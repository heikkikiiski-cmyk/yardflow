/**
 * YardFlow Map Resize & Orientation Handling (map.js)
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

    function initMapResizeListeners(grid) {
        if (grid && typeof grid.on === 'function') {
            grid.on('resizestop', function(event, el) {
                if (el && (el.querySelector('#map') || el.querySelector('#admin-map') || el.querySelector('#yardSatelliteMap') || el.querySelector('#customerGeofenceMap'))) {
                    safeInvalidateMap(global.map || (typeof window !== 'undefined' ? window.map : null));
                    safeInvalidateMap(global.adminMap || (typeof window !== 'undefined' ? window.adminMap : null));
                    safeInvalidateMap(global.yardMap || (typeof window !== 'undefined' ? window.yardMap : null));
                    safeInvalidateMap(global.customerGeofenceMap || (typeof window !== 'undefined' ? window.customerGeofenceMap : null));
                }
            });
        }

        const resizeHandler = () => {
            safeInvalidateMap(global.map || (typeof window !== 'undefined' ? window.map : null));
            safeInvalidateMap(global.adminMap || (typeof window !== 'undefined' ? window.adminMap : null));
            safeInvalidateMap(global.yardMap || (typeof window !== 'undefined' ? window.yardMap : null));
            safeInvalidateMap(global.customerGeofenceMap || (typeof window !== 'undefined' ? window.customerGeofenceMap : null));
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
    target.initMapResizeListeners = initMapResizeListeners;
    if (typeof globalThis !== 'undefined' && globalThis !== target) {
        globalThis.safeInvalidateMap = safeInvalidateMap;
        globalThis.initMapResizeListeners = initMapResizeListeners;
    }
    if (typeof global !== 'undefined' && global !== target && global !== globalThis) {
        global.safeInvalidateMap = safeInvalidateMap;
        global.initMapResizeListeners = initMapResizeListeners;
    }

    if (typeof document !== 'undefined' && typeof setTimeout === 'function') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                initMapResizeListeners(global.dashboardGrid);
            });
        } else {
            initMapResizeListeners(global.dashboardGrid);
        }
    }
})(typeof window !== 'undefined' ? window : global);
