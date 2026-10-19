/**
 * Test: User Invitation (resetPasswordForEmail) & Password Recovery Modal (#modal-set-password)
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

function runTest() {
    console.log('🧪 Testing User Invitation & Password Recovery Flow...');

    const indexPath = path.join(__dirname, '..', 'index.html');
    const wwwIndexPath = path.join(__dirname, '..', 'www', 'index.html');
    const html = fs.readFileSync(indexPath, 'utf-8');
    const wwwHtml = fs.readFileSync(wwwIndexPath, 'utf-8');

    // 0. Synchronization check
    assert.strictEqual(html, wwwHtml, 'index.html ja www/index.html tulee olla täysin identtiset');
    console.log('✅ Synchronization verified between index.html and www/index.html');

    // 1. Password Recovery Modal Markup
    console.log('\n--- 1. Testing Password Recovery Modal Markup ---');
    assert(html.includes('id="modal-set-password"'), 'Elementti #modal-set-password löytyy');
    assert(html.includes('id="setPasswordModalTitle"'), 'Otsikko #setPasswordModalTitle löytyy');
    assert(html.includes('Aseta YardFlow-salasanasi'), 'Otsikkoteksti oikein');
    assert(html.includes('id="newPasswordInput"'), '#newPasswordInput kenttä löytyy');
    assert(html.includes('id="confirmPasswordInput"'), '#confirmPasswordInput kenttä löytyy');
    assert(html.includes('id="setPasswordErrorMessage"'), '#setPasswordErrorMessage virhealue löytyy');
    assert(html.includes('id="btnSaveNewPassword"'), '#btnSaveNewPassword tallennusnappi löytyy');
    assert(html.includes('id="btnCancelSetPassword"'), '#btnCancelSetPassword peruutussnappi löytyy');
    assert(html.includes('Tallenna salasana ja aloita'), 'Tallennusnapissa teksti: Tallenna salasana ja aloita');
    console.log('✅ Password recovery modal markup, inputs and uniform buttons verified');

    // 2. Logic & Function Definitions
    console.log('\n--- 2. Testing Function Definitions ---');
    assert(html.includes('function showSetPasswordModal('), 'showSetPasswordModal funktio määritelty');
    assert(html.includes('function closeSetPasswordModal('), 'closeSetPasswordModal funktio määritelty');
    assert(html.includes('function handleSetPasswordSubmit('), 'handleSetPasswordSubmit funktio määritelty');
    assert(html.includes('function initSupabaseAuthListener('), 'initSupabaseAuthListener funktio määritelty');
    assert(html.includes('resetPasswordForEmail('), 'resetPasswordForEmail kutsu löytyy');
    assert(html.includes('updateUser({ password:'), 'auth.updateUser kutsu löytyy');
    assert(html.includes('PASSWORD_RECOVERY'), 'PASSWORD_RECOVERY tapahtuman kuuntelu löytyy');
    console.log('✅ All recovery functions and Supabase calls verified in code');

    // 3. Functional Simulation in VM Sandbox
    console.log('\n--- 3. Simulating Password Set & Invitation Logic ---');
    const vm = require('vm');
    let lastStatus = null;
    let lastStatusType = null;
    let resetPasswordEmailSent = null;
    let userPasswordUpdated = null;
    let profilesUpserted = null;

    const localStore = {};
    const sandbox = {
        window: {
            location: { origin: 'https://yardflow.test' }
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
        esc: s => String(s || ''),
        PERMISSION_KEYS: ['can_complete_jobs'],
        ROLE_PRESETS: {
            driver: { permissions: { can_complete_jobs: true } }
        },
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
                        }
                    };
                },
                auth: {
                    async resetPasswordForEmail(email, opts) {
                        resetPasswordEmailSent = { email, opts };
                        if (email === 'ratelimit@auraus.fi') {
                            return { error: { message: 'Email rate limit exceeded' } };
                        }
                        return { error: null };
                    },
                    async updateUser(payload) {
                        userPasswordUpdated = payload.password;
                        return { data: { user: { id: 'u_123', email: 'test@yardflow.fi' } }, error: null };
                    },
                    onAuthStateChange(cb) {
                        this._cb = cb;
                    }
                }
            };
        }
    };

    vm.createContext(sandbox);

    // Extract saveDriverFromForm and recovery functions from HTML
    const saveDriverCodeMatch = html.match(/async function saveDriverFromForm\(\)[\s\S]*?window\.saveDriverFromForm = saveDriverFromForm;/);
    assert(saveDriverCodeMatch, 'saveDriverFromForm extracted');

    const recoveryCodeMatch = html.match(/\/\/ 🔑 SALASANAN ASETUS & RECOVERY[\s\S]*?window\.initSupabaseAuthListener = initSupabaseAuthListener;/);
    assert(recoveryCodeMatch, 'Recovery code block extracted');

    vm.runInContext(`
        ${saveDriverCodeMatch[0]}
        ${recoveryCodeMatch[0]}
    `, sandbox);

    // Test A: Admin creates driver with email -> invitation sent & profile saved
    sandbox.document.getElementById('driverInputName').value = 'Teemu Työntekijä';
    sandbox.document.getElementById('driverInputPhone').value = '040 555 1234';
    sandbox.document.getElementById('driverInputEmail').value = 'teemu@auraus.fi';
    sandbox.document.getElementById('driverRoleSelect').value = 'driver';

    return sandbox.saveDriverFromForm().then(() => {
        assert(resetPasswordEmailSent !== null, 'resetPasswordForEmail kutsuttu');
        assert.strictEqual(resetPasswordEmailSent.email, 'teemu@auraus.fi', 'Sähköpostiosoite oikein');
        assert.strictEqual(profilesUpserted.email, 'teemu@auraus.fi', 'Profiilitiedot tallennettu Supabaseen');
        assert(lastStatus.includes('aktivointilinkki lähetetty'), 'Statusviestissä maininta aktivointilinkistä');
        assert.strictEqual(lastStatusType, 'success');
        console.log('✅ Email invitation & Supabase profiles upsert verified on user creation');

        // Test B: Rate-limit or email failure provides clear warning and manual password fallback
        sandbox.document.getElementById('driverInputName').value = 'Risto RateLimit';
        sandbox.document.getElementById('driverInputPhone').value = '040 555 9999';
        sandbox.document.getElementById('driverInputEmail').value = 'ratelimit@auraus.fi';

        return sandbox.saveDriverFromForm();
    }).then(() => {
        assert(lastStatus.includes('sähköpostikutsun lähetys epäonnistui'), 'Statusviesti varoittaa epäonnistuneesta kutsusta');
        assert(lastStatus.includes('aloitussalasanan suoraan käsin'), 'Statusviesti ohjaa asettamaan salasanan käsin');
        assert.strictEqual(lastStatusType, 'warning');
        console.log('✅ Fallback warning when invite email delivery fails verified');

        // Test C: Password Recovery Modal validation & submission
        sandbox.showSetPasswordModal();
        assert.strictEqual(sandbox.document.getElementById('modal-set-password').style.display, 'flex');

        // Mismatched passwords
        sandbox.document.getElementById('newPasswordInput').value = 'UusiSalasana123';
        sandbox.document.getElementById('confirmPasswordInput').value = 'EriSalasana';
        return sandbox.handleSetPasswordSubmit({ preventDefault() {} });
    }).then(() => {
        assert.strictEqual(sandbox.document.getElementById('setPasswordErrorMessage').style.display, 'block');
        assert(sandbox.document.getElementById('setPasswordErrorMessage').textContent.includes('eivät täsmää'));

        // Matching passwords
        sandbox.document.getElementById('newPasswordInput').value = 'TurvallinenSalasana2026';
        sandbox.document.getElementById('confirmPasswordInput').value = 'TurvallinenSalasana2026';
        return sandbox.handleSetPasswordSubmit({ preventDefault() {} });
    }).then(() => {
        assert.strictEqual(userPasswordUpdated, 'TurvallinenSalasana2026', 'Supabase auth.updateUser kutsuttu uudella salasanalla');
        assert.strictEqual(sandbox.document.getElementById('modal-set-password').style.display, 'none', 'Modaali suljettu onnistumisen jälkeen');
        assert(lastStatus.includes('Salasana asetettu onnistuneesti'), 'Onnistumisviesti näytetty');
        console.log('✅ Set password modal validation and Supabase updateUser verified');

        console.log('\n🎉 All User Invitation & Password Recovery tests PASSED successfully!');
    });
}

runTest();
