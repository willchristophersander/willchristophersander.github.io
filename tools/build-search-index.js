#!/usr/bin/env node
/**
 * Build search-index.json from site HTML pages.
 * Run from repo root: node tools/build-search-index.js
 * Output: assets/search-index.json
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PAGES = [
  "index.html",
  "projects.html",
  "code-reviews.html",
  "coursework.html",
  "experience.html",
  "contact.html",
  "resume.html",
];

function extractTitle(html) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? m[1].replace(/\s+/g, " ").trim() : "";
}

function extractSearchableText(html) {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (!bodyMatch) return "";
  let text = bodyMatch[1]
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text;
}

const index = [];

for (const file of PAGES) {
  const path = join(ROOT, file);
  try {
    const html = readFileSync(path, "utf-8");
    const title = extractTitle(html);
    const text = extractSearchableText(html);
    index.push({ url: file, title, text });
  } catch (err) {
    console.warn("Skip", file, err.message);
  }
}

const outPath = join(ROOT, "assets", "search-index.json");
writeFileSync(outPath, JSON.stringify(index), "utf-8");
console.log("Wrote", outPath, "(" + index.length, "pages)");
