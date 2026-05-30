# ReadShift Quality Gates (Phase 4)

## 1) Mobile responsiveness (375px)
1. Run app locally: `npm run dev`
2. Run E2E baseline: `npm run qa:e2e:staging`
3. Confirm `mobile responsiveness baseline at 375px` passes.

## 2) Lighthouse target on ReadingScreen
1. Start app locally: `npm run dev`
2. Start an active reading session (or navigate with a seeded dev user) so `/session/reading` renders real content.
3. Run: `npm run qa:lighthouse:reading`
4. Open `artifacts/lighthouse-reading.json` and verify:
- `performance >= 85`
- `accessibility >= 85`
- `best-practices >= 85`

## 3) E2E tests in staging
1. Set `E2E_BASE_URL` to staging frontend URL.
2. Run: `npm run qa:e2e:staging`
3. Store Playwright HTML report artifact from the run.

## 4) Cross-browser timer accuracy verification
The Playwright quality-gate test runs on Chromium, Firefox, WebKit, and a mobile Chromium profile.

Pass condition:
- Synthetic full-session timer drift <= 200ms.

## Notes
- Playwright/Lighthouse are executed via `npx`. Install browser binaries when prompted:
  - `npx playwright install`
- For CI/staging, pin package versions in `devDependencies` if you want fully reproducible tool versions.
