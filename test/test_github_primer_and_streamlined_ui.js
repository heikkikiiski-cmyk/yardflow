/**
 * YardFlow Automated Test Suite:
 * GitHub Primer Theme (Dark & Light) and Streamlined UI Verification
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

console.log('🧪 Testing GitHub Primer Theme & Streamlined UI...\n');

const ROOT_DIR = path.resolve(__dirname, '..');
const WWW_DIR = path.join(ROOT_DIR, 'www');

// 0. Verify Synchronization
console.log('--- 0. Checking File Synchronization ---');
const filesToSync = [
    'style.css',
    'theme.js',
    'app.js',
    'dashboard.js',
    'index.html'
];

filesToSync.forEach(file => {
    const rootPath = path.join(ROOT_DIR, file);
    const wwwPath = path.join(WWW_DIR, file);
    assert(fs.existsSync(rootPath), `Root file missing: ${file}`);
    assert(fs.existsSync(wwwPath), `WWW file missing: ${file}`);
    const rootContent = fs.readFileSync(rootPath, 'utf8');
    const wwwContent = fs.readFileSync(wwwPath, 'utf8');
    assert.strictEqual(rootContent, wwwContent, `File out of sync: ${file}`);
});
console.log('✅ Synchronization verified across all tested root and www/ files\n');

// 1. Check GitHub Primer CSS variables and styles in style.css
console.log('--- 1. Testing GitHub Primer Theme Styles in style.css ---');
const styleCss = fs.readFileSync(path.join(ROOT_DIR, 'style.css'), 'utf8');

assert(styleCss.includes('--canvas-default: #0d1117;'), 'Dark theme --canvas-default must be #0d1117');
assert(styleCss.includes('--canvas-subtle: #010409;'), 'Dark theme --canvas-subtle must be #010409');
assert(styleCss.includes('--canvas-card: #161b22;'), 'Dark theme --canvas-card must be #161b22');
assert(styleCss.includes('--border-default: #30363d;'), 'Dark theme --border-default must be #30363d');
assert(styleCss.includes('--fg-default: #e6edf3;'), 'Dark theme --fg-default must be #e6edf3');
assert(styleCss.includes('--btn-primary-bg: #238636;'), 'Dark theme --btn-primary-bg must be #238636');

assert(styleCss.includes('[data-theme="light"]'), 'Light theme selector must exist');
assert(styleCss.includes('--canvas-default: #ffffff;'), 'Light theme --canvas-default must be #ffffff');
assert(styleCss.includes('--canvas-subtle: #f6f8fa;'), 'Light theme --canvas-subtle must be #f6f8fa');
assert(styleCss.includes('--border-default: #d0d7de;'), 'Light theme --border-default must be #d0d7de');
assert(styleCss.includes('--fg-default: #1f2328;'), 'Light theme --fg-default must be #1f2328');
assert(styleCss.includes('--btn-primary-bg: #1f883d;'), 'Light theme --btn-primary-bg must be #1f883d');

assert(styleCss.includes('.card, .widget, .Box'), '.card, .widget, .Box rule must exist');
assert(styleCss.includes('border-radius: 6px;'), 'GitHub Primer 6px border radius must be configured');
assert(styleCss.includes('.card-header, .Box-header'), '.card-header, .Box-header rule must exist');
assert(styleCss.includes('.btn-primary'), '.btn-primary must be styled');
assert(styleCss.includes('--header-height: 52px;'), '--header-height must be 52px');
console.log('✅ GitHub Primer Dark & Light CSS variables and typography verified\n');

// 2. Streamlined Navigation & Map Controls
console.log('--- 2. Testing Streamlined Navigation & Map Controls in index.html ---');
const indexHtml = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');

assert(indexHtml.includes('↗ Navigoi'), '↗ Navigoi button must exist in index.html');
assert(indexHtml.includes('📍 Keskitä'), '📍 Keskitä button must exist in index.html');
assert(!indexHtml.includes('🗺️ Avaa Mapsissa'), 'Old duplicate "Avaa Mapsissa" button must be removed');
assert(!indexHtml.includes('>📍 Kartalle<'), 'Old duplicate "Kartalle" text button must be removed from property flow');
console.log('✅ Two clear navigation actions (↗ Navigoi and 📍 Keskitä) verified\n');

// 3. Consolidated Work Queue & Grouped Toolbar
console.log('--- 3. Testing Consolidated Work Queue & Grouped Toolbar ---');
assert(indexHtml.includes('(<span id="taskCount">'), 'Consolidated targets heading with taskCount must exist');
assert(indexHtml.includes('class="route-toolbar Box"'), 'Grouped route toolbar Box must exist');
assert(indexHtml.includes('id="btnOptimize"'), '#btnOptimize must be present in toolbar');
assert(indexHtml.includes('id="btn-create-new-route"'), '#btn-create-new-route must be present in toolbar');
assert(indexHtml.includes('id="property-list-container"'), '#property-list-container must exist');
assert(indexHtml.includes('id="taskList"'), '#taskList must exist inside container');
console.log('✅ Consolidated single work queue and grouped toolbar verified\n');

// 4. Header & Theme Toggle
console.log('--- 4. Testing 52px Header & Theme Toggle ---');
assert(indexHtml.includes('id="topbarActiveBadge"'), '#topbarActiveBadge must exist in header');
assert(indexHtml.includes('id="topbarActiveRouteName"'), '#topbarActiveRouteName must exist in header');
assert(indexHtml.includes('id="themeToggleBtn"'), '#themeToggleBtn must exist in header');
assert(indexHtml.includes('id="connectionStatusIndicator"'), '#connectionStatusIndicator must exist in header');
assert(indexHtml.includes('<script src="theme.js"></script>'), 'theme.js script tag must be included in index.html');
console.log('✅ 52px Header, active badge, status and theme button verified\n');

// 5. Theme Switching VM Simulation
console.log('--- 5. Simulating Theme Toggle & Persistence in VM Sandbox ---');
const themeJs = fs.readFileSync(path.join(ROOT_DIR, 'theme.js'), 'utf8');

let storedTheme = null;
let currentHtmlTheme = null;
const mockBtn = {
    attributes: {},
    html: '',
    setAttribute(k, v) { this.attributes[k] = v; },
    querySelector(sel) {
        if (sel === '.theme-toggle-icon') return { textContent: '' };
        if (sel === '.theme-toggle-text') return { textContent: '' };
        return null;
    }
};

const sandbox = {
    document: {
        documentElement: {
            getAttribute(k) { return currentHtmlTheme; },
            setAttribute(k, v) { if (k === 'data-theme') currentHtmlTheme = v; }
        },
        getElementById(id) {
            if (id === 'themeToggleBtn') return mockBtn;
            if (id === 'metaThemeColor') return { setAttribute: () => {} };
            return null;
        },
        readyState: 'complete'
    },
    localStorage: {
        getItem(k) { return storedTheme; },
        setItem(k, v) { if (k === 'yardflow_theme') storedTheme = v; }
    },
    window: {
        matchMedia: () => ({ matches: false })
    },
    console
};
sandbox.globalThis = sandbox;

vm.createContext(sandbox);
vm.runInContext(themeJs, sandbox);

assert.strictEqual(typeof sandbox.toggleTheme, 'function', 'toggleTheme function must be exported');
assert.strictEqual(typeof sandbox.applyTheme, 'function', 'applyTheme function must be exported');

// Test toggle from dark to light
sandbox.applyTheme('dark');
assert.strictEqual(currentHtmlTheme, 'dark');
assert.strictEqual(storedTheme, 'dark');

sandbox.toggleTheme();
assert.strictEqual(currentHtmlTheme, 'light', 'toggleTheme should switch dark to light');
assert.strictEqual(storedTheme, 'light', 'localStorage should store light');

sandbox.toggleTheme();
assert.strictEqual(currentHtmlTheme, 'dark', 'toggleTheme should switch light back to dark');
assert.strictEqual(storedTheme, 'dark', 'localStorage should store dark');

console.log('✅ Theme toggle and persistence verified in VM sandbox\n');

console.log('🎉 All GitHub Primer & Streamlined UI tests PASSED successfully!');
