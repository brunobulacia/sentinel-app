'use client';
import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';

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
  PENDING: 'bg-yellow-100 text-yellow-700',
  RUNNING: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
};

export default function EscaneoPage() {
  const [configs, setConfigs] = useState<ScanConfig[]>([]);
  const [selectedConfig, setSelectedConfig] = useState('');
  const [execution, setExecution] = useState<Execution | null>(null);
  const [recent, setRecent] = useState<Execution[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadRecent = async () => {
    const { data } = await api.get('/scan-executions');
    setRecent(data.slice(0, 5));
  };

  useEffect(() => {
    api.get('/scan-configs').then(r => setConfigs(r.data));
    loadRecent();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const startScan = async () => {
    if (!selectedConfig) return;
    const { data } = await api.post('/scan-executions', { scanConfigId: selectedConfig });
    setExecution(data);
    pollRef.current = setInterval(async () => {
      const { data: updated } = await api.get(`/scan-executions/${data.id}`);
      setExecution(updated);
      if (updated.status === 'COMPLETED' || updated.status === 'FAILED') {
        clearInterval(pollRef.current!);
        loadRecent();
      }
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Ejecutar Escaneo</h2>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Iniciar Nuevo Escaneo</h3>
        <div className="flex gap-4">
          <select
            value={selectedConfig}
            onChange={e => setSelectedConfig(e.target.value)}
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Seleccionar configuracion...</option>
            {configs.map(c => (
              <option key={c.id} value={c.id}>{c.name} — {c.targetUrl}</option>
            ))}
          </select>
          <button
            onClick={startScan}
            disabled={!selectedConfig || execution?.status === 'RUNNING' || execution?.status === 'PENDING'}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            Iniciar Escaneo
          </button>
        </div>

        {execution && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                {execution.scanConfig?.name ?? 'Escaneo en progreso'}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[execution.status]}`}>
                {execution.status}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${execution.progress}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>{execution.progress}%</span>
              {execution.status === 'COMPLETED' && (
                <span className="text-green-600 font-medium">
                  {execution.totalVulnerabilities} vulnerabilidades encontradas
                </span>
              )}
            </div>
            {execution.status === 'FAILED' && execution.errorMessage && (
              <p className="text-red-600 text-sm mt-2">{execution.errorMessage}</p>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Ejecuciones Recientes</h3>
        {recent.length === 0 ? (
          <p className="text-gray-500 text-sm">Sin ejecuciones previas.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {recent.map(e => (
              <div key={e.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">{e.scanConfig?.name}</p>
                  <p className="text-xs text-gray-400">{e.id.slice(0, 8)}...</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600">{e.totalVulnerabilities} vulns</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[e.status]}`}>
                    {e.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
