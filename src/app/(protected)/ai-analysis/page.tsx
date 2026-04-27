'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, AlertTriangle, ShieldAlert, Cpu, Sparkles, Activity, Layers, ArrowRight, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Execution {
  id: string;
  status: string;
  totalVulnerabilities: number;
  createdAt: string;
  scanConfig: { name: string; targetUrl: string };
}

interface AdditionalVuln {
  name: string;
  description: string;
  type: string;
  likelihood: 'HIGH' | 'MEDIUM' | 'LOW';
  reason: string;
  recommendation: string;
}

interface RemediationItem {
  order: number;
  action: string;
  impact: string;
  effort: 'LOW' | 'MEDIUM' | 'HIGH';
}

interface AiAnalysis {
  summary: string;
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  stackAnalysis: string;
  additionalVulnerabilities: AdditionalVuln[];
  remediationPriority: RemediationItem[];
  attackScenarios: string[];
}

interface AnalysisResult {
  executionId: string;
  targetUrl: string;
  scannedAt: string;
  vulnCounts: { total: number; high: number; medium: number; low: number };
  analysis: AiAnalysis;
}

const RISK_STYLE: Record<string, string> = {
  CRITICAL: 'bg-red-500/20 text-red-400 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.3)]',
  HIGH: 'bg-orange-500/20 text-orange-400 border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.3)]',
  MEDIUM: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.3)]',
  LOW: 'bg-green-500/20 text-green-400 border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.3)]',
};

const LIKELIHOOD_DOT: Record<string, string> = {
  HIGH: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]',
  MEDIUM: 'bg-yellow-400 shadow-[0_0_8px_rgba(234,179,8,0.8)]',
  LOW: 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]',
};

const EFFORT_BADGE: Record<string, string> = {
  LOW: 'bg-green-500/20 text-green-400 border border-green-500/30',
  MEDIUM: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  HIGH: 'bg-red-500/20 text-red-400 border border-red-500/30',
};

