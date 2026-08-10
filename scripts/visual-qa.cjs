const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const outputDirectory = path.resolve(__dirname, "..", "qa");
const baseUrl = process.env.QA_BASE_URL || "http://127.0.0.1:3000";

async function capture() {
  const browser = await chromium.launch({
    args: ["--no-proxy-server"],
    headless: true,
    ...(process.env.QA_BROWSER_PATH
      ? { executablePath: process.env.QA_BROWSER_PATH }
      : {}),
  });
  const context = await browser.newContext({
    viewport: { width: 430, height: 932 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 26_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1",
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
  await page.screenshot({
    path: path.join(outputDirectory, "iphone-today.png"),
    fullPage: true,
  });

  const firstTerm = await page.locator(".word-heading h2").innerText();
  await page
    .getByRole("button", { name: "想一想，再显示释义" })
    .click();
  await page.waitForTimeout(300);
  await page.screenshot({
    path: path.join(outputDirectory, "iphone-answer.png"),
    fullPage: true,
  });

  await page.getByRole("button", { name: "认识" }).click();
  await page.waitForTimeout(200);
  await page.screenshot({
    path: path.join(outputDirectory, "iphone-spelling.png"),
    fullPage: true,
  });
  await page.getByPlaceholder("输入英文单词").fill(firstTerm);
  await page.getByRole("button", { name: "检查拼写" }).click();
  await page.getByRole("button", { name: "继续下一个" }).click();
  const storedAfterReview = await page.evaluate(() =>
    window.localStorage.getItem("ciji-vocabulary-state-v2"),
  );
  await page.reload({ waitUntil: "domcontentloaded" });
  const storedAfterReload = await page.evaluate(() =>
    window.localStorage.getItem("ciji-vocabulary-state-v2"),
  );

  await page.getByRole("button", { name: "词库" }).click();
  await page.waitForTimeout(250);
  await page.screenshot({
    path: path.join(outputDirectory, "iphone-library.png"),
    fullPage: true,
  });

  await page.getByRole("button", { name: "计划" }).click();
  await page.waitForTimeout(250);
  await page.screenshot({
    path: path.join(outputDirectory, "iphone-plan.png"),
    fullPage: true,
  });

  await page.getByRole("button", { name: "阅读", exact: true }).click();
  await page.locator(".daily-reading-card").waitFor();
  await page.waitForFunction(
    () =>
      document
        .querySelector(".daily-reading-card")
        ?.getAttribute("aria-busy") === "false",
    null,
    { timeout: 10_000 },
  );
  const bilingualReady =
    (await page.locator(".reading-title-translation").isVisible()) &&
    (await page.locator(".reading-translation").isVisible());
  await page.getByRole("button", { name: "英文原文" }).click();
  const englishOnlyReady = !(await page.locator(".reading-translation").isVisible());
  await page.getByRole("button", { name: "中英对照" }).click();
  await page.screenshot({
    path: path.join(outputDirectory, "iphone-reading.png"),
    fullPage: true,
  });

  await page.locator(".reading-body .reading-word").first().click();
  await page.locator(".definition-content, .definition-missing").waitFor();
  const definitionFound = await page.locator(".definition-content").isVisible();
  await page.screenshot({
    path: path.join(outputDirectory, "iphone-definition-sheet.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "完成" }).click();

  await page.getByRole("button", { name: "名著片段" }).click();
  await page.waitForTimeout(200);
  await page.screenshot({
    path: path.join(outputDirectory, "iphone-classic-reading.png"),
    fullPage: true,
  });

  await page.getByRole("button", { name: "今日" }).click();
  await page.evaluate(() => {
    const key = "ciji-vocabulary-state-v2";
    const raw = window.localStorage.getItem(key);
    if (!raw) return;
    const state = JSON.parse(raw);
    state.settings.activePlan = null;
    state.settings.dailyGoal = 40;
    window.localStorage.setItem(key, JSON.stringify(state));
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator(".word-card").waitFor();
  await page.evaluate(() => {
    const key = "ciji-vocabulary-state-v2";
    const raw = window.localStorage.getItem(key);
    if (!raw) return;
    const state = JSON.parse(raw);
    const now = new Date();
    state.words.slice(0, 40).forEach((word, index) => {
      word.reviewCount = Math.max(1, word.reviewCount);
      word.introducedAt = now.toISOString();
      state.logs.push({
        id: `visual-dialogue-${word.id}`,
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
  await page.locator(".daily-reading-card").waitFor();
  await page.getByRole("button", { name: "复习练习" }).click();
  await page.locator(".dialogue-transcript").waitFor();
  const dialogueWordCount = await page
    .locator(".dialogue-turn:not(.dialogue-turn-intro)")
    .count();
  const sceneChapterCount = await page.locator(".dialogue-scene-divider").count();
  const dialogueReviewReady =
    dialogueWordCount === 40 &&
    sceneChapterCount >= 1 &&
    (await page.locator(".dialogue-scenario-card").isVisible()) &&
    (await page.locator(".dialogue-choice-grid button").count()) >= 2;
  if (dialogueReviewReady) {
    await page.locator(".dialogue-choice-grid button").first().click();
    await page.locator(".context-feedback").waitFor();
  }
  await page.screenshot({
    path: path.join(outputDirectory, "iphone-context.png"),
    fullPage: true,
  });

  await page.getByRole("button", { name: "词库" }).click();

  await page.getByRole("button", { name: "添加单词" }).click();
  await page.waitForTimeout(300);
  await page.getByLabel("英文单词").fill("lucid");
  await page.getByLabel("中文释义").fill("清晰易懂的");
  await page.screenshot({
    path: path.join(outputDirectory, "iphone-add-sheet.png"),
    fullPage: true,
  });

  const undersizedTargets = await page.locator("button").evaluateAll((buttons) =>
    buttons
      .map((button) => {
        const box = button.getBoundingClientRect();
        return {
          label:
            button.getAttribute("aria-label") ||
            button.textContent?.replace(/\s+/g, " ").trim() ||
            "unlabelled",
          width: Math.round(box.width),
          height: Math.round(box.height),
        };
      })
      .filter(
        (button) =>
          !button.label.startsWith("查看 ") &&
          (button.width < 44 || button.height < 44),
      ),
  );

  const manifestResponse = await page.request.get(`${baseUrl}/manifest.webmanifest`);
  const serviceWorkerResponse = await page.request.get(`${baseUrl}/sw.js`);
  const onlineConsoleErrors = [...consoleErrors];

  await page.getByRole("button", { name: "取消" }).click();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload({ waitUntil: "domcontentloaded" });
  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  const offlineReady = await page
    .locator(".word-card")
    .waitFor({ timeout: 5_000 })
    .then(() => true)
    .catch(() => false);
  await page.getByRole("button", { name: "阅读", exact: true }).click();
  const offlineReadingReady = await page
    .locator(".daily-reading-card")
    .waitFor({ timeout: 5_000 })
    .then(() => true)
    .catch(() => false);
  await context.setOffline(false);

  const darkContext = await browser.newContext({
    viewport: { width: 430, height: 932 },
    colorScheme: "dark",
  });
  const darkPage = await darkContext.newPage();
  await darkPage.goto(baseUrl, {
    waitUntil: "domcontentloaded",
  });
  await darkPage.locator(".word-card").waitFor();
  await darkPage.screenshot({
    path: path.join(outputDirectory, "iphone-dark.png"),
    fullPage: true,
  });

  const report = {
    consoleErrors: onlineConsoleErrors,
    undersizedTargets,
    persistence:
      Boolean(storedAfterReview) && storedAfterReview === storedAfterReload,
    definitionFound,
    bilingualReady,
    englishOnlyReady,
    dialogueReviewReady,
    dialogueWordCount,
    sceneChapterCount,
    offlineReady,
    offlineReadingReady,
    manifestStatus: manifestResponse.status(),
    serviceWorkerStatus: serviceWorkerResponse.status(),
  };
  fs.writeFileSync(
    path.join(outputDirectory, "visual-qa-report.json"),
    JSON.stringify(report, null, 2),
  );

  await darkContext.close();
  await context.close();
  await browser.close();

  if (
    consoleErrors.length > 0 ||
    undersizedTargets.length > 0 ||
    !report.persistence ||
    !report.definitionFound ||
    !report.bilingualReady ||
    !report.englishOnlyReady ||
    !report.dialogueReviewReady ||
    !report.offlineReady ||
    !report.offlineReadingReady ||
    report.manifestStatus !== 200 ||
    report.serviceWorkerStatus !== 200
  ) {
    console.error(JSON.stringify(report, null, 2));
    process.exitCode = 1;
  } else {
    console.log(JSON.stringify(report, null, 2));
  }
}

capture().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
