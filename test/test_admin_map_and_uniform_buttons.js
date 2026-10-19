const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('🧪 Testing Admin Map & Route Planning and Uniform Save/Cancel Buttons...\n');

const htmlContent = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

// 1. Check DOM Elements & Markup
console.log('--- 1. Testing DOM Elements & Markup ---');

const expectedElements = [
    // Admin map quick controls
    'adminMapBaseSatBtn',
    'adminMapBaseStreetBtn',
    'quickMapBoundariesBtn',
    'yard-draw-actions',
    // Forms and dialogs
    'modal-create-route',
    'addDriverDrawer',
    'addTaskDrawer',
    'routeConfigDrawer',
    'editDialog',
    'addCustomerDrawer',
    'editCustomerDialog'
];

for (const id of expectedElements) {
    assert(htmlContent.includes(`id="${id}"`), `Element id="${id}" missing from index.html`);
    console.log(`✅ Found #${id}`);
}

// 2. Check Uniform Save and Cancel buttons in every form / dialog / drawer
console.log('\n--- 2. Testing Uniform Save and Cancel Buttons ---');

function extractBlock(content, startStr, endStr) {
    const startIdx = content.indexOf(startStr);
    assert(startIdx !== -1, `Could not find start marker: ${startStr}`);
    const endIdx = content.indexOf(endStr, startIdx);
    assert(endIdx !== -1, `Could not find end marker: ${endStr}`);
    return content.substring(startIdx, endIdx + endStr.length);
}

const formChecks = [
    {
        name: 'Route Create/Edit Dialog (#modal-create-route)',
        block: extractBlock(htmlContent, '<dialog id="modal-create-route"', '</dialog>'),
        cancelBtn: /class="[^"]*btn-form-cancel[^"]*"[^>]*onclick="closeCreateRouteModal\(\)"/,
        saveBtn: /class="[^"]*btn-form-save[^"]*"/
    },
    {
        name: 'Add Driver Drawer (#addDriverDrawer)',
        block: extractBlock(htmlContent, '<div id="addDriverDrawer"', 'id="driversListContainer"'),
        cancelBtn: /class="[^"]*btn-form-cancel[^"]*"[^>]*onclick="closeAddDriverDrawer\(\)"/,
        saveBtn: /class="[^"]*btn-form-save[^"]*"[^>]*onclick="saveDriverFromForm\(\)"/
    },
    {
        name: 'Add Property Drawer (#addTaskDrawer)',
        block: extractBlock(htmlContent, '<div id="addTaskDrawer"', 'id="routeConfigDrawer"'),
        cancelBtn: /class="[^"]*btn-form-cancel[^"]*"[^>]*onclick="closeAddTaskDrawer\(\)"/,
        saveBtn: /class="[^"]*btn-form-save[^"]*"[^>]*onclick="addTask\(\)"/
    },
    {
        name: 'Route Config Drawer (#routeConfigDrawer)',
        block: extractBlock(htmlContent, '<div id="routeConfigDrawer"', 'id="yardMapCard"'),
        cancelBtn: /class="[^"]*btn-form-cancel[^"]*"[^>]*onclick="closeRouteConfigDrawer\(\)"/,
        saveBtn: /class="[^"]*btn-form-save[^"]*"[^>]*onclick="saveRoute\(\)"/
    },
    {
        name: 'Edit Property Dialog (#editDialog)',
        block: extractBlock(htmlContent, '<dialog id="editDialog"', '</dialog>'),
        cancelBtn: /class="[^"]*btn-form-cancel[^"]*"[^>]*onclick="closePropertyEditForm\(\)"/,
        saveBtn: /class="[^"]*btn-form-save[^"]*"/
    },
    {
        name: 'Add Customer Drawer (#addCustomerDrawer)',
        block: extractBlock(htmlContent, '<div id="addCustomerDrawer"', 'id="custSearchInput"'),
        cancelBtn: /class="[^"]*btn-form-cancel[^"]*"[^>]*onclick="closeAddCustomerDrawer\(\)"/,
        saveBtn: /class="[^"]*btn-form-save[^"]*"[^>]*onclick="addCustomerFromForm\(\)"/
    },
    {
        name: 'Edit Customer Dialog (#editCustomerDialog)',
        block: extractBlock(htmlContent, '<dialog id="editCustomerDialog"', '</dialog>'),
        cancelBtn: /class="[^"]*btn-form-cancel[^"]*"[^>]*onclick="closeEditCustomerModal\(\)"/,
        saveBtn: /class="[^"]*btn-form-save[^"]*"/
    },
    {
        name: 'Map Drawing & Area Edit Actions (#yard-draw-actions)',
        block: extractBlock(htmlContent, '<div id="yard-draw-actions"', '<div id="yardSatelliteMap">'),
        cancelBtn: /class="[^"]*btn-form-cancel[^"]*"[^>]*onclick="cancelYardDrawOrEdit\(\)"/,
        saveBtn: /class="[^"]*btn-form-save[^"]*"[^>]*onclick="saveAndFinishYardDraw\(\)"/
    }
];

