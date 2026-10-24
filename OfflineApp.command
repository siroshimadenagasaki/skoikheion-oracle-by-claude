#!/bin/bash
# Abre Oracle sin internet: levanta un servidor local (o reusa el que ya está corriendo) y abre el navegador.
# Siempre abre index.html con ?stknet=...: así la app carga el index.html NUEVO de esta carpeta (sin el caché del service worker)
# y el resto (sonidos, MIDIs, fondos) sigue saliendo del caché, o sea que sigue andando sin internet.
cd "$(dirname "$0")" || exit 1

es_oracle() { curl -fs "http://localhost:$1/manifest.json" 2>/dev/null | grep -q "Stoikheion"; }
abrir() { open "http://localhost:$1/index.html?stknet=$(date +%s)"; }

# Puerto fijo (8000): el caché y los soundfonts se guardan por dirección, así que conviene usar siempre la misma.
PORT=8000
while lsof -i :"$PORT" -sTCP:LISTEN >/dev/null 2>&1; do
  if es_oracle "$PORT"; then
    echo "Oracle ya estaba corriendo en http://localhost:$PORT (se abre de nuevo)."
    abrir "$PORT"
    exit 0
  fi
  PORT=$((PORT + 1))
done

echo "Oracle corriendo en http://localhost:$PORT"
echo "Para cerrar la app: cerrá esta ventana."
(sleep 1 && abrir "$PORT") &
python3 -m http.server "$PORT"
