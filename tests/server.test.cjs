const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const { resolvePublicPath, parseRange, serveFile } = require('../server-assets');

test('public paths exclude source, private JSON and Windows traversal', () => {
    const root = path.resolve(__dirname, '..');
    for (const input of ['/../secret', '/..\\secret', '/.git/config', '/server.js', '/server-assets.js', '/other/config.json', '/package-lock.json', '/node_modules/pkg/index.js', '/C:/Windows', '/tests/server.test.cjs']) {
        assert.equal(resolvePublicPath(root, input), null, input);
    }
    assert.equal(resolvePublicPath(root, '/images/1.jpg'), path.join(root, 'images/1.jpg'));
    assert.equal(resolvePublicPath(root, '/manifest.json'), path.join(root, 'manifest.json'));
});

test('byte ranges support suffix, open end, and clamping', () => {
    assert.deepEqual(parseRange('bytes=2-5', 10), { start: 2, end: 5 });
    assert.deepEqual(parseRange('bytes=7-', 10), { start: 7, end: 9 });
    assert.deepEqual(parseRange('bytes=-3', 10), { start: 7, end: 9 });
    assert.deepEqual(parseRange('bytes=0-999', 10), { start: 0, end: 9 });
    for (const input of ['bytes=10-', 'bytes=5-2', 'bytes=-0', 'bytes=a-2', 'bytes=0-2,4-5', 'bytes=-']) assert.equal(parseRange(input, 10), null);
});

test('HTTP serving supports HEAD, validators, ranges and invalid ranges', async t => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cabin-test-'));
    const file = path.join(directory, 'sample.mp3');
    fs.writeFileSync(file, '0123456789');
    const server = http.createServer((req, res) => serveFile(file, req, res, 'audio/mpeg'));
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    t.after(() => { server.closeAllConnections(); server.close(); fs.rmSync(directory, { recursive: true }); });
    const url = `http://127.0.0.1:${server.address().port}`;
    const response = await fetch(url);
    assert.equal(await response.text(), '0123456789');
    assert.equal(response.headers.get('cache-control'), 'public, max-age=86400');
    assert.equal((await fetch(url, { headers: { 'If-None-Match': response.headers.get('etag') } })).status, 304);
    const head = await fetch(url, { method: 'HEAD' });
    assert.equal(head.headers.get('content-length'), '10');
    assert.equal(await head.text(), '');
    const partial = await fetch(url, { headers: { Range: 'bytes=-3' } });
    assert.equal(partial.status, 206);
    assert.equal(await partial.text(), '789');
    assert.equal((await fetch(url, { headers: { Range: 'bytes=99-' } })).status, 416);
    assert.equal((await fetch(url, { method: 'POST' })).status, 405);
});

test('actual server handles malformed URLs and blocks private files', async t => {
    process.env.MONGODB_URI = '';
    const server = require('../server');
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    t.after(() => { server.closeAllConnections(); server.close(); });
    const url = `http://127.0.0.1:${server.address().port}`;
    for (const route of ['/server.js', '/.git/config', '/other/config.json', '/other/messages.json', '/%2e%2e%5cpackage.json']) {
        const res = await fetch(url + route);
        assert.equal(res.status, 403, route);
    }
    assert.equal((await fetch(url + '/%E0%A4%A')).status, 400);
    assert.equal(await (await fetch(url + '/ping')).text(), 'ok');
    assert.equal((await fetch(url + '/manifest.json')).status, 200);
    assert.equal((await fetch(url + '/style.css?v=4.5', { method: 'HEAD' })).status, 200);
});
