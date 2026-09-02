#!/usr/bin/env node
/**
 * Adds pictures to the catalogue.
 *
 *   npm run images:scan    — look at content/incoming, report problems,
 *                            write a draft plan you can edit
 *   npm run images:apply   — process the pictures and add them to the catalogue
 *
 * Two steps on purpose: `scan` never touches anything but the plan, so you can
 * see what would happen — and fix titles, prices and categories — before any
 * file is written.
 */

import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import sharp from "sharp";

const ROOT = process.cwd();
const INCOMING = path.join(ROOT, "content/incoming");
const PLAN = path.join(ROOT, "content/plan.json");
const OUTPUT = path.join(ROOT, "public/puzzles");
const BUCKET = "puzzles";
const CATALOG = path.join(ROOT, "src/data/catalog.json");

/** Puzzles are cut on a 4:3 board, so everything is cropped to that. */
const RATIO = 4 / 3;
/** 300 pieces over 2400px is 80px a piece — comfortable to pick up. */
const TARGET_WIDTH = 2400;
/** Below this the hardest difficulty turns to mush. */
const MIN_WIDTH = 1600;

const EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".tif", ".tiff"]);

const ACCENTS = ["mint", "sky", "lilac", "peach", "blush"];

// ------------------------------------------------------------------ supabase

/** Reads .env.local without pulling in a dependency just for that. */
async function readEnv() {
  const env = {};
  try {
    const raw = await readFile(path.join(ROOT, ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (match) env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    /* no .env.local — the catalogue is written to disk only */
  }
  return env;
}

/**
 * Writes rows straight into Supabase.
 *
 * Needs the service key, because the catalogue tables are read-only to everyone
 * else — which is the point: prices live where the browser cannot reach them.
 */
async function upsert(env, table, rows) {
  const response = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(rows),
  });
  if (!response.ok) {
    throw new Error(`${table}: ${response.status} ${await response.text()}`);
  }
}

/** Puts one processed file into the bucket, replacing whatever was there. */
async function uploadToStorage(env, name, body) {
  const response = await fetch(
    `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodeURIComponent(name)}`,
    {
      method: "POST",
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
        // Re-uploading the same name replaces the file rather than failing,
        // so fixing a picture is just running the pipeline again.
        "x-upsert": "true",
      },
      body,
    },
  );
  if (!response.ok) throw new Error(`${name}: ${response.status} ${await response.text()}`);
  return `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${encodeURIComponent(name)}`;
}

// --------------------------------------------------------------------- utils

const say = (...parts) => console.log(...parts);
const warn = (...parts) => console.log("  ⚠️ ", ...parts);
const fail = (message) => {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
};

async function readJson(file, fallback) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return fallback;
  }
}

async function writeJson(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

/** "Весняне цвітіння 2.png" → "vesniane-tsvitinnia-2" */
function slugify(input) {
  const map = {
    а: "a", б: "b", в: "v", г: "h", ґ: "g", д: "d", е: "e", є: "ie", ж: "zh", з: "z",
    и: "y", і: "i", ї: "i", й: "i", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p",
    р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh",
    щ: "shch", ь: "", ю: "iu", я: "ia", ы: "y", э: "e", ъ: "",
  };
  return input
    .toLowerCase()
    .replace(/[а-яёіїєґы-я]/g, (char) => map[char] ?? char)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function titleFromFile(file) {
  return path
    .basename(file, path.extname(file))
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function walk(dir) {
  const found = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return found;
  }
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await walk(full)));
    else if (EXTENSIONS.has(path.extname(entry.name).toLowerCase())) found.push(full);
  }
  return found;
}

// ---------------------------------------------------------------------- scan