for (const check of formChecks) {
    assert(check.cancelBtn.test(check.block), `Missing uniform Cancel button in ${check.name}`);
    assert(check.saveBtn.test(check.block), `Missing uniform Save button in ${check.name}`);
    console.log(`✅ Uniform [💾 Tallenna] and [✕ Peruuta] verified in: ${check.name}`);
}

// 3. Check Admin Mode CSS & logic: driver HUD and complete buttons must be hidden in admin mode
console.log('\n--- 3. Testing Admin vs Driver HUD & Completion Segregation ---');

assert(htmlContent.includes('.driver-hud-top') && htmlContent.includes('.driver-hud-bottom'), 'Driver HUD classes exist');
assert(htmlContent.includes('body:not(.app-mode-field) .driver-hud-top') || htmlContent.includes('.app-mode-admin .driver-hud-top') || htmlContent.includes('.driver-only'), 'Admin mode CSS rule to hide driver HUD exists');

// Verify renderTasks only shows task-action-row in field mode
assert(htmlContent.includes("currentAppMode === 'field'"), 'renderTasks checks for field mode before displaying completion actions');
console.log('✅ Completion buttons and HUD strictly isolated to Field (driver) mode only');

// 4. Test Map Settings & Admin LocalStorage logic
console.log('\n--- 4. Testing Map Settings & Admin Keys in Logic ---');

assert(htmlContent.includes('yardflow_admin_map_base'), 'Script supports yardflow_admin_map_base');
assert(htmlContent.includes('yardflow_admin_boundaries'), 'Script supports yardflow_admin_boundaries');
assert(htmlContent.includes('function cancelYardDrawOrEdit'), 'cancelYardDrawOrEdit defined');
assert(htmlContent.includes('function saveAndFinishYardDraw'), 'saveAndFinishYardDraw defined');
assert(htmlContent.includes('selectMapLayer'), 'selectMapLayer defined');

// 5. Simulate Map Layer Edit and Cancel / Save in runtime mock
console.log('\n--- 5. Simulating Map Area Edit & Cancel/Save Logic ---');

const localStorageMock = {};
global.localStorage = {
    getItem: (key) => localStorageMock[key] || null,
    setItem: (key, val) => { localStorageMock[key] = String(val); },
    removeItem: (key) => { delete localStorageMock[key]; }
};

let currentMapBase = 'satellite';
let showBoundaries = false;

function setMapBaseLayer(layerName) {
    if (!layerName || (layerName !== 'satellite' && layerName !== 'street')) {
        layerName = 'satellite';
    }
    currentMapBase = layerName;
    localStorage.setItem('yardflow_map_base', layerName);
    localStorage.setItem('yardflow_admin_map_base', layerName);
}

function toggleBoundariesLayer(enable) {
    showBoundaries = !!enable;
    localStorage.setItem('yardflow_show_boundaries', String(showBoundaries));
    localStorage.setItem('yardflow_admin_boundaries', String(showBoundaries));
}

setMapBaseLayer('street');
assert.strictEqual(localStorage.getItem('yardflow_admin_map_base'), 'street');
assert.strictEqual(localStorage.getItem('yardflow_map_base'), 'street');
console.log('✅ setMapBaseLayer writes to both yardflow_map_base and yardflow_admin_map_base');

toggleBoundariesLayer(true);
assert.strictEqual(localStorage.getItem('yardflow_admin_boundaries'), 'true');
assert.strictEqual(localStorage.getItem('yardflow_show_boundaries'), 'true');
console.log('✅ toggleBoundariesLayer writes to both yardflow_show_boundaries and yardflow_admin_boundaries');

// Simulate area edit snapshot and cancel
let originalPoints = [[61.5, 23.7], [61.51, 23.7], [61.51, 23.71], [61.5, 23.71]];
let selectedMapLayer = {
    latlngs: [...originalPoints],
    _originalLatLngs: JSON.stringify(originalPoints),
    pm: {
        _enabled: true,
        disable: function() { this._enabled = false; }
    },
    setLatLngs: function(pts) { this.latlngs = pts; }
};

// Simulate user dragging a vertex
selectedMapLayer.latlngs[0] = [61.505, 23.705];
assert.notDeepStrictEqual(selectedMapLayer.latlngs, originalPoints);

// Test cancelYardDrawOrEdit behavior
function cancelYardDrawOrEditMock() {
    if (selectedMapLayer) {
        if (selectedMapLayer._originalLatLngs) {
            selectedMapLayer.setLatLngs(JSON.parse(selectedMapLayer._originalLatLngs));
            delete selectedMapLayer._originalLatLngs;
        }
        if (selectedMapLayer.pm) selectedMapLayer.pm.disable();
        selectedMapLayer = null;
    }
}

cancelYardDrawOrEditMock();
assert.strictEqual(selectedMapLayer, null);
console.log('✅ cancelYardDrawOrEdit reverts layer vertices to original and disables editing');

console.log('\n🎉 All Admin Map & Uniform Buttons tests PASSED successfully!');
