'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { motion, Variants } from 'framer-motion';
import { History, GitCompare, Activity, FileSearch, Filter } from 'lucide-react';

interface Execution {
  id: string;
  status: string;
  totalVulnerabilities: number;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  scanConfig: { name: string; targetUrl: string };
}

interface StatEntry {
  id: string;
  date: string;
  status: string;
  targetUrl: string;
  total: number;
  high: number;
  medium: number;
  low: number;
}

interface CompareResult {
  scan1: { id: string; total: number };
  scan2: { id: string; total: number };
  newInScan2: string[];
  resolvedInScan2: string[];
  persistent: string[];
}

const STATUS_COLOR: Record<string, string> = {
  COMPLETED: 'bg-green-500/10 text-green-400 border-green-500/30',
  RUNNING: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  PENDING: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  FAILED: 'bg-red-500/10 text-red-400 border-red-500/30',
};

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } }
};

// Recharts Custom Tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/90 border border-slate-700 p-3 rounded-lg shadow-xl backdrop-blur-md">
        <p className="text-gray-200 font-mono text-sm mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-xs font-mono" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function HistorialPage() {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [stats, setStats] = useState<StatEntry[]>([]);
  const [compareA, setCompareA] = useState('');
  const [compareB, setCompareB] = useState('');
  const [comparison, setComparison] = useState<CompareResult | null>(null);
  const [comparing, setComparing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (filterStatus) params.status = filterStatus;
    if (fromDate) params.from = fromDate;
    if (toDate) params.to = toDate;
    try {
      const { data } = await api.get('/scan-history', { params });
      setExecutions(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [filterStatus, fromDate, toDate]);

  const loadStats = async () => {
    try {
      const { data } = await api.get('/scan-history/stats');
      setStats(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { load(); loadStats(); }, [load]);

  const compare = async () => {
    if (!compareA || !compareB) return;
    setComparing(true);
    try {
      const { data } = await api.get(`/scan-history/compare/${compareA}/${compareB}`);
      setComparison(data);
    } catch (e) {
      console.error(e);
    } finally {
      setComparing(false);
    }
  };

  const chartData = stats.map(s => ({
    name: s.targetUrl ? new URL(s.targetUrl).hostname : s.id.slice(0, 8),
    Alta: s.high,
    Media: s.medium,
    Baja: s.low,
  }));

  return (
    <motion.div 
      initial="hidden" 
      animate="visible" 
      variants={containerVariants} 
      className="space-y-6 text-gray-200"
    >
      <div className="flex items-center gap-3 mb-6">
        <History className="w-8 h-8 text-cyan-400" />
        <h2 className="text-3xl font-bold tracking-tight text-white drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">
          REGISTRO HISTÓRICO
        </h2>
      </div>

      {chartData.length > 0 && (
        <motion.div variants={itemVariants} className="glass-panel rounded-xl border border-slate-700/50 p-6 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl" />
          <div className="flex items-center gap-2 mb-6">
            <Activity className="w-5 h-5 text-cyan-400" />
            <h3 className="text-lg font-mono font-bold text-gray-200">TENDENCIA DE VULNERABILIDADES (ÚLTIMOS 10)</h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }} stroke="#475569" />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }} stroke="#475569" allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                <Legend wrapperStyle={{ fontSize: '12px', fontFamily: 'monospace', paddingTop: '10px' }} />
                <Bar dataKey="Alta" fill="#ef4444" radius={[2, 2, 0, 0]} />
                <Bar dataKey="Media" fill="#f97316" radius={[2, 2, 0, 0]} />
                <Bar dataKey="Baja" fill="#22c55e" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {/* Filters */}
      <motion.div variants={itemVariants} className="glass-panel rounded-xl border border-slate-700/50 p-5 flex flex-wrap gap-5 items-end">
        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs font-mono text-cyan-400 mb-1.5 uppercase tracking-wider">Estado</label>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="w-full bg-slate-900/80 border border-slate-700 rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-cyan-500 transition-colors font-mono"
          >
            <option value="" className="bg-slate-900">[*] TODOS</option>
            <option value="COMPLETED" className="bg-slate-900">[✓] COMPLETADO</option>
            <option value="FAILED" className="bg-slate-900">[✕] FALLIDO</option>
            <option value="RUNNING" className="bg-slate-900">[⟳] EN PROCESO</option>
            <option value="PENDING" className="bg-slate-900">[...] PENDIENTE</option>
          </select>
        </div>
        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs font-mono text-cyan-400 mb-1.5 uppercase tracking-wider">Desde (T-)</label>
          <input
            type="date"
            value={fromDate}
            onChange={e => setFromDate(e.target.value)}
            className="w-full bg-slate-900/80 border border-slate-700 rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-cyan-500 transition-colors font-mono [color-scheme:dark]"
          />
        </div>
        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs font-mono text-cyan-400 mb-1.5 uppercase tracking-wider">Hasta (T-)</label>
          <input
            type="date"
            value={toDate}
            onChange={e => setToDate(e.target.value)}
            className="w-full bg-slate-900/80 border border-slate-700 rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-cyan-500 transition-colors font-mono [color-scheme:dark]"
          />
        </div>
        <button
          onClick={load}
          className="bg-cyan-600/20 hover:bg-cyan-600/40 border border-cyan-500/50 text-cyan-400 px-6 py-2 rounded-md text-sm font-mono transition-all flex items-center gap-2 hover:shadow-[0_0_15px_rgba(34,211,238,0.3)]"
        >
          <Filter className="w-4 h-4" /> APLICAR
        </button>
      </motion.div>

      {/* Executions Table */}
      <motion.div variants={itemVariants} className="glass-panel rounded-xl border border-slate-700/50 overflow-hidden">
        {loading ? (
           <div className="p-8 text-center text-cyan-500 font-mono flex items-center justify-center gap-3">
             <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
             LEYENDO REGISTROS...
           </div>
        ) : executions.length === 0 ? (
          <div className="p-8 text-center text-gray-500 font-mono">
            [0] RESULTADOS ENCONTRADOS.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-900/80 border-b border-slate-700 font-mono text-xs text-gray-400">
                <tr>
                  <th className="px-4 py-4 uppercase tracking-wider">Configuración</th>
                  <th className="px-4 py-4 uppercase tracking-wider">Estado</th>
                  <th className="px-4 py-4 uppercase tracking-wider">Vulns</th>
                  <th className="px-4 py-4 uppercase tracking-wider">Inicio</th>
                  <th className="px-4 py-4 uppercase tracking-wider">Fin</th>
                  <th className="px-4 py-4 uppercase tracking-wider">ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {executions.map(e => (
                  <tr key={e.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-4">
                      <p className="font-bold text-gray-200 font-mono">{e.scanConfig?.name}</p>
                      <p className="text-xs text-cyan-500 font-mono">{e.scanConfig?.targetUrl}</p>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`text-[10px] px-2 py-1 border rounded-sm font-mono font-bold ${STATUS_COLOR[e.status]}`}>
                        [{e.status}]
                      </span>
                    </td>
                    <td className="px-4 py-4 text-orange-400 font-mono font-bold">{e.totalVulnerabilities}</td>
                    <td className="px-4 py-4 text-gray-400 text-xs font-mono">
                      {e.startedAt ? new Date(e.startedAt).toLocaleString() : '-'}
                    </td>
                    <td className="px-4 py-4 text-gray-400 text-xs font-mono">
                      {e.finishedAt ? new Date(e.finishedAt).toLocaleString() : '-'}
                    </td>
                    <td className="px-4 py-4 text-slate-500 text-xs font-mono">{e.id.slice(0, 8)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Comparison Tool */}
      <motion.div variants={itemVariants} className="glass-panel rounded-xl border border-purple-500/30 p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-6">
            <GitCompare className="w-6 h-6 text-purple-400" />
            <h3 className="text-lg font-mono font-bold text-gray-200">HERRAMIENTA DE COMPARACIÓN DIFERENCIAL</h3>
          </div>
          
          <div className="flex gap-4 mb-6 flex-wrap">
            <select
              value={compareA}
              onChange={e => setCompareA(e.target.value)}
              className="flex-1 min-w-[200px] bg-slate-900/80 border border-slate-700 rounded-md px-4 py-3 text-sm text-gray-200 focus:outline-none focus:border-purple-500 transition-colors font-mono"
            >
              <option value="" className="bg-slate-900">SELECCIONAR BASE (A)...</option>
              {executions.map(e => (
                <option key={e.id} value={e.id} className="bg-slate-900">
                  {e.scanConfig?.name} — {e.id.slice(0, 8)}
                </option>
              ))}
            </select>
            <div className="flex items-center justify-center px-2 text-purple-500">VS</div>
            <select
              value={compareB}
              onChange={e => setCompareB(e.target.value)}
              className="flex-1 min-w-[200px] bg-slate-900/80 border border-slate-700 rounded-md px-4 py-3 text-sm text-gray-200 focus:outline-none focus:border-purple-500 transition-colors font-mono"
            >
              <option value="" className="bg-slate-900">SELECCIONAR OBJETIVO (B)...</option>
              {executions.map(e => (
                <option key={e.id} value={e.id} className="bg-slate-900">
                  {e.scanConfig?.name} — {e.id.slice(0, 8)}
                </option>
              ))}
            </select>
            <button
              onClick={compare}
              disabled={!compareA || !compareB || comparing}
              className="bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/50 text-purple-300 px-8 py-3 rounded-md text-sm font-mono font-bold transition-all disabled:opacity-50 hover:shadow-[0_0_15px_rgba(168,85,247,0.3)]"
            >
              {comparing ? 'CALCULANDO DIFF...' : 'EJECUTAR DIFF'}
            </button>
          </div>

          {comparison && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-2 h-full bg-red-500/50" />
                <p className="text-xs font-mono text-red-400 mb-2">[+] NUEVAS EN B (REGRESIONES)</p>
                <p className="text-4xl font-bold font-mono text-red-500 drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]">{comparison.newInScan2.length}</p>
                {comparison.newInScan2.length > 0 && (
                  <div className="mt-4 bg-slate-900/80 rounded border border-red-500/10 p-2">
                    <ul className="text-[10px] font-mono text-red-300/80 space-y-1">
                      {comparison.newInScan2.slice(0, 3).map(n => <li key={n} className="truncate">- {n}</li>)}
                      {comparison.newInScan2.length > 3 && <li className="text-slate-500 pt-1">... y {comparison.newInScan2.length - 3} más</li>}
                    </ul>
                  </div>
                )}
              </div>
              
              <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-2 h-full bg-green-500/50" />
                <p className="text-xs font-mono text-green-400 mb-2">[-] RESUELTAS EN B (PARCHES)</p>
                <p className="text-4xl font-bold font-mono text-green-500 drop-shadow-[0_0_5px_rgba(34,197,94,0.5)]">{comparison.resolvedInScan2.length}</p>
                {comparison.resolvedInScan2.length > 0 && (
                  <div className="mt-4 bg-slate-900/80 rounded border border-green-500/10 p-2">
                    <ul className="text-[10px] font-mono text-green-300/80 space-y-1">
                      {comparison.resolvedInScan2.slice(0, 3).map(n => <li key={n} className="truncate">- {n}</li>)}
                      {comparison.resolvedInScan2.length > 3 && <li className="text-slate-500 pt-1">... y {comparison.resolvedInScan2.length - 3} más</li>}
                    </ul>
                  </div>
                )}
              </div>
              
              <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-2 h-full bg-orange-500/50" />
                <p className="text-xs font-mono text-orange-400 mb-2">[=] PERSISTENTES</p>
                <p className="text-4xl font-bold font-mono text-orange-500 drop-shadow-[0_0_5px_rgba(249,115,22,0.5)]">{comparison.persistent.length}</p>
                {comparison.persistent.length > 0 && (
                  <div className="mt-4 bg-slate-900/80 rounded border border-orange-500/10 p-2">
                    <ul className="text-[10px] font-mono text-orange-300/80 space-y-1">
                      {comparison.persistent.slice(0, 3).map(n => <li key={n} className="truncate">- {n}</li>)}
                      {comparison.persistent.length > 3 && <li className="text-slate-500 pt-1">... y {comparison.persistent.length - 3} más</li>}
                    </ul>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
