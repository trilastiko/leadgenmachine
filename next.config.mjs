/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "5mb" },
  },
  serverExternalPackages: ["@prisma/client", "bullmq", "googleapis"],
};

export default nextConfig;
