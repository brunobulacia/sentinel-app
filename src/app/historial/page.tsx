'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

interface Execution {
  id: string;
  status: string;
  totalVulnerabilities: number;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  scanConfig: { name: string; targetUrl: string };
}

interface StatEntry {
  id: string;
  date: string;
  status: string;
  targetUrl: string;
  total: number;
  high: number;
  medium: number;
  low: number;
}

interface CompareResult {
  scan1: { id: string; total: number };
  scan2: { id: string; total: number };
  newInScan2: string[];
  resolvedInScan2: string[];
  persistent: string[];
}

const STATUS_COLOR: Record<string, string> = {
  COMPLETED: 'bg-green-100 text-green-700',
  RUNNING: 'bg-blue-100 text-blue-700',
  PENDING: 'bg-yellow-100 text-yellow-700',
  FAILED: 'bg-red-100 text-red-700',
};

export default function HistorialPage() {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [stats, setStats] = useState<StatEntry[]>([]);
  const [compareA, setCompareA] = useState('');
  const [compareB, setCompareB] = useState('');
  const [comparison, setComparison] = useState<CompareResult | null>(null);
  const [comparing, setComparing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (filterStatus) params.status = filterStatus;
    if (fromDate) params.from = fromDate;
    if (toDate) params.to = toDate;
    const { data } = await api.get('/scan-history', { params });
    setExecutions(data);
    setLoading(false);
  }, [filterStatus, fromDate, toDate]);

  const loadStats = async () => {
    const { data } = await api.get('/scan-history/stats');
    setStats(data);
  };

  useEffect(() => { load(); loadStats(); }, [load]);

  const compare = async () => {
    if (!compareA || !compareB) return;
    setComparing(true);
    try {
      const { data } = await api.get(`/scan-history/compare/${compareA}/${compareB}`);
      setComparison(data);
    } finally {
      setComparing(false);
    }
  };

  const chartData = stats.map(s => ({
    name: s.targetUrl ? new URL(s.targetUrl).hostname : s.id.slice(0, 8),
    Alta: s.high,
    Media: s.medium,
    Baja: s.low,
  }));

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Historial de Escaneos</h2>

      {chartData.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Tendencia de Vulnerabilidades (ultimos 10)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Alta" fill="#dc2626" />
              <Bar dataKey="Media" fill="#d97706" />
              <Bar dataKey="Baja" fill="#16a34a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Estado</label>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos</option>
            <option value="COMPLETED">Completado</option>
            <option value="FAILED">Fallido</option>
            <option value="RUNNING">En proceso</option>
            <option value="PENDING">Pendiente</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Desde</label>
          <input
            type="date"
            value={fromDate}
            onChange={e => setFromDate(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Hasta</label>
          <input
            type="date"
            value={toDate}
            onChange={e => setToDate(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={load}
          className="bg-blue-600 text-white px-4 py-1.5 rounded-md text-sm hover:bg-blue-700"
        >
          Filtrar
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500">Cargando...</p>
      ) : executions.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          No hay ejecuciones con los filtros aplicados.
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Configuracion</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Vulns</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Inicio</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Fin</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {executions.map(e => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{e.scanConfig?.name}</p>
                    <p className="text-xs text-gray-400">{e.scanConfig?.targetUrl}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[e.status]}`}>
                      {e.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{e.totalVulnerabilities}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {e.startedAt ? new Date(e.startedAt).toLocaleString() : '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {e.finishedAt ? new Date(e.finishedAt).toLocaleString() : '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs font-mono">{e.id.slice(0, 8)}...</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Comparar Dos Ejecuciones</h3>
        <div className="flex gap-4 mb-4 flex-wrap">
          <select
            value={compareA}
            onChange={e => setCompareA(e.target.value)}
            className="flex-1 min-w-48 border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="">Ejecucion A...</option>
            {executions.map(e => (
              <option key={e.id} value={e.id}>
                {e.scanConfig?.name} — {e.id.slice(0, 8)}
              </option>
            ))}
          </select>
          <select
            value={compareB}
            onChange={e => setCompareB(e.target.value)}
            className="flex-1 min-w-48 border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="">Ejecucion B...</option>
            {executions.map(e => (
              <option key={e.id} value={e.id}>
                {e.scanConfig?.name} — {e.id.slice(0, 8)}
              </option>
            ))}
          </select>
          <button
            onClick={compare}
            disabled={!compareA || !compareB || comparing}
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {comparing ? 'Comparando...' : 'Comparar'}
          </button>
        </div>
        {comparison && (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-red-50 rounded-lg p-4">
              <p className="text-sm font-semibold text-red-700 mb-1">Nuevas en B</p>
              <p className="text-3xl font-bold text-red-600">{comparison.newInScan2.length}</p>
              {comparison.newInScan2.length > 0 && (
                <ul className="mt-2 text-xs text-red-500 space-y-0.5">
                  {comparison.newInScan2.slice(0, 3).map(n => <li key={n}>{n}</li>)}
                  {comparison.newInScan2.length > 3 && <li>+{comparison.newInScan2.length - 3} mas</li>}
                </ul>
              )}
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm font-semibold text-green-700 mb-1">Resueltas en B</p>
              <p className="text-3xl font-bold text-green-600">{comparison.resolvedInScan2.length}</p>
              {comparison.resolvedInScan2.length > 0 && (
                <ul className="mt-2 text-xs text-green-500 space-y-0.5">
                  {comparison.resolvedInScan2.slice(0, 3).map(n => <li key={n}>{n}</li>)}
                  {comparison.resolvedInScan2.length > 3 && <li>+{comparison.resolvedInScan2.length - 3} mas</li>}
                </ul>
              )}
            </div>
            <div className="bg-yellow-50 rounded-lg p-4">
              <p className="text-sm font-semibold text-yellow-700 mb-1">Persistentes</p>
              <p className="text-3xl font-bold text-yellow-600">{comparison.persistent.length}</p>
              {comparison.persistent.length > 0 && (
                <ul className="mt-2 text-xs text-yellow-500 space-y-0.5">
                  {comparison.persistent.slice(0, 3).map(n => <li key={n}>{n}</li>)}
                  {comparison.persistent.length > 3 && <li>+{comparison.persistent.length - 3} mas</li>}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
