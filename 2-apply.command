#!/bin/zsh
# Крок 2: обробити картинки за планом і додати їх у каталог.
cd "$(dirname "$0")"
export PATH="$HOME/.local/node/bin:$PATH"

npm run images:apply || {
  echo ""
  read -s -k "?Щось пішло не так. Натисніть будь-яку клавішу… "
  exit 1
}

echo ""
echo "Далі: «3-seed.command», щоб оновити базу."
echo ""
read -s -k "?Натисніть будь-яку клавішу, щоб закрити… "
