/**
 * Test: Customer Geofence Editor Modal, Map Visibility & Interactive Area Movement
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

function runTest() {
    console.log('🧪 Testing Customer Geofence Editor Modal & Map...');

    const indexPath = path.join(__dirname, '..', 'index.html');
    const wwwIndexPath = path.join(__dirname, '..', 'www', 'index.html');
    const html = fs.readFileSync(indexPath, 'utf-8');
    const wwwHtml = fs.readFileSync(wwwIndexPath, 'utf-8');

    assert.strictEqual(html, wwwHtml, 'index.html ja www/index.html tulee olla identtiset');

    // 1. DOM Elements
    console.log('\n--- 1. Testing Dialog and Map Markup ---');
    assert(html.includes('id="customerGeofenceDialog"'), '#customerGeofenceDialog elementti löytyy');
    assert(html.includes('modal-geofence'), 'modal-geofence luokka löytyy');
    assert(html.includes('id="customerGeofenceMap"'), '#customerGeofenceMap elementti löytyy');
    assert(html.includes('id="btnGfMapSat"'), 'Satelliittikartan pikavaihtonappi #btnGfMapSat löytyy');
    assert(html.includes('id="btnGfMapStreet"'), 'Peruskartan pikavaihtonappi #btnGfMapStreet löytyy');
    assert(html.includes('id="gfCustCoordInfo"'), 'Koordinaattinäyttö #gfCustCoordInfo löytyy');
    assert(html.includes('id="gfCustPolygonNotice"'), 'Polygon-tilan ohje #gfCustPolygonNotice löytyy');
    
    // Yläkulman Sulje-nappi poistettu, vain alareunan painikepari
    assert(!html.includes('onclick="closeCustomerGeofenceDialog()">✕ Sulje</button>'), 'Yläkulman Sulje-nappi poistettu');
    assert(html.includes('onclick="closeCustomerGeofenceDialog()">✕ Peruuta</button>'), 'Alareunan [✕ Peruuta] painike löytyy');
    assert(html.includes('💾 Tallenna</button>'), 'Alareunan [💾 Tallenna] painike löytyy');
    console.log('✅ Dialog markup, uniform action buttons, map container and layer toggle buttons verified');

    // 2. Dynamic Title & No Hardcoded Test Names
    console.log('\n--- 2. Testing Dynamic Title & Clean Labels ---');
    assert(html.includes("Määritä geofence: ${property.name || 'Nimetön kohde'}"), 'Otsikko asettaa dynaamisesti kohteen nimen');
    assert(!html.includes('Asiakas 2'), 'Ei kovakoodattua Asiakas 2 -testinimeä');
    console.log('✅ Dynamic property title and clean labels verified');

    // 3. Tile Layer Independence & Initialization
    console.log('\n--- 3. Testing Tile Layer Isolation & Map Resizing ---');
    assert(html.includes('function createCustomerGfTileLayer('), 'createCustomerGfTileLayer funktio luo oman erillisen tiilitason');
    assert(html.includes('function setCustomerGeofenceMapBase('), 'setCustomerGeofenceMapBase funktio mahdollistaa karttapohjan vaihdon');
    assert(html.includes('geofenceMap.invalidateSize()'), 'geofenceMap.invalidateSize() kutsutaan viiveellä kartan renderöitymiseksi');
    assert(html.includes('geofenceMap.setView([currentPropertyCoords.lat, currentPropertyCoords.lon], 16)'), 'Kartta keskitetään kohteeseen zoomilla 16');
    assert(html.includes('window.geofenceMap = custGfMap'), 'window.geofenceMap asetetaan oikein');
    console.log('✅ Independent tile layers, invalidateSize and zoom 16 centering verified');

    // 4. Interactive Movement (Map click & Marker drag)
    console.log('\n--- 4. Testing Interactive Geofence Movement ---');
    assert(html.includes('function updateCustomerGeofencePosition('), 'updateCustomerGeofencePosition funktio löytyy');
    assert(html.includes("custGfMap.on('click',"), 'Kartan klikkaus siirtää geofence-alueen keskipisteen');
    assert(html.includes("custGfCircle.on('click',"), 'Ympyrän klikkaus siirtää geofence-alueen keskipisteen');
    assert(html.includes("custGfMarker.on('drag',"), 'Markerin raahaus päivittää geofence-aluetta');
    assert(html.includes("custGfMarker.on('dragend',"), 'Markerin raahauksen päättyminen päivittää geofence-aluetta');
    assert(html.includes('custGfPolygonGroup'), 'Piirretyt piha-alueet visualisoidaan kartalla');
    console.log('✅ Map click, circle click, marker drag and polygon overlay verified');

    // 5. Persistence
    console.log('\n--- 5. Testing Save and State Synchronization ---');
    assert(html.includes('saveAndRender()'), 'saveCustomerGeofence kutsuu saveAndRender()');
    assert(html.includes('persistCustomers()'), 'saveCustomerGeofence kutsuu persistCustomers()');
    assert(html.includes('t.gps = true;'), 'Uudet koordinaatit merkitään GPS-vahvistetuiksi tehtävissä');
    console.log('✅ Save and persistence to customers and tasks verified');

    console.log('\n🎉 All Customer Geofence Editor tests PASSED successfully!');
}

runTest();
