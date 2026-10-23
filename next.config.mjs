/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["10.56.107.127"],
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
};

export default nextConfig;
