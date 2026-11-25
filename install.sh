#!/bin/sh
# claude-switch installer for Linux.   ./install.sh   or   ./install.sh --uninstall
set -e
APP="${XDG_DATA_HOME:-$HOME/.local/share}/claude-switch"
BIN="$HOME/.local/bin"
DESKTOP="${XDG_DATA_HOME:-$HOME/.local/share}/applications/claude-switch.desktop"
SRC="$(cd "$(dirname "$0")" && pwd)"

if [ "$1" = "--uninstall" ]; then
  command -v node >/dev/null && node "$APP/claude-switch.js" auto off >/dev/null 2>&1 || true
  rm -rf "$APP" "$BIN/claude-switch" "$DESKTOP"
  echo "claude-switch removed. Your saved logins are still in ~/.claude-accounts (delete it to forget them)."
  exit 0
fi

command -v node >/dev/null || { echo "Node.js is required: https://nodejs.org (or your package manager)"; exit 1; }
if ! command -v claude >/dev/null; then
  echo "Installing Claude Code..."
  curl -fsSL https://claude.ai/install.sh | bash
fi

mkdir -p "$APP" "$BIN" "$(dirname "$DESKTOP")"
cp "$SRC/claude-switch.js" "$SRC/ui.html" "$APP/"
cp -r "$SRC/assets" "$APP/"
printf '#!/bin/sh\nexec node "%s/claude-switch.js" "$@"\n' "$APP" > "$BIN/claude-switch"
chmod +x "$BIN/claude-switch"
cat > "$DESKTOP" <<EOF
[Desktop Entry]
Type=Application
Name=claude-switch
Comment=Switch Claude Code between your Claude accounts
Exec=node "$APP/claude-switch.js" ui
Terminal=false
Categories=Development;
EOF

echo "Installed. Open it from your app menu or run: claude-switch ui"
case ":$PATH:" in *":$BIN:"*) ;; *) echo "Add $BIN to your PATH to use the claude-switch command.";; esac
