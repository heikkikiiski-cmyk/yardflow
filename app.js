/**
 * YardFlow Application Controller (app.js)
 * - Orientation Unlock (PWA / Mobile / Screen Orientation API)
 * - Multi-View GridStack System (#dashboard-grid, #view-driver, #view-admin, #view-targets)
 * - Dynamic Responsive Column & Orientation Adjustment (Portrait vs. Landscape)
 * - Touch Gesture Optimization & Smooth Scrolling
 */

(function(global) {
    // 1. SALLITAAN NÄYTÖN KÄÄNTÖ MOBIILISSA (Orientation Unlock)
    if (typeof screen !== 'undefined' && screen.orientation && screen.orientation.unlock) {
        screen.orientation.unlock().catch(() => {
            // Hiljainen ohitus jos laite tai selain ei salli kääntölukituksen avausta
        });
    }

    // GridStack-instanssit jokaiselle päänäkymälle
    const gridInstances = {};
    let activeGrid = null;
    let isEditMode = false;

    // Widget-valikoimat kullekin näkymälle
    const VIEW_WIDGETS = {
        dashboard: [
            { id: 'dash-widget-progress', title: 'Päivän tilanne', icon: '📊', desc: 'Edistymispalkki, kuitatut ja jäljellä olevat kohteet', defaultW: 6, defaultH: 4 },
            { id: 'dash-widget-next-stop', title: 'Seuraava ajokohde', icon: '📍', desc: 'Ajo-ohjeet, osoite ja pikakuittaus seuraavaan kohteeseen', defaultW: 6, defaultH: 4 },
            { id: 'dash-widget-route-stats', title: 'Siirtymämatkat', icon: '⚡', desc: 'Siirtymäkilometrit, ajoaika ja reitin pikaoptimointi', defaultW: 6, defaultH: 4 },
            { id: 'dash-widget-tickets', title: 'Päivän esteet', icon: '⚠️', desc: 'Kuljettajien raportoimat esteet, lumitilanne ja huomiot', defaultW: 6, defaultH: 4 },
            { id: 'dash-widget-queue', title: 'Työjono', icon: '🚜', desc: 'Päivän kohteiden ajojärjestys ja käyntitilanne', defaultW: 6, defaultH: 4 },
            { id: 'dash-widget-shortcuts', title: 'Pikalinkit', icon: '🚀', desc: 'Pikatoiminnot: uusi reitti, raportin lataus ja asiakasrekisteri', defaultW: 6, defaultH: 4 },
            { id: 'dash-widget-recent-logs', title: 'Viimeisimmät kuittaukset', icon: '📋', desc: 'Tuoreimmat kuitatut pihatyöt ja aikaleimat', defaultW: 12, defaultH: 4 }
        ],
        driver: [
            { id: 'driver-widget-hud', title: 'Kohde-HUD ja tiedot', icon: '📍', desc: 'Nykyinen kohde, osoite, navigointi ja valokuvaus', defaultW: 12, defaultH: 4 },
            { id: 'driver-widget-map', title: 'Kuljettajan kartta', icon: '🗺️', desc: 'Satelliittikartta, reittiviiva ja oma sijainti (GPS)', defaultW: 12, defaultH: 7 },
            { id: 'driver-widget-actions', title: 'Kuittaus & esteet', icon: '✓', desc: 'Kuittaa tehdyksi ja ilmoita esteestä', defaultW: 12, defaultH: 3 },
            { id: 'driver-widget-queue', title: 'Päivän työjono', icon: '📋', desc: 'Päivän kohteiden suoritusjärjestys', defaultW: 12, defaultH: 4 }
        ],
        admin: [
            { id: 'admin-widget-map', title: 'Alueiden piirto & kartta', icon: '🗺️', desc: 'Satelliittikartta, kone- ja käsityöalueiden piirtotyökalut', defaultW: 8, defaultH: 7 },
            { id: 'admin-widget-targets', title: 'Reitin kohteet', icon: '📋', desc: 'Kiinteistöjen kohdelista ja suodattimet', defaultW: 4, defaultH: 7 },
            { id: 'admin-widget-stats', title: 'Reittioptimointi', icon: '⚡', desc: 'OSRM-siirtymämatkat ja tehokas reititys', defaultW: 6, defaultH: 4 },
            { id: 'admin-widget-routes', title: 'Tallennetut reitit', icon: '📁', desc: 'Aktiiviset reitit ja kuljettajamääritykset', defaultW: 6, defaultH: 4 }
        ],
        targets: [
            { id: 'targets-widget-search', title: 'Kohteiden pikahaku', icon: '🔍', desc: 'Etsi kiinteistöjä ja kohteita reaaliaikaisesti', defaultW: 4, defaultH: 3 },
            { id: 'targets-widget-progress', title: 'Päivän edistyminen', icon: '📊', desc: 'Kuitattujen kohteiden tilannekatsaus', defaultW: 4, defaultH: 3 },
            { id: 'targets-widget-next-stop', title: 'Seuraava ajokohde', icon: '📍', desc: 'Seuraavan kohteen pikaopastus', defaultW: 4, defaultH: 3 },
            { id: 'targets-widget-list', title: 'Kiinteistö- ja työlista', icon: '🏢', desc: 'Kaikki kiinteistöt, huomiot ja tilat', defaultW: 12, defaultH: 6 }
        ]
    };

    function getCurrentViewName() {
        const tab = global.currentTabName || 'dashboard';
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

        // Pystypuhelin: 1 sarake (helppo selata pystysuunnassa)
        // Vaakapuhelin / Pystytabletti: 6 saraketta
        // Vaakatabletti / Desktop: 12 saraketta
        const targetColumns = isMobile && !isLandscape ? 1 : (isLandscape && isMobile ? 6 : 12);
        
        const curActive = (typeof window !== 'undefined' && window.activeGrid) || global.activeGrid || (typeof globalThis !== 'undefined' && globalThis.activeGrid) || activeGrid || (typeof getActiveGrid === 'function' ? getActiveGrid() : null);
        if (curActive && typeof curActive.getColumn === 'function' && curActive.getColumn() !== targetColumns) {
            if (typeof curActive.column === 'function') {
                curActive.column(targetColumns, 'moveScale');
            }
        }

        // Päivitetään myös muut alustetut gridit
        Object.values(gridInstances).forEach(grid => {
            if (grid && typeof grid.getColumn === 'function' && grid.getColumn() !== targetColumns) {
                if (typeof grid.column === 'function') {
                    grid.column(targetColumns, 'moveScale');
                }
            }
        });

        // Päivitetään kartat välittömästi ilman leikkautumista
        if (global.map && typeof global.map.invalidateSize === 'function') global.map.invalidateSize();
        if (global.adminMap && typeof global.adminMap.invalidateSize === 'function') global.adminMap.invalidateSize();
        if (global.yardMap && typeof global.yardMap.invalidateSize === 'function') global.yardMap.invalidateSize();
        if (global.customerGeofenceMap && typeof global.customerGeofenceMap.invalidateSize === 'function') global.customerGeofenceMap.invalidateSize();
    }

    if (typeof window !== 'undefined') {
        window.addEventListener('resize', handleLayoutResize);
        window.addEventListener('orientationchange', () => {
            setTimeout(handleLayoutResize, 300);
        });
    }

    // 2. VAPAA WIDGET-MUOKKAUS KAIKILLE VÄLILEHDILLE
    function initViewGrid(viewName) {
        if (!viewName) viewName = getCurrentViewName();
        if (gridInstances[viewName]) {
            return gridInstances[viewName];
        }

        if (typeof GridStack === 'undefined') {
            return null;
        }

        let gridEl = null;
        if (viewName === 'dashboard') {
            gridEl = document.getElementById('dashboard-grid') || document.querySelector('.dashboard-grid');
        } else if (viewName === 'driver') {
            gridEl = document.getElementById('view-driver');
        } else if (viewName === 'admin') {
            gridEl = document.getElementById('view-admin');
        } else if (viewName === 'targets') {
            gridEl = document.getElementById('view-targets');
        } else {
            gridEl = document.getElementById('view-' + viewName);
        }

        if (!gridEl) return null;

        const isLandscape = (typeof window !== 'undefined') ? (window.innerWidth > window.innerHeight) : false;
        const isMobile = (typeof window !== 'undefined') ? (window.innerWidth < 768) : false;
        const targetColumns = isMobile && !isLandscape ? 1 : (isLandscape && isMobile ? 6 : 12);

        const grid = GridStack.init({
            column: targetColumns,
            cellHeight: '70px',
            margin: 10,
            animate: true,
            float: true,
            disableDrag: true,   // Oletuksena LUKITTU
            disableResize: true  // Oletuksena LUKITTU
        }, gridEl);

        gridInstances[viewName] = grid;
        if (viewName === 'dashboard') {
            global.dashboardGrid = grid;
        }

        if (!activeGrid || viewName === getCurrentViewName()) {
            activeGrid = grid;
            global.activeGrid = grid;
        }

        // Ladataan tallennettu layout asennon ja näkymän mukaan
        loadGridLayout(viewName, grid);

        // Karttojen koon korjauskuuntelija widgettien koolle
        grid.on('resizestop', function(event, el) {
            if (global.map && typeof global.map.invalidateSize === 'function') global.map.invalidateSize();
            if (global.adminMap && typeof global.adminMap.invalidateSize === 'function') global.adminMap.invalidateSize();
            if (global.yardMap && typeof global.yardMap.invalidateSize === 'function') global.yardMap.invalidateSize();
            if (global.customerGeofenceMap && typeof global.customerGeofenceMap.invalidateSize === 'function') global.customerGeofenceMap.invalidateSize();
        });

        return grid;
    }

    function initAllGrids() {
        ['dashboard', 'driver', 'admin', 'targets'].forEach(v => {
            try {
                initViewGrid(v);
            } catch (e) {
                // Hiljainen ohitus jos näkymää ei ole vielä DOMissa
            }
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
        if (typeof enable === 'undefined') {
            enable = !isEditMode;
        }
        isEditMode = !!enable;
        global.isEditMode = isEditMode;

        // Varmistetaan että aktiivinen grid on alustettu
        const curGrid = getActiveGrid() || initViewGrid(getCurrentViewName());
        
        // Kytketään tila päälle/pois kaikissa grideissä
        Object.values(gridInstances).forEach(grid => {
            if (grid) {
                grid.enableMove(enable);
                grid.enableResize(enable);
            }
        });

        if (document && document.body) {
            document.body.classList.toggle('dashboard-editing', enable);
        }

        // Näytetään/piilotetaan muokkaustoiminnot (poistoraksit, lisäysvalikko)
        if (document) {
            document.querySelectorAll('.card-remove-btn').forEach(b => {
                b.style.display = enable ? 'flex' : 'none';
            });

            const addBtn = document.getElementById('btn-add-widget');
            if (addBtn) addBtn.style.display = enable ? 'inline-flex' : 'none';

            // Päivitetään muokkauspainikkeen tekstit ja ikonit
            const editBtns = document.querySelectorAll('.btn-toggle-dashboard-edit');
            editBtns.forEach(btn => {
                if (enable) {
                    btn.innerHTML = '<span>💾</span> <span class="edit-btn-text">Valmis / Tallenna</span>';
                    btn.classList.add('is-editing', 'btn-primary');
                    btn.classList.remove('btn-outline');
                    btn.title = 'Tallenna asettelu ja lukitse ruutu';
                } else {
                    btn.innerHTML = '<span>✏️</span> <span class="edit-btn-text">Muokkaa näkymää</span>';
                    btn.classList.remove('is-editing', 'btn-primary');
                    btn.classList.add('btn-outline');
                    btn.title = 'Muokkaa korttien asettelua ja kokoa';
                }
            });
        }

        if (!enable) {
            saveGridLayout();
            if (typeof showToast === 'function') {
                showToast('Asettelu tallennettu ja lukittu!', 'success');
            }
        }
    }

    function getGridLayout(gridOrView) {
        const items = [];
        let gridEl = null;

        if (typeof gridOrView === 'string') {
            if (gridInstances[gridOrView] && gridInstances[gridOrView].el) {
                gridEl = gridInstances[gridOrView].el;
            } else if (gridOrView === 'dashboard') {
                gridEl = document.getElementById('dashboard-grid') || document.querySelector('.dashboard-grid');
            } else if (gridOrView === 'driver') {
                gridEl = document.getElementById('view-driver');
            } else if (gridOrView === 'admin') {
                gridEl = document.getElementById('view-admin');
            } else if (gridOrView === 'targets') {
                gridEl = document.getElementById('view-targets');
            } else {
                gridEl = document.getElementById(gridOrView) || document.getElementById('view-' + gridOrView);
            }
        } else if (gridOrView && gridOrView.el) {
            gridEl = gridOrView.el;
        } else {
            const cur = getCurrentViewName();
            if (gridInstances[cur] && gridInstances[cur].el) {
                gridEl = gridInstances[cur].el;
            } else if (cur === 'dashboard') {
                gridEl = document.getElementById('dashboard-grid') || document.querySelector('.dashboard-grid');
            } else if (cur === 'driver') {
                gridEl = document.getElementById('view-driver');
            } else if (cur === 'admin') {
                gridEl = document.getElementById('view-admin');
            } else if (cur === 'targets') {
                gridEl = document.getElementById('view-targets');
            } else {
                gridEl = document.getElementById('view-' + cur);
            }
        }

        if (!gridEl || typeof gridEl.querySelectorAll !== 'function') return items;

        gridEl.querySelectorAll('.grid-stack-item').forEach(el => {
            const id = el.getAttribute('gs-id') || el.id;
            const x = parseInt(el.getAttribute('gs-x') || 0, 10);
            const y = parseInt(el.getAttribute('gs-y') || 0, 10);
            const w = parseInt(el.getAttribute('gs-w') || 6, 10);
            const h = parseInt(el.getAttribute('gs-h') || 4, 10);
            const hidden = el.style.display === 'none';
            items.push({ id, x, y, w, h, hidden });
        });
        return items;
    }

    function saveGridLayout(currentView) {
        if (!currentView) currentView = getCurrentViewName();
        const isLandscape = (typeof window !== 'undefined') ? (window.innerWidth > window.innerHeight) : false;
        const storageKey = `yf_grid_layout_${currentView}_${isLandscape ? 'land' : 'port'}`;
        const layoutData = getGridLayout(currentView);

        if (layoutData && layoutData.length > 0) {
            try {
                localStorage.setItem(storageKey, JSON.stringify(layoutData));
                // Yhteensopivuus fallback-avain
                localStorage.setItem('yf_grid_layout_' + currentView, JSON.stringify(layoutData));
            } catch (e) {
                console.warn('saveGridLayout error:', e);
            }
        }
        return layoutData;
    }

    function loadGridLayout(currentView, grid) {
        if (!currentView) currentView = getCurrentViewName();
        const isLandscape = (typeof window !== 'undefined') ? (window.innerWidth > window.innerHeight) : false;
        const orient = isLandscape ? 'land' : 'port';
        const storageKey = `yf_grid_layout_${currentView}_${orient}`;

        try {
            let raw = localStorage.getItem(storageKey);
            if (!raw) {
                raw = localStorage.getItem('yf_grid_layout_' + currentView);
            }
            if (!raw && currentView.startsWith('view-')) {
                const stripped = currentView.replace('view-', '');
                raw = localStorage.getItem(`yf_grid_layout_${stripped}_${orient}`) || localStorage.getItem(`yf_grid_layout_${stripped}`);
            }
            if (!raw) return null;

            const savedLayout = JSON.parse(raw);
            if (grid && Array.isArray(savedLayout)) {
                savedLayout.forEach(item => {
                    const itemEl = grid.el.querySelector(`[gs-id="${item.id}"]`) || document.getElementById(item.id);
                    if (itemEl) {
                        const parentGridItem = itemEl.classList.contains('grid-stack-item') ? itemEl : itemEl.closest('.grid-stack-item');
                        if (parentGridItem) {
                            if (item.hidden) {
                                parentGridItem.style.display = 'none';
                                grid.removeWidget(parentGridItem, false);
                            } else {
                                parentGridItem.style.display = '';
                                grid.update(parentGridItem, { x: item.x, y: item.y, w: item.w, h: item.h });
                            }
                        }
                    }
                });
            }
            return savedLayout;
        } catch (e) {
            console.warn('loadGridLayout error:', e);
            return null;
        }
    }

    function removeDashboardWidget(widgetId, viewName) {
        if (!viewName) viewName = getCurrentViewName();
        const itemEl = document.querySelector(`.grid-stack-item[gs-id="${widgetId}"]`) || document.getElementById(widgetId);
        if (!itemEl) return;

        const parentGridItem = itemEl.classList.contains('grid-stack-item') ? itemEl : itemEl.closest('.grid-stack-item');
        const grid = gridInstances[viewName] || activeGrid;

        if (parentGridItem) {
            parentGridItem.style.display = 'none';
            if (grid) {
                grid.removeWidget(parentGridItem, false);
            }
        } else {
            itemEl.style.display = 'none';
        }

        saveGridLayout(viewName);
        if (typeof showToast === 'function') {
            showToast('Kortti piilotettu. Voit palauttaa sen [➕ Lisää kortti] -valikosta.', 'info');
        }
    }

    function openAddWidgetModal(viewName) {
        if (!viewName) viewName = getCurrentViewName();
        const modal = document.getElementById('modal-add-widget');
        const listEl = document.getElementById('available-widgets-list');
        if (!modal || !listEl) return;

        const widgets = VIEW_WIDGETS[viewName] || VIEW_WIDGETS['dashboard'] || [];

        listEl.innerHTML = '';
        widgets.forEach(w => {
            const itemEl = document.querySelector(`.grid-stack-item[gs-id="${w.id}"]`) || document.getElementById(w.id);
            const isVisible = itemEl && itemEl.style.display !== 'none' && (!itemEl.closest('.grid-stack-item') || itemEl.closest('.grid-stack-item').style.display !== 'none');

            const cardRow = document.createElement('div');
            cardRow.className = 'available-widget-item';
            cardRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 12px 14px; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-md); margin-bottom: 8px; gap: 12px;';
            cardRow.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 1.4rem;">${w.icon}</span>
                    <div>
                        <div style="font-weight: 700; font-size: 0.95rem; color: var(--fg);">${w.title}</div>
                        <div style="font-size: 0.78rem; color: var(--muted);">${w.desc}</div>
                    </div>
                </div>
                <div>
                    ${isVisible
                        ? '<span class="status-pill status-ready" style="font-size: 0.78rem;">✓ Näytöllä</span>'
                        : `<button type="button" class="btn-primary tiny-btn" onclick="addDashboardWidget('${w.id}', '${viewName}')" style="padding: 6px 14px; font-weight: 700; background: #0284c7;">➕ Lisää</button>`
                    }
                </div>
            `;
            listEl.appendChild(cardRow);
        });

        modal.style.display = 'flex';
    }

    function closeAddWidgetModal() {
        const modal = document.getElementById('modal-add-widget');
        if (modal) modal.style.display = 'none';
    }

    function addDashboardWidget(widgetId, viewName) {
        if (!viewName) viewName = getCurrentViewName();
        const itemEl = document.querySelector(`.grid-stack-item[gs-id="${widgetId}"]`) || document.getElementById(widgetId);
        const parentGridItem = itemEl && itemEl.classList.contains('grid-stack-item') ? itemEl : (itemEl ? itemEl.closest('.grid-stack-item') : null);
        const grid = gridInstances[viewName] || activeGrid;

        if (parentGridItem) {
            parentGridItem.style.display = '';
            if (grid) {
                grid.makeWidget(parentGridItem);
            }
        } else if (itemEl) {
            itemEl.style.display = '';
        }

        closeAddWidgetModal();
        saveGridLayout(viewName);
        if (typeof showToast === 'function') {
            showToast('Kortti lisätty näkymään!', 'success');
        }
    }

    // Yhteensopivuusfunktiot
    const initDashboardGrid = () => initViewGrid('dashboard');
    const toggleDashboardEditMode = toggleEditMode;
    const saveDashboardGridLayout = saveGridLayout;
    const loadDashboardGridLayout = loadGridLayout;
    const getDashboardGridLayout = getGridLayout;

    // Vientiobjektit
    const exports = {
        handleLayoutResize,
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
        gridInstances,
        VIEW_WIDGETS,
        DASHBOARD_AVAILABLE_WIDGETS: VIEW_WIDGETS.dashboard,
        DRIVER_AVAILABLE_WIDGETS: VIEW_WIDGETS.driver,
        ADMIN_AVAILABLE_WIDGETS: VIEW_WIDGETS.admin,
        TARGETS_AVAILABLE_WIDGETS: VIEW_WIDGETS.targets
    };

    const target = (typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : global));
    Object.assign(target, exports);

    if (typeof globalThis !== 'undefined' && globalThis !== target) {
        Object.assign(globalThis, exports);
    }
    if (typeof global !== 'undefined' && global !== target && global !== globalThis) {
        Object.assign(global, exports);
    }

    // Alustus DOMContentLoaded-vaiheessa
    if (typeof document !== 'undefined' && typeof setTimeout === 'function') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(initAllGrids, 100);
            });
        } else {
            setTimeout(initAllGrids, 100);
        }
    }
})(typeof window !== 'undefined' ? window : global);
