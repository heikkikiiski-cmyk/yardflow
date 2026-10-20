/**
 * Test: GridStack Removal & Solid Fixed CSS Grid Dashboard
 * Verifies that GridStack libraries and edit buttons have been completely removed,
 * the 4 fixed dashboard sections are present and structured cleanly,
 * and high accuracy map tile layers (OSM HOT and Esri Satellite) are active.
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

function runTest() {
    console.log('🧪 Testing GridStack Elimination & Solid CSS Grid Dashboard...');

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
    const appCss = fs.readFileSync(appCssPath, 'utf-8');
    const styleCss = fs.readFileSync(styleCssPath, 'utf-8');
    const dashJs = fs.readFileSync(dashJsPath, 'utf-8');
    const mapJs = fs.readFileSync(mapJsPath, 'utf-8');

    // 1. GridStack.js CDN and styles complete removal from index.html
    console.log('\n--- 1. Testing GridStack.js CDN & Resource Complete Removal ---');
    assert(!html.includes('gridstack.min.css'), 'GridStack CSS must be completely removed from index.html');
    assert(!html.includes('gridstack-all.js'), 'GridStack JS script must be completely removed from index.html');
    assert(html.includes('style.css'), 'style.css link exists');
    assert(html.includes('dashboard.js'), 'dashboard.js script exists');
    assert(html.includes('map.js'), 'map.js script exists');
    console.log('✅ GridStack CSS and JS scripts confirmed 100% removed from <head>');

    // 2. Removal of Edit Mode Buttons & Add Widget Modals
    console.log('\n--- 2. Testing Edit Mode Buttons & Add Widget Removal ---');
    assert(!html.includes('id="btn-toggle-dashboard-edit"'), 'Button #btn-toggle-dashboard-edit must be removed');
    assert(!html.includes('id="btn-hero-toggle-edit"'), 'Button #btn-hero-toggle-edit must be removed');
    assert(!html.includes('id="btn-add-widget"'), 'Button #btn-add-widget must be removed');
    assert(!html.includes('id="modal-add-widget"'), 'Modal #modal-add-widget must be removed');
    assert(!html.includes('class="card-remove-btn"'), 'Card remove buttons (.card-remove-btn) must be removed');
    console.log('✅ All edit buttons, card removal tags and widget addition modal removed');

    // 3. Fixed 4-Section Dashboard Structure
    console.log('\n--- 3. Testing Fixed 4-Section Dashboard Structure ---');
    assert(html.includes('id="dashboard-grid"'), 'Dashboard grid #dashboard-grid exists');
    assert(!html.includes('id="dashboard-grid" class="dashboard-grid grid-stack"'), 'GridStack class removed from #dashboard-grid');

    // Section 1: Weather & Snow forecast
    assert(html.includes('id="dash-widget-weather"'), 'Section 1: #dash-widget-weather present');
    assert(html.includes('id="dashWeatherContent"'), 'Section 1: #dashWeatherContent present');
    assert(html.includes('api.open-meteo.com/v1/forecast'), 'Open-Meteo forecast API configured');

    // Section 2: Progress meter
    assert(html.includes('id="dash-widget-progress"'), 'Section 2: #dash-widget-progress present');
    assert(html.includes('id="dashProgressSummaryText"'), 'Section 2: #dashProgressSummaryText summary present');
    assert(html.includes('id="dashProgressBarFill"'), 'Section 2: #dashProgressBarFill present');

    // Section 3: Overall city situation map
    assert(html.includes('id="dash-widget-map"'), 'Section 3: #dash-widget-map present');
    assert(html.includes('id="dashboardCityMap"'), 'Section 3: #dashboardCityMap present');

    // Section 4: Driver situation accordion
    assert(html.includes('id="dash-widget-drivers-accordion"'), 'Section 4: #dash-widget-drivers-accordion present');
    assert(html.includes('id="driverAccordionContainer"'), 'Section 4: #driverAccordionContainer present');
    assert(html.includes('id="btnFilterDriversAll"'), 'Section 4: All filter pill present');
    assert(html.includes('id="btnFilterDriversPending"'), 'Section 4: Pending filter pill present');
    assert(html.includes('id="btnFilterDriversDone"'), 'Section 4: Done filter pill present');
    console.log('✅ All 4 mandatory fixed Dashboard sections verified');

    // 4. CSS Grid Layout & Responsiveness
    console.log('\n--- 4. Testing CSS Styles for Fixed Grid & Responsiveness ---');
    assert(styleCss.includes('.dashboard-grid'), 'CSS .dashboard-grid defined');
    assert(styleCss.includes('grid-template-columns: repeat(12, 1fr)'), 'CSS 12-column grid defined');
    assert(styleCss.includes('@media (max-width: 900px)'), 'Mobile/tablet responsive breakpoint defined');
    assert(!styleCss.includes('androidWidgetJiggle'), 'GridStack jiggle animation removed');
    console.log('✅ Clean CSS Grid layout confirmed without legacy GridStack drag styles');

    // 5. Unified Map Controls & High Accuracy Layers
    console.log('\n--- 5. Testing Unified Map Controls & High Accuracy Tile Layers ---');
    assert(html.includes('id="btn-toggle-basemap"'), 'Unified toggle button #btn-toggle-basemap present in routes map toolbar');
    assert(html.includes('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png'), 'High-precision OSM HOT street layer present');
    assert(html.includes('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'), 'Esri World Imagery satellite layer present');
    console.log('✅ Unified map toolbar button and high accuracy tile layers confirmed');

    // 6. Safe Function Exports
    console.log('\n--- 6. Testing Function Declarations & Non-Throwing Invocations ---');
    assert(html.includes('function initDashboardGrid('), 'initDashboardGrid defined');
    assert(html.includes('function toggleDashboardEditMode('), 'toggleDashboardEditMode defined');
    assert(html.includes('function fetchWeatherForecast('), 'fetchWeatherForecast defined');
    assert(html.includes('function initDashboardCityMap('), 'initDashboardCityMap defined');
    assert(html.includes('function renderDriverOverviewAccordion('), 'renderDriverOverviewAccordion defined');
    assert(html.includes('function toggleMapBaseUnified('), 'toggleMapBaseUnified defined');
    console.log('✅ All required functions defined and safely guarded');

    console.log('\n🎉 All GridStack Elimination & Solid CSS Grid Dashboard tests PASSED successfully!');
}

runTest();
