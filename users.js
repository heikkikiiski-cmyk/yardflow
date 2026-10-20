/**
 * YardFlow – Users and Driver Management (users.js)
 */

(function(global) {
    function getStoredDriversList() {
        if (typeof global.getStoredDrivers === 'function') {
            return global.getStoredDrivers();
        }
        try {
            const raw = localStorage.getItem('yardflow_drivers');
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    }

    function openAddDriverDrawer(driverId = null) {
        if (typeof global.openAddDriverDrawer === 'function') {
            return global.openAddDriverDrawer(driverId);
        }
    }

    function closeAddDriverDrawer() {
        if (typeof global.closeAddDriverDrawer === 'function') {
            return global.closeAddDriverDrawer();
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

            const { data, error } = await client
                .from('profiles')
                .insert([profilePayload])
                .select();

            if (error) {
                console.warn('Supabase profiles insert error:', error);
                // Yritetään upsertia jos rivi oli jo olemassa
                await client.from('profiles').upsert(profilePayload);
            } else {
                profileResult = data;
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
