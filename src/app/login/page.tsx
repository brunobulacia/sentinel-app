'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const { login, user, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace('/configuracion');
  }, [user, loading, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      router.replace('/configuracion');
    } catch {
      setError('Credenciales incorrectas. Verifica tu email y contraseña.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-400">Sentinel</h1>
          <p className="text-gray-400 text-sm mt-1">Vulnerability Scanner </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Iniciar Sesion</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-md px-4 py-3 text-sm mb-4">
              {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="juan@tigo.bo"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
            >
              {submitting ? 'Iniciando...' : 'Iniciar Sesion'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            No tienes cuenta?{' '}
            <Link href="/register" className="text-blue-600 hover:underline font-medium">
              Registrarse
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
