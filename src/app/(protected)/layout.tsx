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
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <div className="text-neon-cyan text-lg font-mono font-semibold tracking-widest animate-pulse">
          INICIANDO SISTEMA...
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-screen overflow-hidden text-slate-200">
      <Nav />
      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  );
}
