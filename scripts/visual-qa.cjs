const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const outputDirectory = path.resolve(__dirname, "..", "qa");
const baseUrl = process.env.QA_BASE_URL || "http://127.0.0.1:3000";

async function capture() {
  const browser = await chromium.launch({ headless: true });
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

  await page.goto(baseUrl, { waitUntil: "networkidle" });
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
  await page.reload({ waitUntil: "networkidle" });
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

  await page.getByRole("button", { name: "语境" }).click();
  await page.waitForTimeout(250);
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
      .filter((button) => button.width < 44 || button.height < 44),
  );

  const manifestResponse = await page.request.get(`${baseUrl}/manifest.webmanifest`);
  const serviceWorkerResponse = await page.request.get(`${baseUrl}/sw.js`);

  await page.getByRole("button", { name: "取消" }).click();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload({ waitUntil: "networkidle" });
  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  const offlineReady = await page
    .locator(".word-card")
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
    waitUntil: "networkidle",
  });
  await darkPage.locator(".word-card").waitFor();
  await darkPage.screenshot({
    path: path.join(outputDirectory, "iphone-dark.png"),
    fullPage: true,
  });

  const report = {
    consoleErrors,
    undersizedTargets,
    persistence:
      Boolean(storedAfterReview) && storedAfterReview === storedAfterReload,
    offlineReady,
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
    !report.offlineReady ||
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
