const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const baseUrl = process.env.QA_BASE_URL || "http://127.0.0.1:4173";
const outputDirectory = path.resolve(__dirname, "..", "qa");

async function run() {
  fs.mkdirSync(outputDirectory, { recursive: true });
  const browser = await chromium.launch({
    args: ["--no-proxy-server"],
    headless: true,
    executablePath: process.env.QA_BROWSER_PATH,
  });
  const context = await browser.newContext({
    viewport: { width: 430, height: 932 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 26_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1",
  });
  const page = await context.newPage();
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Day 1" }).waitFor();
  await page.screenshot({ path: path.join(outputDirectory, "ielts-day-1.png"), fullPage: true });

  const taskCount = await page.locator(".ielts-task").count();
  const totalMinutes = await page.locator(".task-time").evaluateAll((nodes) =>
    nodes.reduce((sum, node) => sum + Number(node.firstChild?.textContent || 0), 0),
  );
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);

  await page.locator(".ielts-task-summary").first().click();
  await page.getByPlaceholder("记下错因、表达或今天最卡的地方…").fill("同义替换反应较慢");
  await page.getByRole("button", { name: "完成这项训练" }).click();
  const progressAfterOne = await page.locator(".ielts-progress strong").innerText();
  await page.reload({ waitUntil: "networkidle" });
  const persisted = await page.locator(".ielts-task").first().evaluate((node) => node.classList.contains("is-complete"));

  await page.getByRole("button", { name: "背词" }).click();
  await page.getByRole("heading", { name: "词汇训练" }).waitFor();
  await page.getByRole("button", { name: "训练" }).click();
  await page.getByRole("heading", { name: "Day 1" }).waitFor();

  console.log(JSON.stringify({ taskCount, totalMinutes, overflow, progressAfterOne, persisted, errors }, null, 2));
  await browser.close();

  if (taskCount !== 4 || totalMinutes !== 120 || overflow || !persisted || errors.length) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

