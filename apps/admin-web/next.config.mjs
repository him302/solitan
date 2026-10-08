/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@soliton/shared-types',
    '@soliton/api-contract',
    '@soliton/design-tokens',
    '@soliton/ui',
    '@soliton/i18n',
  ],
};

export default nextConfig;
