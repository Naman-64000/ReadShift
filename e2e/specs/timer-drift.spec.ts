import { test, expect } from '@playwright/test';

test.describe('Drift-Corrected Timer Accuracy', () => {
  test('Reading timer should compensate for drift and maintain accurate elapsed time', async ({ page }) => {
    // Navigate to the test page or mock the timer behavior directly using page.evaluate
    // We will inject the useReadingTimer logic into the browser page context and test it
    // because testing a React hook directly in Playwright requires a component.
    
    await page.goto('about:blank');
    
    // Inject the hook logic as standard JS into the browser context to test pure timer accuracy
    const result = await page.evaluate(async () => {
      return new Promise<{ elapsedMs: number, expectedMs: number }>((resolve) => {
        // Mock variables
        const totalChunks = 10;
        const intervalMs = 200; // Fast interval for testing
        let currentChunkIndex = 0;
        let startWallTime = 0;
        
        let timerRef: any = null;
        
        function tick(expectedTickTime: number, chunkIdx: number) {
          const now = performance.now();
          const drift = now - expectedTickTime;
          const nextChunk = chunkIdx + 1;
          
          // Mimic warm-up extra delay for first 3 chunks (+400ms)
          const warmUpExtra = (nextChunk < 3) ? 400 : 0;
          const targetInterval = intervalMs + warmUpExtra;
          
          const nextInterval = Math.max(0, targetInterval - drift);
          
          // Simulate some heavy synchronous work to cause drift
          const stallEnd = performance.now() + 50;
          while(performance.now() < stallEnd) {
             // spin
          }

          if (nextChunk >= totalChunks) {
             const finalElapsed = performance.now() - startWallTime;
             // Calculate expected time based on logic
             // 10 chunks total. Chunk 0 gets +400 when started.
             // Chunks 1, 2 get +400 during tick.
             // So 10 * 200 = 2000. Plus 3 * 400 = 1200. Total expected ~ 3200ms.
             resolve({ elapsedMs: finalElapsed, expectedMs: 3200 });
             return;
          }
          
          timerRef = setTimeout(
            () => tick(expectedTickTime + targetInterval, nextChunk),
            nextInterval
          );
        }
        
        // start
        const now = performance.now();
        startWallTime = now;
        const firstInterval = intervalMs + 400;
        timerRef = setTimeout(() => tick(now + firstInterval, 0), firstInterval);
      });
    });
    
    console.log(`Timer completed in ${result.elapsedMs}ms (Expected ~${result.expectedMs}ms)`);
    
    // Check if the timer is accurate within 200ms despite the intentional 50ms CPU stalls at each tick
    const deviation = Math.abs(result.elapsedMs - result.expectedMs);
    expect(deviation).toBeLessThan(200);
  });
});
