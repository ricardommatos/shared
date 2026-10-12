#!/bin/bash
# Duplo clique para abrir o Extrator de Carrosséis.
# Na primeira vez instala o que é preciso; depois arranca logo.

cd "$(dirname "$0")" || exit 1

if ! command -v python3 >/dev/null 2>&1; then
  echo "É preciso o Python 3. Vai abrir-se o instalador das ferramentas da Apple;"
  echo "aceita, espera que termine e volta a abrir este ficheiro."
  xcode-select --install
  read -r -p "Carrega Enter para fechar."
  exit 1
fi

if [ ! -d .venv ]; then
  echo "Primeira utilização: a preparar (só acontece uma vez)…"
  python3 -m venv .venv || exit 1
fi

.venv/bin/python -m pip install -q --upgrade pip gallery-dl

.venv/bin/python app.py
