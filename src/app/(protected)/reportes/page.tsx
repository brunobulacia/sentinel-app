'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';

interface Execution {
  id: string;
  status: string;
  totalVulnerabilities: number;
  createdAt: string;
  scanConfig: { name: string };
}

interface Report {
  id: string;
  title: string;
  generatedAt: string;
  totalVulnerabilities: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
}

export default function ReportesPage() {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedExecution, setSelectedExecution] = useState('');
  const [generating, setGenerating] = useState(false);

  const load = async () => {
    const [execRes, repRes] = await Promise.all([
      api.get('/scan-executions'),
      api.get('/reports'),
    ]);
    setExecutions(execRes.data.filter((e: Execution) => e.status === 'COMPLETED'));
    setReports(repRes.data);
  };

  useEffect(() => { load(); }, []);

  const generate = async () => {
    if (!selectedExecution) return;
    setGenerating(true);
    try {
      await api.post('/reports', { scanExecutionId: selectedExecution, format: 'HTML' });
      setSelectedExecution('');
      load();
    } finally {
      setGenerating(false);
    }
  };

  const download = async (reportId: string, title: string) => {
    const res = await api.get(`/reports/${reportId}/download`, { responseType: 'blob' });
    const blob = new Blob([res.data], { type: 'text/html; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const deleteReport = async (id: string) => {
    await api.delete(`/reports/${id}`);
    load();
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Generacion de Reportes</h2>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Generar Nuevo Reporte</h3>
        <div className="flex gap-4">
          <select
            value={selectedExecution}
            onChange={e => setSelectedExecution(e.target.value)}
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Seleccionar ejecucion completada...</option>
            {executions.map(e => (
              <option key={e.id} value={e.id}>
                {e.scanConfig?.name} — {e.totalVulnerabilities} vulns — {new Date(e.createdAt).toLocaleDateString()}
              </option>
            ))}
          </select>
          <button
            onClick={generate}
            disabled={!selectedExecution || generating}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            {generating ? 'Generando...' : 'Generar Reporte HTML'}
          </button>
        </div>
        {executions.length === 0 && (
          <p className="text-sm text-gray-400 mt-3">No hay ejecuciones completadas disponibles.</p>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Reportes Generados</h3>
        {reports.length === 0 ? (
          <p className="text-gray-500 text-sm">No hay reportes generados aun.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {reports.map(r => (
              <div key={r.id} className="flex items-center justify-between py-4">
                <div>
                  <p className="text-sm font-medium text-gray-700">{r.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{new Date(r.generatedAt).toLocaleString()}</p>
                  <div className="flex gap-3 mt-1 text-xs">
                    <span className="text-gray-500">Total: <strong>{r.totalVulnerabilities}</strong></span>
                    <span className="text-red-600">Alta: <strong>{r.highCount}</strong></span>
                    <span className="text-yellow-600">Media: <strong>{r.mediumCount}</strong></span>
                    <span className="text-green-600">Baja: <strong>{r.lowCount}</strong></span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => download(r.id, r.title)}
                    className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-md text-xs hover:bg-blue-100 font-medium"
                  >
                    Descargar HTML
                  </button>
                  <button
                    onClick={() => deleteReport(r.id)}
                    className="bg-red-50 text-red-600 px-3 py-1.5 rounded-md text-xs hover:bg-red-100"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
