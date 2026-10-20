/**
 * YardFlow – Users and Driver Management (users.js)
 */

(function(global) {
    function getStoredDriversList() {
        if (typeof global.getStoredDrivers === 'function') {
            return global.getStoredDrivers();
        }
        try {
            const raw = localStorage.getItem('yardflow_drivers_v1') || localStorage.getItem('yardflow_drivers');
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    }

    function openAddDriverDrawer(driverId = null) {
        if (typeof global.openAddDriverDrawer === 'function') {
            return global.openAddDriverDrawer(driverId);
        }
        const drawer = document.getElementById('addDriverDrawer');
        if (drawer) {
            drawer.style.display = 'block';
        }
    }

    function closeAddDriverDrawer() {
        if (typeof global.closeAddDriverDrawer === 'function') {
            return global.closeAddDriverDrawer();
        }
        const drawer = document.getElementById('addDriverDrawer');
        if (drawer) {
            drawer.style.display = 'none';
        }
    }

    /**
     * Luo uusi profiili suoraan Supabasen 'profiles'-tauluun tai lokaalisäilöön
     */
    async function createUserProfile({ name, email, role, phone, password, vehicle, permissions, expiresAt }) {
        const client = (typeof global.getSupabaseClient === 'function' ? global.getSupabaseClient() : null) || global.supabaseClient || null;
        let createdUser = null;
        let authError = null;

        // 1. Supabase auth.signUp ilman admin-session ylikirjoitusta
        if (client && client.auth && password) {
            const authEmail = email || `${(name || 'kayttaja').toLowerCase().replace(/[^a-z0-9]/g, '')}@yardflow.fi`;
            try {
                let currentSession = null;
                if (typeof client.auth.getSession === 'function') {
                    const s = await client.auth.getSession();
                    currentSession = s?.data?.session;
                }

                const { data, error } = await client.auth.signUp({
                    email: authEmail,
                    password: password,
                    options: {
                        data: {
                            full_name: name,
                            name: name,
                            role: role || 'driver',
                            phone: phone,
                            vehicle: vehicle,
                            permissions: permissions || {},
                            must_change_password: true
                        }
                    }
                });

                if (currentSession && client.auth.setSession) {
                    await client.auth.setSession({
                        access_token: currentSession.access_token,
                        refresh_token: currentSession.refresh_token
                    });
                }

                if (error) {
                    authError = error;
                } else if (data && data.user) {
                    createdUser = data.user;
                }
            } catch (err) {
                authError = err;
            }
        }

        // 2. Tallennus 'profiles'-tauluun
        let profileResult = null;
        if (client && client.from) {
            const targetId = createdUser ? createdUser.id : ('drv_' + Date.now());
            const profilePayload = {
                id: targetId,
                full_name: name,
                name: name,
                email: email || null,
                role: role || 'driver',
                phone: phone || null,
                vehicle: vehicle || null,
                permissions: permissions || {},
                expires_at: expiresAt || null,
                must_change_password: true,
                created_at: new Date().toISOString()
            };

            try {
                const upsertPromise = client.from('profiles').upsert(profilePayload);
                const { data, error } = (upsertPromise && typeof upsertPromise.select === 'function')
                    ? await upsertPromise.select()
                    : await upsertPromise;

                if (error) {
                    console.warn('Supabase profiles insert error:', error);
                } else {
                    profileResult = data;
                }
            } catch (pErr) {
                console.warn('Supabase profiles query error:', pErr);
            }
        }

        return { user: createdUser, error: authError, profile: profileResult };
    }

    async function saveDriver(driverData) {
        if (typeof global.saveDriverFromForm === 'function') {
            return await global.saveDriverFromForm();
        }
        return await createUserProfile(driverData || {});
    }

    // Tapahtumankuuntelijat DOM-painikkeille (ei kaadu TypeErroriin)
    if (typeof document !== 'undefined') {
        const attachListeners = () => {
            const btnAdd = document.getElementById('btn-add-driver');
            if (btnAdd && !btnAdd.hasAttribute('data-bound')) {
                btnAdd.setAttribute('data-bound', 'true');
                btnAdd.addEventListener('click', async (e) => {
                    const drawer = document.getElementById('addDriverDrawer');
                    const isDrawerOpen = drawer && drawer.style.display !== 'none' && drawer.style.display !== '';
                    const nameField = document.getElementById('driverInputName');

                    if (isDrawerOpen && nameField && nameField.value.trim().length > 0) {
                        e.preventDefault();
                        if (typeof global.saveDriverFromForm === 'function') {
                            try {
                                await global.saveDriverFromForm();
                            } catch (err) {
                                console.error('Virhe kuljettajan tallennuksessa:', err);
                                if (typeof global.showStatus === 'function') {
                                    global.showStatus(err.message || 'Virhe tallennuksessa', 'error');
                                } else {
                                    alert(err.message || 'Virhe tallennuksessa');
                                }
                            }
                        }
                    } else {
                        // Avaa lomakelaatikko
                        if (typeof global.openAddDriverDrawer === 'function') {
                            global.openAddDriverDrawer();
                        } else {
                            openAddDriverDrawer();
                        }
                    }
                });
            }

            const btnSave = document.getElementById('btnSaveDriver');
            if (btnSave && !btnSave.hasAttribute('data-bound')) {
                btnSave.setAttribute('data-bound', 'true');
                btnSave.addEventListener('click', async (e) => {
                    e.preventDefault();
                    if (typeof global.saveDriverFromForm === 'function') {
                        try {
                            await global.saveDriverFromForm();
                        } catch (err) {
                            console.error('Virhe kuljettajan tallennuksessa:', err);
                            if (typeof global.showStatus === 'function') {
                                global.showStatus(err.message || 'Virhe tallennuksessa', 'error');
                            } else {
                                alert(err.message || 'Virhe tallennuksessa');
                            }
                        }
                    }
                });
            }
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', attachListeners);
        } else {
            attachListeners();
        }
    }

    const target = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : global);
    target.getStoredDriversList = getStoredDriversList;
    target.openAddDriverDrawerModal = openAddDriverDrawer;
    target.closeAddDriverDrawerModal = closeAddDriverDrawer;
    target.createUserProfile = createUserProfile;
    target.saveDriver = saveDriver;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            getStoredDriversList,
            openAddDriverDrawer,
            closeAddDriverDrawer,
            createUserProfile,
            saveDriver
        };
    }
})(typeof window !== 'undefined' ? window : global);
