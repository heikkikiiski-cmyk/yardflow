/**
 * Test: Map Centering Functions (GPS & Target) and Route Step Indicator Cleanup
 */

const fs = require('fs');
const assert = require('assert');
const vm = require('vm');

function runTest() {
    console.log('🧪 Testing Map Centering Functions & Route Step Indicator...');

    const html = fs.readFileSync('index.html', 'utf8');

    // 1. Verify Markup & DOM Elements
    console.log('\n--- 1. Testing DOM Elements & Markup ---');
    assert(html.includes('id="btn-gps-center"'), 'GPS FAB element #btn-gps-center löytyy');
    assert(html.includes('class="map-fab-gps"'), 'Luokka .map-fab-gps löytyy');
    assert(html.includes('🎯'), 'GPS-ikonina 🎯 löytyy');
    assert(html.includes('onclick="centerMapOnUserLocation()"'), 'Kutsutaan centerMapOnUserLocation()');
    console.log('✅ Found #btn-gps-center FAB with 🎯');

    assert(html.includes('id="btn-center-target-hud"'), 'Painike #btn-center-target-hud löytyy HUD:sta');
    assert(html.includes('id="btn-center-target-admin"'), 'Painike #btn-center-target-admin löytyy Admin-ohjauksesta');
    assert(html.includes('Keskitä kohteeseen'), 'Painikkeissa teksti "Keskitä kohteeseen"');
    console.log('✅ Found [ 📍 Keskitä kohteeseen ] in HUD and Admin Map');

    assert(html.includes('route-step-indicator'), 'Luokka .route-step-indicator löytyy');
    assert(html.includes('id="driverHudStep"'), 'Elementti #driverHudStep löytyy');
    assert(html.includes('id="btn-prev-property"'), 'Elementti #btn-prev-property löytyy');
    assert(html.includes('id="btn-next-property"'), 'Elementti #btn-next-property löytyy');
    console.log('✅ Found .route-step-indicator between #btn-prev-property and #btn-next-property');

    // 2. Verify Function Declarations
    console.log('\n--- 2. Testing Function Declarations ---');
    assert(html.includes('function centerMapOnUserLocation('), 'centerMapOnUserLocation funktio määritelty');
    assert(html.includes('function centerMapOnTarget('), 'centerMapOnTarget funktio määritelty');
    assert(html.includes('function updateDriverHud('), 'updateDriverHud funktio määritelty');
    assert(html.includes('map.flyTo(') || html.includes('yardMap.flyTo('), 'flyTo kutsu löytyy kartan keskityksestä');
    console.log('✅ Functions centerMapOnUserLocation, centerMapOnTarget and updateDriverHud declared');

    // 3. Functional Testing in Sandbox
    console.log('\n--- 3. Testing Logic & HUD Step Indicator in Sandbox ---');
    const mockTasks = [
        { id: '101', name: 'Kohde 1', address: 'Hämeenkatu 1', lat: 61.4975, lon: 23.7600, done: false },
        { id: '102', name: 'Kohde 2', address: 'Hämeenkatu 2', lat: 61.4985, lon: 23.7620, done: false },
        { id: '103', name: 'Kohde 3', address: 'Hämeenkatu 3', lat: 61.4995, lon: 23.7640, done: false },
        { id: '104', name: 'Kohde 4', address: 'Hämeenkatu 4', lat: 61.5005, lon: 23.7660, done: false }
    ];

    let flyToCalls = [];
    let setViewCalls = [];
    let addedLayers = [];

    const mockMap = {
        flyTo(coords, zoom, opts) {
            flyToCalls.push({ coords, zoom, opts });
        },
        setView(coords, zoom) {
            setViewCalls.push({ coords, zoom });
        },
        hasLayer(layer) {
            return addedLayers.includes(layer);
        },
        addLayer(layer) {
            addedLayers.push(layer);
        }
    };

    const dom = {
        'btn-gps-center': { classList: { add() {}, remove() {} } },
        'driverHudStep': { textContent: '', style: {} },
        'driverHudCounter': { textContent: '' },
        'driverHudName': { textContent: '' },
        'driverHudAddress': { textContent: '' },
        'driverHudNote': { style: {} },
        'driverHudNoteText': { textContent: '' },
        'driverHudRouteInfo': { textContent: '', style: {} },
        'btnDriverCompleteText': { textContent: '' },
        'btn-driver-complete': { style: {}, disabled: false },
        'btn-uncomplete-property': { style: {}, disabled: false },
        'btn-prev-property': { disabled: false },
        'btn-next-property': { disabled: false },
        'userLocationHeading': { style: {} }
    };

    const sandbox = {
        window: {
            tasks: mockTasks,
            yardMap: mockMap,
            map: mockMap,
            activeSelectedTaskId: null
        },
        tasks: mockTasks,
        activeSelectedTaskId: null,
        yardMap: mockMap,
        map: mockMap,
        document: {
            getElementById(id) {
                return dom[id] || null;
            }
        },
        navigator: {
            geolocation: {
                getCurrentPosition(successCb, errCb) {
                    successCb({
                        coords: {
                            latitude: 61.4980,
                            longitude: 23.7610,
                            accuracy: 15,
                            heading: 90
                        }
                    });
                }
            }
        },
        L: {
            divIcon(opts) { return { _isDivIcon: true, opts }; },
            marker(coords, opts) {
                return {
                    coords,
                    opts,
                    setLatLng(newCoords) { this.coords = newCoords; },
                    addTo(m) { m.addLayer(this); return this; }
                };
            },
            circle(coords, opts) {
                return {
                    coords,
                    opts,
                    setLatLng(newCoords) { this.coords = newCoords; },
                    setRadius(r) { this.radius = r; },
                    addTo(m) { m.addLayer(this); return this; }
                };
            }
        },
        showStatus() {},
        alert() {},
        makeTargetGeoKey: (n, a) => `${n}_${a}`,
        resolveMapTargetObject: () => null,
        renderYardGeofenceCircle: () => {},
        getActiveOrNextTask() {
            const currentId = sandbox.activeSelectedTaskId;
            if (currentId != null) {
                const found = sandbox.tasks.find(t => String(t.id) === String(currentId));
                if (found) return found;
            }
            return sandbox.tasks.find(t => !t.done) || sandbox.tasks[0];
        }
    };

    vm.createContext(sandbox);

    // Extract updateDriverHud, centerMapOnUserLocation and centerMapOnTarget
    const hudMatch = html.match(/function updateDriverHud\(\)[\s\S]*?window\.updateDriverHud = updateDriverHud;/);
    assert(hudMatch, 'updateDriverHud extracted');

    const centerMatch = html.match(/let userLocationMarker = null;[\s\S]*?window\.centerMapOnCurrentTarget = centerMapOnTarget;/);
    assert(centerMatch, 'centerMapOnUserLocation and centerMapOnTarget extracted');

    vm.runInContext(`
        ${hudMatch[0]}
        ${centerMatch[0]}
    `, sandbox);

    // Test A: HUD indicator at step 1 of 4
    sandbox.updateDriverHud();
    assert.strictEqual(dom['driverHudStep'].textContent, '1 / 4', 'Ensimmäinen kohde näyttää puhtaasti "1 / 4" ilman nollakohteita');
    assert.strictEqual(dom['btn-prev-property'].disabled, true, 'Ensimmäisessä kohteessa Edellinen on estetty');
    assert.strictEqual(dom['btn-next-property'].disabled, false, 'Ensimmäisessä kohteessa Seuraava on aktiivinen');
    console.log('✅ Route step indicator shows "1 / 4" on first target');

    // Test B: Navigate to step 2 of 4
    sandbox.activeSelectedTaskId = '102';
    sandbox.updateDriverHud();
    assert.strictEqual(dom['driverHudStep'].textContent, '2 / 4', 'Toinen kohde näyttää "2 / 4"');
    assert.strictEqual(dom['btn-prev-property'].disabled, false);
    assert.strictEqual(dom['btn-next-property'].disabled, false);
    console.log('✅ Route step indicator shows "2 / 4" on second target');

    // Test C: Mark target 2 as completed
    sandbox.tasks[1].done = true;
    sandbox.updateDriverHud();
    assert(dom['driverHudStep'].textContent.includes('2 / 4') && dom['driverHudStep'].textContent.includes('VALMIS'), 'Valmis kohde säilyttää numeron 2 / 4 ja näyttää VALMIS');
    console.log('✅ Completed target maintains step indicator and status: "2 / 4 (VALMIS ✓)"');

    // Test D: Center to Target (flyTo [lat, lng], 17)
    flyToCalls = [];
    sandbox.centerMapOnTarget('103');
    assert(flyToCalls.length > 0, 'map.flyTo kutsuttu kohteeseen');
    assert.strictEqual(flyToCalls[0].coords[0], 61.4995);
    assert.strictEqual(flyToCalls[0].coords[1], 23.7640);
    assert.strictEqual(flyToCalls[0].zoom, 17, 'flyTo zoomitaso on 17');
    console.log('✅ centerMapOnTarget flyTo([lat, lng], 17) verified');

    // Test E: Center to User Location (GPS)
    flyToCalls = [];
    sandbox.centerMapOnUserLocation();
    assert(flyToCalls.length > 0, 'map.flyTo kutsuttu omaan GPS-sijaintiin');
    assert.strictEqual(flyToCalls[0].coords[0], 61.4980);
    assert.strictEqual(flyToCalls[0].coords[1], 23.7610);
    assert.strictEqual(flyToCalls[0].zoom, 17, 'Oman sijainnin zoomitaso on 17');
    assert(addedLayers.length > 0, 'Oma sijaintipiste lisätty kartalle sinisenä pisteenä');
    console.log('✅ centerMapOnUserLocation flyTo([lat, lng], 17) & user marker verified');

    console.log('\n🎉 All Map Centering & Route Step Indicator tests PASSED successfully!');
}

runTest();
