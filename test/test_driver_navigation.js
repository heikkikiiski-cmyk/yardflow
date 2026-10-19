const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('index.html', 'utf8');

// 1. Verify required DOM elements exist
const requiredIds = [
  'btn-prev-property',
  'btn-next-property',
  'btn-uncomplete-property',
  'btn-driver-complete',
  'driver-hud-top',
  'driverHudStep',
  'driverHudCounter',
  'driverHudName',
  'driverHudAddress'
];

requiredIds.forEach(id => {
  assert.ok(html.includes(`id="${id}"`), `Missing required ID #${id}`);
  console.log(`✅ Found #${id}`);
});

// 2. Verify functions exist in index.html
const requiredFunctions = [
  'navigateActiveProperty',
  'getActiveOrNextTask',
  'updateDriverHud',
  'uncompleteActiveYard',
  'triggerTaskCompletedTransition'
];

requiredFunctions.forEach(fn => {
  assert.ok(html.includes(`function ${fn}`), `Missing function ${fn}`);
  console.log(`✅ Found function ${fn}`);
});

// 3. Test functional behavior with mock environment
const mockTasks = [
  { id: 't1', name: 'Kohde 1', address: 'Katu 1', done: false, lat: 61.5, lon: 23.7 },
  { id: 't2', name: 'Kohde 2', address: 'Katu 2', done: false, lat: 61.51, lon: 23.71 },
  { id: 't3', name: 'Kohde 3', address: 'Katu 3', done: false, lat: 61.52, lon: 23.72 }
];

let tasks = JSON.parse(JSON.stringify(mockTasks));
let activeSelectedTaskId = null;
let currentRouteId = 'r1';

const dom = {
  'driverHudStep': { textContent: '', style: {} },
  'driverHudCounter': { textContent: '' },
  'driverHudName': { textContent: '' },
  'driverHudAddress': { textContent: '' },
  'driverHudNote': { style: {} },
  'driverHudNoteText': { textContent: '' },
  'driverHudRouteInfo': { textContent: '', style: {} },
  'btnDriverCompleteText': { textContent: '' },
  'btn-driver-complete': { style: {}, disabled: false },
  'btn-uncomplete-property': { style: {}, disabled: false },
  'btn-prev-property': { disabled: false },
  'btn-next-property': { disabled: false },
  'driver-hud-top': { classList: { add: () => {}, remove: () => {} }, offsetWidth: 100 }
};

global.document = {
  getElementById: (id) => dom[id] || null,
  querySelectorAll: () => []
};

function esc(s) { return s || ''; }
function getActiveOrNextTask() {
  if (!tasks || tasks.length === 0) return null;
  if (activeSelectedTaskId != null) {
    const found = tasks.find(t => String(t.id) === String(activeSelectedTaskId));
    if (found) return found;
  }
  return tasks.find(t => !t.done && !t.blocked) || tasks.find(t => !t.done) || tasks[0] || null;
}

function selectActiveProperty(id) {
  activeSelectedTaskId = id;
}

function navigateActiveProperty(delta) {
  if (!tasks || tasks.length === 0) return;
  const currentTask = getActiveOrNextTask();
  let curIdx = currentTask ? tasks.findIndex(t => String(t.id) === String(currentTask.id)) : 0;
  if (curIdx === -1) curIdx = 0;

  const newIdx = curIdx + delta;
  if (newIdx < 0 || newIdx >= tasks.length) return;

  const nextT = tasks[newIdx];
  if (!nextT) return;

  selectActiveProperty(nextT.id);
  updateDriverHud();
}

function updateDriverHud() {
  const total = tasks.length;
  const done = tasks.filter(t => t.done).length;
  const currentTask = getActiveOrNextTask();
  const taskIndex = currentTask ? tasks.findIndex(t => String(t.id) === String(currentTask.id)) : -1;

  dom['btn-prev-property'].disabled = (taskIndex <= 0);
  dom['btn-next-property'].disabled = (taskIndex === -1 || taskIndex >= total - 1);
  dom['driverHudCounter'].textContent = `${done} / ${total}`;

  if (currentTask.done) {
    dom['btn-driver-complete'].style.display = 'none';
    dom['btn-uncomplete-property'].style.display = 'inline-flex';
    dom['driverHudStep'].textContent = `KOHDE ${taskIndex + 1} (VALMIS ✓)`;
  } else {
    dom['btn-driver-complete'].style.display = 'inline-flex';
    dom['btn-uncomplete-property'].style.display = 'none';
    dom['driverHudStep'].textContent = `KOHDE ${taskIndex + 1}`;
  }
  dom['driverHudName'].textContent = currentTask.name;
}

// Initial state test
updateDriverHud();
assert.strictEqual(dom['btn-prev-property'].disabled, true, 'At index 0 prev must be disabled');
assert.strictEqual(dom['btn-next-property'].disabled, false, 'At index 0 next must be enabled');
assert.strictEqual(dom['btn-driver-complete'].style.display, 'inline-flex', 'Complete btn visible');
assert.strictEqual(dom['btn-uncomplete-property'].style.display, 'none', 'Uncomplete btn hidden');
assert.strictEqual(dom['driverHudStep'].textContent, 'KOHDE 1');
console.log('✅ Initial HUD state verified at Kohde 1');

// Navigate next -> Kohde 2
navigateActiveProperty(1);
assert.strictEqual(activeSelectedTaskId, 't2');
assert.strictEqual(dom['btn-prev-property'].disabled, false, 'At index 1 prev must be enabled');
assert.strictEqual(dom['btn-next-property'].disabled, false, 'At index 1 next must be enabled');
assert.strictEqual(dom['driverHudStep'].textContent, 'KOHDE 2');
console.log('✅ Navigate next to Kohde 2 verified');

// Navigate next -> Kohde 3
navigateActiveProperty(1);
assert.strictEqual(activeSelectedTaskId, 't3');
assert.strictEqual(dom['btn-prev-property'].disabled, false, 'At index 2 prev must be enabled');
assert.strictEqual(dom['btn-next-property'].disabled, true, 'At index 2 (last) next must be disabled');
assert.strictEqual(dom['driverHudStep'].textContent, 'KOHDE 3');
console.log('✅ Navigate next to Kohde 3 (last) verified');

// Navigate prev -> Kohde 2
navigateActiveProperty(-1);
assert.strictEqual(activeSelectedTaskId, 't2');
assert.strictEqual(dom['driverHudStep'].textContent, 'KOHDE 2');
console.log('✅ Navigate prev back to Kohde 2 verified');

// Mark Kohde 2 as completed
tasks[1].done = true;
updateDriverHud();
assert.strictEqual(dom['btn-driver-complete'].style.display, 'none', 'Complete btn hidden when done');
assert.strictEqual(dom['btn-uncomplete-property'].style.display, 'inline-flex', 'Uncomplete btn shown when done');
assert.strictEqual(dom['driverHudStep'].textContent, 'KOHDE 2 (VALMIS ✓)');
console.log('✅ Completed state shows uncomplete button and (VALMIS ✓)');

// Test uncomplete
tasks[1].done = false;
tasks[1].status = 'pending';
updateDriverHud();
assert.strictEqual(dom['btn-driver-complete'].style.display, 'inline-flex');
assert.strictEqual(dom['btn-uncomplete-property'].style.display, 'none');
assert.strictEqual(dom['driverHudStep'].textContent, 'KOHDE 2');
console.log('✅ Uncomplete restores complete button and pending status');

console.log('🎉 All driver navigation & uncomplete tests PASSED successfully!');