async function scan() {
  if (!existsSync(INCOMING)) {
    await mkdir(INCOMING, { recursive: true });
    say(`Створив теку ${path.relative(ROOT, INCOMING)}`);
  }

  const files = (await walk(INCOMING)).sort();
  if (files.length === 0) {
    say(`\nУ ${path.relative(ROOT, INCOMING)} немає зображень.`);
    say("Складіть їх у підтеки за категоріями, наприклад content/incoming/nature/, і запустіть знову.\n");
    return;
  }

  const catalog = await readJson(CATALOG, { categories: [], puzzles: [] });
  const previous = await readJson(PLAN, { categories: [], items: [] });
  const knownCategories = new Set(catalog.categories.map((category) => category.id));
  const takenIds = new Set(catalog.puzzles.map((puzzle) => puzzle.id));

  // A picture that moved to another folder is still the same picture, so it is
  // matched by name as well as by path — otherwise renaming a category folder
  // would silently throw away the titles and prices already filled in.
  const byFile = new Map(previous.items.map((item) => [item.file, item]));
  const basenameCounts = new Map();
  for (const item of previous.items) {
    const name = path.basename(item.file);
    basenameCounts.set(name, (basenameCounts.get(name) ?? 0) + 1);
  }
  const byBasename = new Map(
    previous.items
      .filter((item) => basenameCounts.get(path.basename(item.file)) === 1)
      .map((item) => [path.basename(item.file), item]),
  );

  const items = [];
  const newCategories = [...previous.categories];

  say(`\nЗнайдено зображень: ${files.length}\n`);

  for (const file of files) {
    const relative = path.relative(INCOMING, file);
    const folder = path.dirname(relative).split(path.sep)[0];
    const category = folder === "." ? "" : folder;
    const kept = byFile.get(relative) ?? byBasename.get(path.basename(relative));
    const moved = kept && kept.file !== relative;

    let meta;
    try {
      meta = await sharp(file).metadata();
    } catch {
      say(`✖ ${relative}`);
      warn("не вдалося прочитати файл — пропускаю");
      continue;
    }

    const warnings = [];
    if (!meta.width || !meta.height) warnings.push("невідомий розмір");
    if (meta.width && meta.width < MIN_WIDTH) {
      warnings.push(
        `ширина ${meta.width}px замала — для 300 шматочків треба від ${MIN_WIDTH}px`,
      );
    }
    if (meta.width && meta.height) {
      const ratio = meta.width / meta.height;
      const loss = Math.round((1 - Math.min(ratio, RATIO) / Math.max(ratio, RATIO)) * 100);
      if (loss > 12) warnings.push(`при обрізанні до 4:3 втратиться близько ${loss}% кадру`);
    }

    if (category && !knownCategories.has(category)) {
      if (!newCategories.some((item) => item.id === category)) {
        newCategories.push({
          id: category,
          slug: category,
          title: { uk: category, en: category },
          blurb: { uk: "", en: "" },
          icon: "🧩",
          accent: ACCENTS[newCategories.length % ACCENTS.length],
        });
      }
      const declared = newCategories.find((item) => item.id === category);
      const named = declared && declared.title?.uk?.trim() && declared.title.uk !== category;
      if (!named) {
        warnings.push(`нова категорія «${category}» — заповніть її назву в plan.json`);
      } else {
        say(`     нова категорія «${declared.title.uk}» буде створена`);
      }
    }
    if (!category) warnings.push("файл лежить не в теці категорії");

    const title = titleFromFile(relative);
    let id = kept?.id ?? `${category || "puzzle"}-${slugify(title)}`;
    // The id becomes both the file name and the public URL, so an id still
    // carrying a different category is corrected now rather than living on
    // forever. The prefix is compared against the categories that exist, since
    // the plan's own category may already have been edited by hand.
    const prefix = [...knownCategories, ...newCategories.map((item) => item.id)].find(
      (name) => name !== category && id.startsWith(`${name}-`),
    );
    if (category && prefix) id = `${category}-${id.slice(prefix.length + 1)}`;
    while (!kept && (takenIds.has(id) || items.some((item) => item.id === id))) id = `${id}-2`;

    items.push({
      file: relative,
      id,
      category,
      title: kept?.title ?? { uk: title, en: title },
      access: kept?.access ?? "points",
      pointsCost: kept?.pointsCost ?? 200,
      priceCents: kept?.priceCents ?? 125,
      license: kept?.license ?? "own",
      skip: kept?.skip ?? false,
      source: { width: meta.width ?? 0, height: meta.height ?? 0 },
      warnings,
    });

    say(`${warnings.length ? "•" : "✓"} ${relative}  →  ${id}  (${meta.width}×${meta.height})`);
    if (moved) say(`     перенесено з ${kept.file} — ваші правки збережено`);
    warnings.forEach((message) => warn(message));
  }

  await writeJson(PLAN, { categories: newCategories, items });

  const problems = items.filter((item) => item.warnings.length > 0).length;
  say(`\nПлан записано: ${path.relative(ROOT, PLAN)}`);
  say(`Готово до додавання: ${items.length - problems}, з зауваженнями: ${problems}\n`);
  say("Далі: відредагуйте назви, категорії й ціни у plan.json, потім `npm run images:apply`.\n");
}

