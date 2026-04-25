'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Nav from '@/app/ui/nav';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-blue-400 text-lg font-semibold">Cargando...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <Nav />
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
