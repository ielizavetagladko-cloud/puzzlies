#!/bin/zsh
# Крок 1: подивитися, які картинки лежать у content/incoming, і скласти план.
# Нічого не змінює, окрім файлу content/plan.json.
cd "$(dirname "$0")"
export PATH="$HOME/.local/node/bin:$PATH"

npm run images:scan

open content/plan.json 2>/dev/null
echo ""
echo "План відкрито в редакторі. Відредагуйте назви, категорію й ціни, збережіть (Cmd+S),"
echo "а тоді запустіть «2-apply.command»."
echo ""
read -s -k "?Натисніть будь-яку клавішу, щоб закрити… "
