'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  Settings, 
  Radar, 
  ShieldAlert, 
  FileText, 
  History, 
  BrainCircuit, 
  Cpu, 
  LogOut 
} from 'lucide-react';
import { cn } from '@/lib/utils';

const links = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/configuracion', label: 'Configuración', icon: Settings },
  { href: '/escaneo', label: 'Escáner', icon: Radar },
  { href: '/vulnerabilidades', label: 'Vulnerabilidades', icon: ShieldAlert },
  { href: '/reportes', label: 'Reportes', icon: FileText },
  { href: '/historial', label: 'Historial', icon: History },
  { href: '/ai-analysis', label: 'Análisis IA', icon: BrainCircuit },
  { href: '/ml-analysis', label: 'Modelos ML', icon: Cpu },
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
    <aside className="w-64 glass-panel border-r border-y-0 border-l-0 flex flex-col shrink-0 relative z-10">
      <div className="p-6 border-b border-slate-700/50 flex items-center gap-3">
        <div className="w-8 h-8 rounded-md bg-neon-cyan/20 border border-neon-cyan flex items-center justify-center neon-text-cyan shadow-[0_0_10px_rgba(0,240,255,0.4)]">
          <ShieldAlert size={20} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white tracking-widest font-mono">SENTINEL</h1>
          <p className="text-[10px] text-neon-cyan/70 font-mono tracking-widest uppercase">SecOps Terminal</p>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {links.map((link) => {
          const isActive = pathname.startsWith(link.href);
          const Icon = link.icon;
          
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "group relative flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-300",
                isActive ? "text-neon-cyan" : "text-slate-400 hover:text-white"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="activeNavIndicator"
                  className="absolute inset-0 bg-neon-cyan/10 border border-neon-cyan/30 rounded-md shadow-[inset_0_0_12px_rgba(0,240,255,0.1)]"
                  initial={false}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              
              {/* Hover effect laser line */}
              <div className="absolute left-0 top-1/4 bottom-1/4 w-[2px] bg-neon-cyan opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-[0_0_8px_rgba(0,240,255,1)]" />

              <Icon size={18} className="relative z-10" />
              <span className="relative z-10 font-mono tracking-wide">{link.label}</span>
            </Link>
          );
        })}
      </nav>

      {user && (
        <div className="p-4 border-t border-slate-700/50 bg-slate-900/50">
          <div className="flex flex-col gap-1 mb-4">
            <p className="text-xs text-white font-medium truncate flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-neon-green shadow-[0_0_5px_#00ff66] animate-pulse" />
              {user.name}
            </p>
            <p className="text-[10px] text-slate-500 truncate font-mono ml-4">{user.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 text-xs bg-slate-800/50 hover:bg-red-950/40 text-slate-400 hover:text-neon-red border border-transparent hover:border-neon-red/30 py-2 rounded-md transition-all duration-300 font-mono tracking-widest hover:shadow-[0_0_10px_rgba(255,0,60,0.2)] group"
          >
            <LogOut size={14} className="group-hover:-translate-x-1 transition-transform" />
            DISCONNECT
          </button>
        </div>
      )}
    </aside>
  );
}
