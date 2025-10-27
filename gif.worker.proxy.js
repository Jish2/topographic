// Proxy worker to keep the Worker script same-origin and avoid CORS restrictions
// Loads the real optimized gif.js worker from CDN inside the worker context
importScripts("https://unpkg.com/gif.js.optimized/dist/gif.worker.js");