// --------------------------------------------------------------------- apply

async function apply() {
  const plan = await readJson(PLAN, null);
  if (!plan) fail(`Немає ${path.relative(ROOT, PLAN)} — спершу запустіть \`npm run images:scan\`.`);

  const catalog = await readJson(CATALOG, { categories: [], puzzles: [] });
  const items = plan.items.filter((item) => !item.skip);
  if (items.length === 0) fail("У плані немає жодного зображення для додавання.");

  // New categories first, so the puzzles below have somewhere to belong.
  for (const category of plan.categories ?? []) {
    if (catalog.categories.some((existing) => existing.id === category.id)) continue;
    if (!category.title?.uk?.trim() || !category.title?.en?.trim()) {
      fail(`Категорія «${category.id}» без назви. Заповніть title.uk і title.en у plan.json.`);
    }
    catalog.categories.push(category);
    say(`+ категорія ${category.id}`);
  }

  const categoryIds = new Set(catalog.categories.map((category) => category.id));
  for (const item of items) {
    if (!existsSync(path.join(INCOMING, item.file))) {
      fail(
        `Файла «${item.file}» більше немає — його перейменували або перенесли.\n` +
          "  Запустіть `npm run images:scan` ще раз: план оновиться, а ваші правки збережуться.",
      );
    }
    if (!categoryIds.has(item.category)) {
      fail(`«${item.file}»: невідома категорія «${item.category}».`);
    }
    if (item.access === "points" && !(item.pointsCost > 0)) {
      fail(`«${item.id}»: для access "points" потрібна ціна pointsCost.`);
    }
  }

  await mkdir(OUTPUT, { recursive: true });

  const env = await readEnv();
  const canWrite = Boolean(env.SUPABASE_SERVICE_ROLE_KEY && env.NEXT_PUBLIC_SUPABASE_URL);

  for (const item of items) {
    const source = path.join(INCOMING, item.file);
    const target = path.join(OUTPUT, `${item.id}.jpg`);

    const image = sharp(source).rotate();
    const meta = await image.metadata();
    const width = Math.min(TARGET_WIDTH, meta.width ?? TARGET_WIDTH);
    const height = Math.round(width / RATIO);

    await image
      // "cover" fills the 4:3 frame and trims the overflow, so no letterboxing
      // ever reaches the board.
      .resize(width, height, { fit: "cover", position: "attention" })
      .jpeg({ quality: 82, mozjpeg: true })
      .toFile(target);

    // The bucket is the home for pictures; the local copy stays as a source
    // for re-processing and as a fallback if storage is unreachable.
    let imageUrl = `/puzzles/${item.id}.jpg`;
    if (canWrite) {
      try {
        imageUrl = await uploadToStorage(env, `${item.id}.jpg`, await readFile(target));
      } catch (error) {
        warn(`не вдалося завантажити у сховище: ${error.message}`);
      }
    }

    const entry = {
      id: item.id,
      categoryId: item.category,
      title: item.title,
      image: imageUrl,
      width,
      height,
      access: item.access,
      ...(item.access === "points" ? { pointsCost: item.pointsCost } : null),
      ...(item.access === "paid" ? { priceCents: item.priceCents } : null),
      license: item.license,
    };

    const index = catalog.puzzles.findIndex((puzzle) => puzzle.id === item.id);
    if (index >= 0) catalog.puzzles[index] = entry;
    else catalog.puzzles.push(entry);

    say(`✓ ${item.id}  ${width}×${height}${imageUrl.startsWith("http") ? "  → сховище" : ""}`);
  }

  await writeJson(CATALOG, catalog);
  say(`\nКаталог оновлено: ${catalog.puzzles.length} пазлів, ${catalog.categories.length} категорій.`);

  if (canWrite) {
    try {
      await syncCatalogue(env, catalog);
      say("✓ база оновлена — SQL вручну запускати не треба");
      say("\nГотово: картинки вже на сайті, деплой не потрібен.\n");
      return;
    } catch (error) {
      warn(`не вдалося записати в базу: ${error.message}`);
      warn("каталог на диску оновлено — далі старим способом, через SQL");
    }
  } else {
    warn("немає SUPABASE_SERVICE_ROLE_KEY у .env.local — записати в базу не можу");
  }

  say("\nЩо далі:");
  say("  1. npm run seed          — оновити supabase/seed.sql");
  say("  2. запустіть seed.sql у SQL Editor Supabase");
  say("  3. «4-publish.command» — викласти картинки на сайт\n");
}

