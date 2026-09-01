#!/bin/sh
# Dev-server launcher: Node lives in ~/.local/node (no system install).
export PATH="$HOME/.local/node/bin:$PATH"
exec npm run dev "$@"
