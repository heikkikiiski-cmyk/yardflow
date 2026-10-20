/**
 * Test: User Creation with Mandatory Initial Password & Forced Password Change on First Login
 * Also tests Password Recovery Modal (#modal-set-password)
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

function runTest() {
    console.log('🧪 Testing Forced Password Change & Initial Account Creation Flow...');

    const indexPath = path.join(__dirname, '..', 'index.html');
    const wwwIndexPath = path.join(__dirname, '..', 'www', 'index.html');
    const html = fs.readFileSync(indexPath, 'utf-8');
    const wwwHtml = fs.readFileSync(wwwIndexPath, 'utf-8');

    // 0. Synchronization check
    assert.strictEqual(html, wwwHtml, 'index.html ja www/index.html tulee olla täysin identtiset');
    console.log('✅ Synchronization verified between index.html and www/index.html');

    // 1. Forced Password Change Modal Markup (#modal-force-change-password)
    console.log('\n--- 1. Testing Forced Password Change Modal Markup ---');
    assert(html.includes('id="modal-force-change-password"'), 'Elementti #modal-force-change-password löytyy');
    assert(html.includes('id="forcePasswordModalTitle"'), 'Otsikko #forcePasswordModalTitle löytyy');
    assert(html.includes('Aseta oma salasana jatkaaksesi'), 'Otsikkoteksti oikein');
    assert(html.includes('id="forceNewPasswordInput"'), '#forceNewPasswordInput kenttä löytyy');
    assert(html.includes('id="forceConfirmPasswordInput"'), '#forceConfirmPasswordInput kenttä löytyy');
    assert(html.includes('id="forcePasswordErrorMessage"'), '#forcePasswordErrorMessage virhealue löytyy');
    assert(html.includes('id="btnSaveForcePassword"'), '#btnSaveForcePassword tallennusnappi löytyy');
    assert(html.includes('Tallenna uusi salasana ja aloita työt'), 'Napissa teksti: Tallenna uusi salasana ja aloita työt');
    assert(html.includes('onclick="logoutUser()"'), 'Uloskirjautumislinkki löytyy pakkosalasanan modaalista');
    console.log('✅ Forced password change modal markup, inputs and uniform buttons verified');

    // 2. Password Recovery Modal Markup (#modal-set-password)
    console.log('\n--- 2. Testing Password Recovery Modal Markup ---');
    assert(html.includes('id="modal-set-password"'), 'Elementti #modal-set-password löytyy');
    assert(html.includes('id="setPasswordModalTitle"'), 'Otsikko #setPasswordModalTitle löytyy');
    assert(html.includes('Aseta YardFlow-salasanasi'), 'Otsikkoteksti oikein');
    assert(html.includes('id="newPasswordInput"'), '#newPasswordInput kenttä löytyy');
    assert(html.includes('id="confirmPasswordInput"'), '#confirmPasswordInput kenttä löytyy');
    assert(html.includes('id="setPasswordErrorMessage"'), '#setPasswordErrorMessage virhealue löytyy');
    assert(html.includes('id="btnSaveNewPassword"'), '#btnSaveNewPassword tallennusnappi löytyy');
    assert(html.includes('id="btnCancelSetPassword"'), '#btnCancelSetPassword peruutusnappi löytyy');
    console.log('✅ Password recovery modal markup verified');

    // 3. Logic & Function Definitions
    console.log('\n--- 3. Testing Function Definitions ---');
    assert(html.includes('function showForceChangePasswordModal('), 'showForceChangePasswordModal funktio määritelty');
    assert(html.includes('function closeForceChangePasswordModal('), 'closeForceChangePasswordModal funktio määritelty');
    assert(html.includes('function handleForcePasswordSubmit('), 'handleForcePasswordSubmit funktio määritelty');
    assert(html.includes('function showSetPasswordModal('), 'showSetPasswordModal funktio määritelty');
    assert(html.includes('function closeSetPasswordModal('), 'closeSetPasswordModal funktio määritelty');
    assert(html.includes('function handleSetPasswordSubmit('), 'handleSetPasswordSubmit funktio määritelty');
    assert(html.includes('must_change_password'), 'must_change_password käsittely löytyy');
    console.log('✅ All forced change and recovery functions verified in code');

    // 4. Functional Simulation in VM Sandbox
    console.log('\n--- 4. Simulating Account Creation & Forced Password Change Logic ---');
    const vm = require('vm');
    let lastStatus = null;
    let lastStatusType = null;
    let signedUpUser = null;
    let profilesUpserted = null;
    let profilesUpdated = null;
    let userPasswordUpdated = null;
    let resetPasswordCalls = 0;

    const localStore = {};
    const sandbox = {
        window: {
            location: { origin: 'https://yardflow.test' },
            pendingPasswordChangeUser: null
        },
        document: {
            elements: {},
            getElementById(id) {
                if (!this.elements[id]) {
                    this.elements[id] = {
                        id,
                        value: '',
                        style: {},
                        textContent: '',
                        disabled: false,
                        focus() {}
                    };
                }
                return this.elements[id];
            }
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
        alert(msg) {
            lastStatus = msg;
            lastStatusType = 'alert';
        },
        esc: s => String(s || ''),
        PERMISSION_KEYS: ['can_complete_jobs'],
        ROLE_PRESETS: {
            driver: { permissions: { can_complete_jobs: true }, hint: '' },
            admin: { permissions: { can_complete_jobs: true }, hint: '' }
        },
        getUserRole() { return 'admin'; },
        applyPermissionsToUi() {},
        renderDriversView() {},
        closeAddDriverDrawer() {},
        hideLoginView() {},
        restoreUserSession() {},
        getStoredDrivers() {
            try {
                return JSON.parse(localStore['yardflow_drivers_v1'] || '[]');
            } catch (e) { return []; }
        },
        persistDrivers(list) {
            localStore['yardflow_drivers_v1'] = JSON.stringify(list);
        },
        getSupabaseClient() {
            return {
                from(table) {
                    return {
                        async upsert(row) {
                            if (table === 'profiles') profilesUpserted = row;
                            return { data: row, error: null };
                        },
                        update(fields) {
                            return {
                                eq(col, val) {
                                    if (table === 'profiles') profilesUpdated = { fields, col, val };
                                    return Promise.resolve({ data: fields, error: null });
                                }
                            };
                        }
                    };
                },
                auth: {
                    async signUp(payload) {
                        signedUpUser = payload;
                        return { data: { user: { id: 'sb_user_999', email: payload.email } }, error: null };
                    },
                    async resetPasswordForEmail(email, opts) {
                        resetPasswordCalls++;
                        return { error: null };
                    },
                    async updateUser(payload) {
                        userPasswordUpdated = payload.password;
                        return { data: { user: { id: 'sb_user_999', email: 'teemu@auraus.fi' } }, error: null };
                    },
                    onAuthStateChange(cb) {
                        this._cb = cb;
                    }
                }
            };
        }
    };

    vm.createContext(sandbox);

    // Extract saveDriverFromForm, forced password functions, and recovery functions from HTML
    const saveDriverCodeMatch = html.match(/async function saveDriverFromForm\(\)[\s\S]*?window\.saveDriverFromForm = saveDriverFromForm;/);
    assert(saveDriverCodeMatch, 'saveDriverFromForm extracted');

    const forcedPasswordCodeMatch = html.match(/\/\/ 🔒 PAKOLLINEN SALASANAN VAIHTO[\s\S]*?window\.handleForcePasswordSubmit = handleForcePasswordSubmit;/);
    assert(forcedPasswordCodeMatch, 'Forced password code block extracted');

    const recoveryCodeMatch = html.match(/\/\/ 🔑 SALASANAN ASETUS & RECOVERY[\s\S]*?window\.initSupabaseAuthListener = initSupabaseAuthListener;/);
    assert(recoveryCodeMatch, 'Recovery code block extracted');

    vm.runInContext(`
        ${saveDriverCodeMatch[0]}
        ${forcedPasswordCodeMatch[0]}
        ${recoveryCodeMatch[0]}
    `, sandbox);

    // Test A: Admin creates driver without password -> should be rejected with warning
    sandbox.document.getElementById('driverEditId').value = '';
    sandbox.document.getElementById('driverInputName').value = 'Uusi Kuski';
    sandbox.document.getElementById('driverInputPhone').value = '040 123 4567';
    sandbox.document.getElementById('driverInputPassword').value = '';

    sandbox.saveDriverFromForm();
    assert(lastStatus.includes('aloitussalasana') || lastStatus.includes('vähintään 6'), 'Lyhyt tai puuttuva aloitussalasana estää tallennuksen');
    console.log('✅ Validation: Mandatory initial password (min. 6 chars) enforced');

    // Test B: Admin creates driver with initial password -> direct signUp and profile with must_change_password: true
    sandbox.document.getElementById('driverInputPassword').value = 'Aloitus2026';
    sandbox.document.getElementById('driverInputEmail').value = 'teemu@auraus.fi';

    return sandbox.saveDriverFromForm().then(() => {
        assert.strictEqual(resetPasswordCalls, 0, 'Sähköpostikutsuja (resetPasswordForEmail) ei lähetetä käyttäjän luonnissa');
        assert(signedUpUser !== null, 'Supabase auth.signUp kutsuttu suoraan aloitussalasanalla');
        assert.strictEqual(signedUpUser.email, 'teemu@auraus.fi', 'signUp email oikein');
        assert.strictEqual(signedUpUser.password, 'Aloitus2026', 'signUp salasana oikein');
        assert.strictEqual(signedUpUser.options?.data?.must_change_password, true, 'signUp metadata sisältää must_change_password: true');

        assert(profilesUpserted !== null, 'Profiilitiedot tallennettu Supabaseen');
        assert.strictEqual(profilesUpserted.must_change_password, true, 'profiles.must_change_password on true');

        const drivers = sandbox.getStoredDrivers();
        const created = drivers.find(d => d.name === 'Uusi Kuski');
        assert(created, 'Kuljettaja löytyy tallennetuista kuljettajista');
        assert.strictEqual(created.must_change_password, true, 'Lokaalilla kuljettajalla must_change_password: true');
        assert(lastStatus.includes('aloitussalasana asetettu'), 'Statusviestissä maininta aloitussalasanasta');
        console.log('✅ User created directly with initial password and must_change_password: true (no invite emails)');

        // Test C: Forced Password Change Modal - Opening & Validation
        const userToForce = {
            id: 'sb_user_999',
            name: 'Uusi Kuski',
            email: 'teemu@auraus.fi',
            role: 'driver',
            must_change_password: true
        };
        sandbox.showForceChangePasswordModal(userToForce);
        assert.strictEqual(sandbox.document.getElementById('modal-force-change-password').style.display, 'flex');

        // Mismatched passwords
        sandbox.document.getElementById('forceNewPasswordInput').value = 'OmaSalasana2026';
        sandbox.document.getElementById('forceConfirmPasswordInput').value = 'EriSalasana';
        return sandbox.handleForcePasswordSubmit({ preventDefault() {} });
    }).then(() => {
        assert.strictEqual(sandbox.document.getElementById('forcePasswordErrorMessage').style.display, 'block');
        assert(sandbox.document.getElementById('forcePasswordErrorMessage').textContent.includes('eivät täsmää'));

        // Short password (< 6 chars)
        sandbox.document.getElementById('forceNewPasswordInput').value = '123';
        sandbox.document.getElementById('forceConfirmPasswordInput').value = '123';
        return sandbox.handleForcePasswordSubmit({ preventDefault() {} });
    }).then(() => {
        assert.strictEqual(sandbox.document.getElementById('forcePasswordErrorMessage').style.display, 'block');
        assert(sandbox.document.getElementById('forcePasswordErrorMessage').textContent.includes('vähintään 6'));

        // Matching valid password
        sandbox.document.getElementById('forceNewPasswordInput').value = 'UusiTurvallinenKuskiSalasana2026';
        sandbox.document.getElementById('forceConfirmPasswordInput').value = 'UusiTurvallinenKuskiSalasana2026';
        return sandbox.handleForcePasswordSubmit({ preventDefault() {} });
    }).then(() => {
        assert.strictEqual(userPasswordUpdated, 'UusiTurvallinenKuskiSalasana2026', 'Supabase auth.updateUser kutsuttu uudella salasanalla');
        assert(profilesUpdated !== null, 'Profiles taulu päivitetty');
        assert.strictEqual(profilesUpdated.fields.must_change_password, false, 'must_change_password asetettu falseksi');
        assert.strictEqual(profilesUpdated.val, 'sb_user_999', 'Päivitetty oikean käyttäjän profiili');

        const drivers = sandbox.getStoredDrivers();
        const updatedD = drivers.find(d => d.email === 'teemu@auraus.fi');
        assert.strictEqual(updatedD.must_change_password, false, 'Lokaalilla käyttäjällä must_change_password false');
        assert.strictEqual(sandbox.document.getElementById('modal-force-change-password').style.display, 'none', 'Modaali suljettu onnistuneen vaihdon jälkeen');

        const session = JSON.parse(sandbox.localStorage.getItem('yardflow_auth_session'));
        assert(session && session.user, 'Istunto päivitetty');
        assert.strictEqual(session.user.must_change_password, false, 'Istunnossa must_change_password on false');
        console.log('✅ Forced password change validation, Supabase updateUser & profiles update verified');

        // Test D: Password Recovery Modal (#modal-set-password)
        sandbox.showSetPasswordModal();
        assert.strictEqual(sandbox.document.getElementById('modal-set-password').style.display, 'flex');
        sandbox.document.getElementById('newPasswordInput').value = 'PalautettuSalasana2026';
        sandbox.document.getElementById('confirmPasswordInput').value = 'PalautettuSalasana2026';
        return sandbox.handleSetPasswordSubmit({ preventDefault() {} });
    }).then(() => {
        assert.strictEqual(userPasswordUpdated, 'PalautettuSalasana2026');
        assert.strictEqual(sandbox.document.getElementById('modal-set-password').style.display, 'none');
        console.log('✅ Password recovery modal validation & submit verified');

        console.log('\n🎉 All Initial Password & Forced Password Change tests PASSED successfully!');
    });
}

runTest();
