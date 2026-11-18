#!/usr/bin/env python3
"""Local preview server for C&T Stacks.

Run from the project folder:   python3 local/serve.py
Then open:                     http://localhost:8000
As a team member (no editing): http://localhost:8000/?role=viewer

Serves ../index.html with the local runtime mock injected, serves images from
local/_blob, and saves uploads there. Edit index.html and just reload the browser.
"""
import http.server, json, os, secrets, socketserver, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
INDEX = os.path.join(ROOT, '..', 'index.html')
BLOBS = os.path.join(ROOT, '_blob')
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
os.makedirs(BLOBS, exist_ok=True)

# Same skeleton the claude.ai publisher wraps around the page.
HEAD = ('<!doctype html><html><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
        '<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}'
        'body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style>'
        '<script src="/local/mock-claude.js"></script></head><body>')
TYPES = {}

class Handler(http.server.SimpleHTTPRequestHandler):
    def send_bytes(self, body, ctype, code=200):
        self.send_response(code)
        self.send_header('Content-Type', ctype)
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        path = self.path.split('?')[0]
        if path in ('/', '/index.html'):
            with open(INDEX, encoding='utf-8') as f:
                page = HEAD + f.read() + '</body></html>'
            return self.send_bytes(page.encode('utf-8'), 'text/html; charset=utf-8')
        if path == '/local/mock-claude.js':
            with open(os.path.join(ROOT, 'mock-claude.js'), 'rb') as f:
                return self.send_bytes(f.read(), 'text/javascript')
        if path.startswith('/_blob/'):
            name = os.path.basename(path)
            fp = os.path.join(BLOBS, name)
            if os.path.isfile(fp):
                with open(fp, 'rb') as f:
                    return self.send_bytes(f.read(), TYPES.get(name, 'image/png'))
            return self.send_bytes(b'not found', 'text/plain', 404)
        return self.send_bytes(b'not found', 'text/plain', 404)

    def do_POST(self):
        if self.path != '/_upload':
            return self.send_bytes(b'not found', 'text/plain', 404)
        n = int(self.headers.get('Content-Length', 0))
        data = self.rfile.read(n)
        name = secrets.token_hex(16)
        with open(os.path.join(BLOBS, name), 'wb') as f:
            f.write(data)
        TYPES[name] = self.headers.get('Content-Type', 'application/octet-stream')
        return self.send_bytes(json.dumps({'id': name}).encode(), 'application/json')

    def log_message(self, *a):
        pass

socketserver.TCPServer.allow_reuse_address = True
with socketserver.ThreadingTCPServer(('127.0.0.1', PORT), Handler) as s:
    print(f'C&T Stacks running at http://localhost:{PORT}  (Ctrl+C to stop)')
    s.serve_forever()
