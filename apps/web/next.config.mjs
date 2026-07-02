/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@vault/mod-custom-client-portal',
    '@vault/mod-flashcard-spaced-repetition',
    '@vault/mod-habit-tracker',
    '@vault/mod-minimalist-timer',
    '@vault/mod-quick-note-taker','@vault/mod-unit-converter'],
};
export default nextConfig;
