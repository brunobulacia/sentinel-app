'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { ShieldAlert, Download, Brain, ChevronRight, ChevronDown, AlertCircle, AlertTriangle, Info, CheckCircle, Terminal } from 'lucide-react';

interface Execution {
  id: string; status: string; totalVulnerabilities: number; createdAt: string;
  scanConfig: { name: string; targetUrl: string };
}
interface Vuln {
  id: string; name: string; type: string; criticality: 'HIGH' | 'MEDIUM' | 'LOW';
  cvssScore: number | null; affectedUrl: string; recommendation: string;
  description: string; remediated: boolean; scanExecutionId: string;
}
interface AiVuln { name: string; description: string; type: string; likelihood: string; reason: string; recommendation: string; }
interface AiRemediation { order: number; action: string; impact: string; effort: string; }
interface AiAnalysis {
  executionId: string; targetUrl: string; scannedAt: string;
  vulnCounts: { total: number; high: number; medium: number; low: number };
  analysis: { summary: string; riskLevel: string; stackAnalysis: string; additionalVulnerabilities: AiVuln[]; remediationPriority: AiRemediation[]; attackScenarios: string[]; };
}

const CRIT_COLORS: Record<string, { bg: string, border: string, text: string, icon: any }> = {
  HIGH: { bg: 'bg-red-500/10', border: 'border-red-500/50', text: 'text-red-400', icon: AlertCircle },
  MEDIUM: { bg: 'bg-orange-500/10', border: 'border-orange-500/50', text: 'text-orange-400', icon: AlertTriangle },
  LOW: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/50', text: 'text-cyan-400', icon: Info }
};

const RISK_STYLE: Record<string, string> = { 
  CRITICAL: 'bg-red-600/20 text-red-400 border-red-500', 
  HIGH: 'bg-orange-500/20 text-orange-400 border-orange-500', 
  MEDIUM: 'bg-yellow-500/20 text-yellow-400 border-yellow-500', 
  LOW: 'bg-cyan-500/20 text-cyan-400 border-cyan-500' 
};
const EFFORT_STYLE: Record<string, string> = { HIGH: 'text-red-400', MEDIUM: 'text-orange-400', LOW: 'text-cyan-400' };

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } }
};

