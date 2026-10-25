'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { pipeline } = require('node:stream');

function resolvePublicPath(root, pathname) {
    const normalized = pathname.replace(/\\/g, '/');
    const segments = normalized.split('/');
    if (segments.some(segment => segment.startsWith('.') || segment.includes(':')) || normalized.includes('\0')) return null;
    const relative = normalized.replace(/^\/+/, '') || 'index.html';
    const extension = path.extname(relative).toLowerCase();
    if (!['.html', '.css', '.js', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.ico', '.svg', '.mp3', '.wav', '.ogg', '.mp4', '.pdf', '.woff', '.woff2', '.ttf', '.json', ''].includes(extension)) return null;
    if ((extension === '.json' && relative !== 'manifest.json') ||
        /^(?:server(?:-assets)?\.js|package(?:-lock)?\.json)$/i.test(relative) ||
        segments.some(segment => /^(?:node_modules|android|tests)$/i.test(segment))) return null;
    const target = path.resolve(root, relative);
    const within = path.relative(root, target);
    return within.startsWith('..') || path.isAbsolute(within) ? null : target;
}

function parseRange(header, size) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(header);
    if (!match || (!match[1] && !match[2]) || !size) return null;
    let start, end;
    if (!match[1]) {
        const suffix = Number(match[2]);
        if (!Number.isSafeInteger(suffix) || suffix <= 0) return null;
        start = Math.max(0, size - suffix);
        end = size - 1;
    } else {
        start = Number(match[1]);
        end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
    }
    return Number.isSafeInteger(start) && Number.isSafeInteger(end) && start >= 0 && start < size && end >= start ? { start, end } : null;
}

function serveFile(filePath, req, res, contentType) {
    if (!['GET', 'HEAD'].includes(req.method)) {
        res.writeHead(405, { Allow: 'GET, HEAD' });
        return res.end();
    }
    fs.stat(filePath, (error, stat) => {
        if (error || !stat.isFile()) { res.writeHead(404); return res.end(); }
        const etag = `W/"${stat.size.toString(16)}-${Math.trunc(stat.mtimeMs).toString(16)}"`;
        const headers = { 'Content-Type': contentType, 'Accept-Ranges': 'bytes', ETag: etag, 'Last-Modified': stat.mtime.toUTCString() };
        // HTML/API remain fresh; versioned assets can be reused after validation.
        if (!/\.html$/i.test(filePath) && !/sw\.js$/i.test(filePath)) {
            res.removeHeader('Pragma');
            res.removeHeader('Expires');
            headers['Cache-Control'] = /\.(css|js|json)$/i.test(filePath) ? 'public, max-age=0, must-revalidate' : 'public, max-age=86400';
        }
        if(req.cabinPrivate){headers['Cache-Control']='private, no-store';}
        if (req.headers['if-none-match'] === etag && !/\.html$/i.test(filePath)) {
            res.writeHead(304, headers); return res.end();
        }
        let range;
        if (req.headers.range && req.method === 'GET' &&
            (!req.headers['if-range'] || req.headers['if-range'] === stat.mtime.toUTCString())) {
            range = parseRange(req.headers.range, stat.size);
            if (!range) { res.writeHead(416, { ...headers, 'Content-Range': `bytes */${stat.size}` }); return res.end(); }
        }
        headers['Content-Length'] = range ? range.end - range.start + 1 : stat.size;
        if (range) headers['Content-Range'] = `bytes ${range.start}-${range.end}/${stat.size}`;
        res.writeHead(range ? 206 : 200, headers);
        if (req.method === 'HEAD') return res.end();
        pipeline(fs.createReadStream(filePath, range || undefined), res, () => {});
    });
}
module.exports = { resolvePublicPath, parseRange, serveFile };
