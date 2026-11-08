import React, { useState, useMemo } from 'react';
import Modal from './Modal';
import { 
  FileSpreadsheet, 
  History, 
  Upload, 
  Activity, 
  Wifi, 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  Loader2,
  Camera,
  RefreshCw
} from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';
import { syncService } from '../services/syncService';

interface ToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ToolsModal: React.FC<ToolsModalProps> = ({ isOpen, onClose }) => {
  const { 
    products, 
    setModal, 
    updatePreference 
  } = useAppContext();

  // Diagnóstico de Conexión Nube
  const [pingStatus, setPingStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [pingLatency, setPingLatency] = useState<number | null>(null);
  const [pingError, setPingError] = useState<string | null>(null);

  // Diagnóstico Rápido de Inventario
  const diagnostics = useMemo(() => {
    if (!products) return { withoutPhoto: 0, withoutCost: 0, outOfStock: 0, totalProducts: 0, totalVariants: 0 };
    
    let withoutCost = 0;
    let outOfStock = 0;
    let totalVariants = 0;
    let withoutPhoto = 0;

    products.forEach(p => {
      if (!p.imageUrls || p.imageUrls.length === 0) {
        withoutPhoto++;
      }
      const productTotalStock = p.variants.reduce((sum, v) => sum + v.stock, 0);
      if (productTotalStock === 0) {
        outOfStock++;
      }
      p.variants.forEach(v => {
        totalVariants++;
        if (v.cost === undefined || v.cost === null || v.cost <= 0) {
          withoutCost++;
        }
      });
    });

    return {
      withoutPhoto,
      withoutCost,
      outOfStock,
      totalProducts: products.length,
      totalVariants
    };
  }, [products]);

  const handleTestConnection = async () => {
    setPingStatus('testing');
    setPingError(null);
    const start = performance.now();
    try {
      await syncService.fetchRemoteData();
      const latency = Math.round(performance.now() - start);
      setPingLatency(latency);
      setPingStatus('success');
    } catch (err: any) {
      setPingStatus('error');
      setPingError(err.message || 'Error de conexión');
    }
  };

  const handleOpenCsvImport = () => {
    onClose();
    setModal({ type: 'import-csv' });
  };

  const handleOpenAuditLog = () => {
    onClose();
    setModal({ type: 'audit-log' });
  };

  const handleOpenRestoreBackup = () => {
    onClose();
    setModal({ type: 'restore-backup' });
  };

  const handleFilterWithoutPhoto = () => {
    updatePreference('photoFilter', 'without_photo');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Centro de Herramientas y Diagnóstico" size="3xl">
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">

        {/* 1. Módulo Principal: Actualización Masiva CSV */}
        <div className="p-4 sm:p-5 bg-gradient-to-br sm:bg-gradient-to-r from-emerald-950/50 via-gray-900 to-emerald-950/40 rounded-xl sm:rounded-2xl border border-emerald-500/30 hover:border-emerald-500/50 transition-all shadow-lg shadow-emerald-950/20">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 sm:p-3 bg-emerald-500/20 text-emerald-400 rounded-xl flex-shrink-0 mt-0.5">
                <FileSpreadsheet size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base sm:text-lg font-bold text-white">Actualizar Stock y Precios (CSV)</h3>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-semibold px-2 py-0.5 rounded-full border border-emerald-500/30">
                    2 Pasos
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-gray-300 mt-1 leading-relaxed">
                  Genera la plantilla con tus <strong className="text-emerald-300 font-semibold">{diagnostics.totalVariants} variantes</strong>, edita valores en Excel y cárgala para actualizar todo en bloque.
                </p>
              </div>
            </div>
            <button
              onClick={handleOpenCsvImport}
              className="flex-shrink-0 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold py-2.5 px-4 sm:px-5 rounded-xl shadow-md transition-all text-xs sm:text-sm hover:shadow-emerald-600/30"
            >
              <span>Abrir Actualizador</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>

        {/* 2. Grid de Diagnósticos (Salud del Inventario + Conexión Google Sheets) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Card: Salud del Inventario */}
          <div className="p-4 sm:p-5 bg-gray-900/60 rounded-xl sm:rounded-2xl border border-gray-700/80 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-purple-400">
                  <Activity size={18} />
                  <h4 className="font-semibold text-white text-sm sm:text-base">Salud del Inventario</h4>
                </div>
                <span className="text-xs text-gray-400 font-mono bg-gray-800/90 px-2 py-0.5 rounded-md border border-gray-700">
                  {diagnostics.totalProducts} productos
                </span>
              </div>

              {/* Métricas interactivas */}
              <div className="grid grid-cols-3 gap-2 sm:gap-2.5 my-2">
                {/* Sin Costo */}
                <div className="p-2 sm:p-2.5 bg-gray-800/80 rounded-xl border border-gray-700/70 text-center flex flex-col justify-center min-h-[64px]">
                  <span className="text-base sm:text-lg font-bold text-gray-100">{diagnostics.withoutCost}</span>
                  <span className="text-[10px] text-gray-400 mt-0.5 font-medium">Sin Costo</span>
                </div>

                {/* Sin Foto (Botón interactivo si hay productos) */}
                <button
                  type="button"
                  onClick={diagnostics.withoutPhoto > 0 ? handleFilterWithoutPhoto : undefined}
                  disabled={diagnostics.withoutPhoto === 0}
                  className={`p-2 sm:p-2.5 rounded-xl border text-center flex flex-col justify-center min-h-[64px] transition-all group ${
                    diagnostics.withoutPhoto > 0 
                      ? 'bg-amber-950/40 hover:bg-amber-900/50 active:scale-95 border-amber-500/40 hover:border-amber-400 text-amber-300 cursor-pointer shadow-sm' 
                      : 'bg-gray-800/80 border-gray-700/70 text-gray-400 cursor-default'
                  }`}
                  title={diagnostics.withoutPhoto > 0 ? "Haz clic para ver los productos sin foto en el catálogo" : "Todos los productos tienen fotos"}
                >
                  <span className="text-base sm:text-lg font-bold">{diagnostics.withoutPhoto}</span>
                  <span className="text-[10px] mt-0.5 font-medium flex items-center justify-center gap-1">
                    <Camera size={11} className={diagnostics.withoutPhoto > 0 ? "text-amber-400" : "text-gray-500"} />
                    Sin Foto
                  </span>
                  {diagnostics.withoutPhoto > 0 && (
                    <span className="text-[9px] text-amber-400/90 font-medium group-hover:underline mt-0.5 leading-none">
                      Ver lista →
                    </span>
                  )}
                </button>

                {/* Agotados */}
                <div className="p-2 sm:p-2.5 bg-gray-800/80 rounded-xl border border-gray-700/70 text-center flex flex-col justify-center min-h-[64px]">
                  <span className="text-base sm:text-lg font-bold text-gray-100">{diagnostics.outOfStock}</span>
                  <span className="text-[10px] text-gray-400 mt-0.5 font-medium">Agotados</span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-gray-400 mt-2">
              Haz clic en <strong className="text-amber-300">Sin Foto</strong> para localizarlos en el catálogo y asignarles imagen.
            </p>
          </div>

          {/* Card: Diagnóstico de Conexión Nube */}
          <div className="p-4 sm:p-5 bg-gray-900/60 rounded-xl sm:rounded-2xl border border-gray-700/80 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-cyan-400">
                  <Wifi size={18} />
                  <h4 className="font-semibold text-white text-sm sm:text-base">Conexión Google Sheets</h4>
                </div>
                <span className="text-[11px] text-gray-400 font-mono">Webhook Apps Script</span>
              </div>

              {/* Caja de Estado y Acción */}
              <div className="p-3 bg-gray-800/80 rounded-xl border border-gray-700/70 my-2 flex items-center justify-between gap-2 min-h-[64px]">
                <div className="min-w-0 flex-1">
                  {pingStatus === 'idle' && (
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-gray-500 inline-block flex-shrink-0"></span>
                      <span className="text-xs text-gray-300 truncate">Listo para comprobar</span>
                    </div>
                  )}
                  {pingStatus === 'testing' && (
                    <div className="flex items-center gap-2">
                      <Loader2 size={15} className="animate-spin text-cyan-400 flex-shrink-0" />
                      <span className="text-xs text-cyan-300 font-medium truncate">Probando respuesta...</span>
                    </div>
                  )}
                  {pingStatus === 'success' && (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                      <span className="text-xs text-emerald-300 font-semibold truncate">
                        Conectado ({pingLatency}ms)
                      </span>
                    </div>
                  )}
                  {pingStatus === 'error' && (
                    <div className="flex items-center gap-2">
                      <XCircle size={16} className="text-rose-400 flex-shrink-0" />
                      <span className="text-xs text-rose-300 font-medium truncate" title={pingError || ''}>
                        Fallo de conexión
                      </span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={pingStatus === 'testing'}
                  className="flex-shrink-0 px-3.5 py-2 bg-gray-700 hover:bg-gray-600 active:bg-gray-800 text-xs font-semibold text-white rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
                >
                  <RefreshCw size={13} className={pingStatus === 'testing' ? 'animate-spin' : ''} />
                  <span>Probar Ping</span>
                </button>
              </div>
            </div>

            <p className="text-[11px] text-gray-400 mt-2">
              Prueba la latencia y comunicación bidireccional con tu hoja de cálculo.
            </p>
          </div>

        </div>

        {/* 3. Operaciones de Administración (2 Columnas Simétricas) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 border-t border-gray-700/60">

          {/* Bitácora de Auditoría */}
          <button
            type="button"
            onClick={handleOpenAuditLog}
            className="text-left p-4 sm:p-5 bg-gray-800/60 hover:bg-gray-800 active:scale-[0.99] rounded-xl sm:rounded-2xl border border-gray-700/70 hover:border-purple-500/50 transition-all flex items-start gap-3.5 group shadow-sm"
          >
            <div className="p-2.5 bg-purple-500/10 text-purple-400 rounded-xl group-hover:bg-purple-500/20 group-hover:scale-105 transition-all flex-shrink-0">
              <History size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <h4 className="font-semibold text-white text-sm sm:text-base group-hover:text-purple-300 transition-colors">
                  Bitácora de Auditoría
                </h4>
                <ArrowRight size={14} className="text-gray-500 group-hover:text-purple-400 transition-transform group-hover:translate-x-0.5" />
              </div>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                Historial cronológico de ventas, cambios de stock y modificaciones en el catálogo.
              </p>
            </div>
          </button>

          {/* Restaurar Respaldo */}
          <button
            type="button"
            onClick={handleOpenRestoreBackup}
            className="text-left p-4 sm:p-5 bg-gray-800/60 hover:bg-gray-800 active:scale-[0.99] rounded-xl sm:rounded-2xl border border-gray-700/70 hover:border-indigo-500/50 transition-all flex items-start gap-3.5 group shadow-sm"
          >
            <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl group-hover:bg-indigo-500/20 group-hover:scale-105 transition-all flex-shrink-0">
              <Upload size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <h4 className="font-semibold text-white text-sm sm:text-base group-hover:text-indigo-300 transition-colors">
                  Restaurar Respaldo
                </h4>
                <ArrowRight size={14} className="text-gray-500 group-hover:text-indigo-400 transition-transform group-hover:translate-x-0.5" />
              </div>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                Restaura la base de datos completa de productos y movimientos desde un archivo .json.
              </p>
            </div>
          </button>

        </div>

      </div>
    </Modal>
  );
};

export default ToolsModal;