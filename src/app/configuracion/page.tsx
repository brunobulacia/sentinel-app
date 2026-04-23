'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';

const VULN_TYPES = [
  'SQL_INJECTION', 'XSS', 'CSRF', 'INSECURE_CONFIG',
  'DATA_EXPOSURE', 'BROKEN_AUTH', 'SECURITY_MISCONFIG', 'SSRF',
];

interface ScanConfig {
  id: string;
  name: string;
  targetUrl: string;
  vulnerabilityTypes: string[];
  depth: string;
  scheduledAt: string | null;
  isActive: boolean;
}

const emptyForm = {
  name: '',
  targetUrl: '',
  vulnerabilityTypes: [] as string[],
  depth: 'medium',
  scheduledAt: '',
};

export default function ConfiguracionPage() {
  const [configs, setConfigs] = useState<ScanConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    try {
      const { data } = await api.get('/scan-configs');
      setConfigs(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEditing(null);
    setShowForm(false);
  };

  const openEdit = (cfg: ScanConfig) => {
    setEditing(cfg.id);
    setForm({
      name: cfg.name,
      targetUrl: cfg.targetUrl,
      vulnerabilityTypes: cfg.vulnerabilityTypes ?? [],
      depth: cfg.depth,
      scheduledAt: cfg.scheduledAt ? cfg.scheduledAt.slice(0, 16) : '',
    });
    setShowForm(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form, scheduledAt: form.scheduledAt || undefined };
    if (editing) {
      await api.put(`/scan-configs/${editing}`, payload);
    } else {
      await api.post('/scan-configs', payload);
    }
    resetForm();
    load();
  };

  const remove = async (id: string) => {
    await api.delete(`/scan-configs/${id}`);
    load();
  };

  const toggleType = (type: string) => {
    setForm(f => ({
      ...f,
      vulnerabilityTypes: f.vulnerabilityTypes.includes(type)
        ? f.vulnerabilityTypes.filter(t => t !== type)
        : [...f.vulnerabilityTypes, type],
    }));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Configuracion de Escaneos</h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm font-medium"
        >
          Nueva Configuracion
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">
            {editing ? 'Editar Configuracion' : 'Nueva Configuracion'}
          </h3>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  required
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL Objetivo</label>
                <input
                  required
                  type="url"
                  value={form.targetUrl}
                  onChange={e => setForm(f => ({ ...f, targetUrl: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Profundidad</label>
                <select
                  value={form.depth}
                  onChange={e => setForm(f => ({ ...f, depth: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Baja</option>
                  <option value="medium">Media</option>
                  <option value="deep">Profunda</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Programar (opcional)</label>
                <input
                  type="datetime-local"
                  value={form.scheduledAt}
                  onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipos de Vulnerabilidad</label>
              <div className="flex flex-wrap gap-2">
                {VULN_TYPES.map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleType(type)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      form.vulnerabilityTypes.includes(type)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                    }`}
                  >
                    {type.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm font-medium"
              >
                {editing ? 'Guardar Cambios' : 'Crear Configuracion'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 text-sm"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">Cargando...</p>
      ) : configs.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          No hay configuraciones. Crea una nueva.
        </div>
      ) : (
        <div className="space-y-3">
          {configs.map(cfg => (
            <div key={cfg.id} className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-gray-800">{cfg.name}</h4>
                <p className="text-sm text-gray-500">{cfg.targetUrl}</p>
                <div className="flex gap-2 mt-1">
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded capitalize">{cfg.depth}</span>
                  {cfg.scheduledAt && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                      {new Date(cfg.scheduledAt).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => openEdit(cfg)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Editar
                </button>
                <button
                  onClick={() => remove(cfg.id)}
                  className="text-sm text-red-600 hover:underline"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
