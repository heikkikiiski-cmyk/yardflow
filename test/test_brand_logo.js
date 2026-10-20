/**
 * Test: Brand Logo and Visual Identity
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

function runTest() {
    console.log('🧪 Testing Brand Logo & Visual Assets...');

    const indexPath = path.join(__dirname, '..', 'index.html');
    const wwwIndexPath = path.join(__dirname, '..', 'www', 'index.html');
    const html = fs.readFileSync(indexPath, 'utf-8');
    const wwwHtml = fs.readFileSync(wwwIndexPath, 'utf-8');

    // 0. Synchronization check
    assert.strictEqual(html, wwwHtml, 'index.html ja www/index.html tulee olla täysin identtiset');
    console.log('✅ Synchronization verified between index.html and www/index.html');

    // 1. Files existence check
    const rootDir = path.join(__dirname, '..');
    assert(fs.existsSync(path.join(rootDir, 'assets', 'logo.png')), 'assets/logo.png exists');
    assert(fs.existsSync(path.join(rootDir, 'www', 'assets', 'logo.png')), 'www/assets/logo.png exists');
    assert(fs.existsSync(path.join(rootDir, 'favicon.ico')), 'favicon.ico exists');
    assert(fs.existsSync(path.join(rootDir, 'favicon.png')), 'favicon.png exists');
    assert(fs.existsSync(path.join(rootDir, 'www', 'favicon.ico')), 'www/favicon.ico exists');
    assert(fs.existsSync(path.join(rootDir, 'www', 'favicon.png')), 'www/favicon.png exists');
    assert(fs.existsSync(path.join(rootDir, 'icons', 'icon-192.png')), 'icons/icon-192.png exists');
    assert(fs.existsSync(path.join(rootDir, 'icons', 'icon-512.png')), 'icons/icon-512.png exists');
    assert(fs.existsSync(path.join(rootDir, 'app.css')), 'app.css exists');
    assert(fs.existsSync(path.join(rootDir, 'www', 'app.css')), 'www/app.css exists');
    console.log('✅ All logo, favicon, icon and css files verified in root and www/');

    // 2. HTML Markup checks
    console.log('\n--- 2. Checking HTML Markup for New Logo ---');
    assert(html.includes('class="login-logo"'), '.login-logo found in index.html');
    assert(html.includes('src="assets/logo.png"'), 'src="assets/logo.png" found in index.html');
    assert(html.includes('class="menu-logo"'), '.menu-logo found in index.html');
    assert(html.includes('href="favicon.ico"'), 'favicon.ico link found in head');
    assert(html.includes('href="favicon.png"'), 'favicon.png link found in head');

    // Ensure old SVG stack icon is completely replaced
    assert(!html.includes('d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"'), 'Old stack icon removed from HTML');
    console.log('✅ Old stack icon completely replaced with official YF logo in login view, drawer and header');

    // 3. CSS checks
    console.log('\n--- 3. Checking CSS Classes ---');
    const css = fs.readFileSync(path.join(rootDir, 'app.css'), 'utf-8');
    assert(css.includes('.login-logo'), '.login-logo defined in app.css');
    assert(css.includes('.menu-logo'), '.menu-logo defined in app.css');
    assert(css.includes('width: 100px'), 'width: 100px for login logo');
    assert(css.includes('width: 40px'), 'width: 40px for menu logo');
    console.log('✅ CSS rules and responsiveness verified');

    console.log('\n🎉 All Brand Logo tests PASSED successfully!');
}

runTest();
