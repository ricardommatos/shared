#!/usr/bin/env bash
# Sobe index.html para helloimricardo.me/clock/v2/ por FTPS (PTisp, cpp78.webserver.pt).
# Pede a password no momento; não a guarda em lado nenhum.
set -euo pipefail
cd "$(dirname "$0")"
HOST="cpp78.webserver.pt"
USER="helloimr"
REMOTE_DIR="public_html/clock/v2"
read -rsp "Password FTP de ${USER}@${HOST}: " PASS; echo
CFG="$(mktemp)"; trap 'rm -f "$CFG"' EXIT
printf 'user = "%s:%s"\n' "$USER" "$PASS" > "$CFG"
curl -sS --ssl-reqd --ftp-create-dirs -K "$CFG" -T index.html "ftp://${HOST}/${REMOTE_DIR}/index.html"
echo "Upload feito. A verificar..."
curl -sS -o /dev/null -w "https://helloimricardo.me/clock/v2/ -> HTTP %{http_code}\n" "https://helloimricardo.me/clock/v2/"
