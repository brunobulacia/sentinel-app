'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';

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
  CRITICAL: 'bg-red-100 text-red-800 border border-red-300',
  HIGH: 'bg-orange-100 text-orange-800 border border-orange-300',
  MEDIUM: 'bg-yellow-100 text-yellow-800 border border-yellow-300',
  LOW: 'bg-green-100 text-green-800 border border-green-300',
};

const LIKELIHOOD_DOT: Record<string, string> = {
  HIGH: 'bg-red-500',
  MEDIUM: 'bg-yellow-500',
  LOW: 'bg-green-500',
};

const EFFORT_BADGE: Record<string, string> = {
  LOW: 'bg-green-100 text-green-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  HIGH: 'bg-red-100 text-red-700',
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
      setError('Error al conectar con el servicio de IA. Verifica que ANTHROPIC_API_KEY este configurado en el servidor.');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Analisis con Inteligencia Artificial</h2>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-2">Seleccionar Escaneo</h3>
        <p className="text-sm text-gray-500 mb-4">
          Elige un escaneo completado para que la IA analice las vulnerabilidades, detecte riesgos adicionales y priorice la remediacion.
        </p>
        <div className="flex gap-4">
          <select
            value={selectedId}
            onChange={e => { setSelectedId(e.target.value); setResult(null); setError(''); }}
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Seleccionar ejecucion completada...</option>
            {executions.map(e => (
              <option key={e.id} value={e.id}>
                {e.scanConfig?.name} — {e.scanConfig?.targetUrl} — {e.totalVulnerabilities} vulns
              </option>
            ))}
          </select>
          <button
            onClick={analyze}
            disabled={!selectedId || analyzing}
            className="bg-purple-600 text-white px-6 py-2 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium whitespace-nowrap"
          >
            {analyzing ? 'Analizando...' : 'Analizar con IA'}
          </button>
        </div>
        {executions.length === 0 && (
          <p className="text-sm text-gray-400 mt-3">No hay ejecuciones completadas disponibles.</p>
        )}
      </div>

      {analyzing && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="inline-block w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-600 font-medium">La IA esta analizando las vulnerabilidades...</p>
          <p className="text-sm text-gray-400 mt-1">Esto puede tomar unos segundos.</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Resultado del Analisis</h3>
                <p className="text-sm text-gray-500">{result.targetUrl} · {new Date(result.scannedAt).toLocaleString()}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-bold ${RISK_STYLE[result.analysis.riskLevel]}`}>
                Riesgo: {result.analysis.riskLevel}
              </span>
            </div>
            <div className="flex gap-6 text-sm mb-4 bg-gray-50 rounded-lg p-3">
              <span className="text-gray-600">Total: <strong>{result.vulnCounts.total}</strong></span>
              <span className="text-red-600">Alta: <strong>{result.vulnCounts.high}</strong></span>
              <span className="text-yellow-600">Media: <strong>{result.vulnCounts.medium}</strong></span>
              <span className="text-green-600">Baja: <strong>{result.vulnCounts.low}</strong></span>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Resumen Ejecutivo</p>
                <p className="text-sm text-gray-700">{result.analysis.summary}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Stack Detectado</p>
                <p className="text-sm text-gray-700">{result.analysis.stackAnalysis}</p>
              </div>
            </div>
          </div>

          {result.analysis.attackScenarios.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-3">Escenarios de Ataque</h3>
              <ul className="space-y-2">
                {result.analysis.attackScenarios.map((s, i) => (
                  <li key={i} className="flex gap-3 text-sm text-gray-700">
                    <span className="text-red-500 font-bold mt-0.5">⚠</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.analysis.remediationPriority.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-3">Plan de Remediacion Priorizado</h3>
              <div className="space-y-3">
                {result.analysis.remediationPriority.map((r, i) => (
                  <div key={i} className="flex gap-4 items-start">
                    <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 text-sm font-bold flex items-center justify-center shrink-0">
                      {r.order}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-medium text-gray-800">{r.action}</p>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${EFFORT_BADGE[r.effort]}`}>
                          Esfuerzo: {r.effort}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">{r.impact}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.analysis.additionalVulnerabilities.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-3">Vulnerabilidades Adicionales Probables</h3>
              <p className="text-xs text-gray-400 mb-4">Riesgos que la IA detecta como probables aunque no fueron encontrados directamente en el escaneo.</p>
              <div className="space-y-4">
                {result.analysis.additionalVulnerabilities.map((v, i) => (
                  <div key={i} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`w-2 h-2 rounded-full ${LIKELIHOOD_DOT[v.likelihood]}`} />
                      <p className="text-sm font-semibold text-gray-800">{v.name}</p>
                      <span className="text-xs text-gray-400">({v.type})</span>
                      <span className="text-xs text-gray-400 ml-auto">Probabilidad: {v.likelihood}</span>
                    </div>
                    <p className="text-xs text-gray-600 mb-1">{v.description}</p>
                    <p className="text-xs text-gray-500 mb-1"><strong>Por que:</strong> {v.reason}</p>
                    <p className="text-xs text-blue-700 bg-blue-50 rounded px-2 py-1"><strong>Recomendacion:</strong> {v.recommendation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
