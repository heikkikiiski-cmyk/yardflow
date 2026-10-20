/**
 * YardFlow Android-Widget GridStack Dashboard & Card Customization (dashboard.js)
 */

(function(global) {
    let dashboardGridInstance = null;
    let isDashboardEditMode = false;

    const DASHBOARD_AVAILABLE_WIDGETS = [
        { id: 'dash-widget-progress', title: 'Päivän tilanne', icon: '📊', desc: 'Edistymispalkki, kuitatut ja jäljellä olevat kohteet', defaultW: 6, defaultH: 4 },
        { id: 'dash-widget-next-stop', title: 'Seuraava ajokohde', icon: '📍', desc: 'Ajo-ohjeet, osoite ja pikakuittaus seuraavaan kohteeseen', defaultW: 6, defaultH: 4 },
        { id: 'dash-widget-route-stats', title: 'Siirtymämatkat', icon: '⚡', desc: 'Siirtymäkilometrit, ajoaika ja reitin pikaoptimointi', defaultW: 6, defaultH: 4 },
        { id: 'dash-widget-tickets', title: 'Päivän esteet', icon: '⚠️', desc: 'Kuljettajien raportoimat esteet, lumitilanne ja huomiot', defaultW: 6, defaultH: 4 },
        { id: 'dash-widget-queue', title: 'Työjono', icon: '🚜', desc: 'Päivän kohteiden ajojärjestys ja käyntitilanne', defaultW: 6, defaultH: 4 },
        { id: 'dash-widget-shortcuts', title: 'Pikalinkit', icon: '🚀', desc: 'Pikatoiminnot: uusi reitti, raportin lataus ja asiakasrekisteri', defaultW: 6, defaultH: 4 },
        { id: 'dash-widget-recent-logs', title: 'Viimeisimmät kuittaukset', icon: '📋', desc: 'Tuoreimmat kuitatut pihatyöt ja aikaleimat', defaultW: 12, defaultH: 4 }
    ];

    function initDashboardGrid() {
        const gridEl = document.getElementById('dashboard-grid') || document.querySelector('.dashboard-grid');
        if (!gridEl) return null;

        if (typeof GridStack === 'undefined') {
            console.warn('GridStack not loaded, using CSS grid fallback');
            return null;
        }

        if (dashboardGridInstance) {
            return dashboardGridInstance;
        }

        // Alustus JS-tiedostossa:
        const grid = GridStack.init({
            column: 12, // 12-sarakkeinen joustava gridi
            cellHeight: '70px',
            margin: 10,
            animate: true,
            float: true,
            disableDrag: true,   // Oletuksena LUKITTU
            disableResize: true  // Oletuksena LUKITTU
        }, gridEl);

        dashboardGridInstance = grid;
        global.dashboardGrid = grid;

        // Palautetaan tallennettu layout jos löytyy
        const currentView = global.currentTabName || 'dashboard';
        const savedLayout = loadDashboardGridLayout(currentView);
        if (savedLayout && Array.isArray(savedLayout)) {
            try {
                savedLayout.forEach(item => {
                    const itemEl = gridEl.querySelector(`[gs-id="${item.id}"]`) || document.getElementById(item.id);
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
            } catch (e) {
                console.warn('Failed restoring grid layout:', e);
            }
        }

        // Kartan automaattinen päivitys koon muuttuessa
        if (typeof initMapResizeListeners === 'function') {
            initMapResizeListeners(grid);
        } else {
            grid.on('resizestop', function(event, el) {
                if (el && (el.querySelector('#map') || el.querySelector('#admin-map') || el.querySelector('#yardSatelliteMap') || el.querySelector('#customerGeofenceMap'))) {
                    if (global.map && typeof global.map.invalidateSize === 'function') global.map.invalidateSize();
                    if (global.adminMap && typeof global.adminMap.invalidateSize === 'function') global.adminMap.invalidateSize();
                    if (global.yardMap && typeof global.yardMap.invalidateSize === 'function') global.yardMap.invalidateSize();
                }
            });
        }

        return grid;
    }

    function toggleDashboardEditMode(enable) {
        if (typeof enable === 'undefined') {
            enable = !isDashboardEditMode;
        }
        isDashboardEditMode = !!enable;

        const grid = dashboardGridInstance || (typeof GridStack !== 'undefined' ? initDashboardGrid() : null);
        if (grid) {
            grid.enableMove(enable);
            grid.enableResize(enable);
        }

        document.body.classList.toggle('dashboard-editing', enable);

        // Näytetään/piilotetaan muokkaustoiminnot (poistoraksit, lisäysvalikko)
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

        if (!enable) {
            saveDashboardGridLayout();
            if (typeof showToast === 'function') {
                showToast('Asettelu tallennettu ja lukittu!', 'success');
            }
        }
    }

    function removeDashboardWidget(widgetId) {
        const itemEl = document.querySelector(`.grid-stack-item[gs-id="${widgetId}"]`) || document.getElementById(widgetId);
        if (!itemEl) return;

        const parentGridItem = itemEl.classList.contains('grid-stack-item') ? itemEl : itemEl.closest('.grid-stack-item');
        if (parentGridItem) {
            parentGridItem.style.display = 'none';
            if (dashboardGridInstance) {
                dashboardGridInstance.removeWidget(parentGridItem, false);
            }
        } else {
            itemEl.style.display = 'none';
        }

        saveDashboardGridLayout();
        if (typeof showToast === 'function') {
            showToast('Kortti piilotettu. Voit palauttaa sen [➕ Lisää kortti] -valikosta.', 'info');
        }
    }

    function openAddWidgetModal() {
        const modal = document.getElementById('modal-add-widget');
        const listEl = document.getElementById('available-widgets-list');
        if (!modal || !listEl) return;

        listEl.innerHTML = '';
        DASHBOARD_AVAILABLE_WIDGETS.forEach(w => {
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
                        : `<button type="button" class="btn-primary tiny-btn" onclick="addDashboardWidget('${w.id}')" style="padding: 6px 14px; font-weight: 700; background: #0284c7;">➕ Lisää</button>`
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

    function addDashboardWidget(widgetId) {
        const itemEl = document.querySelector(`.grid-stack-item[gs-id="${widgetId}"]`) || document.getElementById(widgetId);
        const parentGridItem = itemEl && itemEl.classList.contains('grid-stack-item') ? itemEl : (itemEl ? itemEl.closest('.grid-stack-item') : null);

        if (parentGridItem) {
            parentGridItem.style.display = '';
            if (dashboardGridInstance) {
                dashboardGridInstance.makeWidget(parentGridItem);
            }
        } else if (itemEl) {
            itemEl.style.display = '';
        }

        closeAddWidgetModal();
        saveDashboardGridLayout();
        if (typeof showToast === 'function') {
            showToast('Kortti lisätty näkymään!', 'success');
        }
    }

    function getDashboardGridLayout() {
        const items = [];
        const gridEl = document.getElementById('dashboard-grid') || document.querySelector('.dashboard-grid');
        if (!gridEl) return items;

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

    function saveDashboardGridLayout() {
        const currentView = global.currentTabName || 'dashboard';
        const layoutData = getDashboardGridLayout();
        if (layoutData && layoutData.length > 0) {
            try {
                localStorage.setItem('yf_grid_layout_' + currentView, JSON.stringify(layoutData));
            } catch (e) {
                console.warn('saveDashboardGridLayout error:', e);
            }
        }
    }

    function loadDashboardGridLayout(currentView = global.currentTabName || 'dashboard') {
        try {
            const raw = localStorage.getItem('yf_grid_layout_' + currentView);
            if (!raw) return null;
            return JSON.parse(raw);
        } catch (e) {
            return null;
        }
    }

    // Exports
    const target = (typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : global));
    target.initDashboardGrid = initDashboardGrid;
    target.toggleDashboardEditMode = toggleDashboardEditMode;
    target.removeDashboardWidget = removeDashboardWidget;
    target.openAddWidgetModal = openAddWidgetModal;
    target.closeAddWidgetModal = closeAddWidgetModal;
    target.addDashboardWidget = addDashboardWidget;
    target.getDashboardGridLayout = getDashboardGridLayout;
    target.saveDashboardGridLayout = saveDashboardGridLayout;
    target.loadDashboardGridLayout = loadDashboardGridLayout;
    target.DASHBOARD_AVAILABLE_WIDGETS = DASHBOARD_AVAILABLE_WIDGETS;

    if (typeof globalThis !== 'undefined' && globalThis !== target) {
        globalThis.initDashboardGrid = initDashboardGrid;
        globalThis.toggleDashboardEditMode = toggleDashboardEditMode;
        globalThis.removeDashboardWidget = removeDashboardWidget;
        globalThis.openAddWidgetModal = openAddWidgetModal;
        globalThis.closeAddWidgetModal = closeAddWidgetModal;
        globalThis.addDashboardWidget = addDashboardWidget;
        globalThis.getDashboardGridLayout = getDashboardGridLayout;
        globalThis.saveDashboardGridLayout = saveDashboardGridLayout;
        globalThis.loadDashboardGridLayout = loadDashboardGridLayout;
        globalThis.DASHBOARD_AVAILABLE_WIDGETS = DASHBOARD_AVAILABLE_WIDGETS;
    }

    if (typeof global !== 'undefined' && global !== target && global !== globalThis) {
        global.initDashboardGrid = initDashboardGrid;
        global.toggleDashboardEditMode = toggleDashboardEditMode;
        global.removeDashboardWidget = removeDashboardWidget;
        global.openAddWidgetModal = openAddWidgetModal;
        global.closeAddWidgetModal = closeAddWidgetModal;
        global.addDashboardWidget = addDashboardWidget;
        global.getDashboardGridLayout = getDashboardGridLayout;
        global.saveDashboardGridLayout = saveDashboardGridLayout;
        global.loadDashboardGridLayout = loadDashboardGridLayout;
        global.DASHBOARD_AVAILABLE_WIDGETS = DASHBOARD_AVAILABLE_WIDGETS;
    }

    // Auto-init on DOMContentLoaded
    if (typeof document !== 'undefined' && typeof setTimeout === 'function') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(initDashboardGrid, 100);
            });
        } else {
            setTimeout(initDashboardGrid, 100);
        }
    }
})(typeof window !== 'undefined' ? window : global);
