#!/bin/zsh
# Крок 3: перерахувати каталог для бази й покласти SQL у буфер обміну.
cd "$(dirname "$0")"
export PATH="$HOME/.local/node/bin:$PATH"
# Без UTF-8 локалі pbcopy псує кирилицю та емодзі.
export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8

npm run seed && pbcopy < supabase/seed.sql

echo ""
echo "SQL скопійовано в буфер обміну ($(grep -c '' supabase/seed.sql) рядків)."
echo ""
echo "Відкрийте Supabase → SQL Editor → New query → Cmd+V → Run."
echo "Потім запустіть «4-publish.command», щоб викласти зміни на сайт."
echo ""
read -s -k "?Натисніть будь-яку клавішу, щоб закрити… "
