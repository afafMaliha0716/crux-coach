// Copies the MediaPipe WebAssembly runtime into public/ so the browser loads
// it from this site instead of a CDN. Runs before `dev` and `build`.
import { cp, mkdir } from "node:fs/promises";

const from = new URL("../node_modules/@mediapipe/tasks-vision/wasm/", import.meta.url);
const to = new URL("../public/mediapipe/wasm/", import.meta.url);

await mkdir(to, { recursive: true });
await cp(from, to, { recursive: true });
