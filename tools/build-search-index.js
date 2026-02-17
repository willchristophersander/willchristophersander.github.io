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

/** Canonical page for a modal id (so we know when to strip it from another page's text). */
function modalCanonicalPageForStrip(id) {
  if (id.startsWith("project-")) return "projects.html";
  if (id.startsWith("course-")) return "coursework.html";
  return null;
}

/** Remove from body HTML any modal whose id is canonical on another page, to avoid duplicate search hits. */
function stripCanonicalModalsFromBody(bodyHtml, currentFile) {
  const re = /<div[^>]*\bclass="[^"]*modal[^"]*"[^>]*\bid="([^"]+)"[^>]*>/gi;
  const ranges = [];
  let m;
  while ((m = re.exec(bodyHtml)) !== null) {
    const id = m[1];
    const canonical = modalCanonicalPageForStrip(id);
    if (canonical && canonical !== currentFile) {
      const openStart = bodyHtml.lastIndexOf("<div", m.index);
      const end = findClosingDiv(bodyHtml, openStart);
      if (end !== -1) ranges.push([openStart, end]);
    }
  }
  let result = bodyHtml;
  for (let i = ranges.length - 1; i >= 0; i--) {
    const [a, b] = ranges[i];
    result = result.slice(0, a) + " " + result.slice(b);
  }
  return result;
}

function extractSearchableText(html, file) {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (!bodyMatch) return "";
  let body = bodyMatch[1];
  body = stripCanonicalModalsFromBody(body, file);
  let text = body
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text;
}

/** Page title for display (e.g. "Projects" from "Projects | Will Christopher Sander") */
function displayTitle(fullTitle) {
  const pipe = fullTitle.indexOf("|");
  return pipe > 0 ? fullTitle.slice(0, pipe).trim() : fullTitle;
}

/** Find matching closing </div> from start of an opening <div> by counting depth. */
function findClosingDiv(html, openTagStart) {
  let depth = 1;
  const reOpen = /<div[\s>]/gi;
  const reClose = /<\/div>/gi;
  reOpen.lastIndex = openTagStart + 1;
  reClose.lastIndex = openTagStart + 1;
  let nextOpen = reOpen.exec(html);
  let nextClose = reClose.exec(html);
  while (nextOpen || nextClose) {
    if (nextClose && (!nextOpen || nextClose.index < nextOpen.index)) {
      depth--;
      if (depth === 0) return nextClose.index;
      reClose.lastIndex = nextClose.index + 1;
      nextClose = reClose.exec(html);
    } else if (nextOpen) {
      depth++;
      reOpen.lastIndex = nextOpen.index + 1;
      nextOpen = reOpen.exec(html);
    }
  }
  return -1;
}

function decodeHtmlEntities(str) {
  return String(str)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'");
}

/** Extract first <h2> or <h1> text from a chunk of HTML. */
function firstHeadingText(html) {
  const m = html.match(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/i);
  if (!m) return "";
  return decodeHtmlEntities(m[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim());
}

/** Strip tags to plain text for search. */
function innerText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Canonical page for a modal id (so search links open the right page). */
function modalCanonicalPage(id, currentFile) {
  if (id.startsWith("project-")) return "projects.html";
  if (id.startsWith("course-")) return "coursework.html";
  return currentFile;
}

/** Find all modals (div with class="modal" and id), return index entries. Only one entry per modal, from its canonical page. */
function extractModals(html, file, pageTitle) {
  const entries = [];
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (!bodyMatch) return entries;
  const body = bodyMatch[1];
  const re = /<div[^>]*\bclass="[^"]*modal[^"]*"[^>]*\bid="([^"]+)"[^>]*>/gi;
  let m;
  while ((m = re.exec(body)) !== null) {
    const id = m[1];
    const canonical = modalCanonicalPage(id, file);
    if (canonical !== file) continue;
    const openStart = body.lastIndexOf("<div", m.index);
    const end = findClosingDiv(body, openStart);
    if (end === -1) continue;
    const block = body.slice(openStart, end);
    const sub = firstHeadingText(block);
    const text = innerText(block);
    if (text.length > 0) {
      entries.push({
        url: canonical + "#" + id,
        title: displayTitle(pageTitle),
        subtitle: sub || null,
        text,
      });
    }
  }
  return entries;
}

/** Extract id from h2 opening tag if present (e.g. <h2 id="section-id">). */
function sectionIdFromHeadingBlock(headingBlock) {
  const match = headingBlock.match(/<h2[^>]*\bid="([^"]+)"[^>]*>/i);
  return match ? match[1] : null;
}

/** Split body by <h2>, create one entry per section (heading + content until next h2). Use section id in URL when present. */
function extractSections(html, file, pageTitle) {
  const entries = [];
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (!bodyMatch) return entries;
  const body = bodyMatch[1];
  const parts = body.split(/(<h2[^>]*>[\s\S]*?<\/h2>)/gi);
  for (let i = 1; i < parts.length; i += 2) {
    const headingBlock = parts[i];
    const contentBlock = parts[i + 1] || "";
    const sub = decodeHtmlEntities(headingBlock.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/i, "$1").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim());
    const text = innerText(headingBlock + contentBlock);
    const sectionId = sectionIdFromHeadingBlock(headingBlock);
    if (sub && text.length > 20) {
      entries.push({
        url: sectionId ? file + "#" + sectionId : file,
        title: displayTitle(pageTitle),
        subtitle: sub,
        text,
      });
    }
  }
  return entries;
}

const index = [];

for (const file of PAGES) {
  const path = join(ROOT, file);
  try {
    const html = readFileSync(path, "utf-8");
    const fullTitle = extractTitle(html);
    const title = displayTitle(fullTitle);
    const text = extractSearchableText(html, file);
    index.push({ url: file, title, text });
    index.push(...extractModals(html, file, fullTitle));
    index.push(...extractSections(html, file, fullTitle));
  } catch (err) {
    console.warn("Skip", file, err.message);
  }
}

const outPath = join(ROOT, "assets", "search-index.json");
writeFileSync(outPath, JSON.stringify(index), "utf-8");
console.log("Wrote", outPath, "(" + index.length, "entries)");
