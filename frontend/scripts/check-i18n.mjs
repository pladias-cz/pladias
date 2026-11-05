#!/usr/bin/env node

/**
 * i18n audit frontendu.
 *
 * Chyby (exit kód 1):
 *  - klíč použitý v kódu (`t("...")` / `i18nKey: "..."`) chybí v cs/translation.json
 *  - en/pl/de obsahuje klíč neznámý pro cs
 *
 * Informativní (CI neblokují):
 *  - chybějící překlady v en/pl/de (runtime je fallback na cs, viz fallbackLng v src/i18n/i18n.tsx)
 *  - cs klíče nepoužité v kódu (mohou být dynamické – viz DYNAMIC_KEY_PREFIXES)
 *
 * Spuštění: npm run i18n:check
 */

import {readdirSync, readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {extname, join} from "node:path";

const frontendRoot = fileURLToPath(new URL("..", import.meta.url));
const LOCALES = ["cs", "en", "pl", "de"];
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);

// Klíče používané jen nepřímo (např. translationKey posílaný backendem, skládané klíče
// bez literálového prefixu). Rozšiřovat, až se objeví nový případ.
const DYNAMIC_KEY_PREFIXES = [];

/** Převede vnořený JSON na množinu plochých klíčů ("a.b.c"). */
function flattenKeys(value, prefix = "", out = new Set()) {
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
        for (const [key, nested] of Object.entries(value)) {
            flattenKeys(nested, prefix ? `${prefix}.${key}` : key, out);
        }
    } else {
        out.add(prefix);
    }
    return out;
}

function walkSources(dir) {
    const files = [];
    for (const entry of readdirSync(dir, {withFileTypes: true})) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...walkSources(path));
        } else if (SOURCE_EXTENSIONS.has(extname(entry.name))) {
            files.push(path);
        }
    }
    return files;
}

function loadLocale(lang) {
    return JSON.parse(readFileSync(join(frontendRoot, `src/locales/${lang}/translation.json`), "utf8"));
}

const localeKeys = new Map(LOCALES.map((lang) => [lang, flattenKeys(loadLocale(lang))]));

// `t("...")` / `t('...')` – lookbehind vyloučí shody jako parseInt("..."), split("...").
// Volání `i18n.t("...")` v kódu není, všechny komponenty používají deklarovaný `t`.
const T_CALL = /(?<![A-Za-z0-9_$.])t\(\s*(["'])((?:\\.|(?!\1).)*)\1/g;
// `t(`prefix${...}`)` – dynamický klíč, známe jen statický prefix
const T_TEMPLATE = /(?<![A-Za-z0-9_$.])t\(\s*`([^`$]*)\$\{/g;
// klíče uložené v datových objektech (např. src/constants/core/status.ts)
const I18N_KEY_PROP = /\bi18nKey\s*:\s*(["'])([^"']+)\1/g;

const usedKeys = new Set();
const dynamicPrefixes = [];
for (const file of walkSources(join(frontendRoot, "src"))) {
    // komentáře odstraníme, aby se nekontrolovaly klíče uvedené jen v komentářích
    // (pouze celé řádky // a blokové /* */ – inline // necháváme, řetězce s URL by se poškodily)
    const source = readFileSync(file, "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/^[ \t]*\/\/.*$/gm, "");
    for (const match of source.matchAll(T_CALL)) {
        usedKeys.add(match[2]);
    }
    for (const match of source.matchAll(T_TEMPLATE)) {
        dynamicPrefixes.push(match[1]);
    }
    for (const match of source.matchAll(I18N_KEY_PROP)) {
        usedKeys.add(match[2]);
    }
}

const csKeys = localeKeys.get("cs");

const errors = [];
for (const key of [...usedKeys].sort()) {
    if (!csKeys.has(key)) {
        errors.push(`kód používá klíč chybějící v cs/translation.json: ${key}`);
    }
}
for (const lang of ["en", "pl", "de"]) {
    for (const key of [...localeKeys.get(lang)].sort()) {
        if (!csKeys.has(key)) {
            errors.push(`${lang}/translation.json obsahuje klíč neznámý pro cs: ${key}`);
        }
    }
}

const isUsed = (key) =>
    usedKeys.has(key)
    || dynamicPrefixes.some((prefix) => key.startsWith(prefix))
    || DYNAMIC_KEY_PREFIXES.some((prefix) => key.startsWith(prefix));
const unusedKeys = [...csKeys].filter((key) => !isUsed(key)).sort();

console.log(
    `i18n audit: cs má ${csKeys.size} klíčů, v kódu je přímo použito ${usedKeys.size}, `
    + `dynamických prefixů ${dynamicPrefixes.length}`,
);
for (const lang of ["en", "pl", "de"]) {
    const missing = [...csKeys].filter((key) => !localeKeys.get(lang).has(key));
    console.log(`info: ${lang} nemá ${missing.length} překladů (fallback na cs)`);
}
if (unusedKeys.length > 0) {
    console.log(`info: ${unusedKeys.length} cs klíčů není v kódu přímo použito (mohou být dynamické):`);
    for (const key of unusedKeys.slice(0, 50)) {
        console.log(`  ${key}`);
    }
    if (unusedKeys.length > 50) {
        console.log(`  … a dalších ${unusedKeys.length - 50}`);
    }
}

if (errors.length > 0) {
    console.error(`\ni18n audit našel ${errors.length} chyb:`);
    for (const error of errors) {
        console.error(`  ${error}`);
    }
    process.exit(1);
}
console.log("i18n audit: OK");