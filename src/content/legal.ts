import type { Locale } from "@/i18n/config";

/**
 * Privacy policy and terms.
 *
 * Written to describe what the site actually does today, not a generic
 * template: the data listed here is exactly what the schema in
 * supabase/migrations stores, and the processors are the services the app
 * really talks to. When any of that changes — a payment provider, an analytics
 * tool, an email sender — this file has to change with it.
 */

export const CONTACT_EMAIL = "ielizaveta.gladko@gmail.com";
export const LAST_UPDATED = "2026-09-02";

export type LegalSection = { heading: string; body: string[] };
export type LegalDocument = {
  title: string;
  intro: string;
  updatedLabel: string;
  sections: LegalSection[];
};

const uk: { privacy: LegalDocument; terms: LegalDocument } = {
  privacy: {
    title: "Політика конфіденційності",
    updatedLabel: "Оновлено",
    intro:
      "Пазлики — це гра, у якій збирають пазли. Ми збираємо мінімум даних: рівно стільки, скільки потрібно, щоб зберегти твій прогрес і відкриті картинки.",
    sections: [
      {
        heading: "Хто відповідає за твої дані",
        body: [
          `Сайтом опікується приватна особа. Питання щодо даних надсилай на ${CONTACT_EMAIL} — відповідаємо протягом 30 днів.`,
        ],
      },
      {
        heading: "Що ми збираємо",
        body: [
          "Якщо ти граєш як гість — нічого. Бали, зібрані пазли й незавершені дошки зберігаються лише у твоєму браузері й до нас не потрапляють.",
          "Якщо ти входиш в акаунт, ми зберігаємо: адресу електронної пошти; баланс балів та історію його змін; список відкритих і куплених картинок; час проходження, кількість спроб і збережені дошки.",
          "Наші постачальники також ведуть технічні журнали — IP-адреса, тип браузера, час запиту. Це стандартний захист від збоїв і зловживань.",
        ],
      },
      {
        heading: "Навіщо це потрібно",
        body: [
          "Пошта потрібна, щоб надіслати посилання для входу й підтвердити, що акаунт твій. Ігрові дані — щоб прогрес не зникав і був доступний з будь-якого пристрою. Історія покупок — щоб куплена картинка лишалася твоєю назавжди.",
          "Ми не використовуємо твої дані для реклами, не профілюємо тебе й нікому їх не продаємо.",
        ],
      },
      {
        heading: "Кому передаємо",
        body: [
          "Supabase — база даних і авторизація. Сервер розташований у Франкфурті, Німеччина.",
          "Vercel — хостинг сайту.",
          "Google — тільки якщо ти обираєш вхід через Google. Тоді Google повідомляє нам твою пошту й підтверджує особу; пароль ми не бачимо.",
          "Коли зʼявиться оплата, до списку додасться платіжний провайдер. Ця сторінка буде оновлена до того, як пройде перший платіж.",
        ],
      },
      {
        heading: "Файли cookie",
        body: [
          "Ми використовуємо лише необхідні cookie: сесію входу й запамʼятовування обраної мови. Рекламних і аналітичних трекерів на сайті немає, тому банера про згоду ти теж не побачиш.",
        ],
      },
      {
        heading: "Скільки зберігаємо",
        body: [
          "Поки існує твій акаунт. Якщо попросиш видалити його, ми видалимо профіль, прогрес і історію балів. Записи про оплати доведеться зберегти довше — цього вимагає податкове законодавство.",
        ],
      },
      {
        heading: "Твої права",
        body: [
          "Ти можеш попросити копію своїх даних, виправити їх або видалити акаунт. Достатньо написати на пошту вище з тієї адреси, на яку зареєстровано акаунт.",
          "Гостьовий прогрес видаляється кнопкою «Скинути прогрес» у профілі або очищенням даних сайту в браузері.",
        ],
      },
      {
        heading: "Діти",
        body: [
          "Гра підходить для будь-якого віку, але акаунт і покупки призначені для повнолітніх. Якщо дитині менше 16 років, акаунт має створювати хтось із батьків.",
        ],
      },
      {
        heading: "Зміни",
        body: [
          "Якщо політика зміниться, ми оновимо дату вгорі сторінки. Про суттєві зміни — наприклад появу нового постачальника — повідомимо на пошту.",
        ],
      },
    ],
  },
  terms: {
    title: "Умови користування",
    updatedLabel: "Оновлено",
    intro:
      "Коротко: грай скільки хочеш, бали заробляй чесно, куплені картинки лишаються твоїми. Нижче — те саме, але детальніше.",
    sections: [
      {
        heading: "Що це за сервіс",
        body: [
          "Пазлики — онлайн-гра, де ти збираєш пазли з картинок. Частина картинок безкоштовна, частина відкривається за бали, окремі — за гроші.",
        ],
      },
      {
        heading: "Акаунт",
        body: [
          "Грати можна без реєстрації. Акаунт потрібен, щоб прогрес зберігався на сервері й щоб покупки не зникли зі зміною браузера.",
          "Один акаунт — одна людина. Не передавай доступ і не створюй акаунти для обходу обмежень.",
        ],
      },
      {
        heading: "Бали",
        body: [
          "Бали — це ігрова умовність. Вони не є грошима, не мають грошової вартості, не обмінюються назад на гроші й не передаються між акаунтами.",
          "Бали нараховує сервер за завершені пазли. Спроби нарахувати їх в обхід гри — привід заблокувати акаунт.",
        ],
      },
      {
        heading: "Платні картинки",
        body: [
          "Купуючи картинку, ти отримуєш право збирати з неї пазл у Пазликах, необмежено в часі, поки працює сервіс.",
          "Це не купівля самого зображення: права на нього лишаються у автора, і ти не отримуєш ліцензії на друк, перепродаж чи будь-яке використання поза грою.",
        ],
      },
      {
        heading: "Оплата",
        body: [
          "Наразі оплата працює в тестовому режимі: гроші не списуються. Коли зʼявиться справжня оплата, ця сторінка буде оновлена — з описом платіжного провайдера, валюти й порядку повернення коштів.",
        ],
      },
      {
        heading: "Що не можна робити",
        body: [
          "Зламувати гру, автоматизувати збирання пазлів, вивантажувати зображення для використання поза сервісом, заважати роботі сайту.",
        ],
      },
      {
        heading: "Відповідальність",
        body: [
          "Сервіс надається як є. Ми намагаємось, щоб він працював без збоїв і щоб прогрес не губився, але не можемо цього гарантувати абсолютно. Радимо не сприймати ігрові бали як цінність, яку не можна втратити.",
        ],
      },
      {
        heading: "Звʼязок",
        body: [`З усіх питань: ${CONTACT_EMAIL}`],
      },
    ],
  },
};

