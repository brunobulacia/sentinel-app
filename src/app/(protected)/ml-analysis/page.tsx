'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { BrainCircuit, Cpu, Zap, Activity, AlertTriangle, CheckCircle2, XCircle, Search, Target, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Execution {
  id: string;
  status: string;
  totalVulnerabilities: number;
  createdAt: string;
  scanConfig: { name: string; targetUrl: string };
}

interface MlPrediction {
  vuln_id: string | null;
  name: string;
  type: string;
  cvssScore: number | null;
  affectedUrl: string;
  currentCriticality: string | null;
  mlCriticality: 'HIGH' | 'MEDIUM' | 'LOW';
  confidence: number;
  probabilities: Record<string, number>;
  agreement: boolean;
}

interface MlResult {
  executionId: string;
  targetUrl: string;
  predictions: MlPrediction[];
  summary: { HIGH: number; MEDIUM: number; LOW: number; avgConfidence: number };
}

interface ModelInfo {
  model: string;
  n_estimators: number;
  training_samples: number;
  accuracy: number;
  feature_importances: Record<string, number>;
  classes: string[];
}

const CRIT_STYLE: Record<string, string> = {
  HIGH:   'bg-red-500/20 text-red-400 border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.2)]',
  MEDIUM: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50 shadow-[0_0_10px_rgba(234,179,8,0.2)]',
  LOW:    'bg-green-500/20 text-green-400 border-green-500/50 shadow-[0_0_10px_rgba(34,197,94,0.2)]',
};

const CRIT_BAR: Record<string, string> = {
  HIGH: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]', 
  MEDIUM: 'bg-yellow-400 shadow-[0_0_8px_rgba(234,179,8,0.8)]', 
  LOW: 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]',
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 }
};

