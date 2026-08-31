/* TLUXE Hairs — repository validation for a classic Shopify Liquid theme.
   No package.json. Node is used only as a syntax/JSON runner. */

'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const failures = [];

function rel(filePath) {
  return path.relative(ROOT, filePath).split(path.sep).join('/');
}

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === '.shopify') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function fail(message) {
  failures.push(message);
}

function mustExist(relativePath) {
  if (!fs.existsSync(path.join(ROOT, relativePath))) {
    fail('missing required file: ' + relativePath);
  }
}

function mustNotExist(relativePath) {
  if (fs.existsSync(path.join(ROOT, relativePath))) {
    fail('unexpected file for a Liquid theme: ' + relativePath);
  }
}

/* ---- Repository integrity ---- */
mustExist('layout/theme.liquid');
mustExist('templates/index.liquid');
mustExist('templates/product.liquid');
mustExist('templates/cart.liquid');
mustExist('templates/collection.liquid');
mustExist('templates/search.liquid');
mustExist('snippets/product-card.liquid');
mustExist('assets/tluxe.js');
mustExist('assets/tluxe.css');
mustExist('assets/sw.js');
mustExist('config/settings_schema.json');
mustExist('config/settings_data.json');
mustExist('locales/en.default.json');
mustExist('.github/workflows/theme-ci.yml');

mustNotExist('sections');
mustNotExist('package.json');
mustNotExist('package-lock.json');
mustNotExist('yarn.lock');
mustNotExist('.env');
mustNotExist('.github/workflows/node.js.yml');
mustNotExist('.github/workflows/npm-publish-github-packages.yml');
mustNotExist('.github/workflows/generator-generic-ossf-slsa3-publish.yml');

const files = walk(ROOT, []);

/* ---- JSON validity ---- */
const jsonFiles = files.filter((file) => file.endsWith('.json'));
for (const file of jsonFiles) {
  try {
    JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    fail('invalid JSON ' + rel(file) + ': ' + error.message);
  }
}

/* ---- JavaScript syntax ---- */
const jsFiles = files.filter((file) => file.endsWith('.js'));
for (const file of jsFiles) {
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
  } catch (error) {
    const detail = (error.stderr && error.stderr.toString()) || error.message;
    fail('JavaScript syntax error in ' + rel(file) + ': ' + detail.trim());
  }
}

/* ---- Practical CSS validity (balanced braces, ignoring strings/comments) ---- */
function cssBraceBalance(source) {
  let depth = 0;
  let inSingle = false;
  let inDouble = false;
  let inComment = false;
  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i];
    const next = source[i + 1];
    if (inComment) {
      if (ch === '*' && next === '/') {
        inComment = false;
        i += 1;
      }
      continue;
    }
    if (!inSingle && !inDouble && ch === '/' && next === '*') {
      inComment = true;
      i += 1;
      continue;
    }
    if (ch === '\\') {
      i += 1;
      continue;
    }
    if (!inDouble && ch === "'") {
      inSingle = !inSingle;
      continue;
    }
    if (!inSingle && ch === '"') {
      inDouble = !inDouble;
      continue;
    }
    if (inSingle || inDouble) continue;
    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth < 0) return 'closing brace without opening brace';
    }
  }
  if (inComment) return 'unclosed comment';
  if (inSingle || inDouble) return 'unclosed string';
  if (depth !== 0) return 'unbalanced braces (depth ' + depth + ')';
  return null;
}

const cssFiles = files.filter((file) => file.endsWith('.css'));
for (const file of cssFiles) {
  const source = fs.readFileSync(file, 'utf8');
  if (!source.trim()) {
    fail('empty CSS file: ' + rel(file));
    continue;
  }
  const problem = cssBraceBalance(source);
  if (problem) fail('CSS issue in ' + rel(file) + ': ' + problem);
}

/* ---- Accidental secrets (do not print matched secret values) ---- */
const secretPatterns = [
  { name: 'Shopify Admin API token', re: /shpat_[0-9a-zA-Z]+/ },
  { name: 'Shopify secret token', re: /shpss_[0-9a-zA-Z]+/ },
  { name: 'Shopify custom app token', re: /shpca_[0-9a-zA-Z]+/ },
  { name: 'Shopify private app token', re: /shppa_[0-9a-zA-Z]+/ },
  { name: 'Stripe live secret', re: /sk_live_[0-9a-zA-Z]+/ },
  { name: 'Stripe test secret', re: /sk_test_[0-9a-zA-Z]+/ },
  { name: 'AWS access key', re: /AKIA[0-9A-Z]{16}/ },
  { name: 'PEM private key', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { name: 'GitHub PAT', re: /ghp_[0-9A-Za-z]{20,}/ },
  { name: 'npm token', re: /npm_[0-9A-Za-z]{20,}/ }
];

const skipSecretScan = /\.(png|jpg|jpeg|webp|gif|ico|woff2?|ttf|otf|svg)$/i;
for (const file of files) {
  if (skipSecretScan.test(file)) continue;
  const text = fs.readFileSync(file, 'utf8');
  for (const rule of secretPatterns) {
    if (rule.re.test(text)) {
      fail('possible secret (' + rule.name + ') in ' + rel(file));
    }
  }
}

if (failures.length) {
  console.error('Theme repository validation failed:\n');
  failures.forEach((item) => console.error(' - ' + item));
  process.exit(1);
}

console.log('Theme repository validation passed.');
console.log(' JSON files: ' + jsonFiles.length);
console.log(' JavaScript files: ' + jsFiles.length);
console.log(' CSS files: ' + cssFiles.length);
console.log(' Files scanned: ' + files.length);
