/**
 * Test: Drawer Role-based Visibility, Supervisor Clean Labels & Admin Creation/Deletion Restrictions
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

function runTest() {
    console.log('🧪 Testing Drawer Role-based Visibility & Supervisor Restrictions...');

    const indexPath = path.join(__dirname, '..', 'index.html');
    const wwwIndexPath = path.join(__dirname, '..', 'www', 'index.html');
    const html = fs.readFileSync(indexPath, 'utf-8');
    const wwwHtml = fs.readFileSync(wwwIndexPath, 'utf-8');

    // 0. Synchronization check
    assert.strictEqual(html, wwwHtml, 'index.html ja www/index.html tulee olla täysin identtiset');
    console.log('✅ Synchronization verified between index.html and www/index.html');

    // 1. Markup Checks
    console.log('\n--- 1. Testing Drawer & Dialog Markup Elements ---');
    assert(html.includes('id="drawerModeSection"'), 'Elementti #drawerModeSection löytyy');
    assert(html.includes('id="drawerBtnModeAdminLabel"'), 'Elementti #drawerBtnModeAdminLabel löytyy');
    assert(html.includes('id="drawerDividerAdmin"'), 'Elementti #drawerDividerAdmin löytyy');
    assert(html.includes('id="btnSettingsModeAdminLabel"'), 'Elementti #btnSettingsModeAdminLabel löytyy');
    assert(html.includes('id="driversViewSubtitle"'), 'Elementti #driversViewSubtitle löytyy');
    assert(html.includes('id="permMatrixHelpText"'), 'Elementti #permMatrixHelpText löytyy');
    assert(html.includes('function getUserRole('), 'Funktio getUserRole löytyy');
    console.log('✅ Drawer and dynamic text container elements verified');

    // 2. Functional Simulation in VM Sandbox
    console.log('\n--- 2. Simulating Driver (Field) Role in Drawer ---');
    const elements = {};
    function getEl(id) {
        if (!elements[id]) {
            elements[id] = {
                id,
                value: '',
                textContent: '',
                style: {
                    display: '',
                    setProperty(prop, val) { this[prop] = val; }
                },
                classList: {
                    toggle() {},
                    add() {},
                    remove() {}
                },
                disabled: false,
                querySelector(sel) {
                    if (sel.includes('admin')) {
                        return { style: {}, disabled: false };
                    }
                    return null;
                }
            };
        }
        return elements[id];
    }

    const localStore = {};
    let lastStatus = null;
    let lastStatusType = null;

    const sandbox = {
        window: {},
        document: {
            getElementById: getEl,
            querySelector(sel) { return getEl(sel); },
            createElement: () => ({ style: {}, setAttribute() {} }),
            body: { appendChild() {} }
        },
        localStorage: {
            getItem(key) { return localStore[key] || null; },
            setItem(key, val) { localStore[key] = String(val); },
            removeItem(key) { delete localStore[key]; }
        },
        showStatus(msg, type) {
            lastStatus = msg;
            lastStatusType = type;
        },
        esc: s => String(s || ''),
        PERMISSION_KEYS: [
            'can_complete_jobs',
            'can_upload_photos',
            'can_view_routes',
            'can_edit_routes',
            'can_view_map_planning',
            'can_view_customers',
            'can_edit_customers',
            'can_view_reports',
            'can_edit_drivers'
        ],
        PERMISSION_LABELS: {},
        ROLE_PRESETS: {
            admin: {
                name: 'Admin',
                badge: '👑 Admin',
                permissions: { can_complete_jobs: true, can_edit_routes: true, can_view_customers: true, can_edit_customers: true, can_view_reports: true, can_edit_drivers: true }
            },
            supervisor: {
                name: 'Työnjohto',
                badge: '👔 Työnjohto',
                permissions: { can_complete_jobs: true, can_edit_routes: true, can_view_customers: true, can_edit_customers: true, can_view_reports: true, can_edit_drivers: false }
            },
            driver: {
                name: 'Kuljettaja',
                badge: '🚜 Kuljettaja',
                permissions: { can_complete_jobs: true, can_upload_photos: true, can_view_routes: true, can_edit_routes: false, can_view_customers: false, can_view_reports: false, can_edit_drivers: false }
            },
            temporary: {
                name: 'Tuuraaja',
                badge: '⏱️ Tuuraaja',
                permissions: { can_complete_jobs: true, can_upload_photos: true, can_view_routes: true, can_edit_routes: false, can_view_customers: false, can_view_reports: false, can_edit_drivers: false }
            }
        },
        currentAppMode: 'field',
        tasks: [],
        routes: []
    };

    vm.createContext(sandbox);

    // Extract relevant functions from HTML
    const fnCode = html.match(/function getStoredDrivers[\s\S]*?window\.renderDriversView = renderDriversView;/);
    assert(fnCode, 'Drivers and permissions functions extracted from HTML');

    vm.runInContext(`
        ${fnCode[0]}
    `, sandbox);

    // Setup driver user
    const driverUser = {
        id: 'drv_10',
        name: 'Kalle Kuljettaja',
        role: 'driver',
        permissions: { ...sandbox.ROLE_PRESETS.driver.permissions }
    };
    localStore['yardflow_drivers_v1'] = JSON.stringify([driverUser]);
    localStore['yardflow_active_user_id'] = 'drv_10';
    sandbox.currentAppMode = 'field';

    sandbox.applyPermissionsToUi();

    assert.strictEqual(getEl('drawerModeSection').style.display, 'none', 'Kuskilla käyttäjäroolin valitsin on piilotettu');
    assert.strictEqual(getEl('navHomeLabel').textContent, 'Koti (Ajojono / Työpäivä)', 'Kuskilla Koti-valikon teksti on Koti (Ajojono / Työpäivä)');
    assert.strictEqual(getEl('navMapLabel').textContent, 'Kartta', 'Kuskilla Kartta-valikon teksti on Kartta');
    assert.strictEqual(getEl('nav-home').style.display, 'flex', 'Kuskille Koti näkyy');
    assert.strictEqual(getEl('nav-map').style.display, 'flex', 'Kuskille Kartta näkyy');
    assert.strictEqual(getEl('btn-logout').style.display, 'flex', 'Kuskille Kirjaudu ulos näkyy');

    // Verify all supervisor/admin views are strictly hidden for driver
    assert.strictEqual(getEl('nav-routes-mgmt').style.display, 'none', 'Reitit piilotettu kuskilta');
    assert.strictEqual(getEl('nav-drivers').style.display, 'none', 'Kuljettajat piilotettu kuskilta');
    assert.strictEqual(getEl('nav-customers').style.display, 'none', 'Asiakkaat piilotettu kuskilta');
    assert.strictEqual(getEl('nav-history').style.display, 'none', 'Raportit piilotettu kuskilta');
    assert.strictEqual(getEl('nav-billing').style.display, 'none', 'Laskutus piilotettu kuskilta');
    assert.strictEqual(getEl('nav-settings').style.display, 'none', 'Asetukset piilotettu kuskilta');
    assert.strictEqual(getEl('drawerDividerAdmin').style.display, 'none', 'Divider piilotettu kuskilta');
    console.log('✅ Driver sees ONLY Koti, Kartta and Logout in drawer');

    // 3. Supervisor Simulation
    console.log('\n--- 3. Simulating Supervisor Role & "Admin" Label Removal ---');
    const supervisorUser = {
        id: 'drv_20',
        name: 'Saara Työnjohtaja',
        phone: '040 555 2222',
        role: 'supervisor',
        permissions: { ...sandbox.ROLE_PRESETS.supervisor.permissions }
    };
    const adminUser = {
        id: 'drv_99',
        name: 'Pekka Pääkäyttäjä',
        phone: '040 555 9999',
        role: 'admin',
        permissions: { ...sandbox.ROLE_PRESETS.admin.permissions }
    };
    localStore['yardflow_drivers_v1'] = JSON.stringify([driverUser, supervisorUser, adminUser]);
    localStore['yardflow_active_user_id'] = 'drv_20';
    sandbox.currentAppMode = 'admin';

    sandbox.applyPermissionsToUi();

    assert.strictEqual(getEl('drawerBtnModeAdminLabel').textContent, 'Työnjohto', 'Hampurilaisvalikossa lukee Työnjohto (ei Admin)');
    assert(getEl('appModeBadge').textContent.includes('Työnjohto'), 'Mode-badgessa lukee Työnjohto');
    assert(!getEl('appModeBadge').textContent.includes('Admin'), 'Mode-badgessa EI lue Admin');
    assert.strictEqual(getEl('drawerModeText').textContent, '👔 Työnjohto aktiivinen', 'Drawerissa lukee 👔 Työnjohto aktiivinen');
    assert(!getEl('drawerModeText').textContent.includes('Admin'), 'Drawerissa EI lue Admin');
    assert(getEl('btnSettingsModeAdminLabel').textContent.includes('Työnjohto'), 'Asetusnapissa lukee Työnjohto');
    assert(!getEl('btnSettingsModeAdminLabel').textContent.includes('Admin'), 'Asetusnapissa EI lue Admin');
    assert(getEl('driversViewSubtitle').textContent.includes('Työnjohto'), 'Käyttäjähallinnan alaotsikossa lukee Työnjohto');
    assert(!getEl('driversViewSubtitle').textContent.includes('Admin'), 'Käyttäjähallinnan alaotsikossa EI lue Admin');
    console.log('✅ Clean supervisor labels verified without "Admin" occurrences');

    // 4. Supervisor Restrictions on Admin User Management
    console.log('\n--- 4. Testing Supervisor Restrictions on Admin Users ---');
    
    // Test: Supervisor cannot delete Admin
    sandbox.deleteDriver('drv_99');
    assert(lastStatus.includes('Vain järjestelmänvalvoja (Admin) voi poistaa'), 'Työnjohtajan admin-poisto estetty ilmoituksella');
    assert.strictEqual(lastStatusType, 'error');
    console.log('✅ Supervisor prevented from deleting Admin user');

    // Test: Supervisor cannot create/save user as Admin
    getEl('driverInputName').value = 'Uusi Admin Yrittäjä';
    getEl('driverInputPhone').value = '040 999 8888';
    getEl('driverRoleSelect').value = 'admin';

    sandbox.saveDriverFromForm().then(() => {
        assert(lastStatus.includes('Työnjohtaja ei voi luoda tai asettaa pääkäyttäjäoikeuksia'), 'Työnjohtajan admin-luonti estetty');
        assert.strictEqual(lastStatusType, 'error');
        console.log('✅ Supervisor prevented from creating Admin user');

        // Test: Render view hides edit/delete buttons for Admin user when viewer is supervisor
        sandbox.renderDriversView();
        const driversListHtml = getEl('driversListContainer').innerHTML;
        assert(driversListHtml.includes('🔒 Pääkäyttäjätili'), 'Admin-käyttäjällä näkyy suojalukko työnjohtajalle');
        assert(!driversListHtml.includes("deleteDriver('drv_99')"), 'Työnjohtajalle EI näytetä poistonappia admin-käyttäjälle');
        assert(!driversListHtml.includes("openAddDriverDrawer('drv_99')"), 'Työnjohtajalle EI näytetä muokkausnappia admin-käyttäjälle');
        console.log('✅ Admin cards protected and buttons hidden for supervisor in drivers list');

        console.log('\n🎉 All Drawer Role Visibility & Supervisor Restriction tests PASSED successfully!');
    });
}

runTest();
