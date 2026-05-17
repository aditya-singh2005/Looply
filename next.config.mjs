/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', '@supabase/supabase-js'],
  },
};

export default nextConfig;
