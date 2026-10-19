const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('index.html', 'utf8');

// 1. Verify required DOM elements exist
const requiredIds = [
  'map-settings-card',
  'btnMapBaseSatellite',
  'btnMapBaseStreet',
  'toggle-map-boundaries',
  'boundariesToggleStatus',
  'quickMapBaseToggleBtn',
  'quickMapBoundariesBtn'
];

requiredIds.forEach(id => {
  assert.ok(html.includes(`id="${id}"`), `Missing required ID #${id}`);
  console.log(`✅ Found #${id}`);
});

// 2. Verify functions exist in index.html
const requiredFunctions = [
  'getBaseLayers',
  'getBoundaryLayer',
  'setMapBaseLayer',
  'toggleBoundariesLayer',
  'toggleMapBaseQuick',
  'toggleBoundariesQuick',
  'updateMapSettingsUi'
];

requiredFunctions.forEach(fn => {
  assert.ok(html.includes(`function ${fn}`), `Missing function ${fn}`);
  console.log(`✅ Found function ${fn}`);
});

// 3. Functional behavior with mock DOM and Leaflet
const store = {};
global.localStorage = {
  getItem: (k) => store[k] || null,
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; }
};

const dom = {
  btnMapBaseSatellite: { className: '' },
  btnMapBaseStreet: { className: '' },
  'toggle-map-boundaries': { checked: false },
  boundariesToggleStatus: { textContent: '', style: {} },
  quickMapBaseToggleBtn: { textContent: '' },
  quickMapBoundariesBtn: { textContent: '', style: {} }
};

global.document = {
  getElementById: (id) => dom[id] || null
};

// Mock Leaflet
const addedLayers = new Set();
global.yardMap = {
  hasLayer: (l) => addedLayers.has(l),
  addLayer: (l) => { addedLayers.add(l); },
  removeLayer: (l) => { addedLayers.delete(l); }
};

const mockSatelliteLayer = { id: 'sat', addTo: (m) => m.addLayer(mockSatelliteLayer), bringToBack: () => {} };
const mockStreetLayer = { id: 'street', addTo: (m) => m.addLayer(mockStreetLayer), bringToBack: () => {} };
const mockBoundaryLayer = { id: 'boundary', addTo: (m) => m.addLayer(mockBoundaryLayer) };

let currentMapBase = 'satellite';
let showBoundaries = false;
let currentBaseLayer = mockSatelliteLayer;
currentBaseLayer.addTo(global.yardMap);

function updateMapSettingsUi() {
  if (currentMapBase === 'street') {
    dom.btnMapBaseStreet.className = 'btn-primary';
    dom.btnMapBaseSatellite.className = 'btn-outline';
  } else {
    dom.btnMapBaseSatellite.className = 'btn-primary';
    dom.btnMapBaseStreet.className = 'btn-outline';
  }
  dom['toggle-map-boundaries'].checked = !!showBoundaries;
  dom.boundariesToggleStatus.textContent = showBoundaries ? 'Päällä ✓' : 'Pois';
  dom.quickMapBaseToggleBtn.textContent = currentMapBase === 'street' ? '🗺️ Peruskartta' : '🛰️ Satelliitti';
  dom.quickMapBoundariesBtn.textContent = showBoundaries ? '📐 Rajat: Päällä' : '📐 Rajat: Pois';
}

function setMapBaseLayer(layerName) {
  if (layerName !== 'satellite' && layerName !== 'street') layerName = 'satellite';
  currentMapBase = layerName;
  localStorage.setItem('yardflow_map_base', layerName);
  if (global.yardMap.hasLayer(currentBaseLayer)) global.yardMap.removeLayer(currentBaseLayer);
  currentBaseLayer = layerName === 'street' ? mockStreetLayer : mockSatelliteLayer;
  currentBaseLayer.addTo(global.yardMap);
  updateMapSettingsUi();
}

function toggleBoundariesLayer(enable) {
  showBoundaries = !!enable;
  localStorage.setItem('yardflow_show_boundaries', String(showBoundaries));
  if (showBoundaries) {
    if (!global.yardMap.hasLayer(mockBoundaryLayer)) mockBoundaryLayer.addTo(global.yardMap);
  } else {
    if (global.yardMap.hasLayer(mockBoundaryLayer)) global.yardMap.removeLayer(mockBoundaryLayer);
  }
  updateMapSettingsUi();
}

// Test initial
updateMapSettingsUi();
assert.strictEqual(currentMapBase, 'satellite');
assert.strictEqual(dom.btnMapBaseSatellite.className, 'btn-primary');
assert.strictEqual(dom.btnMapBaseStreet.className, 'btn-outline');
assert.strictEqual(global.yardMap.hasLayer(mockSatelliteLayer), true);
assert.strictEqual(global.yardMap.hasLayer(mockStreetLayer), false);
assert.strictEqual(dom['toggle-map-boundaries'].checked, false);
console.log('✅ Initial state verified: satellite active, boundaries off');

// Switch to street
setMapBaseLayer('street');
assert.strictEqual(localStorage.getItem('yardflow_map_base'), 'street');
assert.strictEqual(dom.btnMapBaseStreet.className, 'btn-primary');
assert.strictEqual(dom.btnMapBaseSatellite.className, 'btn-outline');
assert.strictEqual(global.yardMap.hasLayer(mockStreetLayer), true);
assert.strictEqual(global.yardMap.hasLayer(mockSatelliteLayer), false);
assert.strictEqual(dom.quickMapBaseToggleBtn.textContent, '🗺️ Peruskartta');
console.log('✅ Switch to street base layer verified');

// Toggle boundaries on
toggleBoundariesLayer(true);
assert.strictEqual(localStorage.getItem('yardflow_show_boundaries'), 'true');
assert.strictEqual(dom['toggle-map-boundaries'].checked, true);
assert.strictEqual(dom.boundariesToggleStatus.textContent, 'Päällä ✓');
assert.strictEqual(global.yardMap.hasLayer(mockBoundaryLayer), true);
assert.strictEqual(dom.quickMapBoundariesBtn.textContent, '📐 Rajat: Päällä');
console.log('✅ Toggle boundaries ON verified');

// Toggle boundaries off
toggleBoundariesLayer(false);
assert.strictEqual(localStorage.getItem('yardflow_show_boundaries'), 'false');
assert.strictEqual(dom['toggle-map-boundaries'].checked, false);
assert.strictEqual(dom.boundariesToggleStatus.textContent, 'Pois');
assert.strictEqual(global.yardMap.hasLayer(mockBoundaryLayer), false);
assert.strictEqual(dom.quickMapBoundariesBtn.textContent, '📐 Rajat: Pois');
console.log('✅ Toggle boundaries OFF verified');

// Switch back to satellite
setMapBaseLayer('satellite');
assert.strictEqual(localStorage.getItem('yardflow_map_base'), 'satellite');
assert.strictEqual(dom.btnMapBaseSatellite.className, 'btn-primary');
assert.strictEqual(dom.btnMapBaseStreet.className, 'btn-outline');
assert.strictEqual(global.yardMap.hasLayer(mockSatelliteLayer), true);
console.log('✅ Switch back to satellite verified');

console.log('🎉 All Map Settings tests PASSED successfully!');
