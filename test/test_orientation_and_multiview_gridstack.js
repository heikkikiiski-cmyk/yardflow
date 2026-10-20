/**
 * YardFlow Automated Test Suite:
 * Orientation Unlock & Multi-View GridStack System across Mobile and Views
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

console.log('🧪 Testing Orientation Unlock, Multi-View GridStack & Responsive Mobile Support...\n');

const ROOT_DIR = path.resolve(__dirname, '..');
const WWW_DIR = path.join(ROOT_DIR, 'www');

// 0. Verify Synchronization
console.log('--- 0. Checking File Synchronization ---');
const filesToSync = [
    'manifest.json',
    'manifest.webmanifest',
    'config.xml',
    'app.js',
    'dashboard.js',
    'map.js',
    'style.css',
    'app.css',
    'index.html'
];

filesToSync.forEach(file => {
    const rootPath = path.join(ROOT_DIR, file);
    const wwwPath = path.join(WWW_DIR, file);
    assert(fs.existsSync(rootPath), `Root file missing: ${file}`);
    assert(fs.existsSync(wwwPath), `WWW file missing: ${file}`);
    const rootContent = fs.readFileSync(rootPath, 'utf8');
    const wwwContent = fs.readFileSync(wwwPath, 'utf8');
    assert.strictEqual(rootContent, wwwContent, `File out of sync: ${file}`);
});
console.log('✅ All files strictly synchronized between root and www/\n');

// 1. Orientation Unlock Checks
console.log('--- 1. Testing Orientation Unlock (PWA, Cordova/Capacitor, Screen Orientation API) ---');
const manifestJson = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'manifest.json'), 'utf8'));
const manifestWeb = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'manifest.webmanifest'), 'utf8'));
assert.strictEqual(manifestJson.orientation, 'any', 'manifest.json orientation must be "any"');
assert.strictEqual(manifestWeb.orientation, 'any', 'manifest.webmanifest orientation must be "any"');

const configXml = fs.readFileSync(path.join(ROOT_DIR, 'config.xml'), 'utf8');
assert(configXml.includes('<preference name="Orientation" value="default" />'), 'config.xml must contain Orientation default preference');

const indexHtml = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');
assert(indexHtml.includes('screen.orientation.unlock'), 'index.html or scripts must include screen.orientation.unlock()');
assert(indexHtml.includes('<link rel="manifest" href="manifest.json">'), 'index.html must link manifest.json');
assert(indexHtml.includes('<script src="app.js"></script>'), 'index.html must load app.js');
console.log('✅ Orientation unlock settings verified across manifests, config and code\n');

// 2. Multi-View GridStack Markup
console.log('--- 2. Testing Multi-View GridStack Containers & Widgets ---');
const expectedContainers = ['dashboard-grid', 'view-driver', 'view-admin', 'view-targets'];
expectedContainers.forEach(id => {
    assert(indexHtml.includes(`id="${id}"`), `Container #${id} must exist in index.html`);
});

// Verify class="grid-stack" on all 4 views
const driverBlock = indexHtml.substring(indexHtml.indexOf('id="view-driver"'), indexHtml.indexOf('id="view-admin"'));
const adminBlock = indexHtml.substring(indexHtml.indexOf('id="view-admin"'), indexHtml.indexOf('id="view-targets"'));
const targetsBlock = indexHtml.substring(indexHtml.indexOf('id="view-targets"'), indexHtml.indexOf('id="view-routes"'));
const dashBlock = indexHtml.substring(indexHtml.indexOf('id="dashboard-grid"'), indexHtml.indexOf('id="modal-add-widget"'));

assert(driverBlock.includes('grid-stack'), '#view-driver must be a grid-stack container');
assert(adminBlock.includes('grid-stack'), '#view-admin must be a grid-stack container');
assert(targetsBlock.includes('grid-stack'), '#view-targets must be a grid-stack container');
assert(dashBlock.includes('grid-stack'), '#dashboard-grid must be a grid-stack container');

assert(driverBlock.includes('gs-id="driver-widget-hud"'), 'Driver view must have driver-widget-hud');
assert(driverBlock.includes('gs-id="driver-widget-map"'), 'Driver view must have driver-widget-map');
assert(adminBlock.includes('gs-id="admin-widget-map"'), 'Admin view must have admin-widget-map');
assert(targetsBlock.includes('gs-id="targets-widget-search"'), 'Targets view must have targets-widget-search');
console.log('✅ All view containers and grid items verified in DOM markup\n');

// 3. CSS for Touch Gestures and Mobile Corner Handles
console.log('--- 3. Testing Touch Optimization & Resize Handles in CSS ---');
const styleCss = fs.readFileSync(path.join(ROOT_DIR, 'style.css'), 'utf8');
assert(styleCss.includes('touch-action: pan-y !important;'), 'style.css must protect native vertical scrolling with pan-y');
assert(styleCss.includes('width: 36px !important;'), 'style.css must provide 36px touch handle in edit mode');
assert(styleCss.includes('height: 36px !important;'), 'style.css must provide 36px touch handle height');
assert(styleCss.includes('.ui-resizable-handle'), 'style.css must format resizable handles');
assert(styleCss.includes('@media (max-width: 768px) and (orientation: portrait)'), 'style.css must include mobile portrait responsive query');
console.log('✅ CSS touch scrolling & corner resize handles verified\n');

// 4. Functionality & Sandbox Simulation
console.log('--- 4. Testing Multi-View Grid Logic, Storage Keys & Resize in VM ---');
const appJs = fs.readFileSync(path.join(ROOT_DIR, 'app.js'), 'utf8');

const mockStorage = {};
const mockMap = { invalidateSize: () => { mockMap.invalidated = true; }, invalidated: false };
const mockAdminMap = { invalidateSize: () => { mockAdminMap.invalidated = true; }, invalidated: false };

const createMockGrid = (id) => {
    let cols = 12;
    let enabledMove = false;
    let enabledResize = false;
    const items = [
        { id: `${id}-item-1`, x: 0, y: 0, w: 6, h: 4, style: { display: '' }, getAttribute: (k) => k === 'gs-id' ? `${id}-item-1` : '0' },
        { id: `${id}-item-2`, x: 6, y: 0, w: 6, h: 4, style: { display: '' }, getAttribute: (k) => k === 'gs-id' ? `${id}-item-2` : '0' }
    ];
    return {
        id,
        el: {
            id,
            querySelectorAll: (sel) => items,
            querySelector: (sel) => items[0]
        },
        getColumn: () => cols,
        column: (c) => { cols = c; return cols; },
        enableMove: (en) => { enabledMove = en; },
        enableResize: (en) => { enabledResize = en; },
        getEnabledMove: () => enabledMove,
        getEnabledResize: () => enabledResize,
        update: () => {},
        removeWidget: () => {},
        makeWidget: () => {},
        on: () => {}
    };
};

const sandbox = {
    window: {
        innerWidth: 1024,
        innerHeight: 768,
        addEventListener: () => {},
        map: mockMap,
        adminMap: mockAdminMap
    },
    document: {
        getElementById: (id) => ({
            id,
            classList: { toggle: () => {}, contains: () => true },
            style: {},
            querySelectorAll: () => [],
            querySelector: () => null
        }),
        querySelectorAll: () => [],
        body: { classList: { toggle: () => {} } }
    },
    screen: {
        orientation: {
            unlock: async () => {}
        }
    },
    localStorage: {
        getItem: (k) => mockStorage[k] || null,
        setItem: (k, v) => { mockStorage[k] = v; },
        removeItem: (k) => { delete mockStorage[k]; }
    },
    setTimeout: (fn) => fn(),
    console
};
sandbox.globalThis = sandbox;
sandbox.global = sandbox;

vm.createContext(sandbox);
vm.runInContext(appJs, sandbox);

// 4.1 Check function exports
assert.strictEqual(typeof sandbox.handleLayoutResize, 'function', 'handleLayoutResize must be defined');
assert.strictEqual(typeof sandbox.saveGridLayout, 'function', 'saveGridLayout must be defined');
assert.strictEqual(typeof sandbox.loadGridLayout, 'function', 'loadGridLayout must be defined');
assert.strictEqual(typeof sandbox.toggleEditMode, 'function', 'toggleEditMode must be defined');
assert.strictEqual(typeof sandbox.initViewGrid, 'function', 'initViewGrid must be defined');

// 4.2 Test orientation storage keys
sandbox.window.innerWidth = 1024;
sandbox.window.innerHeight = 768; // Landscape
let keyLand = sandbox.getStorageKey('driver');
assert.strictEqual(keyLand, 'yf_grid_layout_driver_land', 'Landscape key must be yf_grid_layout_driver_land');

sandbox.window.innerWidth = 400;
sandbox.window.innerHeight = 800; // Portrait
let keyPort = sandbox.getStorageKey('driver');
assert.strictEqual(keyPort, 'yf_grid_layout_driver_port', 'Portrait key must be yf_grid_layout_driver_port');

// 4.3 Test Layout Resize Column Calculations
// Desktop / Tablet Landscape: 12 columns
sandbox.window.innerWidth = 1200;
sandbox.window.innerHeight = 800;
const testGrid = createMockGrid('test-grid');
sandbox.setActiveGrid(testGrid);
sandbox.handleLayoutResize();
assert.strictEqual(testGrid.getColumn(), 12, 'Desktop landscape should set 12 columns');

// Mobile Portrait: 1 column
sandbox.window.innerWidth = 390;
sandbox.window.innerHeight = 844;
sandbox.handleLayoutResize();
assert.strictEqual(testGrid.getColumn(), 1, 'Mobile portrait should set 1 column');

// Mobile Landscape: 6 columns
sandbox.window.innerWidth = 700;
sandbox.window.innerHeight = 350;
sandbox.handleLayoutResize();
assert.strictEqual(testGrid.getColumn(), 6, 'Mobile landscape should set 6 columns');

// 4.4 Verify Map Invalidation
assert.strictEqual(mockMap.invalidated, true, 'window.map.invalidateSize must have been called during resize');
assert.strictEqual(mockAdminMap.invalidated, true, 'window.adminMap.invalidateSize must have been called during resize');

// 4.5 Save and Load Layout Persistence per View
sandbox.window.innerWidth = 400;
sandbox.window.innerHeight = 800; // port
sandbox.currentTabName = 'targets';
sandbox.gridInstances['targets'] = testGrid;
sandbox.saveGridLayout('targets');
assert(mockStorage['yf_grid_layout_targets_port'], 'Layout must be stored in localStorage under yf_grid_layout_targets_port');

const loaded = sandbox.loadGridLayout('targets');
assert(Array.isArray(loaded) && loaded.length > 0, 'Loaded layout must return saved items');

console.log('✅ Multi-view grid logic, storage keys and responsive columns passed in sandbox\n');

console.log('🎉 All Orientation Unlock & Multi-View GridStack tests PASSED successfully!');
