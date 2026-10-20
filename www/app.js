/**
 * YardFlow Application Controller (app.js)
 * - Orientation Unlock (PWA / Mobile / Screen Orientation API)
 * - Responsive Multi-View CSS Grid & Flexbox Controller
 * - Safe Map Size Invalidation & Touch Optimization
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
    let isEditMode = false;

    const VIEW_WIDGETS = {
        dashboard: [
            { id: 'dash-widget-progress', title: 'Päivän tilanne', icon: '📊', desc: 'Edistymispalkki, kuitatut ja jäljellä olevat kohteet', defaultW: 6, defaultH: 4 },
            { id: 'dash-widget-weather', title: 'Säätiedot & Lumiennuste', icon: '❄️', desc: 'Reaaliaikainen sää ja lumisade-ennuste', defaultW: 6, defaultH: 4 },
            { id: 'dash-widget-map', title: 'Kaupungin tilannekartta', icon: '🗺️', desc: 'Koko kaupungin asiakaskohteet ja kuittaustilat', defaultW: 12, defaultH: 6 },
            { id: 'dash-widget-drivers-accordion', title: 'Kuljettajatilanne', icon: '🚜', desc: 'Kuskikohtainen edistyminen ja pihat', defaultW: 12, defaultH: 6 }
        ],
        driver: [
            { id: 'driver-widget-hud', title: 'Kohde-HUD ja tiedot', icon: '📍', desc: 'Nykyinen kohde, osoite, navigointi ja valokuvaus', defaultW: 12, defaultH: 4 },
            { id: 'driver-widget-map', title: 'Kuljettajan kartta', icon: '🗺️', desc: 'Satelliittikartta, reittiviiva ja oma sijainti (GPS)', defaultW: 12, defaultH: 7 },
            { id: 'driver-widget-actions', title: 'Kuittaus & esteet', icon: '✓', desc: 'Kuittaa tehdyksi ja ilmoita esteestä', defaultW: 12, defaultH: 3 }
        ],
        admin: [
            { id: 'admin-widget-map', title: 'Alueiden piirto & kartta', icon: '🗺️', desc: 'Satelliittikartta, kone- ja käsityöalueiden piirtotyökalut', defaultW: 8, defaultH: 7 },
            { id: 'admin-widget-targets', title: 'Reitin kohteet', icon: '📋', desc: 'Kiinteistöjen kohdelista ja suodattimet', defaultW: 4, defaultH: 7 }
        ],
        targets: [
            { id: 'targets-widget-search', title: 'Kohteiden pikahaku', icon: '🔍', desc: 'Etsi kiinteistöjä ja kohteita reaaliaikaisesti', defaultW: 4, defaultH: 3 },
            { id: 'targets-widget-progress', title: 'Päivän edistyminen', icon: '📊', desc: 'Kuitattujen kohteiden tilannekatsaus', defaultW: 4, defaultH: 3 }
        ]
    };

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

    // 3. MOBIILIN KOSKETUSTUKI JA SARAKEMUUTOS (Portrait vs. Landscape)
    function handleLayoutResize() {
        const isLandscape = (typeof window !== 'undefined') ? (window.innerWidth > window.innerHeight) : false;
        const isMobile = (typeof window !== 'undefined') ? (window.innerWidth < 768) : false;

        // Pystypuhelin: 1 sarake, Vaakapuhelin: 6 saraketta, Desktop: 12 saraketta
        const targetColumns = isMobile && !isLandscape ? 1 : (isLandscape && isMobile ? 6 : 12);
        
        try {
            const curActive = (typeof window !== 'undefined' && window.activeGrid) || global.activeGrid || activeGrid || (typeof getActiveGrid === 'function' ? getActiveGrid() : null);
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

    function isGridContainerVisible(gridEl, viewName) {
        if (!gridEl) return false;
        if (typeof window === 'undefined' || typeof document === 'undefined') return true;
        if (gridEl.style && gridEl.style.display === 'none') return false;
        return true;
    }

    function initViewGrid(viewName) {
        if (!viewName) viewName = getCurrentViewName();
        if (gridInstances[viewName]) {
            return gridInstances[viewName];
        }
        const gridEl = getGridContainer(viewName);
        let cols = 12;
        const gridObj = {
            id: viewName,
            el: gridEl,
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

    function initAllGrids() {
        ['dashboard', 'driver', 'admin', 'targets'].forEach(v => {
            try { initViewGrid(v); } catch (e) {}
        });
        const current = getCurrentViewName();
        activeGrid = gridInstances[current] || gridInstances['dashboard'] || null;
        global.activeGrid = activeGrid;
        handleLayoutResize();
    }

    function getActiveGrid() {
        const cur = getCurrentViewName();
        if (gridInstances[cur]) {
            activeGrid = gridInstances[cur];
            global.activeGrid = activeGrid;
            return activeGrid;
        }
        return activeGrid || gridInstances['dashboard'] || null;
    }

    function setActiveGrid(grid) {
        activeGrid = grid;
        global.activeGrid = grid;
        if (typeof window !== 'undefined') window.activeGrid = grid;
        if (typeof globalThis !== 'undefined') globalThis.activeGrid = grid;
    }

    function toggleEditMode(enable) {
        isEditMode = !!enable;
        global.isEditMode = isEditMode;
        global.isDashboardEditMode = isEditMode;
        if (document && document.body) {
            document.body.classList.remove('dashboard-editing');
        }
    }

    function getGridLayout() { return []; }
    function saveGridLayout() { return []; }
    function loadGridLayout() { return []; }

    function removeDashboardWidget(widgetId) {
        if (typeof document !== 'undefined') {
            const el = document.getElementById(widgetId);
            if (el) el.style.display = 'none';
        }
    }

    function openAddWidgetModal() {}
    function closeAddWidgetModal() {}
    function addDashboardWidget() {}

    function showView(viewId) {
        if (!viewId || typeof document === 'undefined') return;
        document.querySelectorAll('.view-section').forEach(el => el.style.display = 'none');
        const target = document.getElementById(viewId) || (viewId === 'view-map' ? document.getElementById('viewRoutes') : null) || (viewId === 'viewRoutes' ? document.getElementById('view-map') : null) || (viewId === 'view-dashboard' ? document.getElementById('dashboard-view') : null) || (viewId === 'dashboard-view' ? document.getElementById('view-dashboard') : null);
        if (target) {
            const isMapView = (viewId === 'view-map' || target.id === 'view-map' || viewId === 'routes' || viewId === 'map');
            target.style.display = isMapView ? 'flex' : 'block';

            if (isMapView && (typeof window !== 'undefined' && window.yardMap || global.yardMap)) {
                const ym = (typeof window !== 'undefined' && window.yardMap) || global.yardMap;
                setTimeout(() => { if (ym && ym.invalidateSize) ym.invalidateSize(); }, 200);
            }
            if ((viewId === 'view-dashboard' || target.id === 'view-dashboard' || viewId === 'dashboard') && (typeof window !== 'undefined' && window.dashboardCityMap || global.dashboardCityMap)) {
                const dm = (typeof window !== 'undefined' && window.dashboardCityMap) || global.dashboardCityMap;
                setTimeout(() => { if (dm && dm.invalidateSize) dm.invalidateSize(); }, 200);
            }
        }
        handleLayoutResize();
    }

    function initDriverFormHandlers() {
        if (typeof document === 'undefined') return;
        const btnSave = document.getElementById('btn-add-driver') || document.getElementById('btnSaveDriver');
        if (btnSave) {
            btnSave.onclick = async function(e) {
                e.preventDefault();
                const name = document.getElementById('driverInputName')?.value || document.getElementById('driver-name')?.value;
                const phone = document.getElementById('driverInputPhone')?.value || document.getElementById('driver-phone')?.value;
                const email = document.getElementById('driverInputEmail')?.value || null;
                const role = document.getElementById('driverRoleSelect')?.value || 'driver';

                if (!name) return alert('Syötä kuljettajan nimi');

                const client = (typeof supabaseClient !== 'undefined' && supabaseClient) ? supabaseClient : (typeof window !== 'undefined' && window.supabaseClient ? window.supabaseClient : null);
                if (!client) {
                    console.error('Supabase virhe: supabaseClient puuttuu');
                    return alert('Tallennusvirhe: SupabaseClient ei ole saatavilla');
                }

                const { data, error } = await client
                    .from('profiles')
                    .insert([{
                        full_name: name,
                        phone: phone,
                        email: email,
                        role: role
                    }]);

                if (error) {
                    console.error('Supabase virhe:', error);
                    alert('Tallennusvirhe: ' + error.message);
                } else {
                    alert('Kuljettaja tallennettu onnistuneesti!');
                    if (typeof loadDrivers === 'function') loadDrivers();
                }
            };
        }
    }

    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initDriverFormHandlers);
        } else {
            initDriverFormHandlers();
        }
    }

    const switchView = showView;
    const initDashboardGrid = () => initViewGrid('dashboard');
    const toggleDashboardEditMode = toggleEditMode;
    const saveDashboardGridLayout = saveGridLayout;
    const loadDashboardGridLayout = loadGridLayout;
    const getDashboardGridLayout = getGridLayout;

    function navigateToTask(taskId) {
        let task = null;
        if (typeof taskId === 'object' && taskId) task = taskId;
        else if (typeof global.tasks !== 'undefined' && Array.isArray(global.tasks)) task = global.tasks.find(t => t.id === taskId || String(t.id) === String(taskId));
        else if (typeof window !== 'undefined' && Array.isArray(window.tasks)) task = window.tasks.find(t => t.id === taskId || String(t.id) === String(taskId));
        if (!task) return;
        const dest = (task.lat && (task.lon || task.lng)) ? `${task.lat},${task.lon || task.lng}` : encodeURIComponent(task.address || task.name);
        if (typeof window !== 'undefined') window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}`, '_blank');
    }

    const exports = {
        handleLayoutResize,
        showView,
        switchView,
        navigateToTask,
        initDriverFormHandlers,
        initViewGrid,
        initAllGrids,
        initDashboardGrid,
        getActiveGrid,
        setActiveGrid,
        toggleEditMode,
        toggleDashboardEditMode,
        removeDashboardWidget,
        addDashboardWidget,
        openAddWidgetModal,
        closeAddWidgetModal,
        getGridLayout,
        getDashboardGridLayout,
        saveGridLayout,
        saveDashboardGridLayout,
        loadGridLayout,
        loadDashboardGridLayout,
        getCurrentViewName,
        getStorageKey,
        getGridContainer,
        isGridContainerVisible,
        safeInvalidateMap,
        gridInstances,
        VIEW_WIDGETS,
        DASHBOARD_AVAILABLE_WIDGETS: VIEW_WIDGETS.dashboard,
        DRIVER_AVAILABLE_WIDGETS: VIEW_WIDGETS.driver,
        ADMIN_AVAILABLE_WIDGETS: VIEW_WIDGETS.admin,
        TARGETS_AVAILABLE_WIDGETS: VIEW_WIDGETS.targets
    };

    Object.assign(global, exports);
    if (typeof window !== 'undefined') Object.assign(window, exports);
    if (typeof globalThis !== 'undefined') Object.assign(globalThis, exports);
    if (typeof global !== 'undefined') Object.assign(global, exports);
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
