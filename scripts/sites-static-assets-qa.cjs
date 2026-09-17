const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(
  process.env.SITES_STATIC_DIR || path.join(__dirname, "..", "out"),
);
const htmlPath = path.join(root, "index.html");

if (!fs.existsSync(htmlPath)) {
  console.error(`Missing static entrypoint: ${htmlPath}`);
  process.exit(1);
}

const html = fs.readFileSync(htmlPath, "utf8");
const references = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
  .map((match) => match[1])
  .filter(
    (value) =>
      value.startsWith("/") &&
      !value.startsWith("//") &&
      !value.startsWith("/#"),
  );
const uniqueReferences = [...new Set(references)];
const missing = uniqueReferences.filter((reference) => {
  const pathname = decodeURIComponent(reference.split(/[?#]/, 1)[0]);
  const localPath = path.join(root, ...pathname.split("/").filter(Boolean));
  return !fs.existsSync(localPath);
});
const wrongBasePath = uniqueReferences.filter((reference) =>
  reference.startsWith("/ciji-wordbook/"),
);

const report = {
  root,
  checked: uniqueReferences.length,
  missing: missing.slice(0, 8),
  wrongBasePath: wrongBasePath.slice(0, 8),
};

console.log(JSON.stringify(report, null, 2));

if (missing.length || wrongBasePath.length) {
  console.error("Sites static asset check failed.");
  process.exit(1);
}

