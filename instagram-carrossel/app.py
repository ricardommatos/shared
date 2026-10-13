"""Extrator de carrosséis do Instagram — app local.

Corre no teu computador e abre uma página em http://127.0.0.1:8765
onde colas o link de um post. As imagens são descarregadas com o
gallery-dl, usando os cookies do browser onde tens o Instagram aberto.
"""

import io
import json
import mimetypes
import re
import subprocess
import sys
import threading
import webbrowser
import zipfile
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse

PORTA = 8765
AQUI = Path(__file__).resolve().parent
PASTA_DESTINO = Path.home() / "Downloads" / "Instagram"
BROWSERS = {"chrome", "safari", "dia", "arc", "firefox", "brave", "edge"}
EXTENSOES = {".jpg", ".jpeg", ".png", ".webp", ".heic", ".mp4", ".mov"}

PADRAO_URL = re.compile(
    r"^https?://(www\.)?instagram\.com/(?:[\w.]+/)?(p|reel|tv)/([\w-]+)"
)


def extrair(url, browser):
    m = PADRAO_URL.match(url.strip())
    if not m:
        raise ValueError("Isto não parece um link de post do Instagram.")
    codigo = m.group(3)
    destino = PASTA_DESTINO / codigo
    destino.mkdir(parents=True, exist_ok=True)

    cmd = [
        sys.executable, str(AQUI / "gdl.py"),
        "--cookies-from-browser", browser,
        "-D", str(destino),
        "-f", "{num:>02}.{extension}",
        f"https://www.instagram.com/p/{codigo}/",
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
    ficheiros = listar(codigo)

    if not ficheiros:
        raise RuntimeError(traduzir_erro(proc.stderr + proc.stdout, browser))
    return {"pasta": codigo, "ficheiros": ficheiros}


def listar(codigo):
    if not re.fullmatch(r"[\w-]+", codigo):
        return []
    pasta = PASTA_DESTINO / codigo
    if not pasta.is_dir():
        return []
    return sorted(
        f.name for f in pasta.iterdir()
        if f.is_file() and f.suffix.lower() in EXTENSOES
    )


def traduzir_erro(texto, browser):
    t = texto.lower()
    nome = browser.capitalize()
    lidos = re.search(r"extracted (\d+) cookies", t)
    if not lidos or lidos.group(1) == "0":
        if browser == "safari":
            return ("Sem permissão para ler os cookies do Safari. Dá 'Acesso "
                    "total ao disco' ao Terminal em Definições do Sistema › "
                    "Privacidade e Segurança, ou escolhe outro browser.")
        return (f"Não consegui ler os cookies do {nome}. Confirma que o {nome} "
                "está instalado e, se o Mac pedir a palavra-passe para o "
                "Porta-chaves, escolhe 'Permitir sempre'.")
    if "login" in t or "401" in t or "redirect" in t:
        return (f"O Instagram pediu login. Abre instagram.com no {nome}, "
                "confirma que tens sessão iniciada e tenta de novo.")
    if "404" in t or "not found" in t:
        return "Post não encontrado. Pode ter sido apagado ou ser privado."
    if "429" in t or "rate" in t:
        return "O Instagram está a limitar pedidos. Espera uns minutos."
    ultima = texto.strip().splitlines()[-1:] or ["erro desconhecido"]
    return "Não foi possível extrair as imagens: " + ultima[0]


def caminho_seguro(pasta, nome):
    alvo = (PASTA_DESTINO / pasta / nome).resolve()
    if PASTA_DESTINO.resolve() not in alvo.parents or not alvo.is_file():
        return None
    return alvo


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def responder(self, codigo, corpo, tipo="application/json", extra=None):
        if isinstance(corpo, (dict, list)):
            corpo = json.dumps(corpo).encode()
        self.send_response(codigo)
        self.send_header("Content-Type", tipo)
        self.send_header("Content-Length", str(len(corpo)))
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(corpo)

    def do_GET(self):
        partes = [unquote(p) for p in urlparse(self.path).path.split("/") if p]

        if not partes:
            html = (AQUI / "index.html").read_bytes()
            return self.responder(200, html, "text/html; charset=utf-8")

        if partes[0] == "media" and len(partes) == 3:
            alvo = caminho_seguro(partes[1], partes[2])
            if not alvo:
                return self.responder(404, {"erro": "Não encontrado"})
            tipo = mimetypes.guess_type(alvo.name)[0] or "application/octet-stream"
            return self.responder(200, alvo.read_bytes(), tipo)

        if partes[0] == "zip" and len(partes) == 2:
            codigo = partes[1]
            nomes = listar(codigo)
            if not nomes:
                return self.responder(404, {"erro": "Não encontrado"})
            buf = io.BytesIO()
            with zipfile.ZipFile(buf, "w", zipfile.ZIP_STORED) as z:
                for n in nomes:
                    z.write(PASTA_DESTINO / codigo / n, f"{codigo}/{n}")
            return self.responder(
                200, buf.getvalue(), "application/zip",
                {"Content-Disposition": f'attachment; filename="instagram_{codigo}.zip"'},
            )

        self.responder(404, {"erro": "Não encontrado"})

    def do_POST(self):
        tamanho = int(self.headers.get("Content-Length", 0))
        try:
            dados = json.loads(self.rfile.read(tamanho) or b"{}")
        except json.JSONDecodeError:
            return self.responder(400, {"erro": "Pedido inválido"})

        if self.path == "/api/extrair":
            browser = dados.get("browser", "chrome")
            if browser not in BROWSERS:
                return self.responder(400, {"erro": "Browser desconhecido"})
            try:
                return self.responder(200, extrair(dados.get("url", ""), browser))
            except (ValueError, RuntimeError) as e:
                return self.responder(400, {"erro": str(e)})
            except subprocess.TimeoutExpired:
                return self.responder(504, {"erro": "Demorou demasiado. Tenta de novo."})

        if self.path == "/api/abrir-pasta":
            pasta = PASTA_DESTINO / str(dados.get("pasta", ""))
            if pasta.resolve().parent == PASTA_DESTINO.resolve() and pasta.is_dir():
                abrir = "open" if sys.platform == "darwin" else "xdg-open"
                subprocess.Popen([abrir, str(pasta)])
                return self.responder(200, {"ok": True})
            return self.responder(404, {"erro": "Pasta não encontrada"})

        self.responder(404, {"erro": "Não encontrado"})


def main():
    PASTA_DESTINO.mkdir(parents=True, exist_ok=True)
    servidor = ThreadingHTTPServer(("127.0.0.1", PORTA), Handler)
    endereco = f"http://127.0.0.1:{PORTA}"
    print(f"Extrator de carrosséis a correr em {endereco}")
    print(f"As imagens ficam em {PASTA_DESTINO}")
    print("Para parar, fecha esta janela ou carrega Ctrl+C.")
    if "--sem-browser" not in sys.argv:
        threading.Timer(0.8, webbrowser.open, [endereco]).start()
    try:
        servidor.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
