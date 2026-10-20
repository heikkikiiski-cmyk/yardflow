/**
 * YardFlow Map Resize & Orientation Handling (map.js)
 */

(function(global) {
    function initMapResizeListeners(grid) {
        if (grid && typeof grid.on === 'function') {
            grid.on('resizestop', function(event, el) {
                if (el && (el.querySelector('#map') || el.querySelector('#admin-map') || el.querySelector('#yardSatelliteMap') || el.querySelector('#customerGeofenceMap'))) {
                    if (global.map && typeof global.map.invalidateSize === 'function') global.map.invalidateSize();
                    if (global.adminMap && typeof global.adminMap.invalidateSize === 'function') global.adminMap.invalidateSize();
                    if (global.yardMap && typeof global.yardMap.invalidateSize === 'function') global.yardMap.invalidateSize();
                }
            });
        }

        global.addEventListener('resize', () => {
            if (global.map && typeof global.map.invalidateSize === 'function') global.map.invalidateSize();
            if (global.adminMap && typeof global.adminMap.invalidateSize === 'function') global.adminMap.invalidateSize();
            if (global.yardMap && typeof global.yardMap.invalidateSize === 'function') global.yardMap.invalidateSize();
        });

        global.addEventListener('orientationchange', () => {
            if (typeof setTimeout === 'function') {
                setTimeout(() => {
                    if (global.map && typeof global.map.invalidateSize === 'function') global.map.invalidateSize();
                    if (global.adminMap && typeof global.adminMap.invalidateSize === 'function') global.adminMap.invalidateSize();
                    if (global.yardMap && typeof global.yardMap.invalidateSize === 'function') global.yardMap.invalidateSize();
                }, 300);
            }
        });
    }

    const target = (typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : global));
    target.initMapResizeListeners = initMapResizeListeners;
    if (typeof globalThis !== 'undefined' && globalThis !== target) {
        globalThis.initMapResizeListeners = initMapResizeListeners;
    }
    if (typeof global !== 'undefined' && global !== target && global !== globalThis) {
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
