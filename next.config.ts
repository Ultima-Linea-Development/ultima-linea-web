import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "photo.yupoo.com" },
      { protocol: "https", hostname: "storage.ultimalinea.com.ar" },
      { protocol: "http", hostname: "localhost" },
    ],
    unoptimized: true,
  },

  turbopack: {
    root: path.resolve(__dirname),
  },

  transpilePackages: ["react-icons"],
};

export default nextConfig;
