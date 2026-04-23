'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';

interface Vuln {
  id: string;
  name: string;
  type: string;
  criticality: string;
  cvssScore: number;
  affectedUrl: string;
  recommendation: string;
  remediated: boolean;
  scanExecutionId: string;
}

const CRITICALITY_STYLE: Record<string, string> = {
  HIGH: 'bg-red-100 text-red-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  LOW: 'bg-green-100 text-green-700',
};

export default function VulnerabilidadesPage() {
  const [vulns, setVulns] = useState<Vuln[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCriticality, setFilterCriticality] = useState('');
  const [executionId, setExecutionId] = useState('');
  const [executionInput, setExecutionInput] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (filterCriticality) params.criticality = filterCriticality;
    if (executionId) params.executionId = executionId;
    const { data } = await api.get('/vulnerabilities', { params });
    setVulns(data);
    setLoading(false);
  }, [filterCriticality, executionId]);

  useEffect(() => { load(); }, [load]);

  const reclassify = async (id: string, criticality: string) => {
    await api.put(`/vulnerabilities/${id}`, { criticality });
    setEditingId(null);
    load();
  };

  const toggleRemediated = async (v: Vuln) => {
    await api.put(`/vulnerabilities/${v.id}`, { remediated: !v.remediated });
    load();
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Clasificacion de Vulnerabilidades</h2>

      <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Criticidad</label>
          <select
            value={filterCriticality}
            onChange={e => setFilterCriticality(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todas</option>
            <option value="HIGH">Alta</option>
            <option value="MEDIUM">Media</option>
            <option value="LOW">Baja</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">ID de Ejecucion</label>
          <div className="flex gap-2">
            <input
              value={executionInput}
              onChange={e => setExecutionInput(e.target.value)}
              placeholder="UUID de ejecucion..."
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
            />
            <button
              onClick={() => setExecutionId(executionInput)}
              className="bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm hover:bg-blue-700"
            >
              Filtrar
            </button>
            {executionId && (
              <button
                onClick={() => { setExecutionId(''); setExecutionInput(''); }}
                className="bg-gray-200 text-gray-600 px-3 py-1.5 rounded-md text-sm hover:bg-gray-300"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500">Cargando...</p>
      ) : vulns.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          No se encontraron vulnerabilidades con los filtros aplicados.
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Criticidad</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">CVSS</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">URL Afectada</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {vulns.map(v => (
                <tr key={v.id} className={v.remediated ? 'opacity-60' : ''}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{v.name}</p>
                    <p className="text-xs text-gray-400 truncate max-w-xs">{v.recommendation}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{v.type.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3">
                    {editingId === v.id ? (
                      <div className="flex gap-1 flex-wrap">
                        {['HIGH', 'MEDIUM', 'LOW'].map(c => (
                          <button
                            key={c}
                            onClick={() => reclassify(v.id, c)}
                            className={`px-2 py-0.5 rounded text-xs font-medium ${CRITICALITY_STYLE[c]}`}
                          >
                            {c}
                          </button>
                        ))}
                        <button onClick={() => setEditingId(null)} className="text-xs text-gray-400 px-1">x</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditingId(v.id)}
                        className={`px-2 py-0.5 rounded text-xs font-medium ${CRITICALITY_STYLE[v.criticality]}`}
                        title="Click para reclasificar"
                      >
                        {v.criticality}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{v.cvssScore?.toFixed(1) ?? '-'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs truncate max-w-xs">{v.affectedUrl}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${v.remediated ? 'text-green-600' : 'text-orange-500'}`}>
                      {v.remediated ? 'Remediado' : 'Pendiente'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleRemediated(v)}
                      className={`text-xs px-3 py-1 rounded-md ${
                        v.remediated
                          ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          : 'bg-green-50 text-green-700 hover:bg-green-100'
                      }`}
                    >
                      {v.remediated ? 'Desmarcar' : 'Marcar remediado'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
