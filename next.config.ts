import type { NextConfig } from "next";

// The app is a static export so it can be hosted anywhere, including GitHub
// Pages, where it lives under /<repo-name>. Set BASE_PATH for that case.
const basePath = process.env.BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;
