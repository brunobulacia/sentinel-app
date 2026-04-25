import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';

export const metadata: Metadata = {
  title: 'Sentinel',
  description: 'Vulnerability Scanner',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
