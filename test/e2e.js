window.__log = [];
const L = (k, v) => window.__log.push({ k, v });
(async () => {
    try {
        const opened = [];
        window.open = u => { opened.push(u); return null; };
        window.alert = m => L('alert', m);
        window.confirm = () => true;

        depot = { address: 'Kissanmaankatu 1, Tampere', lat: null, lon: null, useGps: false };
        depotInput.value = depot.address;
        tasks = [];
        localStorage.clear();

        const addrs = ['Joukahaisenkatu 6, Tampere', 'Kissanmaankatu 3, Tampere', 'Aarikkalankatu 5, Tampere',
                       'Hippoksenkatu 10, Tampere', 'Kinnarinkatu 4, Tampere'];
        addrs.forEach((a, i) => {
            document.getElementById('name').value = 'Kohde ' + (i + 1);
            document.getElementById('address').value = a;
            document.getElementById('type').value = 'Auraus & Hiekoitus';
            document.getElementById('notes').value = i === 0 ? 'Testi <b>huomio</b> & merkit' : '';
            addTask();
        });
        L('tasksAdded', tasks.map(t => ({ n: t.name, a: t.address, type: t.type })));

        // Odota geokoodausta
        await geocodeQueue;
        L('geocoded', tasks.map(t => ({ n: t.name, lat: t.lat, lon: t.lon, found: t.geoName.split(',').slice(0, 3).join(',') })));

        // Varikko
        const dc = await fetchCoordinates(depot.address);
        depot.lat = dc.lat; depot.lon = dc.lon; persistDepot();

        const D = { lat: depot.lat, lon: depot.lon };
        const pathLen = arr => { let km = 0, p = D; arr.forEach(t => { km += dist(p, t); p = t; }); return km; };

        const inputOrder = [...tasks];
        L('inputOrder', inputOrder.map(t => t.name).join(' > '));
        L('inputKm', pathLen(inputOrder).toFixed(2));

        // Brute-force optimi (avoin reitti varikolta)
        const perms = a => a.length <= 1 ? [a] : a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map(p => [x, ...p]));
        let best = Infinity, bestP = null;
        perms(inputOrder).forEach(p => { const k = pathLen(p); if (k < best) { best = k; bestP = p; } });
        L('bruteForceBest', { order: bestP.map(t => t.name).join(' > '), km: best.toFixed(2) });

        await autoOptimizeRoute();
        L('optimizedOrder', tasks.map(t => t.name).join(' > '));
        L('optimizedKm', pathLen(tasks).toFixed(2));
        L('statusAfterOptimize', document.getElementById('optimizerStatus').innerText);

        openRouteInGoogleMaps();
        L('mapsUrl', decodeURIComponent(opened[opened.length - 1] || 'EI AVATTU'));

        // Kuittaus
        const countCards = () => document.querySelectorAll('#taskList .task-item').length;
        toggleTask(tasks[0].id); toggleTask(tasks[1].id);
        L('afterTick', { done: tasks.filter(t => t.done).map(t => t.name), counter: document.getElementById('taskCount').textContent, cardsDone: document.querySelectorAll('#taskList .task-item.done').length });
        currentFilter = 'pending'; renderTasks(); L('pendingFilterCards', countCards());
        currentFilter = 'done'; renderTasks(); L('doneFilterCards', countCards());
        currentFilter = 'all'; renderTasks(); L('allFilterCards', countCards());
        L('persisted', JSON.parse(localStorage.getItem('pihatyot_tasks_v4')).filter(t => t.done).length);

        // Reitti vain tekemättömille
        openRouteInGoogleMaps();
        L('mapsUrlAfterTick', decodeURIComponent(opened[opened.length - 1]));

        // Kuittauksen peruutus ja nollaus
        toggleTask(tasks[0].id);
        L('afterUntick', tasks.filter(t => t.done).length);
        resetAllDone();
        L('afterReset', { done: tasks.filter(t => t.done).length });

        // XSS-tarkistus
        L('notesRenderedAsText', document.querySelector('.task-notes') ? document.querySelector('.task-notes').textContent : 'ei huomiota');
        L('injectedBTags', document.querySelectorAll('.task-notes b').length);
    } catch (e) {
        L('ERROR', e.message + ' ' + e.stack);
    }
    const pre = document.createElement('pre');
    pre.id = 'result';
    pre.textContent = '@@START@@' + JSON.stringify(window.__log, null, 1) + '@@END@@';
    document.body.appendChild(pre);
})();
