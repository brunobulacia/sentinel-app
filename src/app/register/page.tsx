'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { motion } from 'framer-motion';
import { Lock, Mail, ShieldAlert, User } from 'lucide-react';
import ScrambleText from '@/components/ScrambleText';
import MatrixRain from '@/components/MatrixRain';

export default function RegisterPage() {
  const { register, user, loading } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
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
    if (password.length < 6) {
      setError('SECURITY_WARN: Password requires at least 6 entropy units.');
      return;
    }
    setSubmitting(true);
    try {
      await register(name, email, password);
      router.replace('/configuracion');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(typeof msg === 'string' ? msg : 'REGISTRATION_FAILED: Integrity check error or duplicate identity.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-cyber-dark">
      <MatrixRain />
      
      {/* Elementos de fondo suavizados */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-neon-cyan/5 rounded-full blur-[100px] pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-10">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
            className="w-16 h-16 mx-auto mb-4 rounded-xl bg-neon-cyan/5 border border-neon-cyan/50 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.15)] relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-neon-cyan/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
            <ShieldAlert size={32} className="text-neon-cyan relative z-10" />
          </motion.div>
          <h1 className="text-4xl font-bold font-mono tracking-widest text-slate-100 drop-shadow-[0_0_5px_rgba(255,255,255,0.2)]">
            <ScrambleText text="SENTINEL" delay={300} />
          </h1>
          <p className="text-neon-cyan/70 font-mono text-sm mt-2 tracking-widest uppercase">
            <ScrambleText text="SecOps New Identity Registration" delay={800} />
          </p>
        </div>

        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-neon-cyan/50 via-neon-purple/50 to-neon-cyan/50 rounded-xl blur-sm opacity-20 group-hover:opacity-40 transition duration-1000 animate-gradient-xy" />
          
          <div className="relative glass-panel rounded-xl p-8 bg-slate-900/90 border-slate-800">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-2 h-6 bg-neon-cyan rounded-sm shadow-[0_0_5px_rgba(6,182,212,0.4)]" />
              <h2 className="text-xl font-mono text-slate-200 tracking-widest">CREATE_PROFILE</h2>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-red-950/50 border border-neon-red/50 text-neon-red rounded-md px-4 py-3 text-sm mb-6 font-mono shadow-[0_0_10px_rgba(255,0,60,0.2)]"
              >
                {error}
              </motion.div>
            )}

            <form onSubmit={submit} className="space-y-5">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-2 uppercase tracking-wider">Identificador (Nombre)</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Operador Zeta"
                    className="w-full bg-slate-950/50 border border-slate-700 rounded-md pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan transition-colors font-mono placeholder:text-slate-600"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-2 uppercase tracking-wider">Comunicación (Email)</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="zeta@sys.local"
                    className="w-full bg-slate-950/50 border border-slate-700 rounded-md pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan transition-colors font-mono placeholder:text-slate-600"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-2 uppercase tracking-wider">Cifrado (Contraseña)</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950/50 border border-slate-700 rounded-md pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan transition-colors font-mono placeholder:text-slate-600"
                  />
                </div>
              </div>
              
              <button
                type="submit"
                disabled={submitting}
                className="w-full relative overflow-hidden bg-transparent border border-neon-cyan text-neon-cyan py-3 rounded-md disabled:opacity-50 disabled:cursor-not-allowed text-sm font-mono tracking-widest font-bold mt-4 group"
              >
                <div className="absolute inset-0 bg-neon-cyan/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {submitting ? (
                    <>
                      <Lock size={16} className="animate-pulse" />
                      ENCRIPTANDO...
                    </>
                  ) : (
                    'GENERAR IDENTIDAD'
                  )}
                </span>
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-800 text-center">
              <p className="text-xs text-slate-500 font-mono">
                ¿OPERADOR REGISTRADO?{' '}
                <Link href="/login" className="text-neon-cyan hover:text-slate-100 transition-colors hover:drop-shadow-[0_0_5px_rgba(6,182,212,0.4)]">
                  INICIAR SESIÓN
                </Link>
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
