#!/bin/bash
# Abre Oracle sin internet: levanta un servidor local y abre el navegador.
cd "$(dirname "$0")" || exit 1

PORT=8000
while lsof -i :"$PORT" >/dev/null 2>&1; do
  PORT=$((PORT + 1))
done

echo "Oracle corriendo en http://localhost:$PORT"
echo "Para cerrar la app: cerrá esta ventana."
(sleep 1 && open "http://localhost:$PORT") &
python3 -m http.server "$PORT"
