const supabaseHostname = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : 'dyvcaevtrovicafvxnhe.supabase.co';

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    // the Film button (src/components/FilmMode.js) is for the test site and local work, never the live site
    NEXT_PUBLIC_FILM_MODE: process.env.VERCEL_ENV === 'production' ? '' : '1',
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: supabaseHostname,
        pathname: '/storage/v1/object/public/**',
      },
    ],
    formats: ['image/webp'],
    minimumCacheTTL: 86400,
  },
};

export default nextConfig;