/** Mirrors the whole catalogue into the database. */
async function syncCatalogue(env, catalog) {
  await upsert(
    env,
    "categories",
    catalog.categories.map((category, index) => ({
      id: category.id,
      title_uk: category.title.uk,
      title_en: category.title.en,
      blurb_uk: category.blurb?.uk ?? "",
      blurb_en: category.blurb?.en ?? "",
      icon: category.icon ?? "🧩",
      accent: category.accent ?? "mint",
      sort_order: index,
    })),
  );
  await upsert(
    env,
    "puzzles",
    catalog.puzzles.map((puzzle, index) => ({
      id: puzzle.id,
      category_id: puzzle.categoryId,
      title_uk: puzzle.title.uk,
      title_en: puzzle.title.en,
      image: puzzle.image,
      width: puzzle.width,
      height: puzzle.height,
      access: puzzle.access,
      points_cost: puzzle.pointsCost ?? null,
      price_cents: puzzle.priceCents ?? null,
      license: puzzle.license ?? "demo",
      sort_order: index,
      is_active: true,
    })),
  );
}

// -------------------------------------------------------------------- upload

/**
 * Moves pictures that still live in the repository into the bucket.
 *
 * A one-off for the pictures added before storage existed, but written to be
 * safe to run at any time: it only touches entries still pointing at a local
 * path.
 */
async function upload() {
  const env = await readEnv();
  if (!env.SUPABASE_SERVICE_ROLE_KEY || !env.NEXT_PUBLIC_SUPABASE_URL) {
    fail("Потрібен SUPABASE_SERVICE_ROLE_KEY у .env.local.");
  }

  const catalog = await readJson(CATALOG, { categories: [], puzzles: [] });
  const pending = catalog.puzzles.filter((puzzle) => !puzzle.image.startsWith("http"));

  if (pending.length === 0) {
    say("\nУсі картинки вже у сховищі.\n");
    return;
  }

  say(`\nПереношу у сховище: ${pending.length}\n`);

  for (const puzzle of pending) {
    const local = path.join(ROOT, "public", puzzle.image.replace(/^\//, ""));
    if (!existsSync(local)) {
      warn(`${puzzle.id}: немає файлу ${puzzle.image} — пропускаю`);
      continue;
    }
    try {
      puzzle.image = await uploadToStorage(env, `${puzzle.id}.jpg`, await readFile(local));
      say(`✓ ${puzzle.id}`);
    } catch (error) {
      warn(`${puzzle.id}: ${error.message}`);
    }
  }

  await writeJson(CATALOG, catalog);
  await syncCatalogue(env, catalog);
  say("\nГотово. Каталог у базі тепер посилається на сховище.\n");
}

// ---------------------------------------------------------------------- main

const command = process.argv[2];
if (command === "scan") await scan();
else if (command === "apply") await apply();
else if (command === "upload") await upload();
else {
  say("\nВикористання:\n  npm run images:scan\n  npm run images:apply\n  npm run images:upload\n");
  process.exit(1);
}
