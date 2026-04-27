'use client';
import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Crosshair, Play, TerminalSquare, AlertTriangle, ShieldCheck, CheckCircle2, XCircle } from 'lucide-react';

interface ScanConfig { id: string; name: string; targetUrl: string; }
interface Execution {
  id: string;
  status: string;
  progress: number;
  totalVulnerabilities: number;
  startedAt: string | null;
  finishedAt: string | null;
  errorMessage: string | null;
  scanConfig: ScanConfig;
}

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'bg-neon-yellow/10 text-neon-yellow border-neon-yellow/50',
  RUNNING: 'bg-neon-cyan/10 text-neon-cyan border-neon-cyan/50 animate-pulse',
  COMPLETED: 'bg-neon-green/10 text-neon-green border-neon-green/50',
  FAILED: 'bg-neon-red/10 text-neon-red border-neon-red/50',
};

const LOG_MESSAGES = [
  "Inicializando analizador de red...",
  "Resolviendo DNS y conectando al objetivo...",
  "Escaneando puertos abiertos...",
  "Analizando cabeceras HTTP de seguridad...",
  "Buscando directorios expuestos...",
  "Verificando configuraciones SSL/TLS...",
  "Probando vulnerabilidades XSS...",
  "Probando vulnerabilidades SQLi...",
  "Analizando dependencias de software...",
  "Consolidando reporte de vulnerabilidades..."
];

