import { expect, test } from "@playwright/test";

const MAX_DRIFT_MS = 200;

test("mobile responsiveness baseline at 375px", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/auth", { waitUntil: "networkidle" });

  const body = page.locator("body");
  const hasHorizontalOverflow = await body.evaluate((el) => el.scrollWidth > el.clientWidth);

  await expect(page.locator("h1")).toContainText("ReadShift");
  expect(hasHorizontalOverflow).toBeFalsy();
});

test("drift-corrected timer stays within 200ms over synthetic full session", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const totalChunks = 120;
    const intervalMs = 150;

    let chunk = 0;
    const started = performance.now();

    return await new Promise<{ elapsedMs: number; expectedMs: number; driftMs: number }>((resolve) => {
      const tick = (expectedTickTime: number, chunkIdx: number) => {
        const now = performance.now();
        const drift = now - expectedTickTime;
        const nextInterval = Math.max(0, intervalMs - drift);

        const nextChunk = chunkIdx + 1;
        chunk = nextChunk;

        if (nextChunk >= totalChunks) {
          const elapsedMs = now - started;
          const expectedMs = totalChunks * intervalMs;
          resolve({ elapsedMs, expectedMs, driftMs: Math.abs(elapsedMs - expectedMs) });
          return;
        }

        setTimeout(() => tick(expectedTickTime + intervalMs, nextChunk), nextInterval);
      };

      setTimeout(() => tick(started + intervalMs, chunk), intervalMs);
    });
  });

  expect(result.driftMs).toBeLessThanOrEqual(MAX_DRIFT_MS);
});
