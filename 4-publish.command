#!/bin/zsh
# Крок 4: викласти зміни на GitHub — Vercel оновить сайт сам.
cd "$(dirname "$0")"
export PATH="$HOME/.local/bin:$HOME/.local/node/bin:$PATH"
export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8

echo "Зміни, які буде викладено:"
echo ""
git status --short
echo ""

if [ -z "$(git status --porcelain)" ]; then
  echo "Змін немає — викладати нічого."
  read -s -k "?Натисніть будь-яку клавішу… "
  exit 0
fi

read "answer?Викласти ці зміни на сайт? (y/n) "
if [ "$answer" != "y" ]; then
  echo "Скасовано, нічого не змінено."
  read -s -k "?Натисніть будь-яку клавішу… "
  exit 0
fi

read "message?Опис змін (Enter — «Нові картинки»): "
git add -A
git commit -q -m "${message:-Нові картинки}"
git push -q origin main && echo "" && echo "Готово. Vercel оновить сайт за 1–2 хвилини."

echo ""
read -s -k "?Натисніть будь-яку клавішу, щоб закрити… "
