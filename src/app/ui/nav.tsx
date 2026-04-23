'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/configuracion', label: 'Configuracion' },
  { href: '/escaneo', label: 'Escaneo' },
  { href: '/vulnerabilidades', label: 'Vulnerabilidades' },
  { href: '/reportes', label: 'Reportes' },
  { href: '/historial', label: 'Historial' },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <aside className="w-56 bg-gray-900 text-white flex flex-col shrink-0">
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-xl font-bold text-blue-400">Sentinel</h1>
        <p className="text-xs text-gray-400">Tigo Bolivia BOC</p>
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
    </aside>
  );
}