const en: { privacy: LegalDocument; terms: LegalDocument } = {
  privacy: {
    title: "Privacy policy",
    updatedLabel: "Updated",
    intro:
      "Puzzlies is a jigsaw game. We collect the minimum: exactly what is needed to keep your progress and your unlocked pictures.",
    sections: [
      {
        heading: "Who is responsible for your data",
        body: [
          `The site is run by a private individual. For any question about your data write to ${CONTACT_EMAIL}; we answer within 30 days.`,
        ],
      },
      {
        heading: "What we collect",
        body: [
          "If you play as a guest, nothing. Points, solved puzzles and unfinished boards stay in your browser and never reach us.",
          "If you sign in, we store: your email address; your points balance and the history of changes to it; the list of pictures you unlocked or bought; completion times, attempt counts and saved boards.",
          "Our providers also keep technical logs — IP address, browser type, request time — as standard protection against failures and abuse.",
        ],
      },
      {
        heading: "Why we need it",
        body: [
          "The email address is used to send your sign-in link and to prove the account is yours. Game data keeps your progress from disappearing and makes it available on any device. Purchase records keep a bought picture yours for good.",
          "We do not use your data for advertising, we do not profile you, and we do not sell it to anyone.",
        ],
      },
      {
        heading: "Who we share it with",
        body: [
          "Supabase — database and authentication, hosted in Frankfurt, Germany.",
          "Vercel — website hosting.",
          "Google — only if you choose to sign in with Google. Google then tells us your email address and confirms your identity; we never see your password.",
          "When payments go live a payment provider will join this list. This page will be updated before the first payment is taken.",
        ],
      },
      {
        heading: "Cookies",
        body: [
          "Only the essential ones: your sign-in session and your language choice. There are no advertising or analytics trackers on this site, which is why you are not asked to accept a cookie banner.",
        ],
      },
      {
        heading: "How long we keep it",
        body: [
          "For as long as your account exists. Ask us to delete it and we remove your profile, progress and points history. Payment records have to be kept longer, because tax law requires it.",
        ],
      },
      {
        heading: "Your rights",
        body: [
          "You can ask for a copy of your data, have it corrected, or have your account deleted. Write to the address above from the email the account is registered to.",
          "Guest progress is removed with the “Reset progress” button in your profile, or by clearing this site's data in your browser.",
        ],
      },
      {
        heading: "Children",
        body: [
          "The game suits any age, but accounts and purchases are meant for adults. For anyone under 16, a parent should create the account.",
        ],
      },
      {
        heading: "Changes",
        body: [
          "If this policy changes we update the date at the top of the page. For significant changes — a new provider, for instance — we also send an email.",
        ],
      },
    ],
  },
  terms: {
    title: "Terms of use",
    updatedLabel: "Updated",
    intro:
      "In short: play as much as you like, earn points fairly, and pictures you buy stay yours. Below is the same in more detail.",
    sections: [
      {
        heading: "What this service is",
        body: [
          "Puzzlies is an online game where you solve jigsaw puzzles. Some pictures are free, some are unlocked with points, and a few are sold.",
        ],
      },
      {
        heading: "Your account",
        body: [
          "You can play without signing up. An account keeps your progress on the server and makes sure purchases survive a change of browser.",
          "One account, one person. Do not share access or create accounts to work around limits.",
        ],
      },
      {
        heading: "Points",
        body: [
          "Points are a game mechanic. They are not money, hold no monetary value, cannot be exchanged back into money, and cannot be transferred between accounts.",
          "Points are awarded by the server for finished puzzles. Attempts to award them outside the game are grounds for closing the account.",
        ],
      },
      {
        heading: "Paid pictures",
        body: [
          "Buying a picture gives you the right to solve it in Puzzlies, with no time limit, for as long as the service runs.",
          "It is not a purchase of the image itself: the rights stay with its author, and you receive no licence to print, resell or otherwise use it outside the game.",
        ],
      },
      {
        heading: "Payment",
        body: [
          "Payment currently runs in test mode and no money is charged. When real payment goes live this page will be updated with the provider, the currency and the refund terms.",
        ],
      },
      {
        heading: "What you may not do",
        body: [
          "Tamper with the game, automate solving, extract images for use outside the service, or interfere with the site's operation.",
        ],
      },
      {
        heading: "Liability",
        body: [
          "The service is provided as is. We work to keep it running and your progress safe, but cannot guarantee it absolutely. Please do not treat game points as something that cannot be lost.",
        ],
      },
      {
        heading: "Contact",
        body: [`For anything at all: ${CONTACT_EMAIL}`],
      },
    ],
  },
};

export const legal: Record<Locale, { privacy: LegalDocument; terms: LegalDocument }> = { uk, en };