export default function VulnerabilidadesPage() {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [vulns, setVulns] = useState<Vuln[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterCriticality, setFilterCriticality] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<AiAnalysis | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  useEffect(() => {
    api.get('/scan-executions').then((r) => {
      const completed = r.data.filter((e: Execution) => e.status === 'COMPLETED');
      setExecutions(completed);
      if (completed.length > 0) setSelectedId(completed[0].id);
    });
  }, []);

  const loadVulns = useCallback(async () => {
    if (!selectedId) return;
    setLoading(true);
    setAiResult(null);
    const params: Record<string, string> = { executionId: selectedId };
    if (filterCriticality) params.criticality = filterCriticality;
    try {
      const { data } = await api.get('/vulnerabilities', { params });
      setVulns(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [selectedId, filterCriticality]);

  useEffect(() => { loadVulns(); }, [loadVulns]);

  const reclassify = async (id: string, criticality: string) => {
    await api.put(`/vulnerabilities/${id}`, { criticality });
    setEditingId(null);
    loadVulns();
  };
  const toggleRemediated = async (v: Vuln) => {
    await api.put(`/vulnerabilities/${v.id}`, { remediated: !v.remediated });
    loadVulns();
  };
  const exportCsv = () => {
    const headers = ['Nombre', 'Tipo', 'Criticidad', 'CVSS', 'URL Afectada', 'Estado', 'Descripcion', 'Recomendacion'];
    const rows = vulns.map(v => [
      v.name, v.type, v.criticality, v.cvssScore ?? '', v.affectedUrl,
      v.remediated ? 'Remediado' : 'Pendiente', v.description, v.recommendation,
    ]);
    const csv = [headers, ...rows]
      .map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vulnerabilidades-${selectedId.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const runAiAnalysis = async () => {
    if (!selectedId) return;
    setAiLoading(true); setAiError(''); setAiResult(null);
    try {
      const { data } = await api.get(`/ai-analysis/${selectedId}`);
      setAiResult(data);
    } catch {
      setAiError('Error al conectar con la IA. Verifica que ANTHROPIC_API_KEY este configurada en el backend.');
    } finally { setAiLoading(false); }
  };

  const highCount = vulns.filter((v) => v.criticality === 'HIGH').length;
  const mediumCount = vulns.filter((v) => v.criticality === 'MEDIUM').length;
  const lowCount = vulns.filter((v) => v.criticality === 'LOW').length;
  const remediatedCount = vulns.filter((v) => v.remediated).length;

  return (
    <motion.div 
      initial="hidden" 
      animate="visible" 
      variants={containerVariants} 
      className="space-y-6 text-gray-200"
    >
      <div className="flex items-center gap-3 mb-6">
        <ShieldAlert className="w-8 h-8 text-cyan-400" />
        <h2 className="text-3xl font-bold tracking-tight text-white drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">
          CLASIFICACIÓN DE VULNERABILIDADES
        </h2>
      </div>

      {/* Selector and Filters */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-panel p-6 rounded-xl border border-cyan-500/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl" />
          <label className="block text-xs font-mono text-cyan-400 mb-2 uppercase tracking-wider">Escaneo Objetivo [OBJ-SCAN]</label>
          {executions.length === 0 ? (
            <p className="text-sm text-gray-500 font-mono">NO HAY REGISTROS DE ESCANEO COMPLETADOS.</p>
          ) : (
            <select 
              value={selectedId} 
              onChange={(e) => { setSelectedId(e.target.value); setFilterCriticality(''); }}
              className="w-full bg-slate-900/50 border border-slate-700 rounded-md px-4 py-3 text-sm text-gray-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors font-mono"
            >
              {executions.map((e) => (
                <option key={e.id} value={e.id} className="bg-slate-900">
                  {e.scanConfig.name} — {e.scanConfig.targetUrl} — {new Date(e.createdAt).toLocaleString()} — [{e.totalVulnerabilities} VULNS]
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="glass-panel p-6 rounded-xl border border-purple-500/20 relative overflow-hidden flex flex-col justify-end">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl" />
          <label className="block text-xs font-mono text-purple-400 mb-2 uppercase tracking-wider">Filtro Criticidad</label>
          <select 
            value={filterCriticality} 
            onChange={(e) => setFilterCriticality(e.target.value)}
            className="w-full bg-slate-900/50 border border-slate-700 rounded-md px-4 py-3 text-sm text-gray-200 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors font-mono"
          >
            <option value="" className="bg-slate-900">[*] TODAS</option>
            <option value="HIGH" className="bg-slate-900">[!] ALTA</option>
            <option value="MEDIUM" className="bg-slate-900">[-] MEDIA</option>
            <option value="LOW" className="bg-slate-900">[v] BAJA</option>
          </select>
        </div>
      </motion.div>

      {/* Stats HUD */}
      {selectedId && (
        <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'TOTAL VULNS', value: vulns.length, color: 'text-cyan-400', border: 'border-cyan-500/30' },
            { label: 'CRÍTICA/ALTA', value: highCount, color: 'text-red-400', border: 'border-red-500/30' },
            { label: 'MEDIA', value: mediumCount, color: 'text-orange-400', border: 'border-orange-500/30' },
            { label: 'BAJA', value: lowCount, color: 'text-green-400', border: 'border-green-500/30' },
            { label: 'REMEDIADAS', value: remediatedCount, color: 'text-purple-400', border: 'border-purple-500/30' },
          ].map((s) => (
            <div key={s.label} className={`glass-panel rounded-lg p-4 border-l-4 ${s.border} text-center relative overflow-hidden group`}>
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent z-0" />
              <div className="relative z-10">
                <p className={`text-3xl font-bold font-mono ${s.color} drop-shadow-[0_0_5px_currentColor]`}>{s.value}</p>
                <p className="text-xs text-gray-400 mt-1 font-mono">{s.label}</p>
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* Actions */}
      {selectedId && (
        <motion.div variants={itemVariants} className="flex flex-wrap gap-4 items-center justify-end">
          <button onClick={exportCsv} disabled={vulns.length === 0}
            className="flex items-center gap-2 bg-slate-800/80 hover:bg-slate-700/80 border border-cyan-500/50 text-cyan-400 px-5 py-2.5 rounded-md disabled:opacity-50 disabled:cursor-not-allowed text-sm font-mono transition-all hover:shadow-[0_0_10px_rgba(34,211,238,0.3)]">
            <Download className="w-4 h-4" /> EXPORTAR CSV
          </button>
          <button onClick={runAiAnalysis} disabled={aiLoading || vulns.length === 0}
            className="flex items-center gap-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/50 text-purple-300 px-5 py-2.5 rounded-md disabled:opacity-50 disabled:cursor-not-allowed text-sm font-mono transition-all hover:shadow-[0_0_15px_rgba(168,85,247,0.4)]">
            <Brain className="w-4 h-4" />
            {aiLoading ? 'ANALIZANDO RED NEURONAL...' : 'INICIAR ANÁLISIS AI'}
          </button>
        </motion.div>
      )}

      {/* Vulnerability Table */}
      <motion.div variants={itemVariants} className="glass-panel rounded-xl border border-slate-700/50 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-cyan-500 font-mono flex items-center justify-center gap-3">
            <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            DESCARGANDO DATOS DE TELEMETRÍA...
          </div>
        ) : vulns.length === 0 && selectedId ? (
          <div className="p-8 text-center text-gray-500 font-mono">
            [+] SISTEMA LIMPIO. NO SE ENCONTRARON VULNERABILIDADES{filterCriticality ? ` CON CRITICIDAD ${filterCriticality}` : ''}.
          </div>
        ) : vulns.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-900/80 border-b border-slate-700 font-mono text-xs text-gray-400">
                <tr>
                  <th className="w-10 px-4 py-4" />
                  <th className="px-4 py-4 uppercase tracking-wider">Vulnerabilidad</th>
                  <th className="px-4 py-4 uppercase tracking-wider">Tipo</th>
                  <th className="px-4 py-4 uppercase tracking-wider">Criticidad</th>
                  <th className="px-4 py-4 uppercase tracking-wider">CVSS</th>
                  <th className="px-4 py-4 uppercase tracking-wider">Estado</th>
                  <th className="px-4 py-4 uppercase tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {vulns.flatMap((v) => {
                  const style = CRIT_COLORS[v.criticality] || CRIT_COLORS.LOW;
                  const Icon = style.icon;
                  const rows = [(
                    <tr key={v.id} className={`hover:bg-slate-800/30 cursor-pointer transition-colors ${v.remediated ? 'opacity-40 grayscale' : ''}`}
                      onClick={() => setExpandedId(expandedId === v.id ? null : v.id)}>
                      <td className="px-4 py-4 text-cyan-500">
                        {expandedId === v.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <Icon className={`w-4 h-4 ${style.text}`} />
                          <p className="font-medium text-gray-200">{v.name}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-gray-400 text-xs font-mono whitespace-nowrap">{v.type.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-4">
                        {editingId === v.id ? (
                          <div className="flex gap-1 flex-wrap" onClick={(e) => e.stopPropagation()}>
                            {['HIGH', 'MEDIUM', 'LOW'].map((c) => (
                              <button key={c} onClick={() => reclassify(v.id, c)} className={`px-2 py-1 rounded text-xs font-mono font-medium ${CRIT_COLORS[c].bg} ${CRIT_COLORS[c].text} border ${CRIT_COLORS[c].border}`}>{c}</button>
                            ))}
                            <button onClick={() => setEditingId(null)} className="text-xs text-gray-400 px-2 hover:text-white">✕</button>
                          </div>
                        ) : (
                          <button onClick={(e) => { e.stopPropagation(); setEditingId(v.id); }} className={`px-2.5 py-1 rounded-sm text-xs font-mono font-bold ${style.bg} ${style.text} border ${style.border}`}>
                            [{v.criticality}]
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-4 text-cyan-400 font-mono text-xs">{v.cvssScore?.toFixed(1) ?? '-'}</td>
                      <td className="px-4 py-4">
                        <span className={`text-xs font-mono px-2 py-1 rounded-sm border ${v.remediated ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-orange-500/10 text-orange-400 border-orange-500/30'}`}>
                          {v.remediated ? 'SECURED' : 'EXPOSED'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => toggleRemediated(v)} className={`text-xs font-mono px-3 py-1.5 rounded-sm transition-all border ${v.remediated ? 'bg-slate-800 text-gray-400 border-slate-600 hover:bg-slate-700' : 'bg-green-600/20 text-green-400 border-green-500/50 hover:bg-green-600/30 hover:shadow-[0_0_10px_rgba(34,197,94,0.3)]'}`}>
                          {v.remediated ? 'REABRIR' : 'PARCHEAR'}
                        </button>
                      </td>
                    </tr>
                  )];
                  if (expandedId === v.id) {
                    rows.push(
                      <tr key={`${v.id}-detail`}>
                        <td colSpan={7} className="p-0 border-b border-slate-700/50">
                          <AnimatePresence>
                            <motion.div 
                              initial={{ height: 0, opacity: 0 }} 
                              animate={{ height: 'auto', opacity: 1 }} 
                              exit={{ height: 0, opacity: 0 }}
                              className="bg-slate-900/60 p-6 overflow-hidden"
                            >
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                  <p className="text-xs font-mono text-cyan-500 mb-2 flex items-center gap-2"><Terminal className="w-3 h-3"/> VECTOR DE ATAQUE</p>
                                  <p className="text-xs text-gray-300 font-mono bg-black/50 rounded-md px-3 py-2 border border-slate-700 break-all">{v.affectedUrl}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-mono text-cyan-500 mb-2 flex items-center gap-2"><Info className="w-3 h-3"/> ANÁLISIS TÉCNICO</p>
                                  <p className="text-xs text-gray-300 leading-relaxed font-sans">{v.description}</p>
                                </div>
                                <div className="md:col-span-2">
                                  <p className="text-xs font-mono text-green-400 mb-2 flex items-center gap-2"><CheckCircle className="w-3 h-3"/> PROTOCOLO DE MITIGACIÓN</p>
                                  <p className="text-xs text-green-100 leading-relaxed bg-green-500/10 rounded-md px-4 py-3 border border-green-500/30 font-sans">{v.recommendation}</p>
                                </div>
                              </div>
                            </motion.div>
                          </AnimatePresence>
                        </td>
                      </tr>
                    );
                  }
                  return rows;
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </motion.div>

      {/* AI Analysis Section */}
      {aiError && (
        <motion.div variants={itemVariants} className="bg-red-500/10 border border-red-500/50 text-red-400 rounded-lg p-4 text-sm font-mono flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          {aiError}
        </motion.div>
      )}

      {aiResult && (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6 mt-8">
          <div className="flex items-center gap-3 mb-4">
            <Brain className="w-6 h-6 text-purple-400" />
            <h3 className="text-2xl font-bold tracking-tight text-white drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]">
              REPORTE DE INTELIGENCIA AI
            </h3>
          </div>

          <motion.div variants={itemVariants} className="bg-gradient-to-r from-purple-900/40 to-slate-900/40 border border-purple-500/30 rounded-xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-mono text-purple-400 mb-1">OBJETIVO ANALIZADO</p>
                <p className="text-sm text-gray-200 font-mono">{aiResult.targetUrl}</p>
              </div>
              <div className={`px-4 py-2 rounded-md border font-mono text-sm font-bold flex items-center gap-2 ${RISK_STYLE[aiResult.analysis.riskLevel]}`}>
                NIVEL DE RIESGO: {aiResult.analysis.riskLevel}
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div variants={itemVariants} className="glass-panel rounded-xl p-6 border border-slate-700/50">
              <h4 className="text-xs font-mono text-cyan-400 mb-4 border-b border-slate-700 pb-2">1. RESUMEN EJECUTIVO</h4>
              <p className="text-sm text-gray-300 leading-relaxed font-sans whitespace-pre-wrap">{aiResult.analysis.summary}</p>
            </motion.div>

            <motion.div variants={itemVariants} className="glass-panel rounded-xl p-6 border border-slate-700/50">
              <h4 className="text-xs font-mono text-cyan-400 mb-4 border-b border-slate-700 pb-2">2. SUPERFICIE DE ATAQUE (STACK)</h4>
              <p className="text-sm text-gray-300 leading-relaxed font-sans">{aiResult.analysis.stackAnalysis}</p>
            </motion.div>
          </div>

          <motion.div variants={itemVariants} className="glass-panel rounded-xl p-6 border border-slate-700/50">
            <h4 className="text-xs font-mono text-cyan-400 mb-4 border-b border-slate-700 pb-2">3. VECTORES DE ATAQUE POTENCIALES</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {aiResult.analysis.additionalVulnerabilities.map((v, i) => (
                <div key={i} className="bg-slate-900/50 border border-slate-700 rounded-lg p-5 hover:border-orange-500/30 transition-colors">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <p className="text-sm font-bold text-gray-200 font-mono">{v.name}</p>
                    <span className={`text-[10px] px-2 py-1 rounded-sm font-mono font-bold border ${v.likelihood === 'HIGH' ? 'bg-red-500/10 text-red-400 border-red-500/30' : v.likelihood === 'MEDIUM' ? 'bg-orange-500/10 text-orange-400 border-orange-500/30' : 'bg-green-500/10 text-green-400 border-green-500/30'}`}>
                      PROB: {v.likelihood}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mb-2 font-sans">{v.description}</p>
                  <p className="text-xs text-slate-500 italic mb-3">Razón: {v.reason}</p>
                  <div className="bg-green-900/20 border border-green-500/20 rounded-md p-2 mt-auto">
                    <p className="text-xs text-green-400 font-mono"><span className="font-bold">Mitigación:</span> {v.recommendation}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div variants={itemVariants} className="glass-panel rounded-xl p-6 border border-slate-700/50">
              <h4 className="text-xs font-mono text-red-400 mb-4 border-b border-red-900/30 pb-2">4. ESCENARIOS DE EXPLOTACIÓN</h4>
              <div className="space-y-3">
                {aiResult.analysis.attackScenarios.map((scenario, i) => (
                  <div key={i} className="flex gap-3 items-start bg-red-500/5 border border-red-500/20 rounded-lg px-4 py-3">
                    <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-gray-300 font-sans">{scenario}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="glass-panel rounded-xl p-6 border border-slate-700/50">
              <h4 className="text-xs font-mono text-green-400 mb-4 border-b border-green-900/30 pb-2">5. PROTOCOLO DE REMEDIACIÓN PRIORIZADO</h4>
              <div className="space-y-3">
                {aiResult.analysis.remediationPriority.map((item) => (
                  <div key={item.order} className="flex gap-4 items-start bg-slate-900/50 border border-slate-700 rounded-lg p-4">
                    <span className="w-6 h-6 bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 rounded-sm flex items-center justify-center text-xs font-mono font-bold flex-shrink-0">
                      {item.order}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-200 font-mono mb-1">{item.action}</p>
                      <p className="text-xs text-gray-400 font-sans">{item.impact}</p>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] text-gray-500 font-mono uppercase mb-1">Esfuerzo</span>
                      <span className={`text-xs font-bold font-mono ${EFFORT_STYLE[item.effort]}`}>{item.effort}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

