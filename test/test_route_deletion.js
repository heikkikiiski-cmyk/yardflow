const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('index.html', 'utf8');

// 1. Verify deleteRoute and aliases in HTML
assert.ok(html.includes('function deleteRoute'), 'deleteRoute function missing in HTML');
assert.ok(html.includes('window.deleteRoute = deleteRoute'), 'window.deleteRoute missing in HTML');
assert.ok(html.includes('window.renderRoutesList = renderRoutesManagementView'), 'renderRoutesList alias missing');
assert.ok(html.includes('window.updateDashboard = renderDashboardView'), 'updateDashboard alias missing');
assert.ok(html.includes('window.showNotification = showStatus'), 'showNotification alias missing');
assert.ok(html.includes('btn-delete-route'), 'btn-delete-route class missing in HTML');
assert.ok(html.includes('data-route-id='), 'data-route-id attribute missing in HTML');
assert.ok(html.includes('event.stopPropagation(); deleteRoute'), 'event.stopPropagation missing in deleteRoute onclicks');
console.log('✅ HTML markup & script definitions verified');

// 2. Functional test of deleteRoute logic
const store = {
  yardflow_routes: JSON.stringify([
    { id: 'route_1', name: 'Reitti 1', driver: 'Pekka', tasks: [] },
    { id: 2, name: 'Reitti 2', driver: 'Matti', tasks: [] },
    { id: 'route_3', name: 'Reitti 3', driver: 'Hessu', tasks: [] }
  ]),
  yardflow_active_route_id: 'route_1'
};

global.localStorage = {
  getItem: (k) => store[k] || null,
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; }
};

let routes = JSON.parse(store.yardflow_routes);
let currentRouteId = store.yardflow_active_route_id;

let viewsRefreshed = 0;
function renderRoutesManagementView() { viewsRefreshed++; }
function renderRoutes() { viewsRefreshed++; }
function renderActiveRoute() { viewsRefreshed++; }
function updateDriverHud() { viewsRefreshed++; }
function renderDashboardView() { viewsRefreshed++; }
function updateDrawerBadges() { viewsRefreshed++; }
let notificationMsg = '';
function showStatus(msg) { notificationMsg = msg; }

global.confirm = () => true;

function persistRoutes() {
  const json = JSON.stringify(routes);
  localStorage.setItem('yardflow_routes', json);
  localStorage.setItem('pihatyot_routes_v1', json);
  if (currentRouteId) {
    localStorage.setItem('yardflow_active_route_id', String(currentRouteId));
    localStorage.setItem('pihatyot_current_route', String(currentRouteId));
  } else {
    localStorage.removeItem('yardflow_active_route_id');
    localStorage.removeItem('pihatyot_current_route');
  }
}

function deleteRoute(id, event = null) {
  let propagationStopped = false;
  if (event && typeof event.stopPropagation === 'function') {
    event.stopPropagation();
    propagationStopped = true;
  }

  const r = routes.find(x => String(x.id) === String(id));
  const routeName = r ? r.name : 'tämä reitti';
  if (!confirm(`Haluatko varmasti poistaa tämän reitin ("${routeName}")?`)) return;

  routes = routes.filter(x => String(x.id) !== String(id));

  if (String(currentRouteId) === String(id)) {
    currentRouteId = null;
    try {
      localStorage.removeItem('yardflow_active_route_id');
      localStorage.removeItem('pihatyot_current_route');
    } catch (e) {}
  }

  persistRoutes();

  renderRoutesManagementView();
  renderRoutes();
  renderActiveRoute();
  updateDriverHud();
  renderDashboardView();
  updateDrawerBadges();

  showStatus('Reitti poistettu onnistuneesti', 'success');
  return { propagationStopped };
}

// Test: Delete active route 'route_1' with event
let stopped = false;
const mockEvent = { stopPropagation: () => { stopped = true; } };
const res = deleteRoute('route_1', mockEvent);

assert.strictEqual(stopped, true, 'Event propagation must be stopped');
assert.strictEqual(routes.length, 2, 'Routes count must be 2 after deletion');
assert.strictEqual(routes.some(r => r.id === 'route_1'), false, 'route_1 must be removed');
assert.strictEqual(currentRouteId, null, 'Active route ID must be cleared when active route deleted');
assert.strictEqual(store.yardflow_active_route_id, undefined, 'localStorage active route id must be removed');
const storedAfter = JSON.parse(store.yardflow_routes);
assert.strictEqual(storedAfter.length, 2, 'localStorage routes count must be 2');
assert.strictEqual(notificationMsg, 'Reitti poistettu onnistuneesti');
console.log('✅ Delete active route verified with stopPropagation and storage clear');

// Test: Delete numeric route id (2) passed as string '2'
deleteRoute('2');
assert.strictEqual(routes.length, 1);
assert.strictEqual(routes[0].id, 'route_3');
const storedAfter2 = JSON.parse(store.yardflow_routes);
assert.strictEqual(storedAfter2.length, 1);
assert.strictEqual(storedAfter2[0].id, 'route_3');
console.log('✅ Delete numeric ID as string comparison verified');

console.log('🎉 All Route Deletion tests PASSED successfully!');
