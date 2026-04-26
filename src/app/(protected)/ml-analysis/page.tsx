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

interface MlPrediction {
  vuln_id: string | null;
  criticality: 'HIGH' | 'MEDIUM' | 'LOW';
  confidence: number;
  probabilities: Record<string, number>;
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
  HIGH:   'bg-red-100 text-red-700 border border-red-200',
  MEDIUM: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
  LOW:    'bg-green-100 text-green-700 border border-green-200',
};

const CRIT_BAR: Record<string, string> = {
  HIGH: 'bg-red-500', MEDIUM: 'bg-yellow-400', LOW: 'bg-green-500',
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
      setError('Error al conectar con el servicio ML. Verifica que ML_SERVICE_URL este configurado en el backend.');
    } finally {
      setAnalyzing(false);
    }
  };

  const maxImportance = modelInfo
    ? Math.max(...Object.values(modelInfo.feature_importances))
    : 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Analisis ML — Random Forest</h2>
        {modelInfo && (
          <span className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full font-medium">
            Accuracy: {(modelInfo.accuracy * 100).toFixed(1)}% · {modelInfo.training_samples.toLocaleString()} muestras
          </span>
        )}
      </div>

      {modelInfo && (
        <div className="bg-white rounded-lg shadow p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Importancia de Features</h3>
          <div className="space-y-2">
            {Object.entries(modelInfo.feature_importances)
              .sort(([, a], [, b]) => b - a)
              .map(([feat, imp]) => (
                <div key={feat} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-36 shrink-0">{feat.replace(/_/g, ' ')}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-indigo-500 h-2 rounded-full transition-all"
                      style={{ width: `${(imp / maxImportance) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 w-10 text-right">{(imp * 100).toFixed(1)}%</span>
                </div>
              ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-2">Predecir Severidad por Escaneo</h3>
        <p className="text-sm text-gray-500 mb-4">
          El modelo predice la criticidad de cada vulnerabilidad usando Random Forest entrenado con {modelInfo?.training_samples?.toLocaleString() ?? '2000'} muestras.
        </p>
        <div className="flex gap-4">
          <select
            value={selectedId}
            onChange={e => { setSelectedId(e.target.value); setResult(null); setError(''); }}
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Seleccionar escaneo completado...</option>
            {executions.map(e => (
              <option key={e.id} value={e.id}>
                {e.scanConfig?.name} — {e.totalVulnerabilities} vulns — {new Date(e.createdAt).toLocaleDateString()}
              </option>
            ))}
          </select>
          <button
            onClick={analyze}
            disabled={!selectedId || analyzing}
            className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium whitespace-nowrap"
          >
            {analyzing ? 'Prediciendo...' : 'Predecir con ML'}
          </button>
        </div>
        {executions.length === 0 && (
          <p className="text-sm text-gray-400 mt-3">No hay escaneos completados.</p>
        )}
      </div>

      {analyzing && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-600 font-medium">Ejecutando Random Forest...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{error}</div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Total', value: result.predictions.length, color: 'text-gray-700' },
              { label: 'Alta', value: result.summary.HIGH, color: 'text-red-600' },
              { label: 'Media', value: result.summary.MEDIUM, color: 'text-yellow-600' },
              { label: 'Baja', value: result.summary.LOW, color: 'text-green-600' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-lg shadow p-4 text-center">
                <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-lg shadow p-4 flex items-center gap-2 text-sm text-gray-600">
            Confianza promedio del modelo:
            <strong className="text-indigo-600 text-base">
              {(result.summary.avgConfidence * 100).toFixed(0)}%
            </strong>
          </div>

          {result.predictions.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500 text-sm">
              No hay vulnerabilidades en este escaneo.
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">ID Vuln</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Criticidad ML</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Confianza</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Probabilidades</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {result.predictions.map((p, i) => (
                    <tr key={p.vuln_id ?? i} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-xs font-mono text-gray-400">
                        {p.vuln_id ? `${p.vuln_id.slice(0, 8)}...` : `#${i + 1}`}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${CRIT_STYLE[p.criticality]}`}>
                          {p.criticality}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-100 rounded-full h-1.5">
                            <div
                              className={`${CRIT_BAR[p.criticality]} h-1.5 rounded-full`}
                              style={{ width: `${p.confidence * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-600">{(p.confidence * 100).toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-3 text-xs">
                          {Object.entries(p.probabilities).map(([cls, prob]) => (
                            <span key={cls} className="text-gray-500">
                              {cls}: <strong>{(prob * 100).toFixed(0)}%</strong>
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
