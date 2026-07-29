const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const source = path.join(projectRoot, ".openai", "hosting.json");
const targetDirectory = path.join(projectRoot, "dist", ".openai");
const target = path.join(targetDirectory, "hosting.json");

fs.mkdirSync(targetDirectory, { recursive: true });
fs.copyFileSync(source, target);
