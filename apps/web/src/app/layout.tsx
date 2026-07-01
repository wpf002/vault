import { SessionProvider } from './providers';
import { NavBar } from '@/components/NavBar';
import './globals.css';

export const metadata = { title: 'Vault', description: '120 Mini-Apps, One Roof.' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          <NavBar />
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
