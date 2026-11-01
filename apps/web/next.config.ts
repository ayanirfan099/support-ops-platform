import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.e2b.app"],
  transpilePackages: [
    "@supportops/contracts",
    "@supportops/database",
    "@supportops/ui",
  ],
};

export default nextConfig;
