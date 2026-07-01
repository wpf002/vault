import { SessionProvider } from './providers';
import { NavBar } from '@/components/NavBar';
import './globals.css';

export const metadata = { title: 'vault', description: '120 mini-apps, one roof.' };

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
