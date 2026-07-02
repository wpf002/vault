/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@vault/mod-quick-note-taker','@vault/mod-unit-converter'],
};
export default nextConfig;
