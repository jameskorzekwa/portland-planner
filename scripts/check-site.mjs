import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = process.cwd();
const ignoredDirectories = new Set([".git", "node_modules", "_site"]);
const failures = [];
let checkedScripts = 0;
let checkedReferences = 0;

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) return [];
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    return entry.name.endsWith(".html") ? [fullPath] : [];
  });
}

function localTarget(fromFile, reference) {
  if (
    !reference ||
    reference.includes("${") ||
    reference.startsWith("//") ||
    /^[a-z][a-z\d+.-]*:/i.test(reference)
  ) {
    return null;
  }

  const [rawFile, fragment] = reference.split("#", 2);
  const withoutQuery = rawFile.split("?", 1)[0];
  let decoded;
  try {
    decoded = decodeURIComponent(withoutQuery);
  } catch {
    failures.push(`${path.relative(root, fromFile)}: invalid URL encoding in ${reference}`);
    return null;
  }

  const target = decoded
    ? path.resolve(decoded.startsWith("/") ? root : path.dirname(fromFile), decoded.replace(/^\//, ""))
    : fromFile;
  return { target, fragment, reference };
}

function checkReference(fromFile, reference) {
  const local = localTarget(fromFile, reference);
  if (!local) return;
  checkedReferences += 1;

  let target = local.target;
  if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
    target = path.join(target, "index.html");
  }
  if (!fs.existsSync(target)) {
    failures.push(`${path.relative(root, fromFile)}: missing local target ${local.reference}`);
    return;
  }

  if (local.fragment && target.endsWith(".html")) {
    const targetHtml = fs.readFileSync(target, "utf8");
    const ids = new Set(
      [...targetHtml.matchAll(/\bid\s*=\s*(["'])(.*?)\1/gi)].map((match) => match[2]),
    );
    if (!ids.has(local.fragment)) {
      failures.push(`${path.relative(root, fromFile)}: missing fragment ${local.reference}`);
    }
  }
}

const htmlFiles = walk(root);
if (htmlFiles.length === 0) failures.push("No HTML files found");

for (const htmlFile of htmlFiles) {
  const relativeFile = path.relative(root, htmlFile);
  const html = fs.readFileSync(htmlFile, "utf8");

  for (const match of html.matchAll(/\b(?:href|src|poster)\s*=\s*(["'])(.*?)\1/gi)) {
    checkReference(htmlFile, match[2]);
  }
  for (const match of html.matchAll(/(["'`])(assets\/[^"'`?#\s]+)\1/g)) {
    checkReference(htmlFile, match[2]);
  }

  let scriptNumber = 0;
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (/\bsrc\s*=/i.test(match[1])) continue;
    scriptNumber += 1;
    checkedScripts += 1;
    try {
      new vm.Script(match[2], { filename: `${relativeFile}:inline-script-${scriptNumber}.js` });
    } catch (error) {
      failures.push(error.message);
    }
  }
}

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log(
  `Checked ${htmlFiles.length} HTML file(s), ${checkedScripts} inline script(s), and ${checkedReferences} local reference(s).`,
);
