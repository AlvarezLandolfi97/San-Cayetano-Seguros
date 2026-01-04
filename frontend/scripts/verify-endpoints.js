#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SRC_ROOT = path.join(__dirname, "..", "src");
const CONTRACT_CANDIDATES = [
  path.join(__dirname, "..", "..", "frontend_backend_contract.md"),
  path.join(__dirname, "..", "docs", "frontend_backend_contract.md"),
  path.join(__dirname, "..", "..", "docs", "frontend_backend_contract.md"),
];

const strictMode =
  process.env.STRICT === "1" || process.argv.includes("--strict");
const verboseMode = process.env.VERBOSE === "1";

function normalizePathEntry(raw) {
  let p = raw.trim();
  if (!p) return "";
  if (!p.startsWith("/")) {
    p = `/${p}`;
  }
  if (p.startsWith("/api")) {
    p = p.slice(4);
  }
  if (!p.startsWith("/")) {
    p = `/${p}`;
  }
  return p.replace(/\/$/, "");
}

function generalizePath(p) {
  return p.replace(/\{\w+\}/g, "{param}");
}

function loadContract() {
  for (const candidate of CONTRACT_CANDIDATES) {
    if (fs.existsSync(candidate)) {
      const content = fs.readFileSync(candidate, "utf-8");
      const paths = new Set();
      content.split("\n").forEach((line) => {
        if (!line.startsWith("|")) return;
        const cells = line.split("|").map((cell) => cell.trim());
        if (cells.length < 4) return;
        const pathCell = cells[3] || "";
        if (!pathCell || pathCell === "---") return;
        const match = pathCell.match(/`([^`]+)`/);
        const raw = match ? match[1] : pathCell;
        const normalized = normalizePathEntry(raw);
        if (normalized) paths.add(normalized);
      });
      return { path: candidate, paths };
    }
  }
  throw new Error("frontend_backend_contract.md not found.");
}

function walk(dir, list = []) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, list);
    } else if (entry.isFile() && /\.(js|jsx|ts|tsx)$/.test(entry.name)) {
      list.push(full);
    }
  });
  return list;
}

function getLineNumber(content, idx) {
  return content.slice(0, idx).split("\n").length;
}

const API_CALL_RE =
  /api(?:Public|Hybrid)?\.(get|post|put|patch|delete)\s*\(\s*(['"`])([^'"`]+)\2/gi;
const TEMPLATE_RE =
  /api(?:Public|Hybrid)?\.(get|post|put|patch|delete)\s*\(\s*`([^`]+)`/gi;
const FETCH_RE = /(fetch|axios\.(?:get|post|put|patch|delete))\s*\(\s*(['"`])([^'"`]+)\2/gi;

function relativePath(raw) {
  return raw.startsWith("/") && !raw.startsWith("//") && !raw.includes("http");
}

function normalizeCodePath(raw) {
  const templated = raw.replace(/\$\{[^}]+\}/g, "{param}");
  return normalizePathEntry(templated);
}

function extractEndpoints() {
  const files = walk(SRC_ROOT);
  const endpoints = new Map();
  const dynamic = [];
  const fetchWarnings = [];
  files.forEach((file) => {
    const content = fs.readFileSync(file, "utf-8");
    let match;
    while ((match = API_CALL_RE.exec(content)) !== null) {
      const [, method, , raw] = match;
      if (!relativePath(raw)) continue;
      const normalized = normalizeCodePath(raw);
      endpoints.set(normalized, endpoints.get(normalized) || []);
      endpoints.get(normalized).push({
        file,
        method,
        line: getLineNumber(content, match.index),
      });
    }
    while ((match = TEMPLATE_RE.exec(content)) !== null) {
      const [, method, raw] = match;
      if (!relativePath(raw)) continue;
      const normalized = normalizeCodePath(raw);
      if (!normalized) continue;
      dynamic.push({
        file,
        method,
        normalized,
        snippet: match[0].replace(/\s+/g, " ").trim(),
        line: getLineNumber(content, match.index),
      });
    }
    while ((match = FETCH_RE.exec(content)) !== null) {
      const raw = match[3];
      if (!relativePath(raw)) continue;
      fetchWarnings.push({
        file,
        line: getLineNumber(content, match.index),
        snippet: match[0].replace(/\s+/g, " ").trim(),
      });
    }
  });
  return { endpoints, dynamic, fetchWarnings };
}

function logAllowedDynamic(dynamicList) {
  if (!dynamicList.length || !verboseMode) return;
  console.info("ℹ️ Documented dynamic endpoint calls (matches contract):");
  dynamicList.forEach((d) => {
    const method = (d.method || "get").toUpperCase();
    console.info(`  - ${method} ${d.normalized} (${d.file}:${d.line})`);
  });
}

function logUnknownDynamic(dynamicList) {
  if (!dynamicList.length) return false;
  const header = strictMode
    ? "❌ Dynamic endpoint calls not documented (STRICT mode - aborting):"
    : "⚠️ Dynamic endpoint calls not documented (review manually):";
  console.warn(header);
  dynamicList.forEach((d) => {
    const method = (d.method || "get").toUpperCase();
    console.warn(`  - ${method} ${d.normalized} (${d.file}:${d.line})`);
  });
  return strictMode;
}

function logFetchWarnings(warnList) {
  if (!warnList.length) return;
  console.warn("⚠️ fetch/axios calls outside api wrappers:");
  warnList.forEach((d) => {
    console.warn(`  - ${d.file}:${d.line}: ${d.snippet}`);
  });
}

function main() {
  let contract;
  try {
    contract = loadContract();
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  const { endpoints, dynamic, fetchWarnings } = extractEndpoints();
  const codePaths = new Set(endpoints.keys());
  const contractPaths = contract.paths;
  const contractGeneral = new Set(
    [...contractPaths].map((p) => generalizePath(p))
  );
  const codeGeneral = new Set([...codePaths].map((p) => generalizePath(p)));
  const allowedDynamic = [];
  const unknownDynamic = [];
  dynamic.forEach((entry) => {
    if (!entry.normalized) return;
    const general = generalizePath(entry.normalized);
    if (contractGeneral.has(general)) {
      allowedDynamic.push(entry);
      return;
    }
    unknownDynamic.push(entry);
  });

  const missing = [...codePaths].filter(
    (p) => !contractGeneral.has(generalizePath(p))
  );
  const unused = [...contractPaths].filter(
    (p) => !codeGeneral.has(generalizePath(p))
  );

  if (unused.length) {
    console.warn("⚠️ Documented but unused endpoints:");
    unused.forEach((p) => console.warn(`  - ${p}`));
  }

  logFetchWarnings(fetchWarnings);

  logAllowedDynamic(allowedDynamic);
  const unknownDynamicError = logUnknownDynamic(unknownDynamic);

  if (missing.length) {
    console.error("❌ Missing endpoints in contract:");
    missing.forEach((p) => {
      const callers = endpoints.get(p) || [];
      callers.forEach(({ file, method, line }) => {
        console.error(`  - ${method.toUpperCase()} ${p} (${file}:${line})`);
      });
    });
    console.error(`Run 'npm run verify:endpoints' after adding the missing rows.`);
    process.exit(1);
  }

  if (unknownDynamicError) {
    console.error("Dynamic endpoint policy enforced in STRICT mode.");
    process.exit(1);
  }

  console.log("✅ Frontend endpoints are documented.");
}

main();
