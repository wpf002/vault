import { SessionProvider } from './providers';

export const metadata = { title: 'vault', description: '120 mini-apps, one roof.' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
