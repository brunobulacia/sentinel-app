'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';

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

const CRIT_STYLE: Record<string, string> = { HIGH: 'bg-red-100 text-red-700 border border-red-200', MEDIUM: 'bg-yellow-100 text-yellow-700 border border-yellow-200', LOW: 'bg-green-100 text-green-700 border border-green-200' };
const CRIT_DOT: Record<string, string> = { HIGH: 'bg-red-500', MEDIUM: 'bg-yellow-500', LOW: 'bg-green-500' };
const RISK_STYLE: Record<string, string> = { CRITICAL: 'bg-red-600 text-white', HIGH: 'bg-orange-500 text-white', MEDIUM: 'bg-yellow-500 text-white', LOW: 'bg-green-500 text-white' };
const EFFORT_STYLE: Record<string, string> = { HIGH: 'text-red-600', MEDIUM: 'text-yellow-600', LOW: 'text-green-600' };

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
    const { data } = await api.get('/vulnerabilities', { params });
    setVulns(data);
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
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Clasificacion de Vulnerabilidades</h2>

      {/* Execution Selector */}
      <div className="bg-white rounded-lg shadow p-5">
        <label className="block text-sm font-medium text-gray-700 mb-2">Escaneo a analizar</label>
        {executions.length === 0 ? (
          <p className="text-sm text-gray-400">No hay escaneos completados. Ejecuta un escaneo primero.</p>
        ) : (
          <select value={selectedId} onChange={(e) => { setSelectedId(e.target.value); setFilterCriticality(''); }}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {executions.map((e) => (
              <option key={e.id} value={e.id}>
                {e.scanConfig.name} — {e.scanConfig.targetUrl} — {new Date(e.createdAt).toLocaleString()} — {e.totalVulnerabilities} vulns
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Stats */}
      {selectedId && (
        <div className="grid grid-cols-5 gap-3">
          {[
            { label: 'Total', value: vulns.length, color: 'text-gray-700' },
            { label: 'Alta', value: highCount, color: 'text-red-600' },
            { label: 'Media', value: mediumCount, color: 'text-yellow-600' },
            { label: 'Baja', value: lowCount, color: 'text-green-600' },
            { label: 'Remediadas', value: remediatedCount, color: 'text-blue-600' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-lg shadow p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters + AI button */}
      {selectedId && (
        <div className="bg-white rounded-lg shadow p-4 flex flex-wrap gap-4 items-end justify-between">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Criticidad</label>
            <select value={filterCriticality} onChange={(e) => setFilterCriticality(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Todas</option>
              <option value="HIGH">Alta</option>
              <option value="MEDIUM">Media</option>
              <option value="LOW">Baja</option>
            </select>
          </div>
          <button onClick={runAiAnalysis} disabled={aiLoading || vulns.length === 0}
            className="flex items-center gap-2 bg-purple-600 text-white px-5 py-2 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors">
            {aiLoading ? 'Analizando con IA...' : 'Analizar con Claude AI'}
          </button>
        </div>
      )}

      {/* Vulnerability Table */}
      {loading ? (
        <p className="text-gray-500">Cargando vulnerabilidades...</p>
      ) : vulns.length === 0 && selectedId ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          No se encontraron vulnerabilidades{filterCriticality ? ` con criticidad ${filterCriticality}` : ''}.
        </div>
      ) : vulns.length > 0 ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="w-8 px-4 py-3" />
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Vulnerabilidad</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Criticidad</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">CVSS</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {vulns.flatMap((v) => {
                const rows = [(
                  <tr key={v.id} className={`hover:bg-gray-50 cursor-pointer transition-colors ${v.remediated ? 'opacity-60' : ''}`}
                    onClick={() => setExpandedId(expandedId === v.id ? null : v.id)}>
                    <td className="px-4 py-3 text-gray-400 text-xs">{expandedId === v.id ? 'v' : '>'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${CRIT_DOT[v.criticality]}`} />
                        <p className="font-medium text-gray-800">{v.name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{v.type.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3">
                      {editingId === v.id ? (
                        <div className="flex gap-1 flex-wrap" onClick={(e) => e.stopPropagation()}>
                          {['HIGH', 'MEDIUM', 'LOW'].map((c) => (
                            <button key={c} onClick={() => reclassify(v.id, c)} className={`px-2 py-0.5 rounded text-xs font-medium ${CRIT_STYLE[c]}`}>{c}</button>
                          ))}
                          <button onClick={() => setEditingId(null)} className="text-xs text-gray-400 px-1">x</button>
                        </div>
                      ) : (
                        <button onClick={(e) => { e.stopPropagation(); setEditingId(v.id); }} className={`px-2 py-0.5 rounded text-xs font-medium ${CRIT_STYLE[v.criticality]}`}>
                          {v.criticality}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">{v.cvssScore?.toFixed(1) ?? '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${v.remediated ? 'text-green-600' : 'text-orange-500'}`}>
                        {v.remediated ? 'Remediado' : 'Pendiente'}
                      </span>
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => toggleRemediated(v)} className={`text-xs px-3 py-1 rounded-md ${v.remediated ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}>
                        {v.remediated ? 'Desmarcar' : 'Marcar remediado'}
                      </button>
                    </td>
                  </tr>
                )];
                if (expandedId === v.id) {
                  rows.push(
                    <tr key={`${v.id}-detail`}>
                      <td colSpan={7} className="px-6 py-4 bg-blue-50 border-b border-blue-100">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">URL Afectada</p>
                            <p className="text-xs text-gray-700 font-mono bg-white rounded px-2 py-1 border border-gray-200 break-all">{v.affectedUrl}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Descripcion</p>
                            <p className="text-xs text-gray-700 leading-relaxed">{v.description}</p>
                          </div>
                          <div className="md:col-span-2">
                            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Recomendacion de Remediacion</p>
                            <p className="text-xs text-gray-700 leading-relaxed bg-white rounded px-3 py-2 border border-green-200">{v.recommendation}</p>
                          </div>
                        </div>
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

      {aiError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">{aiError}</div>
      )}

      {aiResult && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg shadow p-5 text-white">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold">Analisis por Claude AI (Haiku)</h3>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${RISK_STYLE[aiResult.analysis.riskLevel]}`}>
                Riesgo: {aiResult.analysis.riskLevel}
              </span>
            </div>
            <p className="text-xs text-purple-200">{aiResult.targetUrl}</p>
          </div>

          <div className="bg-white rounded-lg shadow p-5">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">1. Resumen Ejecutivo</h4>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{aiResult.analysis.summary}</p>
          </div>

          <div className="bg-white rounded-lg shadow p-5">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">2. Analisis del Stack Tecnologico</h4>
            <p className="text-sm text-gray-700 leading-relaxed">{aiResult.analysis.stackAnalysis}</p>
          </div>

          <div className="bg-white rounded-lg shadow p-5">
            <h4 className="text-sm font-semibold text-gray-700 mb-4">3. Vulnerabilidades Adicionales Probables</h4>
            <div className="space-y-3">
              {aiResult.analysis.additionalVulnerabilities.map((v, i) => (
                <div key={i} className="border border-orange-100 rounded-lg p-4 bg-orange-50">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <p className="text-sm font-semibold text-gray-800">{v.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${v.likelihood === 'HIGH' ? 'bg-red-100 text-red-700' : v.likelihood === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                      {v.likelihood} prob.
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mb-1.5">{v.description}</p>
                  <p className="text-xs text-gray-500 italic">Por que es probable: {v.reason}</p>
                  <p className="text-xs text-green-700 mt-1.5 bg-white rounded px-2 py-1 border border-green-200">{v.recommendation}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-5">
            <h4 className="text-sm font-semibold text-gray-700 mb-4">4. Escenarios de Ataque Reales</h4>
            <div className="space-y-2">
              {aiResult.analysis.attackScenarios.map((scenario, i) => (
                <div key={i} className="flex gap-3 items-start bg-red-50 border border-red-100 rounded-lg px-4 py-3">
                  <span className="text-red-400 text-sm flex-shrink-0">!</span>
                  <p className="text-sm text-gray-700">{scenario}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-5">
            <h4 className="text-sm font-semibold text-gray-700 mb-4">5. Plan de Remediacion Priorizado</h4>
            <div className="space-y-2">
              {aiResult.analysis.remediationPriority.map((item) => (
                <div key={item.order} className="flex gap-3 items-start border border-gray-100 rounded-lg px-4 py-3 hover:bg-gray-50">
                  <span className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">{item.order}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">{item.action}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.impact}</p>
                  </div>
                  <span className={`text-xs font-medium flex-shrink-0 ${EFFORT_STYLE[item.effort]}`}>Esfuerzo: {item.effort}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
