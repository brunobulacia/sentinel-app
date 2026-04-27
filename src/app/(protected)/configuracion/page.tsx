'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Plus, Edit2, Trash2, Calendar, Target, Shield, Clock, X, Save } from 'lucide-react';

const VULN_TYPES = [
  'SQL_INJECTION', 'XSS', 'CSRF', 'INSECURE_CONFIG',
  'DATA_EXPOSURE', 'BROKEN_AUTH', 'SECURITY_MISCONFIG', 'SSRF',
];

interface ScanConfig {
  id: string;
  name: string;
  targetUrl: string;
  vulnerabilityTypes: string[];
  depth: string;
  scheduledAt: string | null;
  isActive: boolean;
}

const emptyForm = {
  name: '',
  targetUrl: '',
  vulnerabilityTypes: [] as string[],
  depth: 'medium',
  scheduledAt: '',
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 }
};

export default function ConfiguracionPage() {
  const [configs, setConfigs] = useState<ScanConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    try {
      const { data } = await api.get('/scan-configs');
      setConfigs(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEditing(null);
    setShowForm(false);
  };

  const openEdit = (cfg: ScanConfig) => {
    setEditing(cfg.id);
    setForm({
      name: cfg.name,
      targetUrl: cfg.targetUrl,
      vulnerabilityTypes: cfg.vulnerabilityTypes ?? [],
      depth: cfg.depth,
      scheduledAt: cfg.scheduledAt ? cfg.scheduledAt.slice(0, 16) : '',
    });
    setShowForm(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form, scheduledAt: form.scheduledAt || undefined };
    if (editing) {
      await api.put(`/scan-configs/${editing}`, payload);
    } else {
      await api.post('/scan-configs', payload);
    }
    resetForm();
    load();
  };

  const remove = async (id: string) => {
    await api.delete(`/scan-configs/${id}`);
    load();
  };

  const toggleType = (type: string) => {
    setForm(f => ({
      ...f,
      vulnerabilityTypes: f.vulnerabilityTypes.includes(type)
        ? f.vulnerabilityTypes.filter(t => t !== type)
        : [...f.vulnerabilityTypes, type],
    }));
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Settings className="text-neon-cyan" size={28} />
          <h2 className="text-2xl font-bold font-mono tracking-widest text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">PERFILES DE ESCANEO</h2>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-slate-800 border border-neon-cyan text-neon-cyan hover:bg-neon-cyan/10 hover:shadow-[0_0_15px_rgba(0,240,255,0.3)] px-4 py-2 rounded-md text-sm font-mono tracking-widest flex items-center gap-2 transition-all"
        >
          <Plus size={16} /> NUEVA CONFIGURACIÓN
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div 
            initial={{ opacity: 0, height: 0, y: -20 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -20 }}
            className="overflow-hidden"
          >
            <div className="glass-panel rounded-lg p-6 mb-6 border border-neon-cyan/30 relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-neon-cyan via-neon-purple to-neon-cyan opacity-50" />
              
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-mono tracking-widest text-white flex items-center gap-2">
                  <Edit2 size={14} className="text-neon-cyan" /> 
                  {editing ? 'MODIFICAR PERFIL' : 'NUEVO PERFIL'}
                </h3>
                <button onClick={resetForm} className="text-slate-500 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={submit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-mono tracking-widest text-slate-400 mb-2">NOMBRE DEL PERFIL</label>
                    <input
                      required
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full bg-slate-900/50 border border-slate-700 rounded-md px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan transition-all"
                      placeholder="Ej. Producción API"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono tracking-widest text-slate-400 mb-2">URL OBJETIVO</label>
                    <input
                      required
                      type="url"
                      value={form.targetUrl}
                      onChange={e => setForm(f => ({ ...f, targetUrl: e.target.value }))}
                      className="w-full bg-slate-900/50 border border-slate-700 rounded-md px-4 py-3 text-sm text-neon-green font-mono focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan transition-all"
                      placeholder="https://api.ejemplo.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-mono tracking-widest text-slate-400 mb-2">PROFUNDIDAD DE ANÁLISIS</label>
                    <select
                      value={form.depth}
                      onChange={e => setForm(f => ({ ...f, depth: e.target.value }))}
                      className="w-full bg-slate-900/50 border border-slate-700 rounded-md px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan appearance-none transition-all"
                    >
                      <option value="low">BAJA (Rápido)</option>
                      <option value="medium">MEDIA (Estándar)</option>
                      <option value="deep">PROFUNDA (Exhaustivo)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-mono tracking-widest text-slate-400 mb-2">PROGRAMACIÓN (OPCIONAL)</label>
                    <input
                      type="datetime-local"
                      value={form.scheduledAt}
                      onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))}
                      className="w-full bg-slate-900/50 border border-slate-700 rounded-md px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan transition-all"
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono tracking-widest text-slate-400 mb-3">VECTORES DE ATAQUE A EVALUAR</label>
                  <div className="flex flex-wrap gap-3">
                    {VULN_TYPES.map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => toggleType(type)}
                        className={`px-3 py-1.5 rounded text-[10px] font-mono tracking-widest border transition-all ${
                          form.vulnerabilityTypes.includes(type)
                            ? 'bg-neon-purple/20 text-neon-purple border-neon-purple shadow-[0_0_10px_rgba(168,85,247,0.3)]'
                            : 'bg-slate-900/50 text-slate-500 border-slate-700 hover:border-slate-500'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4 pt-4 border-t border-slate-800">
                  <button
                    type="submit"
                    className="flex-1 bg-neon-cyan text-black px-4 py-3 rounded-md hover:bg-white text-sm font-bold font-mono tracking-widest flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(0,240,255,0.4)] hover:shadow-[0_0_20px_rgba(255,255,255,0.6)]"
                  >
                    <Save size={16} />
                    {editing ? 'ACTUALIZAR PERFIL' : 'GUARDAR PERFIL'}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 bg-slate-800 border border-slate-700 text-slate-300 px-4 py-3 rounded-md hover:bg-slate-700 text-sm font-mono tracking-widest transition-all"
                  >
                    CANCELAR
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-t-2 border-neon-cyan rounded-full animate-spin" />
        </div>
      ) : configs.length === 0 ? (
        <div className="glass-panel border-dashed border-slate-700 rounded-lg p-12 text-center">
          <Settings className="mx-auto text-slate-600 mb-4" size={48} />
          <p className="text-slate-400 font-mono tracking-widest">BASE DE DATOS DE CONFIGURACIONES VACÍA</p>
          <p className="text-slate-500 font-mono text-sm mt-2">Cree un nuevo perfil para comenzar.</p>
        </div>
      ) : (
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {configs.map(cfg => (
            <motion.div key={cfg.id} variants={itemVariants} className="glass-panel rounded-lg p-5 flex flex-col justify-between group relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-slate-700 group-hover:bg-neon-cyan transition-colors" />
              
              <div>
                <div className="flex justify-between items-start mb-4">
                  <h4 className="font-bold text-white font-mono tracking-wide flex items-center gap-2">
                    <Shield size={16} className="text-neon-purple" />
                    {cfg.name}
                  </h4>
                </div>
                
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                    <Target size={14} className="text-neon-cyan" />
                    <span className="truncate">{cfg.targetUrl}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                    <Settings size={14} className="text-slate-500" />
                    <span>PROFUNDIDAD: <span className="text-white uppercase">{cfg.depth}</span></span>
                  </div>
                  {cfg.scheduledAt && (
                    <div className="flex items-center gap-2 text-xs font-mono text-neon-yellow">
                      <Calendar size={14} />
                      <span>{new Date(cfg.scheduledAt).toLocaleString()}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-1 mb-6">
                  {cfg.vulnerabilityTypes?.slice(0, 3).map(t => (
                    <span key={t} className="text-[9px] font-mono tracking-widest px-1.5 py-0.5 border border-slate-700 rounded text-slate-400 bg-slate-800/50">
                      {t.replace(/_/g, ' ')}
                    </span>
                  ))}
                  {(cfg.vulnerabilityTypes?.length ?? 0) > 3 && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 text-slate-500">+{cfg.vulnerabilityTypes.length - 3} MÁS</span>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-800/50">
                <button
                  onClick={() => openEdit(cfg)}
                  className="flex-1 text-xs font-mono tracking-widest text-slate-400 hover:text-neon-cyan flex items-center justify-center gap-1 py-2 rounded transition-colors hover:bg-neon-cyan/10"
                >
                  <Edit2 size={14} /> EDITAR
                </button>
                <button
                  onClick={() => remove(cfg.id)}
                  className="flex-1 text-xs font-mono tracking-widest text-slate-400 hover:text-neon-red flex items-center justify-center gap-1 py-2 rounded transition-colors hover:bg-neon-red/10"
                >
                  <Trash2 size={14} /> BORRAR
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