export default function MlAnalysisPage() {
  const [executions, setExecutions]   = useState<Execution[]>([]);
  const [selectedId, setSelectedId]   = useState('');
  const [analyzing, setAnalyzing]     = useState(false);
  const [result, setResult]           = useState<MlResult | null>(null);
  const [modelInfo, setModelInfo]     = useState<ModelInfo | null>(null);
  const [error, setError]             = useState('');

  useEffect(() => {
    api.get('/scan-executions').then(r => {
      const completed = r.data.filter((e: Execution) => e.status === 'COMPLETED');
      setExecutions(completed);
    });
    api.get('/ml-analysis/model/info')
      .then(r => setModelInfo(r.data))
      .catch(() => null);
  }, []);

  const analyze = async () => {
    if (!selectedId) return;
    setAnalyzing(true);
    setResult(null);
    setError('');
    try {
      const { data } = await api.get(`/ml-analysis/${selectedId}`);
      setResult(data);
    } catch {
      setError('Error al conectar con el servicio ML. Verifica que ML_SERVICE_URL esté configurado en el backend.');
    } finally {
      setAnalyzing(false);
    }
  };

  const maxImportance = modelInfo
    ? Math.max(...Object.values(modelInfo.feature_importances))
    : 1;

  return (
    <div className="space-y-6">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-4 mb-6"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-neon-magenta/20 rounded-lg border border-neon-magenta/50">
            <BrainCircuit className="w-6 h-6 text-neon-magenta" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-wider drop-shadow-[0_0_8px_rgba(255,0,255,0.5)]">
            Análisis ML <span className="text-gray-500 font-light text-xl">| Random Forest</span>
          </h2>
        </div>
        {modelInfo && (
          <div className="flex items-center gap-4 bg-black/40 border border-gray-800/60 rounded-full px-4 py-2">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-neon-cyan" />
              <span className="text-xs font-mono text-gray-300">
                Accuracy: <strong className="text-neon-cyan">{(modelInfo.accuracy * 100).toFixed(1)}%</strong>
              </span>
            </div>
            <div className="w-px h-4 bg-gray-700" />
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-neon-purple" />
              <span className="text-xs font-mono text-gray-300">
                Muestras: <strong className="text-neon-purple">{modelInfo.training_samples.toLocaleString()}</strong>
              </span>
            </div>
          </div>
        )}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-2 glass-panel p-6 border-l-4 border-l-neon-magenta relative overflow-hidden"
        >
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-neon-magenta/10 rounded-full blur-3xl pointer-events-none" />
          
          <h3 className="text-lg font-semibold mb-2 text-gray-200 flex items-center gap-2">
            <Zap className="w-5 h-5 text-neon-magenta" />
            Predecir Severidad por Escaneo
          </h3>
          <p className="text-sm text-gray-400 mb-6">
            El modelo predice la criticidad de cada vulnerabilidad usando Random Forest entrenado con {modelInfo?.training_samples?.toLocaleString() ?? '2000'} muestras.
          </p>
          <div className="flex flex-col md:flex-row gap-4">
            <select
              value={selectedId}
              onChange={e => { setSelectedId(e.target.value); setResult(null); setError(''); }}
              className="flex-1 bg-black/50 border border-gray-700/50 rounded-md px-4 py-3 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-neon-magenta/50 focus:border-neon-magenta transition-all"
            >
              <option value="" className="bg-gray-900 text-gray-400">Seleccionar escaneo completado...</option>
              {executions.map(e => (
                <option key={e.id} value={e.id} className="bg-gray-900 text-gray-200">
                  {e.scanConfig?.name} — {e.totalVulnerabilities} vulns — {new Date(e.createdAt).toLocaleDateString()}
                </option>
              ))}
            </select>
            <button
              onClick={analyze}
              disabled={!selectedId || analyzing}
              className={cn(
                "flex items-center justify-center gap-2 px-6 py-3 rounded-md text-sm font-medium transition-all min-w-[180px]",
                !selectedId || analyzing
                  ? "bg-gray-800/50 text-gray-500 cursor-not-allowed border border-gray-700/50"
                  : "bg-neon-magenta/20 text-neon-magenta border border-neon-magenta/50 hover:bg-neon-magenta hover:text-white hover:shadow-[0_0_15px_rgba(255,0,255,0.5)]"
              )}
            >
              {analyzing ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>Prediciendo...</span>
                </>
              ) : (
                <>
                  <BrainCircuit className="w-4 h-4" />
                  <span>Predecir con ML</span>
                </>
              )}
            </button>
          </div>
          {executions.length === 0 && (
            <p className="text-sm text-gray-400/70 mt-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> No hay escaneos completados disponibles.
            </p>
          )}
        </motion.div>

        {modelInfo && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-panel p-6"
          >
            <h3 className="text-sm font-semibold text-neon-cyan mb-4 flex items-center gap-2 uppercase tracking-widest">
              <Cpu className="w-4 h-4" />
              Importancia de Features
            </h3>
            <div className="space-y-3">
              {Object.entries(modelInfo.feature_importances)
                .sort(([, a], [, b]) => b - a)
                .map(([feat, imp]) => (
                  <div key={feat} className="group">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-400 group-hover:text-gray-200 transition-colors uppercase tracking-wider font-mono">
                        {feat.replace(/_/g, ' ')}
                      </span>
                      <span className="text-neon-cyan font-mono">{(imp * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-800/50 rounded-full h-1.5 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(imp / maxImportance) * 100}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="bg-neon-cyan h-1.5 rounded-full shadow-[0_0_8px_rgba(0,255,255,0.8)]"
                      />
                    </div>
                  </div>
                ))}
            </div>
          </motion.div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {analyzing && (
          <motion.div 
            key="analyzing"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass-panel p-12 text-center border border-neon-magenta/30"
          >
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div className="absolute inset-0 border-4 border-neon-magenta/20 rounded-full" />
              <div className="absolute inset-0 border-4 border-neon-magenta border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(255,0,255,0.5)]" />
              <BrainCircuit className="absolute inset-0 m-auto w-8 h-8 text-neon-magenta animate-pulse" />
            </div>
            <h3 className="text-xl font-bold text-white tracking-wide mb-2">Ejecutando Random Forest</h3>
            <p className="text-gray-400 font-mono text-sm">Procesando {modelInfo?.n_estimators ?? 'árboles de decisión'}... calculando probabilidades de clase.</p>
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
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                { label: 'Total Analizado', value: result.predictions.length, color: 'text-white', glow: '' },
                { label: 'Alta (ML)', value: result.summary.HIGH, color: 'text-red-400', glow: 'shadow-[0_0_15px_rgba(239,68,68,0.1)]' },
                { label: 'Media (ML)', value: result.summary.MEDIUM, color: 'text-yellow-400', glow: 'shadow-[0_0_15px_rgba(234,179,8,0.1)]' },
                { label: 'Baja (ML)', value: result.summary.LOW, color: 'text-green-400', glow: 'shadow-[0_0_15px_rgba(34,197,94,0.1)]' },
                { label: 'Discrepancias', value: result.predictions.filter(p => p.currentCriticality && !p.agreement).length, color: 'text-neon-magenta', glow: 'shadow-[0_0_15px_rgba(255,0,255,0.1)]' },
              ].map((s, i) => (
                <motion.div 
                  key={s.label} 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={cn("glass-panel p-4 text-center border-gray-800/50", s.glow)}
                >
                  <p className={cn("text-3xl font-bold font-mono", s.color)}>{s.value}</p>
                  <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider">{s.label}</p>
                </motion.div>
              ))}
            </div>

            <div className="glass-panel p-4 border border-neon-cyan/30 flex items-center gap-3">
              <div className="p-2 bg-neon-cyan/10 rounded-full">
                <Target className="w-5 h-5 text-neon-cyan" />
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">Confianza Promedio Global</p>
                <p className="text-xl font-bold text-neon-cyan font-mono">
                  {(result.summary.avgConfidence * 100).toFixed(1)}%
                </p>
              </div>
            </div>

            {result.predictions.length === 0 ? (
              <div className="glass-panel p-12 text-center text-gray-500 border-dashed">
                <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No hay vulnerabilidades detectadas en este escaneo para analizar.</p>
              </div>
            ) : (
              <div className="glass-panel overflow-hidden border-gray-800/60">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-black/60 border-b border-gray-800">
                      <tr>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-widest">Vulnerabilidad</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-widest">Tipo</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-widest">CVSS</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-widest">Actual</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-widest">Predicción ML</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-widest text-center">Confianza</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-widest text-center">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/50">
                      {result.predictions.map((p, i) => (
                        <motion.tr 
                          key={p.vuln_id ?? i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="hover:bg-white/[0.02] transition-colors"
                        >
                          <td className="px-6 py-4">
                            <p className="font-medium text-gray-200">{p.name}</p>
                            <p className="text-xs text-gray-500 font-mono truncate max-w-[200px]" title={p.affectedUrl}>
                              {p.affectedUrl}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs text-gray-400 bg-gray-900 border border-gray-800 px-2.5 py-1 rounded-md font-mono">
                              {p.type.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-mono text-gray-300">
                              {p.cvssScore != null ? p.cvssScore.toFixed(1) : '—'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {p.currentCriticality ? (
                              <span className={cn('text-xs font-bold px-2.5 py-1 rounded border', CRIT_STYLE[p.currentCriticality])}>
                                {p.currentCriticality}
                              </span>
                            ) : <span className="text-gray-600">—</span>}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {p.currentCriticality && !p.agreement && (
                                <ChevronRight className="w-4 h-4 text-neon-magenta" />
                              )}
                              <span className={cn(
                                'text-xs font-bold px-2.5 py-1 rounded border', 
                                CRIT_STYLE[p.mlCriticality],
                                p.currentCriticality && !p.agreement ? 'animate-pulse' : ''
                              )}>
                                {p.mlCriticality}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col items-center gap-1.5">
                              <span className="text-xs font-mono text-gray-300">{(p.confidence * 100).toFixed(1)}%</span>
                              <div className="w-16 bg-gray-800 rounded-full h-1">
                                <div
                                  className={cn("h-1 rounded-full", CRIT_BAR[p.mlCriticality])}
                                  style={{ width: `${p.confidence * 100}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            {p.currentCriticality ? (
                              p.agreement ? (
                              <span title="Coincide">
                                <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto" />
                              </span>
                            ) : (
                              <span title="Discrepancia detectada">
                                <AlertTriangle className="w-5 h-5 text-neon-magenta mx-auto drop-shadow-[0_0_8px_rgba(255,0,255,0.6)]" />
                              </span>
                            )
                            ) : (
                              <span className="text-gray-600">—</span>
                            )}
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
