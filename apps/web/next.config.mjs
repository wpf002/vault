/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@vault/mod-minimalist-timer',
    '@vault/mod-quick-note-taker','@vault/mod-unit-converter'],
};
export default nextConfig;
