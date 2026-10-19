/**
 * Test: Login View (#view-login), Logout (#btn-logout), Admin Quick Login and Session Management
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

function runTest() {
    console.log('🧪 Testing Login View, Logout & Authentication Flow...');

    const indexPath = path.join(__dirname, '..', 'index.html');
    const wwwIndexPath = path.join(__dirname, '..', 'www', 'index.html');
    const html = fs.readFileSync(indexPath, 'utf-8');
    const wwwHtml = fs.readFileSync(wwwIndexPath, 'utf-8');

    // 0. Synchronization check
    assert.strictEqual(html, wwwHtml, 'index.html ja www/index.html tulee olla täysin identtiset');
    console.log('✅ Synchronization verified between index.html and www/index.html');

    // 1. Login View DOM Elements
    console.log('\n--- 1. Testing Login View Markup ---');
    assert(html.includes('id="view-login"'), 'Elementti #view-login löytyy');
    assert(html.includes('YardFlow'), 'Otsikko YardFlow löytyy');
    assert(html.includes('Työnohjaus &amp; Kenttänhallinta'), 'Alaotsikko Työnohjaus & Kenttänhallinta löytyy');
    assert(html.includes('id="loginUsername"'), '#loginUsername kenttä löytyy');
    assert(html.includes('placeholder="Käyttäjätunnus tai sähköposti"'), 'loginUsername placeholder oikein');
    assert(html.includes('id="loginPassword"'), '#loginPassword kenttä löytyy');
    assert(html.includes('placeholder="Salasana"'), 'loginPassword placeholder oikein');
    assert(html.includes('type="password"'), 'loginPassword type="password"');
    assert(html.includes('id="btn-login"'), 'Kirjautumisnappi #btn-login löytyy');
    assert(html.includes('Kirjaudu sisään'), 'Nappi sisältää tekstin Kirjaudu sisään');
    assert(html.includes('id="loginErrorMessage"'), 'Virheilmoitusalue #loginErrorMessage löytyy');
    
    // Varmistetaan, että mitään oletussalasanoja tai pääkäyttäjävihjeitä ei näytetä UI:ssa
    assert(!html.includes('Pääkäyttäjän pikatuki'), 'Pääkäyttäjän pikatukiteksti poistettu UI:sta');
    assert(!html.includes('Tunnus Admin ja salasana Admin'), 'Tunnus Admin ja salasana Admin poistettu UI:sta');
    console.log('✅ Login View markup, fields, neutral placeholders and clean UI verified (no credential hints)');

    // 2. Logout Button in Drawer
    console.log('\n--- 2. Testing Logout Button in Drawer ---');
    assert(html.includes('id="btn-logout"'), '#btn-logout painike löytyy');
    assert(html.includes('onclick="logoutUser()"'), 'Painike kutsuu logoutUser() funktiota');
    assert(html.includes('Kirjaudu ulos'), 'Painikkeessa lukee Kirjaudu ulos');
    assert(html.includes('btn-danger'), 'Painikkeessa on punainen korostusluokka btn-danger');
    console.log('✅ Logout button (#btn-logout) verified in drawer');

    // 3. Driver Creation Password Input
    console.log('\n--- 3. Testing Initial Password in Driver Creation Drawer ---');
    assert(html.includes('id="driverInputPassword"'), 'Salasanakenttä #driverInputPassword löytyy käyttäjälomakkeelta');
    console.log('✅ Driver password field #driverInputPassword verified');

    // 4. Auth Functions Definitions
    console.log('\n--- 4. Testing Auth Function Definitions ---');
    assert(html.includes('function showLoginView('), 'showLoginView funktio määritelty');
    assert(html.includes('function hideLoginView('), 'hideLoginView funktio määritelty');
    assert(html.includes('function isLoggedIn('), 'isLoggedIn funktio määritelty');
    assert(html.includes('function checkAuthSession('), 'checkAuthSession funktio määritelty');
    assert(html.includes('function restoreUserSession('), 'restoreUserSession funktio määritelty');
    assert(html.includes('function handleLoginSubmit('), 'handleLoginSubmit funktio määritelty');
    assert(html.includes('function logoutUser('), 'logoutUser funktio määritelty');
    console.log('✅ All authentication functions defined in script');

    // 5. Functional Simulation (VM Sandbox)
    console.log('\n--- 5. Simulating Auth Flows in VM Sandbox ---');
    const vm = require('vm');
    const sandbox = {
        window: {},
        document: {
            elements: {},
            getElementById(id) {
                if (!this.elements[id]) {
                    this.elements[id] = {
                        id,
                        value: '',
                        style: {},
                        textContent: '',
                        disabled: false
                    };
                }
                return this.elements[id];
            }
        },
        localStorage: {
            store: {},
            getItem(key) { return this.store[key] || null; },
            setItem(key, val) { this.store[key] = String(val); },
            removeItem(key) { delete this.store[key]; }
        },
        currentAppMode: 'admin',
        currentTab: '',
        setAppMode(mode) { sandbox.currentAppMode = mode; },
        switchTab(tab) { sandbox.currentTab = tab; },
        applyPermissionsToUi() {},
        showStatus() {},
        esc: s => String(s || ''),
        ROLE_PRESETS: {
            admin: {
                permissions: { can_edit_drivers: true, can_complete_jobs: true }
            },
            driver: {
                permissions: { can_edit_drivers: false, can_complete_jobs: true }
            }
        },
        PERMISSION_KEYS: ['can_complete_jobs', 'can_edit_drivers']
    };

    vm.createContext(sandbox);

    // Extract auth logic block from HTML
    const authCodeMatch = html.match(/\/\/ 🔐 SISÄÄNKIRJAUTUMINEN, ULOSKIRJAUTUMINEN & ISTUNTO \(AUTH\)([\s\S]*?)window\.logoutUser = logoutUser;/);
    assert(authCodeMatch, 'Auth code block extracted from HTML');

    vm.runInContext(`
        function getStoredDrivers() {
            try {
                const raw = localStorage.getItem('yardflow_drivers_v1');
                if (raw) return JSON.parse(raw);
            } catch (e) {}
            return [];
        }

        ${authCodeMatch[0]}
    `, sandbox);

    // Test A: Admin quick login ("Admin" / "Admin")
    sandbox.document.getElementById('loginUsername').value = 'Admin';
    sandbox.document.getElementById('loginPassword').value = 'Admin';
    sandbox.handleLoginSubmit({ preventDefault() {} });

    assert(sandbox.localStorage.getItem('yardflow_auth_session') !== null, 'Auth session saved in localStorage for Admin');
    const adminSession = JSON.parse(sandbox.localStorage.getItem('yardflow_auth_session'));
    assert.strictEqual(adminSession.user.role, 'admin', 'Admin role granted');
    assert.strictEqual(sandbox.currentAppMode, 'admin', 'App mode set to admin');
    assert.strictEqual(sandbox.currentTab, 'dashboard', 'Dashboard opened for Admin');
    assert.strictEqual(sandbox.document.getElementById('view-login').style.display, 'none', 'Login view hidden');
    console.log('✅ Admin quick login ("Admin" / "Admin") verified');

    // Test B: Logout
    sandbox.logoutUser();
    assert.strictEqual(sandbox.localStorage.getItem('yardflow_auth_session'), null, 'Auth session cleared on logout');
    assert.strictEqual(sandbox.document.getElementById('view-login').style.display, 'flex', 'Login view shown after logout');
    console.log('✅ Logout clears session and restores Login view');

    // Test C: Driver Login with Password
    const driver1 = {
        id: 'drv_test_100',
        name: 'Mauri Mäkinen',
        email: 'mauri@auraus.fi',
        password: 'KuskiSalasana123',
        role: 'driver'
    };
    sandbox.localStorage.setItem('yardflow_drivers_v1', JSON.stringify([driver1]));

    sandbox.document.getElementById('loginUsername').value = 'mauri@auraus.fi';
    sandbox.document.getElementById('loginPassword').value = 'KuskiSalasana123';
    sandbox.handleLoginSubmit({ preventDefault() {} });

    assert(sandbox.localStorage.getItem('yardflow_auth_session') !== null, 'Auth session saved for driver');
    const driverSession = JSON.parse(sandbox.localStorage.getItem('yardflow_auth_session'));
    assert.strictEqual(driverSession.user.role, 'driver', 'Driver role granted');
    assert.strictEqual(sandbox.currentAppMode, 'field', 'App mode set to field for driver');
    assert.strictEqual(sandbox.currentTab, 'routes', 'Field mode route view opened for driver');
    console.log('✅ Driver login by password verified with field mode transition');

    // Test D: Invalid Password
    sandbox.logoutUser();
    sandbox.document.getElementById('loginUsername').value = 'mauri@auraus.fi';
    sandbox.document.getElementById('loginPassword').value = 'VaaraSalasana';
    sandbox.handleLoginSubmit({ preventDefault() {} });

    assert.strictEqual(sandbox.localStorage.getItem('yardflow_auth_session'), null, 'Session not created for invalid password');
    assert.strictEqual(sandbox.document.getElementById('loginErrorMessage').style.display, 'block', 'Error message displayed');
    console.log('✅ Invalid password rejection & error message verified');

    // Test E: Session restoration on page reload
    sandbox.document.getElementById('loginUsername').value = 'Admin';
    sandbox.document.getElementById('loginPassword').value = 'Admin';
    sandbox.handleLoginSubmit({ preventDefault() {} });
    assert(sandbox.isLoggedIn() === true, 'isLoggedIn returns true');

    const restored = sandbox.checkAuthSession();
    assert.strictEqual(restored, true, 'Existing session automatically restored without showing login view');
    console.log('✅ Existing session persistence and automatic restore verified');

    console.log('\n🎉 All Login View, Logout & Authentication tests PASSED successfully!');
}

runTest();
