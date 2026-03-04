#!/bin/sh
set -e

# Start the static file server in background (serves built frontend)
npx serve -s dist -l 3003 &

# Start the API server (foreground)
node server/index.js
