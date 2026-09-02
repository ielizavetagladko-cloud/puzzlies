#!/bin/zsh
# Крок 3: перерахувати каталог для бази й покласти SQL у буфер обміну.
cd "$(dirname "$0")"
export PATH="$HOME/.local/node/bin:$PATH"
# Без UTF-8 локалі pbcopy псує кирилицю та емодзі.
export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8

echo "Цей крок більше не потрібен у звичайному циклі:"
echo "«2-apply.command» тепер записує каталог у базу сам."
echo ""
echo "Файл SQL усе одно перерахую — він знадобиться, якщо колись"
echo "доведеться відновлювати базу з нуля."
echo ""

npm run seed && pbcopy < supabase/seed.sql

echo "SQL перераховано і скопійовано в буфер ($(grep -c '' supabase/seed.sql) рядків)."
echo ""
read -s -k "?Натисніть будь-яку клавішу, щоб закрити… "
