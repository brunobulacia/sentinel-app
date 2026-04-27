'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Download, Trash2, FileOutput, Loader2, PlusCircle, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

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

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 }
};

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
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center gap-3 mb-6"
      >
        <div className="p-2 bg-neon-purple/20 rounded-lg border border-neon-purple/50">
          <FileText className="w-6 h-6 text-neon-purple" />
        </div>
        <h2 className="text-2xl font-bold text-white tracking-wider drop-shadow-[0_0_8px_rgba(188,19,254,0.5)]">
          Generación de Reportes
        </h2>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-6 border-l-4 border-l-neon-purple relative overflow-hidden"
      >
        <div className="absolute -right-10 -top-10 w-32 h-32 bg-neon-purple/10 rounded-full blur-3xl pointer-events-none" />
        
        <h3 className="text-lg font-semibold mb-4 text-gray-200 flex items-center gap-2">
          <FileOutput className="w-5 h-5 text-neon-purple" />
          Generar Nuevo Reporte
        </h3>
        
        <div className="flex flex-col md:flex-row gap-4">
          <select
            value={selectedExecution}
            onChange={e => setSelectedExecution(e.target.value)}
            className="flex-1 bg-black/50 border border-gray-700/50 rounded-md px-4 py-3 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-neon-purple/50 focus:border-neon-purple transition-all"
          >
            <option value="" className="bg-gray-900 text-gray-400">Seleccionar ejecución completada...</option>
            {executions.map(e => (
              <option key={e.id} value={e.id} className="bg-gray-900 text-gray-200">
                {e.scanConfig?.name} — {e.totalVulnerabilities} vulns — {new Date(e.createdAt).toLocaleDateString()}
              </option>
            ))}
          </select>
          <button
            onClick={generate}
            disabled={!selectedExecution || generating}
            className={cn(
              "flex items-center justify-center gap-2 px-6 py-3 rounded-md text-sm font-medium transition-all min-w-[200px]",
              !selectedExecution || generating
                ? "bg-gray-800/50 text-gray-500 cursor-not-allowed border border-gray-700/50"
                : "bg-neon-purple/20 text-neon-purple border border-neon-purple/50 hover:bg-neon-purple hover:text-white hover:shadow-[0_0_15px_rgba(188,19,254,0.5)]"
            )}
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generando...</span>
              </>
            ) : (
              <>
                <PlusCircle className="w-4 h-4" />
                <span>Generar Reporte HTML</span>
              </>
            )}
          </button>
        </div>
        {executions.length === 0 && (
          <p className="text-sm text-gray-400/70 mt-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> No hay ejecuciones completadas disponibles.
          </p>
        )}
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-panel p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-neon-cyan" />
            Reportes Generados
          </h3>
          <button 
            onClick={load}
            className="p-2 text-gray-400 hover:text-neon-cyan transition-colors"
            title="Actualizar lista"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        {reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500 border border-dashed border-gray-700/50 rounded-lg bg-black/20">
            <FileText className="w-12 h-12 mb-3 text-gray-600/50" />
            <p className="text-sm">No hay reportes generados aún.</p>
          </div>
        ) : (
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={{
              visible: { transition: { staggerChildren: 0.05 } }
            }}
            className="grid gap-4"
          >
            {reports.map(r => (
              <motion.div 
                variants={itemVariants}
                key={r.id} 
                className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-black/40 border border-gray-800/60 rounded-lg hover:border-gray-700 transition-colors group"
              >
                <div className="mb-4 md:mb-0">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="w-4 h-4 text-neon-purple" />
                    <p className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors">{r.title}</p>
                  </div>
                  <p className="text-xs text-gray-500 font-mono mb-2">{new Date(r.generatedAt).toLocaleString()}</p>
                  
                  <div className="flex gap-3 text-xs bg-black/50 px-3 py-1.5 rounded-full inline-flex border border-gray-800/80">
                    <span className="text-gray-400">Total: <strong className="text-gray-200">{r.totalVulnerabilities}</strong></span>
                    <span className="text-gray-500">|</span>
                    <span className="text-red-400/80">Alta: <strong className="text-red-400">{r.highCount}</strong></span>
                    <span className="text-yellow-400/80">Media: <strong className="text-yellow-400">{r.mediumCount}</strong></span>
                    <span className="text-green-400/80">Baja: <strong className="text-green-400">{r.lowCount}</strong></span>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => download(r.id, r.title)}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30 px-4 py-2 rounded-md text-xs hover:bg-neon-cyan hover:text-black font-medium transition-all"
                  >
                    <Download className="w-4 h-4" />
                    Descargar HTML
                  </button>
                  <button
                    onClick={() => deleteReport(r.id)}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-red-500/10 text-red-500 border border-red-500/30 px-4 py-2 rounded-md text-xs hover:bg-red-500 hover:text-white transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="md:hidden">Eliminar</span>
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
