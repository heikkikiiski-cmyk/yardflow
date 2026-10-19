const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('🧪 Testing Clean Data, Geofencing Per Customer, OSRM Routing and Driver Layer Toggles...\n');

const htmlContent = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

// 1. Puhdistetut esimerkkidatat ja oletukset
console.log('--- 1. Testing Clean Data & Defaults ---');

assert(!htmlContent.includes('const DEFAULT_SAMPLE_TASKS ='), 'DEFAULT_SAMPLE_TASKS should be removed');
console.log('✅ DEFAULT_SAMPLE_TASKS is removed');

assert(!htmlContent.includes('const DEFAULT_DRIVERS = ['), 'DEFAULT_DRIVERS array should be removed');
console.log('✅ DEFAULT_DRIVERS array is removed');

// Tarkistetaan getStoredDrivers oletus tyhjäksi
assert(htmlContent.includes("localStorage.getItem('yardflow_drivers_v1')"), 'getStoredDrivers checks yardflow_drivers_v1');
assert(htmlContent.includes("return [];"), 'getStoredDrivers defaults to empty array');
console.log('✅ getStoredDrivers defaults to empty array');

// Tarkistetaan tunnettujen feikkien suodatus
assert(htmlContent.includes('KNOWN_SAMPLE_NAMES'), 'KNOWN_SAMPLE_NAMES filter exists');
assert(htmlContent.includes("tasks = tasks.filter(t => !KNOWN_SAMPLE_NAMES.includes(t.name))"), 'Filters out old sample tasks');
assert(htmlContent.includes("customers = customers.filter(c => !KNOWN_SAMPLE_NAMES.includes(c.name))"), 'Filters out old sample customers');
console.log('✅ Sample filtering exists for tasks and customers');

// 2. Kuljettajan dashboardin virtaviivaistaminen
console.log('\n--- 2. Testing Driver Dashboard Streamlining ---');

// Tarkistetaan CSS: kuljettajalta piilotetut widgetit
assert(htmlContent.includes('body.app-mode-field #dashboard-view #dash-widget-shortcuts'), 'Field mode hides shortcuts widget in CSS');
assert(htmlContent.includes('body.app-mode-field #dashboard-view #dash-widget-recent-logs'), 'Field mode hides recent logs widget in CSS');
assert(htmlContent.includes('body.app-mode-field #dashboard-view #dash-widget-route-stats'), 'Field mode hides route stats widget in CSS');
console.log('✅ CSS rules hide non-essential widgets in field mode');

// Tarkistetaan, että kuljettajalle jää tärkeimmät: progress bar ja seuraava kohde
assert(htmlContent.includes('id="dash-widget-progress"'), 'Progress widget exists');
assert(htmlContent.includes('id="dash-widget-next-stop"'), 'Next stop widget exists');
console.log('✅ Core driver widgets (progress and next stop) exist');

// 3. Geofencing-alueiden määritys asiakaskorttiin
console.log('\n--- 3. Testing Geofence Configuration Per Customer ---');

// Asiakaskortin määritysnappi
assert(htmlContent.includes('openGeofenceEditorForCustomer'), 'openGeofenceEditorForCustomer function is referenced');
assert(htmlContent.includes('Määritä / muokkaa geofence-aluetta'), 'Geofence button text exists in customer card');
console.log('✅ Customer card includes [📍 Määritä / muokkaa geofence-aluetta] button');

// Kohdistettu geofence-dialogi
assert(htmlContent.includes('id="customerGeofenceDialog"'), 'customerGeofenceDialog element exists');
assert(htmlContent.includes('id="customerGeofenceMap"'), 'customerGeofenceMap element exists');
assert(htmlContent.includes('id="gfCustEnabled"'), 'gfCustEnabled checkbox exists');
assert(htmlContent.includes('id="gfCustRadius"'), 'gfCustRadius slider exists');
assert(htmlContent.includes('saveCustomerGeofence()'), 'saveCustomerGeofence button action exists');
assert(htmlContent.includes('closeCustomerGeofenceDialog()'), 'closeCustomerGeofenceDialog button action exists');
console.log('✅ Dedicated #customerGeofenceDialog with Save & Cancel buttons exists');

// Varmistetaan että vanha yleiskartan geofence-asetuslaatikko on poistettu
assert(!htmlContent.includes('class="geofence-settings-box admin-only"'), 'Old generic geofence settings box in yardMapCard is removed');
console.log('✅ Old generic geofence box removed from yardMapCard');

// 4. Kuskin karttatasojen pikapiilotus
console.log('\n--- 4. Testing Driver Layer Toggles ---');

assert(htmlContent.includes('id="btn-toggle-geofence-layer"'), 'btn-toggle-geofence-layer exists');
assert(htmlContent.includes('id="btn-toggle-plow-areas"'), 'btn-toggle-plow-areas exists');
assert(htmlContent.includes('id="btn-toggle-geofence-quick"'), 'btn-toggle-geofence-quick exists');
assert(htmlContent.includes('id="btn-toggle-plow-areas-quick"'), 'btn-toggle-plow-areas-quick exists');
assert(htmlContent.includes('toggleDriverGeofenceLayer'), 'toggleDriverGeofenceLayer function exists');
assert(htmlContent.includes('toggleDriverPlowAreasLayer'), 'toggleDriverPlowAreasLayer function exists');
console.log('✅ Driver layer toggle buttons and handlers exist');

// 5. OSRM-reititys ja polttoainearvion poisto
console.log('\n--- 5. Testing OSRM Driving Routes & Fuel Removal ---');

// Polttoainearvion poisto
assert(!htmlContent.includes('id="dashRouteFuel"'), 'dashRouteFuel element removed');
assert(!htmlContent.includes('fuelPricePerLitre'), 'fuelPricePerLitre removed');
console.log('✅ Fuel estimate removed from UI and analytics');

// OSRM API -kutsu ja varareititys
assert(htmlContent.includes('https://router.project-osrm.org/route/v1/driving/'), 'OSRM public driving route API URL is configured');
assert(htmlContent.includes('fetchOsrmRoute'), 'fetchOsrmRoute function exists');
assert(htmlContent.includes('osrmRouteCache'), 'osrmRouteCache exists for caching route lines');
console.log('✅ OSRM driving route service with caching and fallback integrated');

console.log('\n🎉 All clean data, geofencing, OSRM routing and driver toggle tests passed successfully!');
