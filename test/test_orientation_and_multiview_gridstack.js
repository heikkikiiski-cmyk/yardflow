/**
 * YardFlow Automated Test Suite:
 * Orientation Unlock & Responsive Multi-View Support (Clean Grid / Flexbox without GridStack)
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

console.log('🧪 Testing Orientation Unlock, Clean Multi-View Layout & Responsive Mobile Support...\n');

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

// 2. Clean Multi-View Containers & Removal of GridStack classes & Ghost Views
console.log('--- 2. Testing Multi-View Containers & Clean Layout (GridStack & Ghost Views Removed) ---');
assert(indexHtml.includes('id="dashboard-grid"'), 'Container #dashboard-grid must exist in index.html');

// Verify #view-driver, #view-admin and #view-targets are completely removed per user request
assert(!indexHtml.includes('id="view-driver"'), '#view-driver container must be completely removed');
assert(!indexHtml.includes('id="view-admin"'), '#view-admin container must be completely removed');
assert(!indexHtml.includes('id="view-targets"'), '#view-targets container must be completely removed');

const dashBlock = indexHtml.substring(indexHtml.indexOf('id="dashboard-grid"'), indexHtml.indexOf('id="dash-widget-drivers-accordion"') + 200);
assert(!dashBlock.includes('class="dashboard-grid grid-stack"'), '#dashboard-grid must NOT have grid-stack class');
console.log('✅ All clean view containers verified and ghost views removed\n');

// 3. CSS for Clean Grid Layout and Responsiveness
console.log('--- 3. Testing CSS for Clean Grid Layout & Responsiveness ---');
const styleCss = fs.readFileSync(path.join(ROOT_DIR, 'style.css'), 'utf8');
assert(styleCss.includes('.dashboard-grid'), 'style.css must define .dashboard-grid');
assert(styleCss.includes('grid-template-columns: repeat(12, 1fr)'), 'style.css must define 12-column grid');
assert(styleCss.includes('@media (max-width: 900px)'), 'style.css must include responsive breakpoint query');
assert(!styleCss.includes('androidWidgetJiggle'), 'style.css must not contain legacy GridStack animation');
console.log('✅ CSS clean grid layout & responsive queries verified\n');

// 4. Functionality & Sandbox Simulation
console.log('--- 4. Testing Multi-View Safe Functions, Storage Keys & Resize in VM ---');
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
        querySelector: () => null,
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

// 4.5 Save and Load Layout safe calls (returns empty array or handles safely)
const saved = sandbox.saveGridLayout('targets');
assert(Array.isArray(saved), 'saveGridLayout must return array');
const loaded = sandbox.loadGridLayout('targets');
assert(Array.isArray(loaded), 'loadGridLayout must return array');

console.log('✅ Multi-view grid logic, storage keys and responsive columns passed in sandbox\n');

console.log('🎉 All Orientation Unlock & Responsive Multi-View tests PASSED successfully!');
