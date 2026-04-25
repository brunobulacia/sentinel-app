'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/configuracion', label: 'Configuracion' },
  { href: '/escaneo', label: 'Escaneo' },
  { href: '/vulnerabilidades', label: 'Vulnerabilidades' },
  { href: '/reportes', label: 'Reportes' },
  { href: '/historial', label: 'Historial' },
  { href: '/ai-analysis', label: 'Analisis IA' },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  return (
    <aside className="w-56 bg-gray-900 text-white flex flex-col shrink-0">
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-xl font-bold text-blue-400">Sentinel</h1>
        <p className="text-xs text-gray-400">Seguridad Informatica</p>
      </div>

      <nav className="flex-1 p-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center px-3 py-2 rounded-md mb-1 text-sm transition-colors ${
              pathname.startsWith(link.href)
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      {user && (
        <div className="p-3 border-t border-gray-700">
          <p className="text-xs text-gray-300 font-medium truncate">{user.name}</p>
          <p className="text-xs text-gray-500 truncate mb-2">{user.email}</p>
          <button
            onClick={handleLogout}
            className="w-full text-xs bg-gray-800 hover:bg-red-900 text-gray-300 hover:text-red-300 py-1.5 rounded-md transition-colors"
          >
            Cerrar Sesion
          </button>
        </div>
      )}
    </aside>
  );
}
