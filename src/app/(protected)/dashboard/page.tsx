'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';

interface Execution {
  id: string;
  status: string;
  totalVulnerabilities: number;
  createdAt: string;
  scanConfig: { name: string; targetUrl: string };
}

interface StatEntry {
  id: string;
  high: number;
  medium: number;
  low: number;
  targetUrl: string;
  date: string;
}

const STATUS_COLOR: Record<string, string> = {
  COMPLETED: 'bg-green-100 text-green-700',
  RUNNING: 'bg-blue-100 text-blue-700',
  PENDING: 'bg-yellow-100 text-yellow-700',
  FAILED: 'bg-red-100 text-red-700',
};

const PIE_COLORS = ['#dc2626', '#d97706', '#16a34a'];

export default function DashboardPage() {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [stats, setStats] = useState<StatEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/scan-executions'),
      api.get('/scan-history/stats'),
    ]).then(([exRes, stRes]) => {
      setExecutions(exRes.data);
      setStats(stRes.data);
    }).finally(() => setLoading(false));
  }, []);

  const completed = executions.filter(e => e.status === 'COMPLETED').length;
  const failed = executions.filter(e => e.status === 'FAILED').length;
  const running = executions.filter(e => e.status === 'RUNNING' || e.status === 'PENDING').length;
  const totalVulns = executions.reduce((s, e) => s + (e.totalVulnerabilities ?? 0), 0);

  const totalHigh = stats.reduce((s, e) => s + e.high, 0);
  const totalMedium = stats.reduce((s, e) => s + e.medium, 0);
  const totalLow = stats.reduce((s, e) => s + e.low, 0);

  const pieData = [
    { name: 'Alta', value: totalHigh },
    { name: 'Media', value: totalMedium },
    { name: 'Baja', value: totalLow },
  ].filter(d => d.value > 0);

  const barData = stats.slice(0, 8).map(s => ({
    name: s.targetUrl ? (() => { try { return new URL(s.targetUrl).hostname; } catch { return s.id.slice(0, 8); } })() : s.id.slice(0, 8),
    Alta: s.high,
    Media: s.medium,
    Baja: s.low,
  }));

  const recent = [...executions].slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Cargando dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-5">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Escaneos</p>
          <p className="text-4xl font-bold text-gray-800 mt-1">{executions.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-5">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Completados</p>
          <p className="text-4xl font-bold text-green-600 mt-1">{completed}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-5">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Fallidos</p>
          <p className="text-4xl font-bold text-red-500 mt-1">{failed}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-5">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Vulnerabilidades</p>
          <p className="text-4xl font-bold text-orange-500 mt-1">{totalVulns}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {pieData.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Distribucion por Severidad</h3>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="60%" height={200}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500">Alta</p>
                  <p className="text-2xl font-bold text-red-600">{totalHigh}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Media</p>
                  <p className="text-2xl font-bold text-yellow-600">{totalMedium}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Baja</p>
                  <p className="text-2xl font-bold text-green-600">{totalLow}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {running > 0 && (
          <div className="bg-white rounded-lg shadow p-6 flex flex-col justify-center items-center">
            <div className="text-5xl font-bold text-blue-500">{running}</div>
            <p className="text-gray-500 mt-2">Escaneo{running !== 1 ? 's' : ''} en progreso</p>
          </div>
        )}

        {barData.length > 0 && (
          <div className={`bg-white rounded-lg shadow p-6 ${pieData.length === 0 ? 'lg:col-span-2' : ''}`}>
            <h3 className="text-lg font-semibold mb-4">Ultimos Escaneos (por host)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
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
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Escaneos Recientes</h3>
        {recent.length === 0 ? (
          <p className="text-gray-500 text-sm">Sin escaneos aun.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {recent.map(e => (
              <div key={e.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-gray-800">{e.scanConfig?.name}</p>
                  <p className="text-xs text-gray-400">{e.scanConfig?.targetUrl}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600">{e.totalVulnerabilities ?? 0} vulns</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[e.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {e.status}
                  </span>
                  <span className="text-xs text-gray-400">{new Date(e.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