export default function EscaneoPage() {
  const [configs, setConfigs] = useState<ScanConfig[]>([]);
  const [selectedConfig, setSelectedConfig] = useState('');
  const [execution, setExecution] = useState<Execution | null>(null);
  const [recent, setRecent] = useState<Execution[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const startPolling = (id: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const { data: updated } = await api.get(`/scan-executions/${id}`);
      setExecution(updated);
      
      if (updated.status === 'RUNNING') {
        const logIndex = Math.min(Math.floor(updated.progress / 10), LOG_MESSAGES.length - 1);
        setLogs(prev => {
          const newLog = `[${new Date().toISOString().split('T')[1].slice(0, 8)}] [INFO] ${LOG_MESSAGES[logIndex]}`;
          if (!prev.includes(newLog)) return [...prev, newLog];
          return prev;
        });
      }

      if (updated.status === 'COMPLETED' || updated.status === 'FAILED') {
        clearInterval(pollRef.current!);
        pollRef.current = null;
        if (updated.status === 'COMPLETED') {
          setLogs(prev => [...prev, `[${new Date().toISOString().split('T')[1].slice(0, 8)}] [SUCCESS] Análisis completado. ${updated.totalVulnerabilities} vulnerabilidades halladas.`]);
        } else {
          setLogs(prev => [...prev, `[${new Date().toISOString().split('T')[1].slice(0, 8)}] [ERROR] ${updated.errorMessage || 'Análisis abortado por error crítico.'}`]);
        }
        const { data } = await api.get('/scan-executions');
        setRecent(data.slice(0, 5));
      }
    }, 2000);
  };

  const loadRecent = async () => {
    const { data } = await api.get('/scan-executions');
    setRecent(data.slice(0, 5));
    const active = data.find((e: Execution) => e.status === 'RUNNING' || e.status === 'PENDING');
    if (active && !pollRef.current) {
      setExecution(active);
      setLogs([`[${new Date().toISOString().split('T')[1].slice(0, 8)}] [INFO] Restaurando sesión de escaneo...`]);
      startPolling(active.id);
    }
  };

  useEffect(() => {
    api.get('/scan-configs').then(r => setConfigs(r.data));
    loadRecent();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const startScan = async () => {
    if (!selectedConfig) return;
    setLogs([`[${new Date().toISOString().split('T')[1].slice(0, 8)}] [SYSTEM] Iniciando secuencia de escaneo...`]);
    const { data } = await api.post('/scan-executions', { scanConfigId: selectedConfig });
    setExecution(data);
    startPolling(data.id);
  };

  const isRunning = execution?.status === 'RUNNING' || execution?.status === 'PENDING';

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 max-w-6xl mx-auto"
    >
      <div className="flex items-center gap-3 mb-8">
        <Crosshair className="text-neon-cyan" size={28} />
        <h2 className="text-2xl font-bold font-mono tracking-widest text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">MÓDULO DE ESCANEO</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel de Control y Radar */}
        <div className="lg:col-span-1 space-y-6">
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="glass-panel rounded-lg p-6 relative overflow-hidden group"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-neon-cyan to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
            <h3 className="text-sm font-mono tracking-widest text-slate-300 mb-6 flex items-center gap-2">
              <Crosshair size={14} className="text-neon-cyan" /> FIJAR OBJETIVO
            </h3>
            
            <div className="space-y-4">
              <div className="relative">
                <select
                  value={selectedConfig}
                  onChange={e => setSelectedConfig(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-md px-4 py-3 text-sm text-slate-300 font-mono focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan appearance-none transition-all"
                >
                  <option value="" className="bg-slate-900">SELECCIONAR VECTOR DE ATAQUE...</option>
                  {configs.map(c => (
                    <option key={c.id} value={c.id} className="bg-slate-900">{c.name} — {c.targetUrl}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-3 pointer-events-none text-slate-500">▼</div>
              </div>
              
              <button
                onClick={startScan}
                disabled={!selectedConfig || isRunning}
                className="w-full relative overflow-hidden group bg-slate-800 border border-slate-700 text-white px-6 py-3 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-all font-mono tracking-widest flex items-center justify-center gap-2 hover:border-neon-cyan hover:shadow-[0_0_15px_rgba(0,240,255,0.3)]"
              >
                {!isRunning && <div className="absolute inset-0 bg-neon-cyan/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />}
                <Play size={16} className={isRunning ? "opacity-50" : "text-neon-cyan"} />
                <span className="relative z-10">{isRunning ? 'ESCANEO EN CURSO...' : 'INICIAR ANÁLISIS'}</span>
              </button>
            </div>
          </motion.div>

          {/* Radar Animado */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="glass-panel rounded-lg p-6 flex flex-col items-center justify-center min-h-[300px] relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-grid-white/[0.02] bg-[length:16px_16px]" />
            <div className="relative w-56 h-56 rounded-full border-2 border-neon-cyan/40 flex items-center justify-center overflow-hidden shadow-[0_0_15px_rgba(0,240,255,0.1)] bg-slate-900/40">
              <div className="absolute w-full h-full rounded-full border border-neon-cyan/30 scale-75" />
              <div className="absolute w-full h-full rounded-full border border-neon-cyan/20 scale-50" />
              <div className="absolute w-full h-full rounded-full border border-neon-cyan/10 scale-25" />
              <div className="absolute w-full h-[1px] bg-neon-cyan/30" />
              <div className="absolute h-full w-[1px] bg-neon-cyan/30" />
              
              <AnimatePresence>
                {isRunning && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, rotate: 360 }}
                    exit={{ opacity: 0 }}
                    transition={{ rotate: { duration: 2, repeat: Infinity, ease: "linear" } }}
                    className="absolute inset-0 rounded-full"
                    style={{ 
                      background: 'conic-gradient(from 0deg at 50% 50%, transparent 75%, rgba(0,240,255,0.6) 100%)' 
                    }}
                  />
                )}
              </AnimatePresence>

              {/* Blips (Vulnerabilidades Encontradas simuladas visualmente) */}
              {execution?.status === 'COMPLETED' && (
                <>
                  <div className="absolute w-2.5 h-2.5 bg-neon-red rounded-full top-[30%] left-[60%] shadow-[0_0_10px_#ff003c] animate-pulse" />
                  <div className="absolute w-2 h-2 bg-neon-yellow rounded-full bottom-[40%] right-[70%] shadow-[0_0_8px_#fde047] animate-pulse" />
                  <div className="absolute w-2.5 h-2.5 bg-neon-green rounded-full top-[70%] right-[30%] shadow-[0_0_10px_#00ff66] animate-pulse" />
                </>
              )}
            </div>
            <p className="mt-6 font-mono text-xs tracking-widest text-slate-400">
              ESTADO DEL RADAR: <span className={isRunning ? "text-neon-cyan animate-pulse" : "text-slate-500"}>{isRunning ? 'ACTIVO' : 'EN ESPERA'}</span>
            </p>
          </motion.div>
        </div>

        {/* Terminal y Progreso */}
        <div className="lg:col-span-2 space-y-6 flex flex-col">
          {/* Barra de Progreso */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="glass-panel rounded-lg p-6 relative"
          >
            <h3 className="text-sm font-mono tracking-widest text-slate-300 mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2"><Crosshair size={14} className="text-neon-purple" /> PROGRESO DE OPERACIÓN</span>
              {execution && (
                <span className={`text-[10px] px-2 py-1 rounded-sm border font-mono tracking-widest ${STATUS_COLOR[execution.status]}`}>
                  {execution.status}
                </span>
              )}
            </h3>

            {!execution ? (
              <div className="h-20 flex items-center justify-center border border-dashed border-slate-700/50 rounded bg-slate-900/30">
                <p className="text-slate-500 font-mono text-sm tracking-widest">ESPERANDO INSTRUCCIONES</p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-mono text-slate-300">{execution.scanConfig?.name} <span className="text-slate-500">[{execution.scanConfig?.targetUrl}]</span></p>
                <div className="relative w-full h-4 bg-slate-900 rounded-full overflow-hidden border border-slate-700 shadow-inner">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${execution.progress}%` }}
                    transition={{ duration: 0.5 }}
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-neon-purple to-neon-cyan"
                  >
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTAgNDBsNDAtNDBIMHoiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4yKSIgLz48L3N2Zz4=')] opacity-50" style={{ animation: 'slide 2s linear infinite' }} />
                  </motion.div>
                </div>
                <div className="flex justify-between font-mono text-xs">
                  <span className="text-neon-cyan drop-shadow-[0_0_5px_rgba(0,240,255,0.5)]">{execution.progress}% COMPLETADO</span>
                  {execution.status === 'COMPLETED' && (
                    <span className="text-neon-red drop-shadow-[0_0_5px_rgba(255,0,60,0.5)] flex items-center gap-1">
                      <ShieldCheck size={12} /> {execution.totalVulnerabilities} VULN HALLADAS
                    </span>
                  )}
                </div>
              </div>
            )}
          </motion.div>

          {/* Terminal de Logs */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="glass-panel rounded-lg p-0 flex flex-col overflow-hidden border-slate-700 h-[350px]"
          >
            <div className="bg-slate-900/90 border-b border-slate-700 p-3 flex items-center justify-between shadow-md z-10">
              <div className="flex items-center gap-2">
                <TerminalSquare size={16} className="text-slate-400" />
                <span className="text-xs font-mono text-slate-400 tracking-widest">TERMINAL.LOG</span>
              </div>
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-600/50"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-slate-600/50"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-slate-600/50"></div>
              </div>
            </div>
            <div ref={scrollContainerRef} className="flex-1 p-4 bg-black/80 font-mono text-xs overflow-y-auto space-y-2">
              {logs.length === 0 ? (
                <p className="text-slate-600 italic">Esperando inicio de sesión...</p>
              ) : (
                logs.map((log, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={
                      log.includes('[ERROR]') ? 'text-neon-red drop-shadow-[0_0_2px_currentColor]' : 
                      log.includes('[SUCCESS]') ? 'text-neon-green drop-shadow-[0_0_2px_currentColor]' : 
                      log.includes('[SYSTEM]') ? 'text-neon-purple drop-shadow-[0_0_2px_currentColor]' : 
                      'text-neon-cyan/80'
                    }
                  >
                    {log}
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Historial Reciente */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="glass-panel rounded-lg p-6 mt-6"
      >
        <h3 className="text-sm font-mono tracking-widest text-slate-300 mb-6 flex items-center gap-2">
          <AlertTriangle size={14} className="text-neon-yellow" /> BITÁCORA RECIENTE
        </h3>
        {recent.length === 0 ? (
          <p className="text-slate-500 font-mono text-sm text-center py-4">SIN REGISTROS PREVIOS.</p>
        ) : (
          <div className="divide-y divide-slate-800/50">
            {recent.map(e => (
              <div key={e.id} className="flex items-center justify-between py-4 group hover:bg-slate-800/30 transition-colors -mx-4 px-4 rounded-md">
                <div className="flex items-center gap-3">
                  {e.status === 'COMPLETED' ? <CheckCircle2 size={16} className="text-neon-green" /> : 
                   e.status === 'FAILED' ? <XCircle size={16} className="text-neon-red" /> : 
                   <div className="w-4 h-4 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin" />}
                  <div>
                    <p className="text-sm font-bold text-slate-200 font-mono tracking-wide">{e.scanConfig?.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono mt-1">ID: {e.id.slice(0, 8)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs font-mono text-slate-400">
                    <strong className={e.totalVulnerabilities > 0 ? "text-neon-red" : "text-white"}>{e.totalVulnerabilities}</strong> VULNS
                  </span>
                  <span className={`text-[10px] px-2 py-1 rounded-sm border font-mono tracking-widest ${STATUS_COLOR[e.status] ?? 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                    {e.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
