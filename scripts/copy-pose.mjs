// Copies the MediaPipe Pose runtime and model out of node_modules into public/pose,
// so the browser loads them from this site and video analysis works offline.
import { cpSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const from = join(root, "node_modules", "@mediapipe", "pose");
const to = join(root, "public", "pose");
const files = [
  "pose.js",
  "pose_landmark_full.tflite",
  "pose_solution_packed_assets.data",
  "pose_solution_packed_assets_loader.js",
  "pose_solution_simd_wasm_bin.js",
  "pose_solution_simd_wasm_bin.wasm",
  "pose_solution_wasm_bin.js",
  "pose_solution_wasm_bin.wasm",
  "pose_web.binarypb",
];
if (!existsSync(from)) {
  console.error("@mediapipe/pose is not installed. Run npm install first.");
  process.exit(1);
}
mkdirSync(to, { recursive: true });
for (const f of files) cpSync(join(from, f), join(to, f));
console.log(`Copied ${files.length} pose files to public/pose`);
