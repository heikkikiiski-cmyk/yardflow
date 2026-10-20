/**
 * YardFlow Dashboard & Multi-View Controller (dashboard.js)
 * Clean CSS Grid / Flexbox system without GridStack
 */

(function(global) {
    // 1. SALLITAAN NÄYTÖN KÄÄNTÖ MOBIILISSA (Orientation Unlock)
    if (typeof screen !== 'undefined' && screen.orientation && screen.orientation.unlock) {
        screen.orientation.unlock().catch(() => {});
    }

    // 2. KERTALUONTOINEN VANHAN WIDGET-DATAN SIIVOUS JA ROOLIN LUKITUS ADMINIKSI
    try {
        localStorage.setItem('yf_role', 'admin');
        localStorage.setItem('yardflow_app_mode', 'admin');
        global.currentAppMode = 'admin';
        localStorage.removeItem('yf_dashboard_layout');
        localStorage.removeItem('gridstack_layout');
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('yf_grid_layout_') || key.startsWith('gridstack_')) {
                localStorage.removeItem(key);
            }
        });
    } catch (e) {}

    const gridInstances = global.gridInstances || {};
    global.gridInstances = gridInstances;
    let activeGrid = global.activeGrid || null;

    function safeInvalidateMap(m) {
        if (!m) return;
        try {
            if (typeof m.invalidateSize === 'function') {
                m.invalidateSize();
            }
        } catch (e) {}
    }

    function getCurrentViewName() {
        const tab = global.currentTabName || (typeof window !== 'undefined' ? window.currentTabName : null) || 'dashboard';
        if (tab === 'dashboard' || tab === 'home') return 'dashboard';
        if (tab === 'driver') return 'driver';
        if (tab === 'admin') return 'admin';
        if (tab === 'targets') return 'targets';
        if (tab === 'routes') {
            return (global.currentAppMode === 'field') ? 'driver' : 'admin';
        }
        return tab;
    }

    function getStorageKey(currentView) {
        if (!currentView) currentView = getCurrentViewName();
        const isLandscape = (typeof window !== 'undefined') ? (window.innerWidth > window.innerHeight) : false;
        return `yf_grid_layout_${currentView}_${isLandscape ? 'land' : 'port'}`;
    }

    // Responsiivinen mobiili- ja näyttösovitus
    function handleLayoutResize() {
        const isLandscape = (typeof window !== 'undefined') ? (window.innerWidth > window.innerHeight) : false;
        const isMobile = (typeof window !== 'undefined') ? (window.innerWidth < 768) : false;
        const targetColumns = isMobile && !isLandscape ? 1 : (isLandscape && isMobile ? 6 : 12);

        try {
            const curActive = (typeof window !== 'undefined' && window.activeGrid) || global.activeGrid || activeGrid;
            if (curActive && typeof curActive.getColumn === 'function' && curActive.getColumn() !== targetColumns) {
                if (typeof curActive.column === 'function') {
                    curActive.column(targetColumns, 'moveScale');
                }
            }
            if (gridInstances) {
                Object.values(gridInstances).forEach(grid => {
                    if (grid && typeof grid.getColumn === 'function' && grid.getColumn() !== targetColumns) {
                        if (typeof grid.column === 'function') {
                            grid.column(targetColumns, 'moveScale');
                        }
                    }
                });
            }
        } catch (e) {}

        safeInvalidateMap(global.map || (typeof window !== 'undefined' ? window.map : null));
        safeInvalidateMap(global.adminMap || (typeof window !== 'undefined' ? window.adminMap : null));
        safeInvalidateMap(global.yardMap || (typeof window !== 'undefined' ? window.yardMap : null));
        safeInvalidateMap(global.customerGeofenceMap || (typeof window !== 'undefined' ? window.customerGeofenceMap : null));
    }

    if (typeof window !== 'undefined') {
        window.addEventListener('resize', handleLayoutResize);
        window.addEventListener('orientationchange', () => {
            setTimeout(handleLayoutResize, 300);
        });
    }

    function getGridContainer(viewName) {
        if (typeof document === 'undefined') return null;
        if (viewName === 'dashboard') {
            return document.getElementById('dashboard-grid') || document.querySelector('.dashboard-grid');
        }
        return document.getElementById(`view-${viewName}`) || document.getElementById(viewName);
    }

    // Yhteensopivuusfunktiot puhtaalle CSS Gridille (ei GridStack-kirjastoa)
    function initViewGrid(viewName) {
        if (!viewName) viewName = getCurrentViewName();
        if (gridInstances[viewName]) return gridInstances[viewName];

        const el = getGridContainer(viewName);
        let cols = 12;
        const gridObj = {
            el,
            getColumn: () => cols,
            column: (c) => { if (typeof c === 'number') cols = c; return cols; },
            setStatic: () => {},
            enableMove: () => {},
            enableResize: () => {},
            removeWidget: () => {},
            makeWidget: () => {},
            update: () => {},
            on: () => {}
        };
        gridInstances[viewName] = gridObj;
        if (viewName === 'dashboard') global.dashboardGrid = gridObj;
        if (!activeGrid || viewName === getCurrentViewName()) {
            activeGrid = gridObj;
            global.activeGrid = gridObj;
        }
        return gridObj;
    }

    function initDashboardGrid() {
        return initViewGrid('dashboard');
    }

    function initAllGrids() {
        ['dashboard', 'driver', 'admin', 'targets'].forEach(v => {
            try { initViewGrid(v); } catch (e) {}
        });
        handleLayoutResize();
    }

    function getActiveGrid() {
        return initViewGrid(getCurrentViewName());
    }

    function setActiveGrid(grid) {
        activeGrid = grid;
        global.activeGrid = grid;
        if (typeof window !== 'undefined') window.activeGrid = grid;
    }

    function toggleEditMode() {}
    function toggleDashboardEditMode() {}

    function getGridLayout() { return []; }
    function saveGridLayout() { return []; }
    function loadGridLayout() { return []; }

    function showView(viewId) {
        if (!viewId || typeof document === 'undefined') return;
        const allViews = document.querySelectorAll('.view-section, .view-pane');
        allViews.forEach(v => { v.style.display = 'none'; });
        const target = document.getElementById(viewId) || document.querySelector(`[data-view="${viewId}"]`);
        if (target) target.style.display = 'block';
        handleLayoutResize();
    }

    const exports = {
        handleLayoutResize,
        showView,
        initViewGrid,
        initDashboardGrid,
        initAllGrids,
        getActiveGrid,
        setActiveGrid,
        toggleEditMode,
        toggleDashboardEditMode,
        getGridLayout,
        saveGridLayout,
        loadGridLayout,
        getCurrentViewName,
        getStorageKey,
        getGridContainer
    };

    Object.assign(global, exports);
    if (typeof window !== 'undefined') Object.assign(window, exports);
    if (typeof globalThis !== 'undefined') Object.assign(globalThis, exports);
    if (typeof global !== 'undefined') Object.assign(global, exports);
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
