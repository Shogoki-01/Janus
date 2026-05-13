import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Developer Mode uploads PDFs + images up to 20MB each, multi-file at once.
    // Default server-action body limit is 1MB, which would reject even a
    // single normal bank statement. Match the per-file cap in the upload
    // action (with headroom for the multipart envelope).
    serverActions: {
      bodySizeLimit: "200mb",
    },
  },
};

export default nextConfig;
