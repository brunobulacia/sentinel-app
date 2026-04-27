'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { motion, Variants } from 'framer-motion';
import { Activity, AlertTriangle, CheckCircle, XCircle, ShieldAlert, Radar, History } from 'lucide-react';

interface Execution {
  id: string;
  status: string;
  totalVulnerabilities: number;
  createdAt: string;
  scanConfig: { name: string; targetUrl: string };
}

interface StatEntry {
  id: string;
  high: number;
  medium: number;
  low: number;
  targetUrl: string;
  date: string;
}

const STATUS_COLOR: Record<string, string> = {
  COMPLETED: 'bg-neon-green/10 text-neon-green border-neon-green/50',
  RUNNING: 'bg-neon-cyan/10 text-neon-cyan border-neon-cyan/50 animate-pulse',
  PENDING: 'bg-neon-yellow/10 text-neon-yellow border-neon-yellow/50',
  FAILED: 'bg-neon-red/10 text-neon-red border-neon-red/50',
};

const PIE_COLORS = ['#ef4444', '#eab308', '#22c55e'];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export default function DashboardPage() {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [stats, setStats] = useState<StatEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/scan-executions'),
      api.get('/scan-history/stats'),
    ]).then(([exRes, stRes]) => {
      setExecutions(exRes.data);
      setStats(stRes.data);
    }).finally(() => setLoading(false));
  }, []);

  const completed = executions.filter(e => e.status === 'COMPLETED').length;
  const failed = executions.filter(e => e.status === 'FAILED').length;
  const running = executions.filter(e => e.status === 'RUNNING' || e.status === 'PENDING').length;
  const totalVulns = executions.reduce((s, e) => s + (e.totalVulnerabilities ?? 0), 0);

  const totalHigh = stats.reduce((s, e) => s + e.high, 0);
  const totalMedium = stats.reduce((s, e) => s + e.medium, 0);
  const totalLow = stats.reduce((s, e) => s + e.low, 0);

  const pieData = [
    { name: 'Alta', value: totalHigh },
    { name: 'Media', value: totalMedium },
    { name: 'Baja', value: totalLow },
  ].filter(d => d.value > 0);

  const barData = stats.slice(0, 8).map(s => ({
    name: s.targetUrl ? (() => { try { return new URL(s.targetUrl).hostname; } catch { return s.id.slice(0, 8); } })() : s.id.slice(0, 8),
    Alta: s.high,
    Media: s.medium,
    Baja: s.low,
  }));

  const recent = [...executions].slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-t-2 border-r-2 border-neon-cyan rounded-full animate-spin shadow-[0_0_15px_rgba(0,240,255,0.5)]" />
          <p className="text-neon-cyan font-mono tracking-widest animate-pulse">RECOPILANDO TELEMETRÍA...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <motion.div variants={itemVariants} className="flex items-center gap-3 mb-8">
        <Activity className="text-neon-cyan" size={28} />
        <h2 className="text-2xl font-bold font-mono tracking-widest text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">CENTRO DE OPERACIONES</h2>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Escaneos', value: executions.length, color: 'text-neon-cyan', bg: 'bg-neon-cyan/5', icon: Radar },
          { label: 'Completados', value: completed, color: 'text-neon-green', bg: 'bg-neon-green/5', icon: CheckCircle },
          { label: 'Fallidos', value: failed, color: 'text-neon-red', bg: 'bg-neon-red/5', icon: XCircle },
          { label: 'Total Vulnerabilidades', value: totalVulns, color: 'text-neon-yellow', bg: 'bg-neon-yellow/5', icon: ShieldAlert },
        ].map((stat, i) => (
          <motion.div key={i} variants={itemVariants} className="relative group">
            <div className={`absolute -inset-0.5 ${stat.bg} rounded-lg blur opacity-50 group-hover:opacity-100 transition duration-500`} />
            <div className="relative glass-panel rounded-lg p-5 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">{stat.label}</p>
                <stat.icon size={16} className={`${stat.color} opacity-70`} />
              </div>
              <p className={`text-4xl font-bold font-mono ${stat.color} drop-shadow-[0_0_8px_currentColor]`}>{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {pieData.length > 0 && (
          <motion.div variants={itemVariants} className="glass-panel rounded-lg p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-neon-red via-neon-yellow to-neon-green opacity-50" />
            <h3 className="text-sm font-mono tracking-widest text-slate-300 mb-4 flex items-center gap-2">
              <AlertTriangle size={14} className="text-neon-yellow" /> DISTRIBUCIÓN DE SEVERIDAD
            </h3>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="60%" height={200}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} stroke="none">
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(0,240,255,0.2)', borderRadius: '8px', color: '#fff', fontFamily: 'monospace' }}
                    itemStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-4">
                {[
                  { label: 'Alta', value: totalHigh, color: 'text-neon-red' },
                  { label: 'Media', value: totalMedium, color: 'text-neon-yellow' },
                  { label: 'Baja', value: totalLow, color: 'text-neon-green' },
                ].map(item => (
                  <div key={item.label}>
                    <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest flex items-center gap-1">
                      <span className={`w-2 h-2 rounded-full ${item.color.replace('text-', 'bg-')} shadow-[0_0_5px_currentColor]`} />
                      {item.label}
                    </p>
                    <p className={`text-2xl font-bold font-mono ${item.color} drop-shadow-[0_0_5px_currentColor]`}>{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {running > 0 && (
          <motion.div variants={itemVariants} className="glass-panel rounded-lg p-6 flex flex-col justify-center items-center relative overflow-hidden">
            <div className="absolute inset-0 bg-neon-cyan/5 animate-pulse" />
            <div className="w-24 h-24 rounded-full border-2 border-neon-cyan border-t-transparent animate-spin mb-4 shadow-[0_0_20px_rgba(0,240,255,0.3)] flex items-center justify-center">
              <div className="w-16 h-16 rounded-full border-2 border-neon-purple border-b-transparent animate-spin-reverse" />
            </div>
            <div className="text-4xl font-bold font-mono text-neon-cyan drop-shadow-[0_0_8px_rgba(0,240,255,0.8)]">{running}</div>
            <p className="text-slate-400 mt-2 font-mono text-xs tracking-widest">ESCANEOS EN PROGRESO</p>
          </motion.div>
        )}

        {barData.length > 0 && (
          <motion.div variants={itemVariants} className={`glass-panel rounded-lg p-6 ${pieData.length === 0 ? 'lg:col-span-2' : ''}`}>
            <h3 className="text-sm font-mono tracking-widest text-slate-300 mb-6 flex items-center gap-2">
              <Radar size={14} className="text-neon-cyan" /> IMPACTO POR OBJETIVO
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{ fill: 'rgba(0, 240, 255, 0.05)' }}
                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(0,240,255,0.2)', borderRadius: '8px', color: '#fff', fontFamily: 'monospace' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', fontFamily: 'monospace', color: '#94a3b8' }} iconType="circle" />
                <Bar dataKey="Alta" fill="#ef4444" radius={[2, 2, 0, 0]} />
                <Bar dataKey="Media" fill="#eab308" radius={[2, 2, 0, 0]} />
                <Bar dataKey="Baja" fill="#22c55e" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        )}
      </div>

      <motion.div variants={itemVariants} className="glass-panel rounded-lg p-6">
        <h3 className="text-sm font-mono tracking-widest text-slate-300 mb-4 flex items-center gap-2">
          <History size={14} className="text-neon-purple" /> REGISTRO DE ACTIVIDAD RECIENTE
        </h3>
        {recent.length === 0 ? (
          <p className="text-slate-500 text-sm font-mono text-center py-4">SIN REGISTROS EN LA BASE DE DATOS.</p>
        ) : (
          <div className="divide-y divide-slate-800/50">
            {recent.map(e => (
              <div key={e.id} className="flex items-center justify-between py-4 group hover:bg-slate-800/30 transition-colors -mx-4 px-4 rounded-md">
                <div>
                  <p className="text-sm font-bold text-slate-200 font-mono tracking-wide">{e.scanConfig?.name}</p>
                  <p className="text-[10px] text-neon-cyan/70 font-mono mt-1">{e.scanConfig?.targetUrl}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs font-mono text-slate-400">
                    <strong className="text-white">{e.totalVulnerabilities ?? 0}</strong> VULNS
                  </span>
                  <span className={`text-[10px] px-2 py-1 rounded-sm border font-mono tracking-widest ${STATUS_COLOR[e.status] ?? 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                    {e.status}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono w-20 text-right">{new Date(e.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
