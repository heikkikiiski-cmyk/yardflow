/**
 * YardFlow Android-Widget GridStack Dashboard & Card Customization (dashboard.js)
 * Supports orientation unlocking, multi-view grids (#view-driver, #view-admin, #view-targets, #dashboard-grid),
 * touch scrolling, and portrait/landscape column adaptation.
 */

(function(global) {
    // 1. SALLITAAN NÄYTÖN KÄÄNTÖ MOBIILISSA (Orientation Unlock)
    if (typeof screen !== 'undefined' && screen.orientation && screen.orientation.unlock) {
        screen.orientation.unlock().catch(() => {});
    }

    const gridInstances = global.gridInstances || {};
    global.gridInstances = gridInstances;
    let activeGrid = global.activeGrid || null;
    let isEditMode = !!(global.isEditMode || global.isDashboardEditMode);

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

        // Pystypuhelin: 1 sarake (helppo selata pystysuunnassa)
        // Vaakapuhelin / Pystytabletti: 6 saraketta
        // Vaakatabletti / Desktop: 12 saraketta
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
        } catch (e) {
            console.warn('handleLayoutResize error in dashboard.js:', e);
        }

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
        let gridEl = null;
        if (viewName === 'dashboard') {
            gridEl = document.querySelector('#dashboard-view .grid-stack') || document.getElementById('dashboard-grid') || document.querySelector('.dashboard-grid');
        } else if (viewName === 'driver') {
            gridEl = document.querySelector('#view-driver .grid-stack') || document.querySelector('#view-driver.grid-stack') || document.getElementById('view-driver');
        } else if (viewName === 'admin') {
            gridEl = document.querySelector('#view-admin .grid-stack') || document.querySelector('#view-admin.grid-stack') || document.getElementById('view-admin');
        } else if (viewName === 'targets') {
            gridEl = document.querySelector('#view-targets .grid-stack') || document.querySelector('#view-targets.grid-stack') || document.getElementById('view-targets');
        } else {
            gridEl = document.querySelector(`#view-${viewName} .grid-stack`) || document.querySelector(`#view-${viewName}.grid-stack`) || document.getElementById('view-' + viewName) || document.getElementById(viewName);
        }
        return gridEl;
    }

    function isGridContainerVisible(gridEl, viewName) {
        if (!gridEl) return false;
        
        if (typeof window === 'undefined' || typeof document === 'undefined') return true;

        if (gridEl.style && gridEl.style.display === 'none') return false;

        let parentView = null;
        if (viewName === 'dashboard') {
            parentView = document.getElementById('dashboard-view');
        } else if (viewName === 'driver') {
            parentView = document.getElementById('view-driver');
        } else if (viewName === 'admin') {
            parentView = document.getElementById('view-admin');
        } else if (viewName === 'targets') {
            parentView = document.getElementById('view-targets');
        } else {
            parentView = document.getElementById('view-' + viewName);
        }

        if (parentView && parentView !== gridEl && parentView.style && parentView.style.display === 'none') {
            return false;
        }

        try {
            if (typeof window.getComputedStyle === 'function') {
                const comp = window.getComputedStyle(gridEl);
                if (comp && comp.display === 'none') return false;
                if (parentView && parentView !== gridEl) {
                    const parentComp = window.getComputedStyle(parentView);
                    if (parentComp && parentComp.display === 'none') return false;
                }
            }
            if (gridEl.offsetParent === null && gridEl.style && gridEl.style.position !== 'fixed') {
                return false;
            }
        } catch (e) {}

        return true;
    }

    function initViewGrid(viewName) {
        if (!viewName) viewName = getCurrentViewName();
        if (gridInstances[viewName]) {
            return gridInstances[viewName];
        }

        if (typeof GridStack === 'undefined') {
            return null;
        }

        const gridEl = getGridContainer(viewName);
        if (!gridEl) return null;

        // Varmista, ettei mikään GridStack-alustus kaadu, jos sivunäkymä on piilossa (display: none)
        if (!isGridContainerVisible(gridEl, viewName)) {
            return null;
        }

        if (gridEl.gridstack) {
            gridInstances[viewName] = gridEl.gridstack;
            if (viewName === 'dashboard') global.dashboardGrid = gridEl.gridstack;
            return gridEl.gridstack;
        }

        const isLandscape = (typeof window !== 'undefined') ? (window.innerWidth > window.innerHeight) : false;
        const isMobile = (typeof window !== 'undefined') ? (window.innerWidth < 768) : false;
        const targetColumns = isMobile && !isLandscape ? 1 : (isLandscape && isMobile ? 6 : 12);

        let grid = null;
        try {
            grid = GridStack.init({
                column: targetColumns,
                cellHeight: '70px',
                margin: 10,
                animate: true,
                float: true,
                disableDrag: true,   // Oletuksena LUKITTU
                disableResize: true, // Oletuksena LUKITTU
                staticGrid: !isEditMode // Kun muokkaustila EI ole aktiivinen, GridStack ei saa kaapata kosketuseleitä
            }, gridEl);
        } catch (initErr) {
            console.warn('GridStack.init failed for ' + viewName, initErr);
            return null;
        }

        gridInstances[viewName] = grid;
        if (viewName === 'dashboard') {
            global.dashboardGrid = grid;
        }

        if (!activeGrid || viewName === getCurrentViewName()) {
            activeGrid = grid;
            global.activeGrid = grid;
        }

        try {
            loadGridLayout(viewName, grid);
        } catch (e) {
            console.warn('loadGridLayout error in initViewGrid:', e);
        }

        try {
            if (typeof grid.on === 'function') {
                grid.on('resizestop', function(event, el) {
                    safeInvalidateMap(global.map || (typeof window !== 'undefined' ? window.map : null));
                    safeInvalidateMap(global.adminMap || (typeof window !== 'undefined' ? window.adminMap : null));
                    safeInvalidateMap(global.yardMap || (typeof window !== 'undefined' ? window.yardMap : null));
                    safeInvalidateMap(global.customerGeofenceMap || (typeof window !== 'undefined' ? window.customerGeofenceMap : null));
                });
            }
        } catch (e) {}

        return grid;
    }

    function initDashboardGrid() {
        return initViewGrid('dashboard');
    }

    function initAllGrids() {
        ['dashboard', 'driver', 'admin', 'targets'].forEach(v => {
            try {
                initViewGrid(v);
            } catch (e) {}
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

    function toggleDashboardEditMode(enable) {
        if (typeof enable === 'undefined') {
            enable = !(global.isEditMode || global.isDashboardEditMode || isEditMode);
        }
        isEditMode = !!enable;
        global.isEditMode = isEditMode;
        global.isDashboardEditMode = isEditMode;

        getActiveGrid() || initViewGrid(getCurrentViewName());

        Object.values(gridInstances).forEach(grid => {
            if (grid) {
                try {
                    if (typeof grid.setStatic === 'function') {
                        grid.setStatic(!enable);
                    }
                    if (typeof grid.enableMove === 'function') {
                        grid.enableMove(enable);
                    }
                    if (typeof grid.enableResize === 'function') {
                        grid.enableResize(enable);
                    }
                } catch (e) {
                    console.warn('toggleDashboardEditMode error:', e);
                }
            }
        });

        if (document && document.body) {
            document.body.classList.toggle('dashboard-editing', enable);
        }

        if (document) {
            document.querySelectorAll('.card-remove-btn').forEach(b => {
                b.style.display = enable ? 'flex' : 'none';
            });

            const addBtn = document.getElementById('btn-add-widget');
            if (addBtn) addBtn.style.display = enable ? 'inline-flex' : 'none';
            const topAddBtn = document.getElementById('btn-topbar-add-widget');
            if (topAddBtn) topAddBtn.style.display = enable ? 'inline-flex' : 'none';

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

        try {
            if (typeof gridOrView === 'string') {
                if (gridInstances[gridOrView] && gridInstances[gridOrView].el) {
                    gridEl = gridInstances[gridOrView].el;
                } else {
                    gridEl = getGridContainer(gridOrView);
                }
            } else if (gridOrView && gridOrView.el) {
                gridEl = gridOrView.el;
            } else {
                const cur = getCurrentViewName();
                if (gridInstances[cur] && gridInstances[cur].el) {
                    gridEl = gridInstances[cur].el;
                } else {
                    gridEl = getGridContainer(cur);
                }
            }

            if (!gridEl || typeof gridEl.querySelectorAll !== 'function') return items;

            gridEl.querySelectorAll('.grid-stack-item').forEach(el => {
                const id = el.getAttribute('gs-id') || el.id;
                const node = el.gridstackNode || {};
                const x = (typeof node.x === 'number') ? node.x : parseInt(el.getAttribute('gs-x') || 0, 10);
                const y = (typeof node.y === 'number') ? node.y : parseInt(el.getAttribute('gs-y') || 0, 10);
                const w = (typeof node.w === 'number') ? node.w : parseInt(el.getAttribute('gs-w') || 6, 10);
                const h = (typeof node.h === 'number') ? node.h : parseInt(el.getAttribute('gs-h') || 4, 10);
                const hidden = el.style.display === 'none';
                items.push({ id, x, y, w, h, hidden });
            });
        } catch (e) {
            console.warn('getGridLayout error:', e);
        }
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
        const isMobile = (typeof window !== 'undefined') ? (window.innerWidth < 768) : false;
        const orient = isLandscape ? 'land' : 'port';
        const storageKey = `yf_grid_layout_${currentView}_${orient}`;

        try {
            let raw = null;
            try {
                raw = localStorage.getItem(storageKey);
                if (!raw) {
                    raw = localStorage.getItem('yf_grid_layout_' + currentView);
                }
                if (!raw && currentView.startsWith('view-')) {
                    const stripped = currentView.replace('view-', '');
                    raw = localStorage.getItem(`yf_grid_layout_${stripped}_${orient}`) || localStorage.getItem(`yf_grid_layout_${stripped}`);
                }
            } catch (storageErr) {
                console.warn('localStorage read error:', storageErr);
            }

            let savedLayout = null;
            if (raw) {
                try {
                    savedLayout = JSON.parse(raw);
                } catch (parseErr) {
                    console.warn('Corrupted layout JSON in localStorage for', currentView, parseErr);
                    savedLayout = null;
                }
            }

            const targetColumns = isMobile && !isLandscape ? 1 : (isLandscape && isMobile ? 6 : 12);
            const cols = (grid && typeof grid.getColumn === 'function') ? grid.getColumn() : targetColumns;

            if (!savedLayout || !Array.isArray(savedLayout)) {
                const widgets = VIEW_WIDGETS[currentView] || VIEW_WIDGETS['dashboard'] || [];
                savedLayout = widgets.map((w, idx) => ({
                    id: w.id,
                    x: cols === 1 ? 0 : ((idx % Math.max(1, Math.floor(cols / (w.defaultW || 6)))) * (w.defaultW || 6)),
                    y: cols === 1 ? (idx * (w.defaultH || 4)) : (Math.floor(idx / 2) * (w.defaultH || 4)),
                    w: cols === 1 ? 1 : (w.defaultW || 6),
                    h: w.defaultH || 4,
                    hidden: false
                }));
            }

            if (grid && Array.isArray(savedLayout)) {
                const visibleItems = savedLayout.filter(i => !i.hidden);
                const allZeroCoords = visibleItems.length > 1 && visibleItems.every(i => (i.x || 0) === 0 && (i.y || 0) === 0);

                savedLayout.forEach((item, idx) => {
                    try {
                        const itemEl = (grid.el && typeof grid.el.querySelector === 'function') ? (grid.el.querySelector(`[gs-id="${item.id}"]`) || document.getElementById(item.id)) : null;
                        if (!itemEl) return;
                        const parentGridItem = itemEl.classList.contains('grid-stack-item') ? itemEl : itemEl.closest('.grid-stack-item');
                        if (!parentGridItem) return;

                        if (item.hidden) {
                            parentGridItem.style.display = 'none';
                            if (typeof grid.removeWidget === 'function') {
                                grid.removeWidget(parentGridItem, false);
                            }
                        } else {
                            parentGridItem.style.display = '';

                            let targetW = parseInt(item.w || 6, 10);
                            let targetH = parseInt(item.h || 4, 10);
                            let targetX = parseInt(item.x || 0, 10);
                            let targetY = parseInt(item.y || 0, 10);

                            // MOBIILIN OLETUSASETTELU (1-sarake / fallback):
                            // Mobiililaitteilla (< 768px) pystytilassa sarakemäärä on 1.
                            // Älä pakota työpöydän koordinaatteja (x, y, w, h) mobiiliin, jos ne rikkovat leveyden.
                            if (cols === 1) {
                                targetW = 1;
                                targetX = 0;
                                targetY = idx * targetH;
                            } else {
                                if (allZeroCoords) {
                                    targetX = parseInt(parentGridItem.getAttribute('gs-x') || ((idx % 2) * 6), 10);
                                    targetY = parseInt(parentGridItem.getAttribute('gs-y') || (Math.floor(idx / 2) * 4), 10);
                                }
                                if (targetW > cols) targetW = cols;
                                if (targetX + targetW > cols) {
                                    targetX = Math.max(0, cols - targetW);
                                }
                            }

                            if (typeof grid.update === 'function') {
                                grid.update(parentGridItem, { x: targetX, y: targetY, w: targetW, h: targetH });
                            }
                        }
                    } catch (itemErr) {
                        console.warn('Error restoring widget item in dashboard.js', item, itemErr);
                    }
                });
            }
            return savedLayout;
        } catch (e) {
            console.warn('loadGridLayout error in dashboard.js:', e);
            return null;
        }
    }

    function removeDashboardWidget(widgetId, viewName) {
        if (!viewName) viewName = getCurrentViewName();
        try {
            const itemEl = document.querySelector(`.grid-stack-item[gs-id="${widgetId}"]`) || document.getElementById(widgetId);
            if (!itemEl) return;

            const parentGridItem = itemEl.classList.contains('grid-stack-item') ? itemEl : itemEl.closest('.grid-stack-item');
            const grid = gridInstances[viewName] || activeGrid;

            if (parentGridItem) {
                parentGridItem.style.display = 'none';
                if (grid && typeof grid.removeWidget === 'function') {
                    grid.removeWidget(parentGridItem, false);
                }
            } else {
                itemEl.style.display = 'none';
            }

            saveGridLayout(viewName);
            if (typeof showToast === 'function') {
                showToast('Kortti piilotettu. Voit palauttaa sen [➕ Lisää kortti] -valikosta.', 'info');
            }
        } catch (e) {
            console.warn('removeDashboardWidget error:', e);
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
        try {
            const itemEl = document.querySelector(`.grid-stack-item[gs-id="${widgetId}"]`) || document.getElementById(widgetId);
            const parentGridItem = itemEl && itemEl.classList.contains('grid-stack-item') ? itemEl : (itemEl ? itemEl.closest('.grid-stack-item') : null);
            const grid = gridInstances[viewName] || activeGrid;

            if (parentGridItem) {
                parentGridItem.style.display = '';
                if (grid && typeof grid.makeWidget === 'function') {
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
        } catch (e) {
            console.warn('addDashboardWidget error:', e);
        }
    }

    // 4. SIVUNÄKYMIEN VAIHTO JA NAVIGOINTI (showView & switchView)
    function showView(viewId) {
        if (!viewId) return;

        const viewMap = {
            'dashboard': 'dashboard-view',
            'home': 'dashboard-view',
            'dashboard-view': 'dashboard-view',
            'routes': 'viewRoutes',
            'map': 'viewRoutes',
            'viewRoutes': 'viewRoutes',
            'routes-mgmt': 'view-routes',
            'routes-management': 'view-routes',
            'view-routes': 'view-routes',
            'drivers': 'view-drivers',
            'tyonjohto': 'view-drivers',
            'admin': 'view-drivers',
            'view-drivers': 'view-drivers',
            'customers': 'customers-view',
            'customers-view': 'customers-view',
            'viewCustomers': 'customers-view',
            'history': 'work-history-view',
            'reports': 'work-history-view',
            'work-history-view': 'work-history-view',
            'billing': 'billing-view',
            'billing-view': 'billing-view',
            'settings': 'viewSettings',
            'viewSettings': 'viewSettings'
        };

        const targetId = viewMap[viewId] || viewId;

        if (typeof document !== 'undefined') {
            document.querySelectorAll('.view-section').forEach(view => {
                view.style.display = 'none';
                view.classList.remove('active');
            });

            const target = document.getElementById(targetId);
            if (target) {
                if (targetId === 'viewRoutes' && typeof window !== 'undefined' && window.innerWidth >= 768) {
                    target.style.display = 'flex';
                } else {
                    target.style.display = 'block';
                }
                target.classList.add('active');
            }

            const tabName = Object.keys(viewMap).find(k => viewMap[k] === targetId && !k.includes('-view') && k !== targetId) || targetId;
            if (typeof window !== 'undefined') {
                window.currentTabName = tabName;
            }

            document.querySelectorAll('.drawer-nav-item, .nav-tab').forEach(item => {
                const isActive = (item.getAttribute('data-view') === targetId) || (item.getAttribute('data-view') === tabName) || (item.id === 'nav-' + tabName) || (item.id === 'tab-' + tabName);
                item.classList.toggle('active', !!isActive);
            });
        }

        setTimeout(() => {
            if (typeof initMaps === 'function') {
                initMaps();
            } else if (typeof window !== 'undefined' && typeof window.initMaps === 'function') {
                window.initMaps();
            }
            if (typeof window !== 'undefined') {
                if (window.map && typeof window.map.invalidateSize === 'function') window.map.invalidateSize();
                if (window.adminMap && typeof window.adminMap.invalidateSize === 'function') window.adminMap.invalidateSize();
                if (window.yardMap && typeof window.yardMap.invalidateSize === 'function') window.yardMap.invalidateSize();
                if (window.mapInstance && typeof window.mapInstance.invalidateSize === 'function') window.mapInstance.invalidateSize();
            }
        }, 150);
    }

    const switchView = showView;

    const saveDashboardGridLayout = saveGridLayout;
    const loadDashboardGridLayout = loadGridLayout;
    const getDashboardGridLayout = getGridLayout;
    const toggleEditMode = toggleDashboardEditMode;

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
        initViewGrid,
        initAllGrids,
        initDashboardGrid,
        getActiveGrid,
        setActiveGrid,
        toggleDashboardEditMode,
        toggleEditMode,
        removeDashboardWidget,
        addDashboardWidget,
        openAddWidgetModal,
        closeAddWidgetModal,
        getDashboardGridLayout,
        getGridLayout,
        saveDashboardGridLayout,
        saveGridLayout,
        loadDashboardGridLayout,
        loadGridLayout,
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

    const target = (typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : global));
    Object.assign(target, exports);

    if (typeof globalThis !== 'undefined' && globalThis !== target) {
        Object.assign(globalThis, exports);
    }
    if (typeof global !== 'undefined' && global !== target && global !== globalThis) {
        Object.assign(global, exports);
    }

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
