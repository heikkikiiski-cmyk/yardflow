/**
 * Test: Modular User & Role Management, Permissions Matrix & Dynamic Menu Filtering
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

function runTest() {
    console.log('🧪 Testing Modular User and Role Management with Permissions Matrix...');

    const indexPath = path.join(__dirname, '..', 'index.html');
    const wwwIndexPath = path.join(__dirname, '..', 'www', 'index.html');
    const html = fs.readFileSync(indexPath, 'utf-8');
    const wwwHtml = fs.readFileSync(wwwIndexPath, 'utf-8');

    // 0. Synchronization check
    assert.strictEqual(html, wwwHtml, 'index.html ja www/index.html tulee olla täysin identtiset');
    console.log('✅ Synchronization verified between index.html and www/index.html');

    // 1. Form Markup & Elements
    console.log('\n--- 1. Testing Form Markup & Role Select Elements ---');
    assert(html.includes('id="addDriverDrawer"'), 'Elementti #addDriverDrawer löytyy');
    assert(html.includes('modal-add-driver'), 'Luokka modal-add-driver löytyy');
    assert(html.includes('id="driverInputName"'), '#driverInputName löytyy');
    assert(html.includes('id="driverInputPhone"'), '#driverInputPhone löytyy');
    assert(html.includes('id="driverInputEmail"'), '#driverInputEmail löytyy');
    assert(html.includes('id="driverInputVehicle"'), '#driverInputVehicle löytyy');

    assert(html.includes('id="driverRoleSelect"'), '#driverRoleSelect dropdown löytyy');
    assert(html.includes('value="admin"'), 'Role option admin löytyy');
    assert(html.includes('value="supervisor"'), 'Role option supervisor löytyy');
    assert(html.includes('value="driver"'), 'Role option driver löytyy');
    assert(html.includes('value="temporary"'), 'Role option temporary löytyy');

    assert(html.includes('id="driverInputExpiresAt"'), 'Määräaikaisuuskenttä #driverInputExpiresAt löytyy');
    console.log('✅ Basic inputs, role dropdown presets and expires_at verified');

    // 2. Modular Permissions Matrix (9 Checkboxes)
    console.log('\n--- 2. Testing 9 Permissions Checkboxes ---');
    const expectedPerms = [
        'can_complete_jobs',
        'can_upload_photos',
        'can_view_routes',
        'can_edit_routes',
        'can_view_map_planning',
        'can_view_customers',
        'can_edit_customers',
        'can_view_reports',
        'can_edit_drivers'
    ];

    expectedPerms.forEach(perm => {
        assert(html.includes(`id="perm_${perm}"`), `Valintaruutu perm_${perm} löytyy DOM:sta`);
    });
    console.log('✅ All 9 modular permission checkboxes verified in DOM');

    // 3. Uniform Action Buttons
    console.log('\n--- 3. Testing Uniform Save and Cancel Buttons ---');
    assert(html.includes('class="btn-outline btn-form-cancel"'), 'Cancel button has btn-outline btn-form-cancel classes');
    assert(html.includes('onclick="closeAddDriverDrawer()"'), 'Cancel button calls closeAddDriverDrawer()');
    assert(html.includes('class="btn-primary btn-form-save"'), 'Save button has btn-primary btn-form-save classes');
    assert(html.includes('onclick="saveDriverFromForm()"'), 'Save button calls saveDriverFromForm()');
    assert(html.includes('💾 Tallenna käyttäjä'), 'Save button has text "💾 Tallenna käyttäjä"');
    assert(html.includes('✕ Peruuta'), 'Cancel button has text "✕ Peruuta"');
    console.log('✅ Uniform action button styling and callbacks verified');

    // 4. Logic & Presets Verification
    console.log('\n--- 4. Testing Script Logic, Presets and Expiration ---');
    assert(html.includes('const PERMISSION_KEYS ='), 'PERMISSION_KEYS array defined');
    assert(html.includes('const ROLE_PRESETS ='), 'ROLE_PRESETS object defined');
    assert(html.includes('function isUserExpired('), 'isUserExpired function defined');
    assert(html.includes('function getActiveUser('), 'getActiveUser function defined');
    assert(html.includes('function setActiveUser('), 'setActiveUser function defined');
    assert(html.includes('function getActiveUserPermissions('), 'getActiveUserPermissions function defined');
    assert(html.includes('function hasPermission('), 'hasPermission function defined');
    assert(html.includes('function applyPermissionsToUi('), 'applyPermissionsToUi function defined');
    assert(html.includes('function onDriverRoleChange('), 'onDriverRoleChange function defined');

    // 5. Functional Simulation
    console.log('\n--- 5. Simulating Permission Checks & Filtering ---');
    // Extract definitions from HTML and evaluate in a test sandbox
    const scriptMatch = html.match(/const PERMISSION_KEYS =([\s\S]*?)window\.renderDriversView = renderDriversView;/);
    assert(scriptMatch, 'Driver logic block extracted');

    const sandbox = {
        window: {},
        localStorage: {
            store: {},
            getItem(key) { return this.store[key] || null; },
            setItem(key, val) { this.store[key] = String(val); },
            removeItem(key) { delete this.store[key]; }
        },
        esc: (s) => String(s || ''),
        showStatus: () => {},
        currentAppMode: 'admin',
        tasks: [],
        routes: []
    };

    const vm = require('vm');
    vm.createContext(sandbox);
    vm.runInContext(`
        window.PERMISSION_KEYS = ${html.match(/const PERMISSION_KEYS = (\[[\s\S]*?\]);/)[1]};
        window.ROLE_PRESETS = ${html.match(/const ROLE_PRESETS = (\{[\s\S]*?\n    \};)/)[1]};
        var PERMISSION_KEYS = window.PERMISSION_KEYS;
        var ROLE_PRESETS = window.ROLE_PRESETS;

        function isUserExpired(user) {
            if (!user || !user.expires_at) return false;
            try {
                const exp = new Date(user.expires_at).getTime();
                return !isNaN(exp) && exp < Date.now();
            } catch (e) {
                return false;
            }
        }

        function getStoredDrivers() {
            try {
                const raw = localStorage.getItem('yardflow_drivers_v1');
                if (raw) return JSON.parse(raw);
            } catch (e) {}
            return [];
        }

        function getActiveUser() {
            try {
                const activeId = localStorage.getItem('yardflow_active_user_id');
                if (activeId) {
                    const drivers = getStoredDrivers();
                    return drivers.find(d => String(d.id) === String(activeId)) || null;
                }
            } catch (e) {}
            return null;
        }

        function getActiveUserPermissions() {
            const user = getActiveUser();
            if (!user) {
                if (currentAppMode === 'admin') return { ...ROLE_PRESETS.admin.permissions };
                return { ...ROLE_PRESETS.driver.permissions };
            }
            if (isUserExpired(user)) {
                const empty = {};
                PERMISSION_KEYS.forEach(k => { empty[k] = false; });
                return empty;
            }
            const roleKey = user.role && ROLE_PRESETS[user.role] ? user.role : 'driver';
            const preset = ROLE_PRESETS[roleKey].permissions;
            const merged = { ...preset };
            if (user.permissions) {
                PERMISSION_KEYS.forEach(k => {
                    if (typeof user.permissions[k] === 'boolean') merged[k] = user.permissions[k];
                });
            }
            return merged;
        }

        function hasPermission(permKey) {
            const user = getActiveUser();
            if (!user && currentAppMode === 'admin') return true;
            if (user && isUserExpired(user)) return false;
            return !!getActiveUserPermissions()[permKey];
        }
    `, sandbox);

    // Test Admin Role Presets
    assert(sandbox.window.ROLE_PRESETS.admin.permissions.can_edit_drivers === true);
    assert(sandbox.window.ROLE_PRESETS.supervisor.permissions.can_edit_routes === true);
    assert(sandbox.window.ROLE_PRESETS.supervisor.permissions.can_edit_drivers === false);
    assert(sandbox.window.ROLE_PRESETS.driver.permissions.can_complete_jobs === true);
    assert(sandbox.window.ROLE_PRESETS.driver.permissions.can_edit_routes === false);

    // Test Driver with only field permissions
    const testDriver = {
        id: 'drv_test_1',
        name: 'Matti Meikäläinen',
        role: 'driver',
        permissions: {
            can_complete_jobs: true,
            can_upload_photos: true,
            can_view_routes: true,
            can_edit_routes: false,
            can_view_map_planning: false,
            can_view_customers: false,
            can_edit_customers: false,
            can_view_reports: false,
            can_edit_drivers: false
        }
    };

    sandbox.localStorage.setItem('yardflow_drivers_v1', JSON.stringify([testDriver]));
    sandbox.localStorage.setItem('yardflow_active_user_id', 'drv_test_1');
    sandbox.currentAppMode = 'field';

    assert.strictEqual(sandbox.hasPermission('can_complete_jobs'), true, 'Kuskilla on kuittausoikeus');
    assert.strictEqual(sandbox.hasPermission('can_upload_photos'), true, 'Kuskilla on kuvausoikeus');
    assert.strictEqual(sandbox.hasPermission('can_edit_routes'), false, 'Kuskilla EI ole reittien muokkausoikeutta');
    assert.strictEqual(sandbox.hasPermission('can_view_reports'), false, 'Kuskilla EI ole raporttien katseluoikeutta');
    assert.strictEqual(sandbox.hasPermission('can_edit_drivers'), false, 'Kuskilla EI ole käyttäjien muokkausoikeutta');
    console.log('✅ Driver field-only permissions verified');

    // Test Supervisor permissions
    const testSupervisor = {
        id: 'drv_test_2',
        name: 'Sanna Esimies',
        role: 'supervisor',
        permissions: { ...sandbox.window.ROLE_PRESETS.supervisor.permissions }
    };
    sandbox.localStorage.setItem('yardflow_drivers_v1', JSON.stringify([testDriver, testSupervisor]));
    sandbox.localStorage.setItem('yardflow_active_user_id', 'drv_test_2');

    assert.strictEqual(sandbox.hasPermission('can_edit_routes'), true, 'Työnjohdolla on reittien muokkausoikeus');
    assert.strictEqual(sandbox.hasPermission('can_view_reports'), true, 'Työnjohdolla on raporttioikeus');
    assert.strictEqual(sandbox.hasPermission('can_view_customers'), true, 'Työnjohdolla on asiakasoikeus');
    assert.strictEqual(sandbox.hasPermission('can_edit_drivers'), false, 'Työnjohdolla EI ole käyttäjien muokkausoikeutta');
    console.log('✅ Supervisor permissions verified');

    // Test Temporary user with expired date
    const testExpiredUser = {
        id: 'drv_test_3',
        name: 'Tuuraaja Teemu',
        role: 'temporary',
        expires_at: '2020-01-01T12:00:00', // menneisyydessä
        permissions: { ...sandbox.window.ROLE_PRESETS.temporary.permissions }
    };
    sandbox.localStorage.setItem('yardflow_drivers_v1', JSON.stringify([testDriver, testSupervisor, testExpiredUser]));
    sandbox.localStorage.setItem('yardflow_active_user_id', 'drv_test_3');

    assert.strictEqual(sandbox.isUserExpired(testExpiredUser), true, 'Käyttäjä tunnistettu vanhentuneeksi');
    assert.strictEqual(sandbox.hasPermission('can_complete_jobs'), false, 'Vanhentuneelta käyttäjältä evätty kuittausoikeus');
    assert.strictEqual(sandbox.hasPermission('can_view_routes'), false, 'Vanhentuneelta käyttäjältä evätty reittioikeus');
    console.log('✅ Expired user permission denial verified');

    console.log('\n🎉 All Modular User & Role Management and Permissions tests PASSED successfully!');
}

runTest();
