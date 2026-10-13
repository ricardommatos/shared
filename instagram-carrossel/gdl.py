"""Corre o gallery-dl com suporte extra para os browsers Arc e Dia.

O gallery-dl só conhece os browsers Chromium mais comuns (Chrome, Brave,
Edge…). Arc e Dia usam o mesmo formato de cookies, por isso basta dizer-lhe
onde estão os ficheiros e como se chama a chave no Porta-chaves do macOS.
"""

import os
import subprocess
import sys

from gallery_dl import cookies, main

EXTRA = {
    # nome: (pasta em ~/Library/Application Support, nome no Porta-chaves)
    "arc": ("Arc/User Data", "Arc"),
    "dia": ("Dia/User Data", "Dia"),
}

cookies.SUPPORTED_BROWSERS_CHROMIUM.update(EXTRA)
cookies.SUPPORTED_BROWSERS.update(EXTRA)

# O nome desta função interna já mudou entre versões do gallery-dl.
NOMES_FUNCAO = ("_chromium_browser_settings", "_get_chromium_based_browser_settings")
FUNCAO = next((n for n in NOMES_FUNCAO if hasattr(cookies, n)), None)
_definicoes_originais = getattr(cookies, FUNCAO) if FUNCAO else None


def _definicoes(nome):
    if nome not in EXTRA:
        return _definicoes_originais(nome)
    pasta, chave = EXTRA[nome]
    if sys.platform == "darwin":
        raiz = os.path.expanduser("~/Library/Application Support")
    else:
        raiz = os.environ.get("XDG_CONFIG_HOME") or os.path.expanduser("~/.config")
    return {
        "browser": nome,
        "directory": os.path.join(raiz, pasta),
        "keyring": chave,
        "profiles": True,
    }


_password_original = cookies._get_mac_keyring_password


def _password(nome):
    # Alguns browsers guardam a chave com outro nome de conta;
    # se a procura exata falhar, procura só pelo nome do serviço.
    password = _password_original(nome)
    if password:
        return password
    proc = subprocess.run(
        ["security", "find-generic-password", "-w", "-s", nome + " Safe Storage"],
        capture_output=True,
    )
    return proc.stdout.rstrip(b"\n") or None


if FUNCAO:
    setattr(cookies, FUNCAO, _definicoes)
else:
    print("[aviso] Esta versão do gallery-dl não aceita Arc nem Dia.",
          file=sys.stderr)
if hasattr(cookies, "_get_mac_keyring_password"):
    cookies._get_mac_keyring_password = _password

if __name__ == "__main__":
    sys.exit(main())
