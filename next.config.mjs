/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    domains: ['localhost'],
    unoptimized: true,
  },
  webpack: (config) => {
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      bufferutil: 'commonjs bufferutil',
    });
    // Ensure Three.js and related packages bundle correctly
    config.resolve.alias = {
      ...config.resolve.alias,
      three: 'three',
    };
    return config;
  },
  // Optimize output for deployment
  output: 'standalone',
};

export default nextConfig;
