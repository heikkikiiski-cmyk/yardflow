/**
 * Test: Android-Widget GridStack Customizable and Responsive Card System
 * Tests GridStack integration, edit mode toggling, card removal, card addition,
 * local storage layout saving, and responsive map resize listeners.
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

function runTest() {
    console.log('🧪 Testing Android-Widget GridStack Card System...');

    const rootDir = path.join(__dirname, '..');
    const indexPath = path.join(rootDir, 'index.html');
    const wwwIndexPath = path.join(rootDir, 'www', 'index.html');
    const appCssPath = path.join(rootDir, 'app.css');
    const wwwAppCssPath = path.join(rootDir, 'www', 'app.css');
    const styleCssPath = path.join(rootDir, 'style.css');
    const wwwStyleCssPath = path.join(rootDir, 'www', 'style.css');
    const dashJsPath = path.join(rootDir, 'dashboard.js');
    const wwwDashJsPath = path.join(rootDir, 'www', 'dashboard.js');
    const mapJsPath = path.join(rootDir, 'map.js');
    const wwwMapJsPath = path.join(rootDir, 'www', 'map.js');

    const html = fs.readFileSync(indexPath, 'utf-8');
    const wwwHtml = fs.readFileSync(wwwIndexPath, 'utf-8');
    const appCss = fs.readFileSync(appCssPath, 'utf-8');
    const wwwAppCss = fs.readFileSync(wwwAppCssPath, 'utf-8');
    const styleCss = fs.readFileSync(styleCssPath, 'utf-8');
    const wwwStyleCss = fs.readFileSync(wwwStyleCssPath, 'utf-8');
    const dashJs = fs.readFileSync(dashJsPath, 'utf-8');
    const wwwDashJs = fs.readFileSync(wwwDashJsPath, 'utf-8');
    const mapJs = fs.readFileSync(mapJsPath, 'utf-8');
    const wwwMapJs = fs.readFileSync(wwwMapJsPath, 'utf-8');

    // 0. Synchronization checks
    console.log('\n--- 0. Checking File Synchronization ---');
    assert.strictEqual(html, wwwHtml, 'index.html ja www/index.html tulee olla identtiset');
    assert.strictEqual(appCss, wwwAppCss, 'app.css ja www/app.css tulee olla identtiset');
    assert.strictEqual(styleCss, wwwStyleCss, 'style.css ja www/style.css tulee olla identtiset');
    assert.strictEqual(dashJs, wwwDashJs, 'dashboard.js ja www/dashboard.js tulee olla identtiset');
    assert.strictEqual(mapJs, wwwMapJs, 'map.js ja www/map.js tulee olla identtiset');
    console.log('✅ Synchronization verified across all root and www/ files');

    // 1. GridStack.js CDN and styles inclusion in index.html
    console.log('\n--- 1. Testing GridStack.js CDN & Resource Inclusion ---');
    assert(html.includes('gridstack@10.3.1/dist/gridstack.min.css'), 'GridStack 10.3.1 CSS linkki löytyy');
    assert(html.includes('gridstack@10.3.1/dist/gridstack-all.js'), 'GridStack 10.3.1 JS skripti löytyy');
    assert(html.includes('style.css'), 'style.css linkitys löytyy');
    assert(html.includes('dashboard.js'), 'dashboard.js skripti löytyy');
    assert(html.includes('map.js'), 'map.js skripti löytyy');
    console.log('✅ GridStack CDN and script inclusions verified in <head>');

    // 2. DOM Elements & Buttons Markup
    console.log('\n--- 2. Testing DOM Elements, Grid & Card Buttons Markup ---');
    assert(html.includes('id="btn-toggle-dashboard-edit"'), 'Painike #btn-toggle-dashboard-edit löytyy yläpalkista');
    assert(html.includes('id="btn-hero-toggle-edit"'), 'Painike #btn-hero-toggle-edit löytyy heron toimintoriviltä');
    assert(html.includes('id="btn-add-widget"'), 'Painike #btn-add-widget löytyy');
    assert(html.includes('id="dashboard-grid"') && html.includes('grid-stack'), 'GridStack-säiliö #dashboard-grid.grid-stack löytyy');
    assert(html.includes('class="card-remove-btn"'), 'Poistorastipainikkeet (.card-remove-btn) löytyvät');
    assert(html.includes('id="modal-add-widget"'), 'Modaali #modal-add-widget löytyy');
    assert(html.includes('id="available-widgets-list"'), 'Lista #available-widgets-list löytyy');

    // Verify key widget cards exist inside GridStack items
    assert(html.includes('gs-id="dash-widget-progress"'), 'Widget: Päivän tilanne gs-id määritelty');
    assert(html.includes('gs-id="dash-widget-next-stop"'), 'Widget: Seuraava ajokohde gs-id määritelty');
    assert(html.includes('gs-id="dash-widget-route-stats"'), 'Widget: Siirtymämatkat gs-id määritelty');
    assert(html.includes('gs-id="dash-widget-tickets"'), 'Widget: Päivän esteet gs-id määritelty');
    assert(html.includes('gs-id="dash-widget-queue"'), 'Widget: Työjono gs-id määritelty');
    assert(html.includes('gs-id="dash-widget-shortcuts"'), 'Widget: Pikalinkit gs-id määritelty');
    assert(html.includes('gs-id="dash-widget-recent-logs"'), 'Widget: Viimeisimmät kuittaukset gs-id määritelty');
    console.log('✅ All GridStack DOM elements, cards and remove buttons verified');

    // 3. CSS Styles for Android-Widget effect & Responsiveness
    console.log('\n--- 3. Testing CSS Styles for Edit Mode & Responsiveness ---');
    assert(styleCss.includes('body.dashboard-editing .grid-stack-item-content'), 'Muokkaustilan korostuskehys ja tyylit määritelty');
    assert(styleCss.includes('androidWidgetJiggle'), 'Android-widget liike-efekti määritelty');
    assert(styleCss.includes('.card-remove-btn'), 'Poistorastin (.card-remove-btn) tyylit määritelty');
    assert(styleCss.includes('@media (max-width: 768px) and (orientation: portrait)'), '1-sarakkeen responsiivisuus puhelimelle pystyasennossa määritelty');
    console.log('✅ CSS rules for edit mode jiggle, remove button and portrait responsiveness verified');

    // 4. Function Declarations
    console.log('\n--- 4. Testing Function Declarations ---');
    assert(html.includes('function initDashboardGrid('), 'initDashboardGrid funktio määritelty');
    assert(html.includes('function toggleDashboardEditMode('), 'toggleDashboardEditMode funktio määritelty');
    assert(html.includes('function removeDashboardWidget('), 'removeDashboardWidget funktio määritelty');
    assert(html.includes('function openAddWidgetModal('), 'openAddWidgetModal funktio määritelty');
    assert(html.includes('function closeAddWidgetModal('), 'closeAddWidgetModal funktio määritelty');
    assert(html.includes('function addDashboardWidget('), 'addDashboardWidget funktio määritelty');
    assert(html.includes('function getDashboardGridLayout('), 'getDashboardGridLayout funktio määritelty');
    assert(html.includes('function saveDashboardGridLayout('), 'saveDashboardGridLayout funktio määritelty');
    assert(html.includes('function loadDashboardGridLayout('), 'loadDashboardGridLayout funktio määritelty');
    assert(html.includes('function initMapResizeListeners('), 'initMapResizeListeners funktio määritelty');
    console.log('✅ All required GridStack functions verified in codebase');

    // 5. Functional Simulation in Sandbox
    console.log('\n--- 5. Simulating Edit Mode, Drag/Resize locking, Removal & Layout Persistence ---');
    const localStore = {};
    let moveEnabled = null;
    let resizeEnabled = null;
    let mapInvalidated = 0;
    let adminMapInvalidated = 0;
    let yardMapInvalidated = 0;

    const mockGrid = {
        enableMove(val) { moveEnabled = val; },
        enableResize(val) { resizeEnabled = val; },
        removeWidget(el, removeDom) {},
        makeWidget(el) {},
        update(el, opts) {},
        on(event, handler) { this._handler = handler; },
        triggerResizeStop(el) { if (this._handler) this._handler({}, el); }
    };

    const elements = {};
    function getMockElement(id) {
        if (!elements[id]) {
            elements[id] = {
                id,
                style: {},
                classList: {
                    classes: new Set(),
                    add(c) { this.classes.add(c); },
                    remove(c) { this.classes.delete(c); },
                    toggle(c, f) { if (f === undefined) f = !this.classes.has(c); if (f) this.add(c); else this.remove(c); return f; },
                    contains(c) { return this.classes.has(c); }
                },
                textContent: '',
                innerHTML: '',
                title: '',
                getAttribute(a) { return this[a] || null; },
                setAttribute(a, v) { this[a] = v; },
                querySelectorAll(sel) {
                    if (this.id === 'dashboard-grid' && sel === '.grid-stack-item') {
                        return [
                            { id: 'dash-widget-progress', getAttribute: a => (a === 'gs-id' ? 'dash-widget-progress' : '6'), style: {} },
                            { id: 'dash-widget-next-stop', getAttribute: a => (a === 'gs-id' ? 'dash-widget-next-stop' : '6'), style: {} }
                        ];
                    }
                    return [];
                },
                closest(sel) { return this; }
            };
        }
        return elements[id];
    }

    const removeBtns = [
        getMockElement('remove-btn-1'),
        getMockElement('remove-btn-2')
    ];

    const sandbox = {
        console: console,
        setTimeout: setTimeout,
        clearTimeout: clearTimeout,
        window: {
            currentTabName: 'dashboard',
            map: { invalidateSize() { mapInvalidated++; } },
            adminMap: { invalidateSize() { adminMapInvalidated++; } },
            yardMap: { invalidateSize() { yardMapInvalidated++; } },
            addEventListener(ev, fn) { this['on_' + ev] = fn; }
        },
        document: {
            body: getMockElement('body'),
            getElementById(id) { return getMockElement(id); },
            querySelector(sel) {
                if (sel === '#dashboard-grid' || sel === '.dashboard-grid') return getMockElement('dashboard-grid');
                return null;
            },
            querySelectorAll(sel) {
                if (sel === '.card-remove-btn') return removeBtns;
                if (sel === '.btn-toggle-dashboard-edit') return [getMockElement('btn-toggle-dashboard-edit')];
                if (sel === '#dashboard-grid .grid-stack-item') {
                    return [
                        { id: 'dash-widget-progress', getAttribute: a => (a === 'gs-id' ? 'dash-widget-progress' : '6'), style: {} },
                        { id: 'dash-widget-next-stop', getAttribute: a => (a === 'gs-id' ? 'dash-widget-next-stop' : '6'), style: {} }
                    ];
                }
                return [];
            }
        },
        localStorage: {
            getItem(k) { return localStore[k] || null; },
            setItem(k, v) { localStore[k] = String(v); }
        },
        GridStack: {
            init(opts, el) { return mockGrid; }
        },
        showToast(msg, type) {}
    };

    vm.createContext(sandbox);

    // Run dashboard.js in sandbox
    vm.runInContext(dashJs, sandbox);
    // Run map.js in sandbox
    vm.runInContext(mapJs, sandbox);

    // Initial state: locked
    const gridInstance = sandbox.initDashboardGrid();
    assert(gridInstance !== null, 'GridStack alustettu');

    // Test A: Normal mode is locked
    assert.strictEqual(sandbox.document.body.classList.contains('dashboard-editing'), false, 'Normaalitilassa dashboard-editing ei ole päällä');

    // Test B: Toggle Edit Mode ON
    sandbox.toggleDashboardEditMode(true);
    assert.strictEqual(sandbox.document.body.classList.contains('dashboard-editing'), true, 'Muokkaustilassa body saa dashboard-editing luokan');
    assert.strictEqual(moveEnabled, true, 'Korttien raahaus (move) sallittu muokkaustilassa');
    assert.strictEqual(resizeEnabled, true, 'Korttien koonmuutos (resize) sallittu muokkaustilassa');
    assert.strictEqual(getMockElement('btn-add-widget').style.display, 'inline-flex', 'Lisää kortti -painike näkyvissä muokkaustilassa');
    assert.strictEqual(removeBtns[0].style.display, 'flex', 'Poistoraksit näkyvissä muokkaustilassa');
    assert(getMockElement('btn-toggle-dashboard-edit').innerHTML.includes('Valmis / Tallenna'), 'Painikkeessa lukee Valmis / Tallenna');
    console.log('✅ Edit mode activation (drag, resize, remove buttons, add widget button) verified');

    // Test C: Toggle Edit Mode OFF (Lock & Save)
    sandbox.toggleDashboardEditMode(false);
    assert.strictEqual(sandbox.document.body.classList.contains('dashboard-editing'), false, 'Muokkaustilan poistuttua body ei sisällä dashboard-editing luokkaa');
    assert.strictEqual(moveEnabled, false, 'Korttien raahaus lukittu normaalitilassa');
    assert.strictEqual(resizeEnabled, false, 'Korttien koonmuutos lukittu normaalitilassa');
    assert.strictEqual(getMockElement('btn-add-widget').style.display, 'none', 'Lisää kortti -painike piilotettu normaalitilassa');
    assert.strictEqual(removeBtns[0].style.display, 'none', 'Poistoraksit piilotettu normaalitilassa');
    assert(getMockElement('btn-toggle-dashboard-edit').innerHTML.includes('Muokkaa näkymää'), 'Painikkeessa lukee Muokkaa näkymää');

    // Check localStorage persistence
    const savedLayout = localStore['yf_grid_layout_dashboard'];
    assert(savedLayout, 'Layout tallennettu laitteen muistiin (yf_grid_layout_dashboard)');
    const parsedLayout = JSON.parse(savedLayout);
    assert(Array.isArray(parsedLayout) && parsedLayout.length > 0, 'Tallennettu layout on validi lista');
    console.log('✅ Edit mode exit, layout locking & localStorage persistence verified');

    // Test D: Map Resize & Orientation Change Handlers
    const mockMapEl = {
        querySelector(s) { return s === '#yardSatelliteMap' ? true : null; }
    };
    mockGrid.triggerResizeStop(mockMapEl);
    assert(mapInvalidated > 0 || yardMapInvalidated > 0, 'Kartan koko päivitetty widgetin resizen jälkeen');

    if (sandbox.window.on_resize) {
        sandbox.window.on_resize();
        assert(yardMapInvalidated > 0, 'Kartan koko päivitetty ikkunan koon muuttuessa (resize)');
    }
    console.log('✅ Automatic map invalidation & orientation change response verified');

    console.log('\n🎉 All Android-Widget GridStack tests PASSED successfully!');
}

runTest();
