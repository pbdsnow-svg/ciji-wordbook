const { chromium } = require("playwright");

const baseUrl = process.env.QA_BASE_URL || "http://127.0.0.1:3000";
const storageKey = "ciji-vocabulary-state-v2";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 430, height: 932 },
    timezoneId: "Asia/Shanghai",
  });

  await context.addInitScript(() => {
    const NativeDate = Date;
    let fakeNow = new NativeDate("2026-08-03T08:00:00+08:00").getTime();

    class FakeDate extends NativeDate {
      constructor(...args) {
        super(...(args.length === 0 ? [fakeNow] : args));
      }

      static now() {
        return fakeNow;
      }
    }

    Object.setPrototypeOf(FakeDate, NativeDate);
    window.Date = FakeDate;
    window.__setCijiFakeNow = (value) => {
      fakeNow = new NativeDate(value).getTime();
    };
  });

  const page = await context.newPage();
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.locator(".word-card").waitFor();

  const firstDay = await page.evaluate(({ storageKey }) => {
    const state = JSON.parse(window.localStorage.getItem(storageKey));
    const target =
      state.settings.activePlan?.dailyNewWords ?? state.settings.dailyGoal;
    const introduced = state.words.filter((word) => {
      const date = new Date(word.introducedAt);
      return (
        date.getFullYear() === 2026 &&
        date.getMonth() === 7 &&
        date.getDate() === 3
      );
    }).length;
    return { target, introduced };
  }, { storageKey });

  await page.evaluate(() => {
    window.__setCijiFakeNow("2026-08-04T08:00:00+08:00");
    window.dispatchEvent(new Event("focus"));
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForTimeout(500);

  const secondDay = await page.evaluate(({ storageKey }) => {
    const state = JSON.parse(window.localStorage.getItem(storageKey));
    return state.words.filter((word) => {
      const date = new Date(word.introducedAt);
      return (
        date.getFullYear() === 2026 &&
        date.getMonth() === 7 &&
        date.getDate() === 4
      );
    }).length;
  }, { storageKey });

  await browser.close();

  if (firstDay.introduced !== firstDay.target || secondDay !== firstDay.target) {
    throw new Error(
      `Daily rollover failed: day 1 ${firstDay.introduced}/${firstDay.target}, day 2 ${secondDay}/${firstDay.target}`,
    );
  }

  console.log(
    `Daily rollover passed: ${firstDay.target} new words on both simulated days.`,
  );
}

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
