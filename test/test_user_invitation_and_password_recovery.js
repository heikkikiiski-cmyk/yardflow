/**
 * Test: User Creation with Mandatory Initial Password & Forced Password Change on First Login
 * Also tests 6-Digit OTP Password Reset Modal (#modal-reset-password)
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

function runTest() {
    console.log('🧪 Testing Forced Password Change & 6-Digit OTP Reset Flow...');

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

    // 2. 6-Digit OTP Password Reset Modal Markup (#modal-reset-password)
    console.log('\n--- 2. Testing 6-Digit OTP Password Reset Modal Markup ---');
    assert(html.includes('id="modal-reset-password"'), 'Elementti #modal-reset-password löytyy');
    assert(html.includes('id="resetPasswordModalTitle"'), 'Otsikko #resetPasswordModalTitle löytyy');
    assert(html.includes('id="resetStep1"') && html.includes('step-code'), '#resetStep1 step-code lomake löytyy');
    assert(html.includes('id="resetStep2"') && html.includes('step-new-password'), '#resetStep2 step-new-password lomake löytyy');
    assert(html.includes('id="resetEmailInput"'), '#resetEmailInput kenttä löytyy');
    assert(html.includes('id="btnSendResetCode"'), '#btnSendResetCode nappi löytyy');
    assert(html.includes('id="resetOtpInput"'), '#resetOtpInput kenttä löytyy');
    assert(html.includes('id="btnVerifyResetCode"'), '#btnVerifyResetCode nappi löytyy');
    assert(html.includes('id="resetNewPasswordInput"'), '#resetNewPasswordInput kenttä löytyy');
    assert(html.includes('id="resetConfirmPasswordInput"'), '#resetConfirmPasswordInput kenttä löytyy');
    assert(html.includes('id="btnSaveNewPassword"'), '#btnSaveNewPassword nappi löytyy');
    assert(html.includes('Tallenna uusi salasana'), 'Napissa teksti: Tallenna uusi salasana');
    assert(html.includes('id="resetPasswordErrorMessage"'), '#resetPasswordErrorMessage virhealue löytyy');
    console.log('✅ 6-digit OTP reset password modal markup verified');

    // 3. Logic & Function Definitions
    console.log('\n--- 3. Testing Function Definitions ---');
    assert(html.includes('function showForceChangePasswordModal('), 'showForceChangePasswordModal funktio määritelty');
    assert(html.includes('function closeForceChangePasswordModal('), 'closeForceChangePasswordModal funktio määritelty');
    assert(html.includes('function handleForcePasswordSubmit('), 'handleForcePasswordSubmit funktio määritelty');
    assert(html.includes('function showResetPasswordModal('), 'showResetPasswordModal funktio määritelty');
    assert(html.includes('function closeResetPasswordModal('), 'closeResetPasswordModal funktio määritelty');
    assert(html.includes('function showResetStep('), 'showResetStep funktio määritelty');
    assert(html.includes('function handleSendResetCode('), 'handleSendResetCode funktio määritelty');
    assert(html.includes('function handleVerifyOtpCode('), 'handleVerifyOtpCode funktio määritelty');
    assert(html.includes('function handleSetNewPassword('), 'handleSetNewPassword funktio määritelty');
    assert(html.includes('function handleVerifyOtpAndSetPassword('), 'handleVerifyOtpAndSetPassword funktio määritelty');
    assert(html.includes('verifyOtp('), 'verifyOtp kutsu löytyy');
    assert(html.includes('must_change_password'), 'must_change_password käsittely löytyy');
    console.log('✅ All forced change and OTP reset functions verified in code');

    // 4. Functional Simulation in VM Sandbox
    console.log('\n--- 4. Simulating Account Creation, OTP Reset & Forced Password Change Logic ---');
    const vm = require('vm');
    let lastStatus = null;
    let lastStatusType = null;
    let signedUpUser = null;
    let profilesUpserted = null;
    let profilesUpdated = null;
    let userPasswordUpdated = null;
    let resetPasswordCalls = 0;
    let resetPasswordOptions = null;
    let otpVerified = null;

    const localStore = {};
    const sandbox = {
        URLSearchParams: global.URLSearchParams || URLSearchParams,
        console: console,
        window: {
            location: { origin: 'https://yardflow.test', hash: '', search: '', pathname: '/' },
            history: { replaceState() {} },
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
                    async resetPasswordForEmail(email, options) {
                        resetPasswordCalls++;
                        resetPasswordOptions = options;
                        return { data: {}, error: null };
                    },
                    async verifyOtp(payload) {
                        otpVerified = payload;
                        if (payload.token === '123456') {
                            return { data: { user: { id: 'sb_user_999', email: payload.email } }, error: null };
                        }
                        return { data: null, error: { message: 'Virheellinen koodi' } };
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

    // Extract functions from HTML
    const resetCodeMatch = html.match(/async function requestPasswordReset\([\s\S]*?window\.handleForgotPasswordClick = handleForgotPasswordClick;/);
    assert(resetCodeMatch, 'requestPasswordReset extracted');

    const saveDriverCodeMatch = html.match(/async function saveDriverFromForm\(\)[\s\S]*?window\.saveDriverFromForm = saveDriverFromForm;/);
    assert(saveDriverCodeMatch, 'saveDriverFromForm extracted');

    const forcedPasswordCodeMatch = html.match(/\/\/ 🔒 PAKOLLINEN SALASANAN VAIHTO[\s\S]*?window\.handleForcePasswordSubmit = handleForcePasswordSubmit;/);
    assert(forcedPasswordCodeMatch, 'Forced password code block extracted');

    const recoveryCodeMatch = html.match(/\/\/ 🔑 SALASANAN NOLLAUS OTP-KOODILLA[\s\S]*?window\.initSupabaseAuthListener = initSupabaseAuthListener;/);
    assert(recoveryCodeMatch, 'Recovery code block extracted');

    vm.runInContext(`
        ${resetCodeMatch[0]}
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
        assert.strictEqual(resetPasswordCalls, 0, 'Sähköpostikutsuja ei lähetetä käyttäjän luonnissa');
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
        console.log('✅ User created directly with initial password and must_change_password: true');

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

        // Matching valid password
        sandbox.document.getElementById('forceNewPasswordInput').value = 'UusiTurvallinenKuskiSalasana2026';
        sandbox.document.getElementById('forceConfirmPasswordInput').value = 'UusiTurvallinenKuskiSalasana2026';
        return sandbox.handleForcePasswordSubmit({ preventDefault() {} });
    }).then(() => {
        assert.strictEqual(userPasswordUpdated, 'UusiTurvallinenKuskiSalasana2026', 'Supabase auth.updateUser kutsuttu uudella salasanalla');
        assert(profilesUpdated !== null, 'Profiles taulu päivitetty');
        assert.strictEqual(profilesUpdated.fields.must_change_password, false, 'must_change_password asetettu falseksi');

        const drivers = sandbox.getStoredDrivers();
        const updatedD = drivers.find(d => d.email === 'teemu@auraus.fi');
        assert.strictEqual(updatedD.must_change_password, false, 'Lokaalilla käyttäjällä must_change_password false');
        assert.strictEqual(sandbox.document.getElementById('modal-force-change-password').style.display, 'none');
        console.log('✅ Forced password change validation & Supabase updateUser verified');

        // Test D: Step 1 - Send OTP code for email
        sandbox.showResetPasswordModal('pekka@auraus.fi');
        assert.strictEqual(sandbox.document.getElementById('modal-reset-password').style.display, 'flex');
        assert.strictEqual(sandbox.document.getElementById('resetStep1').style.display, 'flex');
        assert.strictEqual(sandbox.document.getElementById('resetStep2').style.display, 'none');
        assert.strictEqual(sandbox.document.getElementById('resetEmailInput').value, 'pekka@auraus.fi');

        return sandbox.handleSendResetCode({ preventDefault() {} });
    }).then(() => {
        assert.strictEqual(resetPasswordCalls, 1, 'resetPasswordForEmail kutsuttu koodin lähettämiseksi');
        assert(resetPasswordOptions && resetPasswordOptions.redirectTo === 'https://yardflow.vercel.app', 'redirectTo on suora puhdas URL merkkijono');
        assert.strictEqual(sandbox.document.getElementById('resetStep1').style.display, 'flex', 'Vaihe 1 pysyy auki koodin syöttöä varten');
        assert.strictEqual(sandbox.document.getElementById('resetStep2').style.display, 'none', 'Vaihe 2 pysyy piilossa kunnes koodi on vahvistettu');
        console.log('✅ OTP Step 1 code send verified');

        // Test E: Step 1 - Verify OTP Code
        // Invalid OTP code
        sandbox.document.getElementById('resetOtpInput').value = '999999';
        return sandbox.handleVerifyOtpCode({ preventDefault() {} });
    }).then(() => {
        assert.strictEqual(sandbox.document.getElementById('resetPasswordErrorMessage').style.display, 'block');
        assert(sandbox.document.getElementById('resetPasswordErrorMessage').textContent.includes('Virhe vahvistuskoodissa'));
        assert.strictEqual(sandbox.document.getElementById('resetStep1').style.display, 'flex', 'Virheellisellä koodilla pysytään vaiheessa 1');
        assert.strictEqual(sandbox.document.getElementById('resetStep2').style.display, 'none', 'Vaihetta 2 ei avata virheellisellä koodilla');

        // Valid OTP code (123456)
        sandbox.document.getElementById('resetOtpInput').value = '123456';
        return sandbox.handleVerifyOtpCode({ preventDefault() {} });
    }).then(() => {
        assert(otpVerified !== null, 'Supabase auth.verifyOtp kutsuttu');
        assert.strictEqual(otpVerified.token, '123456', 'verifyOtp token oikein');
        assert.strictEqual(otpVerified.type, 'recovery', 'verifyOtp type: recovery');
        assert.strictEqual(sandbox.document.getElementById('resetStep1').style.display, 'none', 'Vaihe 1 piilotettu oikean koodin jälkeen');
        assert.strictEqual(sandbox.document.getElementById('resetStep2').style.display, 'flex', 'Vaihe 2 avattu oikean koodin jälkeen');
        console.log('✅ OTP Step 1 (verifyOtp & transition to Step 2) verified');

        // Test F: Step 2 - Set New Password
        // Mismatching passwords
        sandbox.document.getElementById('resetNewPasswordInput').value = 'UusiOmaSalasana2026';
        sandbox.document.getElementById('resetConfirmPasswordInput').value = 'EriSalasana123';
        return sandbox.handleSetNewPassword({ preventDefault() {} });
    }).then(() => {
        assert.strictEqual(sandbox.document.getElementById('resetPasswordErrorMessage').style.display, 'block');
        assert(sandbox.document.getElementById('resetPasswordErrorMessage').textContent.includes('eivät täsmää'));

        // Short password (<6 chars)
        sandbox.document.getElementById('resetNewPasswordInput').value = '123';
        sandbox.document.getElementById('resetConfirmPasswordInput').value = '123';
        return sandbox.handleSetNewPassword({ preventDefault() {} });
    }).then(() => {
        assert.strictEqual(sandbox.document.getElementById('resetPasswordErrorMessage').style.display, 'block');
        assert(sandbox.document.getElementById('resetPasswordErrorMessage').textContent.includes('vähintään 6 merkkiä'));

        // Valid matching passwords
        sandbox.document.getElementById('resetNewPasswordInput').value = 'UusiOmaSalasana2026';
        sandbox.document.getElementById('resetConfirmPasswordInput').value = 'UusiOmaSalasana2026';
        return sandbox.handleSetNewPassword({ preventDefault() {} });
    }).then(() => {
        assert.strictEqual(userPasswordUpdated, 'UusiOmaSalasana2026', 'updateUser kutsuttu uudella salasanalla');
        assert.strictEqual(sandbox.document.getElementById('modal-reset-password').style.display, 'none', 'Modaali suljettu onnistumisen jälkeen');
        console.log('✅ OTP Step 2 (updateUser & matching passwords) verified successfully');

        console.log('\n🎉 All Initial Password & 6-Digit OTP Reset tests PASSED successfully!');
    });
}

runTest();
