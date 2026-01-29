import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { parse } from 'node-html-parser';

const OUT_DIR = 'public';
const VENDOR_DIR = 'vendor';
const HTML_DIR = 'public/views/';

const HTML_FILES = fs.readdirSync(HTML_DIR);

const isRemote = (url) => /^https?:\/\//.test(url);

const download = async (url, outPath) => {
    const filePath = path.join(OUT_DIR, outPath);
    if (fs.existsSync(filePath)) return;
    console.log(`Downloading ${url} → ${filePath}`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch ${url}`);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, Buffer.from(await res.arrayBuffer()));
};

const toLocalPath = (url) => {
    const u = new URL(url); // built-in, safe
    let pathname = u.pathname.replace(/^\/+/, '');
    // If the path has no extension, treat it as a JS "directory" → index.js
    if (!['.js', '.css'].includes(path.extname(pathname))) {
        pathname = path.join(pathname, 'index.js');
    }
    return pathname;
};


// START SCRIPT

for (const file of HTML_FILES) {
    const html = fs.readFileSync(path.join(HTML_DIR, file), 'utf8');
    const root = parse(html);

    // ---- handle <script src> ----
    const scripts = root.querySelectorAll('script[src]');
    for (const script of scripts) {
        const src = script.getAttribute('src');
        if (!isRemote(src)) continue;

        const localPath = `/${VENDOR_DIR}/${toLocalPath(src.split('?')[0])}`;

        await download(src, localPath);
        script.setAttribute('src', localPath);
    }

    // ---- handle <link href> ----
    const links = root.querySelectorAll('link[href]');
    for (const link of links) {
        const href = link.getAttribute('href');
        if (!isRemote(href)) continue;

        const localPath = `/${VENDOR_DIR}/${toLocalPath(href.split('?')[0])}`;

        await download(href, localPath);
        link.setAttribute('href', localPath);
    }

    // update html file
    fs.writeFileSync(path.join(HTML_DIR, file), root.toString());
}
