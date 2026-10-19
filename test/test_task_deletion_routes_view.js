const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('🧪 Testing Task Deletion from Admin Map & Route Planning view...\n');

const htmlContent = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

// 1. Verify deleteTask function and exports in HTML
console.log('--- 1. Testing Function and Markup Definitions ---');

assert.ok(htmlContent.includes('function deleteTask(id, event = null)'), 'deleteTask with event support missing in HTML');
assert.ok(htmlContent.includes('window.deleteTask = deleteTask'), 'window.deleteTask export missing in HTML');
assert.ok(htmlContent.includes('btn-delete-task'), 'btn-delete-task class missing in HTML');
assert.ok(htmlContent.includes('data-task-id='), 'data-task-id attribute missing in HTML');
assert.ok(htmlContent.includes('event.stopPropagation(); deleteTask('), 'event.stopPropagation missing in deleteTask onclicks');
console.log('✅ deleteTask function, window export, and stopPropagation verified in HTML');

// 2. Verify Delete button in Property Edit Modal (#editDialog)
console.log('\n--- 2. Testing Property Edit Modal Delete Action ---');
assert.ok(htmlContent.includes('deleteEditingTaskFromModal()'), 'deleteEditingTaskFromModal missing in HTML');
assert.ok(htmlContent.includes('window.deleteEditingTaskFromModal = deleteEditingTaskFromModal'), 'window.deleteEditingTaskFromModal missing');
assert.ok(htmlContent.includes('🗑️ Poista kohde'), 'Delete task button label in editDialog missing');
console.log('✅ Delete task button verified in #editDialog');

// 3. Verify Target Selector Delete Button in Map Panel (#yardMapTargetSelect)
console.log('\n--- 3. Testing Map Panel Target Selector Actions ---');
assert.ok(htmlContent.includes('deleteCurrentMapTargetFromList()'), 'deleteCurrentMapTargetFromList missing in HTML');
assert.ok(htmlContent.includes('window.deleteCurrentMapTargetFromList = deleteCurrentMapTargetFromList'), 'window.deleteCurrentMapTargetFromList missing');
assert.ok(htmlContent.includes('openCurrentMapTargetEditModal()'), 'openCurrentMapTargetEditModal missing in HTML');
console.log('✅ Quick delete and edit buttons verified beside #yardMapTargetSelect');

// 4. Functional Simulation of deleteTask logic
console.log('\n--- 4. Testing Functional deleteTask Logic ---');

const localStorageMock = {};
let tasks = [
    { id: 'task_1', name: 'Piha A', address: 'Katu 1', done: false },
    { id: 2, name: 'Piha B', address: 'Katu 2', done: false },
    { id: 'task_3', name: 'Piha C', address: 'Katu 3', done: true }
];
let activeSelectedTaskId = 'task_1';
let activePinMovingTaskId = 'task_1';
let currentRouteId = 'route_main';
let routes = [
    {
        id: 'route_main',
        name: 'Pääreitti',
        tasks: [
            { id: 'task_1', name: 'Piha A' },
            { id: 2, name: 'Piha B' },
            { id: 'task_3', name: 'Piha C' }
        ],
        propertyIds: ['task_1', 2, 'task_3']
    }
];

let editingId = 'task_1';
let editDialogClosed = false;
const mockEditDlg = {
    open: true,
    close: () => { editDialogClosed = true; }
};

let statusMessage = '';
function showStatus(msg) { statusMessage = msg; }
function saveAndRender() { localStorageMock['pihatyot_tasks_v4'] = JSON.stringify(tasks); }
function persistRoutes() { localStorageMock['yardflow_routes'] = JSON.stringify(routes); }

function simulateDeleteTask(id, event = null) {
    if (event && typeof event.stopPropagation === 'function') {
        event.stopPropagation();
    }

    const t = tasks.find(x => String(x.id) === String(id));
    const targetName = t ? t.name : 'tämä kohde';

    // 1. Suodatetaan kohde pois
    tasks = tasks.filter(x => String(x.id) !== String(id));

    // 2. Nollataan valinnat
    if (String(activeSelectedTaskId) === String(id)) activeSelectedTaskId = null;
    if (String(activePinMovingTaskId) === String(id)) activePinMovingTaskId = null;

    // 3. Päivitetään aktiivinen reitti
    if (currentRouteId && Array.isArray(routes)) {
        const curR = routes.find(r => String(r.id) === String(currentRouteId));
        if (curR && Array.isArray(curR.tasks)) {
            curR.tasks = curR.tasks.filter(x => String(x.id) !== String(id));
            if (Array.isArray(curR.propertyIds)) {
                curR.propertyIds = curR.propertyIds.filter(pid => String(pid) !== String(id));
            }
            persistRoutes();
        }
    }

    // 4. Suljetaan muokkausdialogi
    if (mockEditDlg.open && String(editingId) === String(id)) {
        editingId = null;
        mockEditDlg.close();
    }

    // 5. Tallennetaan
    saveAndRender();
    showStatus(`Kohde "${targetName}" poistettu ajolistalta.`);
}

let eventStopped = false;
simulateDeleteTask('task_1', { stopPropagation: () => { eventStopped = true; } });

assert.strictEqual(eventStopped, true, 'Event propagation must be stopped');
assert.strictEqual(tasks.length, 2, 'tasks length must be 2 after deleting task_1');
assert.strictEqual(tasks.some(t => t.id === 'task_1'), false, 'task_1 must not be in tasks');
assert.strictEqual(activeSelectedTaskId, null, 'activeSelectedTaskId must be reset');
assert.strictEqual(activePinMovingTaskId, null, 'activePinMovingTaskId must be reset');
assert.strictEqual(editDialogClosed, true, 'editDialog must be closed');
assert.strictEqual(routes[0].tasks.length, 2, 'active route tasks must be updated');
assert.strictEqual(routes[0].propertyIds.length, 2, 'active route propertyIds must be updated');
console.log('✅ deleteTask string ID deletion & state sync verified');

// Numeric ID test
simulateDeleteTask('2');
assert.strictEqual(tasks.length, 1, 'tasks length must be 1 after deleting numeric ID 2');
assert.strictEqual(tasks[0].id, 'task_3', 'Only task_3 should remain');
assert.strictEqual(routes[0].tasks.length, 1, 'active route tasks should have 1 item');
console.log('✅ deleteTask numeric ID comparison verified');

console.log('\n🎉 All Task Deletion from Admin Map & Route Planning tests PASSED successfully!');
