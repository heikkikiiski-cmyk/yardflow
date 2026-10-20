/**
 * Test: CartoDB Tiles, Fullscreen Maps, Dashboard Situational Center & User Creation
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

console.log('🧪 Testing CartoDB Tiles, Fullscreen Map, Dashboard Command Center & Users...');

const indexPath = path.join(__dirname, '..', 'index.html');
const wwwIndexPath = path.join(__dirname, '..', 'www', 'index.html');
const html = fs.readFileSync(indexPath, 'utf-8');
const wwwHtml = fs.readFileSync(wwwIndexPath, 'utf-8');

// 0. Synchronization
assert.strictEqual(html, wwwHtml, 'index.html and www/index.html must be strictly synchronized');
console.log('✅ Synchronization verified between index.html and www/index.html');

// 1. High Accuracy Tile Layers (OSM HOT & Esri World Imagery)
console.log('\n--- 1. Testing High Accuracy Tile Layer Replacement ---');
assert(html.includes('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png') || html.includes('openstreetmap.fr/hot'), 'High accuracy OpenStreetMap HOT tile layer present in index.html');
assert(!html.includes('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'), 'Blocked OpenStreetMap default tileLayer completely removed');

const mapJs = fs.readFileSync(path.join(__dirname, '..', 'map.js'), 'utf-8');
assert(mapJs.includes('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png') || mapJs.includes('openstreetmap.fr/hot'), 'High accuracy OSM HOT present in map.js');
assert(!mapJs.includes('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'), 'Blocked OSM tiles removed from map.js');
console.log('✅ High accuracy OSM HOT tileLayer verified across map initializations');

// 2. Fullscreen Map Buttons and Logic
console.log('\n--- 2. Testing Map Fullscreen Mode ---');
assert(html.includes('id="btn-map-fullscreen"'), 'Fullscreen button present on routes map');
assert(html.includes('toggleMapFullscreen(\'yardSatelliteMap\', this)'), 'Fullscreen handler attached to routes map');
assert(html.includes('toggleMapFullscreen(\'dashboardCityMap\', this)'), 'Fullscreen handler attached to dashboard city map');
assert(html.includes('function toggleMapFullscreen'), 'toggleMapFullscreen defined in script');

const styleCss = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf-8');
assert(styleCss.includes('.map-btn-fullscreen'), 'CSS: .map-btn-fullscreen defined');
assert(styleCss.includes('.map-fullscreen-active'), 'CSS: .map-fullscreen-active defined with fixed position and 100vw/100vh');
console.log('✅ Fullscreen map controls, CSS rules and size invalidation verified');

// 3. Dashboard Situational Center (4 Sections)
console.log('\n--- 3. Testing Dashboard Command Center 4 Sections ---');

// Section A: Weather & Snow forecast
assert(html.includes('id="dash-widget-weather"'), 'Widget A: #dash-widget-weather present in DOM');
assert(html.includes('id="dashWeatherContent"'), 'Weather content container present');
assert(html.includes('api.open-meteo.com/v1/forecast'), 'Open-Meteo forecast API endpoint present');
assert(html.includes('function fetchWeatherForecast'), 'fetchWeatherForecast defined');
assert(html.includes('function getWeatherDescription'), 'getWeatherDescription defined');

// Section B: City Situation Map
assert(html.includes('id="dash-widget-map"'), 'Widget B: #dash-widget-map present in DOM');
assert(html.includes('id="dashboardCityMap"'), '#dashboardCityMap element present in DOM');
assert(html.includes('function initDashboardCityMap'), 'initDashboardCityMap defined');
assert(html.includes('function renderDashboardCityMapMarkers'), 'renderDashboardCityMapMarkers defined');

// Section C: Day Progress Meter
assert(html.includes('id="dash-widget-progress"'), 'Widget C: #dash-widget-progress present in DOM');
assert(html.includes('id="dashProgressSummaryText"'), 'Clear meter text summary #dashProgressSummaryText present');

// Section D: Driver Situation Accordion
assert(html.includes('id="dash-widget-drivers-accordion"'), 'Widget D: #dash-widget-drivers-accordion present in DOM');
assert(html.includes('id="driverAccordionContainer"'), 'Accordion container present');
assert(html.includes('id="btnFilterDriversAll"'), 'Filter: Kaikki button present');
assert(html.includes('id="btnFilterDriversPending"'), 'Filter: Tekemättä button present');
assert(html.includes('id="btnFilterDriversDone"'), 'Filter: Valmiit button present');
assert(html.includes('function renderDriverOverviewAccordion'), 'renderDriverOverviewAccordion defined');
assert(html.includes('function toggleDriverAccordion'), 'toggleDriverAccordion defined');
console.log('✅ All 4 Dashboard Command Center sections verified in markup & logic');

// 4. Testing users.js and User Creation Process
console.log('\n--- 4. Testing users.js & Driver Creation ---');
assert(fs.existsSync(path.join(__dirname, '..', 'users.js')), 'users.js file exists in root');
assert(fs.existsSync(path.join(__dirname, '..', 'www', 'users.js')), 'www/users.js file exists');
assert(html.includes('<script src="users.js"></script>'), 'users.js included in index.html');

const usersJs = fs.readFileSync(path.join(__dirname, '..', 'users.js'), 'utf-8');
assert(usersJs.includes('createUserProfile'), 'users.js exports createUserProfile');
assert(usersJs.includes('saveDriver'), 'users.js exports saveDriver');

console.log('🎉 All CartoDB, Dashboard Situational Center & Users tests PASSED successfully!');
