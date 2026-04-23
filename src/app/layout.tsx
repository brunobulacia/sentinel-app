import type { Metadata } from 'next';
import './globals.css';
import Nav from './ui/nav';

export const metadata: Metadata = {
  title: 'Sentinel',
  description: 'Vulnerability Scanner - Tigo Bolivia BOC',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="flex h-screen bg-gray-100 overflow-hidden">
        <Nav />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </body>
    </html>
  );
}
