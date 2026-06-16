import type { NextConfig } from "next";
import path from "path";

const allowedDevOrigins = (process.env.ALLOWED_DEV_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["sharp"],

  ...(allowedDevOrigins.length > 0 ? { allowedDevOrigins } : {}),

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "photo.yupoo.com" },
      { protocol: "https", hostname: "storage.ultimalinea.com.ar" },
      { protocol: "https", hostname: "res.cloudinary.com" },
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
