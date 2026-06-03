import { webcrypto } from "node:crypto";

if (!globalThis.crypto) {
  globalThis.crypto = webcrypto;
}

// Programmatically start Vite in the same process to preserve WebCrypto polyfill
import("vite").then(async ({ createServer }) => {
  try {
    const server = await createServer();
    await server.listen();
    server.printUrls();
  } catch (err) {
    console.error("Vite server failed to start:", err);
    process.exit(1);
  }
});