export default function AiAnalysisPage() {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/scan-executions').then(res => {
      setExecutions(res.data.filter((e: Execution) => e.status === 'COMPLETED'));
    });
  }, []);

  const analyze = async () => {
    if (!selectedId) return;
    setAnalyzing(true);
    setResult(null);
    setError('');
    try {
      const res = await api.get(`/ai-analysis/${selectedId}`);
      setResult(res.data);
    } catch {
      setError('Error al conectar con el servicio de IA. Verifica que ANTHROPIC_API_KEY esté configurado en el servidor.');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center gap-3 mb-6"
      >
        <div className="p-2 bg-neon-cyan/20 rounded-lg border border-neon-cyan/50 relative">
          <Sparkles className="absolute -top-1 -right-1 w-3 h-3 text-white animate-pulse" />
          <Bot className="w-6 h-6 text-neon-cyan" />
        </div>
        <h2 className="text-2xl font-bold text-white tracking-wider drop-shadow-[0_0_8px_rgba(0,255,255,0.5)]">
          Análisis LLM <span className="text-gray-500 font-light text-xl">| Claude Security Expert</span>
        </h2>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-6 border-l-4 border-l-neon-cyan relative overflow-hidden"
      >
        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-neon-cyan/10 rounded-full blur-3xl pointer-events-none" />
        
        <h3 className="text-lg font-semibold mb-2 text-gray-200 flex items-center gap-2">
          <Activity className="w-5 h-5 text-neon-cyan" />
          Contexto de Análisis
        </h3>
        <p className="text-sm text-gray-400 mb-6">
          La Inteligencia Artificial correlacionará las vulnerabilidades detectadas, infiriendo el stack tecnológico, prediciendo vectores de ataque compuestos y diseñando un plan de remediación óptimo.
        </p>
        <div className="flex flex-col md:flex-row gap-4">
          <select
            value={selectedId}
            onChange={e => { setSelectedId(e.target.value); setResult(null); setError(''); }}
            className="flex-1 bg-black/50 border border-gray-700/50 rounded-md px-4 py-3 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan transition-all"
          >
            <option value="" className="bg-gray-900 text-gray-400">Seleccionar ejecución completada...</option>
            {executions.map(e => (
              <option key={e.id} value={e.id} className="bg-gray-900 text-gray-200">
                {e.scanConfig?.name} — {e.scanConfig?.targetUrl} — {e.totalVulnerabilities} vulns
              </option>
            ))}
          </select>
          <button
            onClick={analyze}
            disabled={!selectedId || analyzing}
            className={cn(
              "flex items-center justify-center gap-2 px-6 py-3 rounded-md text-sm font-medium transition-all min-w-[200px]",
              !selectedId || analyzing
                ? "bg-gray-800/50 text-gray-500 cursor-not-allowed border border-gray-700/50"
                : "bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/50 hover:bg-neon-cyan hover:text-black hover:shadow-[0_0_15px_rgba(0,255,255,0.5)]"
            )}
          >
            {analyzing ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span>Analizando...</span>
              </>
            ) : (
              <>
                <Bot className="w-4 h-4" />
                <span>Procesar con IA</span>
              </>
            )}
          </button>
        </div>
        {executions.length === 0 && (
          <p className="text-sm text-gray-400/70 mt-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> No hay ejecuciones completadas disponibles.
          </p>
        )}
      </motion.div>

      <AnimatePresence mode="wait">
        {analyzing && (
          <motion.div 
            key="analyzing"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass-panel p-16 text-center border border-neon-cyan/30"
          >
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 border-4 border-neon-cyan/20 rounded-full" />
              <div className="absolute inset-0 border-4 border-neon-cyan border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(0,255,255,0.5)]" style={{ animationDuration: '3s' }} />
              <div className="absolute inset-2 border-4 border-neon-purple/30 border-b-transparent rounded-full animate-spin-reverse" style={{ animationDuration: '2s' }} />
              <Bot className="absolute inset-0 m-auto w-10 h-10 text-neon-cyan animate-pulse" />
            </div>
            <h3 className="text-xl font-bold text-white tracking-wide mb-2">Sintetizando Inteligencia de Amenazas</h3>
            <p className="text-neon-cyan/70 font-mono text-sm max-w-md mx-auto">
              Analizando vectores de ataque, correlacionando vulnerabilidades y formulando estrategias de remediación...
            </p>
          </motion.div>
        )}

        {error && (
          <motion.div 
            key="error"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 flex items-start gap-3"
          >
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-red-400 text-sm">{error}</p>
          </motion.div>
        )}

        {result && !analyzing && (
          <motion.div 
            key="results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="glass-panel p-6 border-t-2 border-t-neon-cyan">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-1">
                    <Sparkles className="w-5 h-5 text-neon-cyan" />
                    Síntesis Estratégica
                  </h3>
                  <p className="text-sm text-gray-400 font-mono">
                    <span className="text-neon-cyan">{result.targetUrl}</span> <span className="mx-2 text-gray-600">|</span> {new Date(result.scannedAt).toLocaleString()}
                  </p>
                </div>
                <div className={cn("px-4 py-2 rounded border flex flex-col items-center justify-center min-w-[120px]", RISK_STYLE[result.analysis.riskLevel])}>
                  <span className="text-xs uppercase tracking-widest opacity-80 mb-0.5">Nivel de Riesgo</span>
                  <span className="font-bold tracking-wider">{result.analysis.riskLevel}</span>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-4 text-sm mb-6 bg-black/40 border border-gray-800/60 rounded-lg p-4">
                <div className="flex items-center gap-2 pr-4 border-r border-gray-800">
                  <span className="text-gray-500 uppercase tracking-wider text-xs">Total</span>
                  <strong className="text-white text-lg font-mono">{result.vulnCounts.total}</strong>
                </div>
                <div className="flex items-center gap-2 pr-4 border-r border-gray-800">
                  <span className="text-red-500/70 uppercase tracking-wider text-xs">Alta</span>
                  <strong className="text-red-400 text-lg font-mono">{result.vulnCounts.high}</strong>
                </div>
                <div className="flex items-center gap-2 pr-4 border-r border-gray-800">
                  <span className="text-yellow-500/70 uppercase tracking-wider text-xs">Media</span>
                  <strong className="text-yellow-400 text-lg font-mono">{result.vulnCounts.medium}</strong>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-500/70 uppercase tracking-wider text-xs">Baja</span>
                  <strong className="text-green-400 text-lg font-mono">{result.vulnCounts.low}</strong>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-black/30 border border-gray-800/50 rounded-lg p-5">
                  <p className="text-xs font-semibold text-neon-cyan uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Activity className="w-4 h-4" /> Resumen Ejecutivo
                  </p>
                  <p className="text-sm text-gray-300 leading-relaxed">{result.analysis.summary}</p>
                </div>
                <div className="bg-black/30 border border-gray-800/50 rounded-lg p-5">
                  <p className="text-xs font-semibold text-neon-purple uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Layers className="w-4 h-4" /> Stack Tecnológico Inferido
                  </p>
                  <p className="text-sm text-gray-300 leading-relaxed font-mono">{result.analysis.stackAnalysis}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {result.analysis.attackScenarios.length > 0 && (
                <div className="glass-panel p-6 border-t-2 border-t-red-500/50">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-red-500" />
                    Vectores de Ataque Compuestos
                  </h3>
                  <ul className="space-y-3">
                    {result.analysis.attackScenarios.map((s, i) => (
                      <motion.li 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        key={i} 
                        className="flex gap-3 text-sm text-gray-300 bg-red-500/5 border border-red-500/10 p-3 rounded-md"
                      >
                        <ArrowRight className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{s}</span>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              )}

              {result.analysis.remediationPriority.length > 0 && (
                <div className="glass-panel p-6 border-t-2 border-t-neon-purple">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-neon-purple" />
                    Plan de Remediación Táctico
                  </h3>
                  <div className="space-y-3">
                    {result.analysis.remediationPriority.map((r, i) => (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        key={i} 
                        className="flex gap-4 items-start bg-black/40 border border-gray-800/60 p-3 rounded-lg hover:border-neon-purple/30 transition-colors"
                      >
                        <div className="w-8 h-8 rounded bg-neon-purple/20 text-neon-purple border border-neon-purple/50 text-sm font-bold font-mono flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(188,19,254,0.2)]">
                          {r.order}
                        </div>
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <p className="text-sm font-bold text-gray-200">{r.action}</p>
                            <span className={cn("text-xs px-2 py-0.5 rounded font-mono", EFFORT_BADGE[r.effort])}>
                              Esfuerzo: {r.effort}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 leading-relaxed">{r.impact}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {result.analysis.additionalVulnerabilities.length > 0 && (
              <div className="glass-panel p-6 border-t-2 border-t-yellow-500/50">
                <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  Vulnerabilidades Latentes Inferidas
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  Riesgos que la IA considera altamente probables basándose en el patrón de vulnerabilidades detectadas, aunque no hayan sido confirmados directamente.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {result.analysis.additionalVulnerabilities.map((v, i) => (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.1 }}
                      key={i} 
                      className="bg-black/40 border border-gray-800/60 rounded-lg p-5 hover:border-yellow-500/30 transition-colors"
                    >
                      <div className="flex flex-wrap items-center gap-3 mb-3 border-b border-gray-800 pb-3">
                        <span className={cn("w-2.5 h-2.5 rounded-full animate-pulse", LIKELIHOOD_DOT[v.likelihood])} />
                        <p className="text-sm font-bold text-white">{v.name}</p>
                        <span className="text-xs font-mono text-gray-500 px-2 py-0.5 bg-gray-900 rounded">{v.type}</span>
                        <span className="text-xs text-gray-400 ml-auto font-mono">Probabilidad: <span className="text-gray-300">{v.likelihood}</span></span>
                      </div>
                      <p className="text-sm text-gray-300 mb-3 leading-relaxed">{v.description}</p>
                      <div className="space-y-2 text-xs">
                        <p className="bg-gray-900/50 p-2 rounded text-gray-400 border border-gray-800/50">
                          <strong className="text-gray-300 block mb-1">Razón de la Inferencia:</strong> {v.reason}
                        </p>
                        <p className="bg-neon-cyan/5 p-2 rounded text-gray-300 border border-neon-cyan/20">
                          <strong className="text-neon-cyan block mb-1">Recomendación Proactiva:</strong> {v.recommendation}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
