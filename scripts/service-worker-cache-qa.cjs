const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const serviceWorkerPath = path.resolve(__dirname, "..", "public", "sw.js");
const source = fs.readFileSync(serviceWorkerPath, "utf8");

function createHarness(fetchImpl) {
  const listeners = new Map();
  const putCalls = [];
  const cachedNavigation = new Response("cached app shell", { status: 200 });
  const cache = {
    addAll: async () => undefined,
    put: async (request, response) => {
      putCalls.push({ request, status: response.status });
    },
  };
  const sandbox = {
    URL,
    Promise,
    Response,
    fetch: fetchImpl,
    caches: {
      open: async () => cache,
      match: async () => cachedNavigation,
      keys: async () => [],
      delete: async () => true,
    },
    self: {
      location: {
        href: "https://example.test/ciji-wordbook/sw.js",
        origin: "https://example.test",
      },
      addEventListener: (name, handler) => listeners.set(name, handler),
      skipWaiting: async () => undefined,
      clients: { claim: async () => undefined },
    },
  };

  vm.runInNewContext(source, sandbox, { filename: serviceWorkerPath });
  return { listeners, putCalls };
}

async function runNavigation(harness) {
  let responsePromise;
  harness.listeners.get("fetch")({
    request: {
      method: "GET",
      mode: "navigate",
      url: "https://example.test/ciji-wordbook/",
    },
    respondWith: (promise) => {
      responsePromise = Promise.resolve(promise);
    },
  });
  const response = await responsePromise;
  await new Promise((resolve) => setTimeout(resolve, 0));
  return response;
}

async function main() {
  const unauthorized = createHarness(async () =>
    new Response("unauthorized", { status: 401 }),
  );
  const unauthorizedResponse = await runNavigation(unauthorized);
  assert.equal(unauthorizedResponse.status, 401);
  assert.equal(
    unauthorized.putCalls.length,
    0,
    "An authorization error must never replace the cached app shell",
  );

  const successful = createHarness(async () =>
    new Response("fresh app shell", { status: 200 }),
  );
  const successfulResponse = await runNavigation(successful);
  assert.equal(successfulResponse.status, 200);
  assert.equal(successful.putCalls.length, 1);

  const offline = createHarness(async () => {
    throw new Error("offline");
  });
  const offlineResponse = await runNavigation(offline);
  assert.equal(await offlineResponse.text(), "cached app shell");

  console.log(
    JSON.stringify(
      {
        unauthorizedCached: unauthorized.putCalls.length,
        successfulCached: successful.putCalls.length,
        offlineFallback: true,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
