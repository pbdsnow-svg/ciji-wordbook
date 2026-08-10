const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const outputDirectory = path.resolve(__dirname, "..", "qa");
const baseUrl = process.env.QA_BASE_URL || "http://127.0.0.1:3000";

async function answerCurrent(page, correct) {
  const currentId = await page
    .locator(".dialogue-turn.is-active")
    .getAttribute("data-word-id");
  const targetTerm = await page.evaluate((wordId) => {
    const raw = window.localStorage.getItem("ciji-vocabulary-state-v2");
    if (!raw) return null;
    return JSON.parse(raw).words.find((word) => word.id === wordId)?.term ?? null;
  }, currentId);
  if (!currentId || !targetTerm) throw new Error("Current dialogue word missing");

  const buttons = page.locator(".dialogue-choice-grid button");
  const count = await buttons.count();
  for (let index = 0; index < count; index += 1) {
    const button = buttons.nth(index);
    const term = (await button.locator("strong").innerText()).trim();
    if ((term === targetTerm) === correct) {
      await button.click();
      return currentId;
    }
  }
  throw new Error(`No ${correct ? "correct" : "wrong"} choice found`);
}

async function run() {
  fs.mkdirSync(outputDirectory, { recursive: true });
  const browser = await chromium.launch({
    args: ["--no-proxy-server"],
    headless: true,
    ...(process.env.QA_BROWSER_PATH
      ? { executablePath: process.env.QA_BROWSER_PATH }
      : {}),
  });
  const context = await browser.newContext({
    viewport: { width: 430, height: 932 },
    isMobile: true,
    hasTouch: true,
    colorScheme: "light",
  });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await page.locator(".word-card").waitFor();
  await page.evaluate(() => {
    const key = "ciji-vocabulary-state-v2";
    const state = JSON.parse(window.localStorage.getItem(key));
    state.settings.activePlan = null;
    state.settings.dailyGoal = 40;
    window.localStorage.setItem(key, JSON.stringify(state));
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator(".word-card").waitFor();
  await page.evaluate(() => {
    const key = "ciji-vocabulary-state-v2";
    const state = JSON.parse(window.localStorage.getItem(key));
    const now = new Date();
    state.words.slice(0, 40).forEach((word, index) => {
      word.reviewCount = Math.max(1, word.reviewCount);
      word.introducedAt = now.toISOString();
      state.logs.push({
        id: `dialogue-qa-${word.id}`,
        wordId: word.id,
        rating: "know",
        reviewedAt: new Date(now.getTime() + index).toISOString(),
        mode: "spelling",
      });
    });
    window.localStorage.setItem(key, JSON.stringify(state));
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator(".word-card").waitFor();
  await page.getByRole("button", { name: "阅读", exact: true }).click();
  await page.getByRole("button", { name: "复习练习" }).click();
  await page.locator(".dialogue-transcript").waitFor();

  const dialogueWordCount = await page
    .locator(".dialogue-turn:not(.dialogue-turn-intro)")
    .count();
  const missedId = await answerCurrent(page, false);
  await page.getByRole("button", { name: "继续对话" }).click();
  for (let index = 0; index < 3; index += 1) {
    await answerCurrent(page, true);
    await page.getByRole("button", { name: "继续对话" }).click();
  }
  const retryId = await page
    .locator(".dialogue-turn.is-active")
    .getAttribute("data-word-id");

  await page.screenshot({
    path: path.join(outputDirectory, "iphone-dialogue-review.png"),
    fullPage: true,
  });
  const undersizedTargets = await page
    .locator(".dialogue-practice button")
    .evaluateAll((buttons) =>
      buttons
        .map((button) => {
          const box = button.getBoundingClientRect();
          return {
            label: button.textContent?.replace(/\s+/g, " ").trim() || "unlabelled",
            width: Math.round(box.width),
            height: Math.round(box.height),
          };
        })
        .filter((button) => button.width < 44 || button.height < 44),
    );
  const report = {
    dialogueWordCount,
    retryAfterThreeTurns: retryId === missedId,
    consoleErrors,
    undersizedTargets,
  };
  fs.writeFileSync(
    path.join(outputDirectory, "dialogue-qa-report.json"),
    JSON.stringify(report, null, 2),
  );
  await context.close();
  await browser.close();

  if (
    report.dialogueWordCount !== 40 ||
    !report.retryAfterThreeTurns ||
    report.consoleErrors.length > 0 ||
    report.undersizedTargets.length > 0
  ) {
    console.error(JSON.stringify(report, null, 2));
    process.exitCode = 1;
  } else {
    console.log(JSON.stringify(report, null, 2));
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
