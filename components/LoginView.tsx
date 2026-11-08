import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';
import { Lock, Unlock, Eye, EyeOff, Loader2, Sparkles, Shield, User, LogOut, CheckCircle } from 'lucide-react';

const LOGO_URL = 'https://res.cloudinary.com/dyeppbrfl/image/upload/v1787511255/copy_of_826fb604-b81c-438a-ab3e-e2cc5f95f40a.png';

const LoginView: React.FC = () => {
  const { user, isLocked, login, unlock, logout } = useAuth();
  
  const [selectedRole, setSelectedRole] = useState<UserRole>('vendedor');
  const [pin, setPin] = useState<string>('');
  const [showPin, setShowPin] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [imgError, setImgError] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) {
      setErrorMsg('Por favor ingresa tu PIN de acceso.');
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      if (isLocked) {
        // Desbloquear sesión existente
        const res = await unlock(pin);
        if (!res.success) {
          setErrorMsg(res.message || 'PIN incorrecto para reanudar sesión.');
        }
      } else {
        // Login nuevo
        const res = await login(pin, selectedRole);
        if (!res.success) {
          setErrorMsg(res.message || 'PIN o contraseña incorrecta.');
        }
      }
    } catch {
      setErrorMsg('Error de conexión al verificar credenciales.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeypadPress = (val: string) => {
    if (val === 'C') {
      setPin('');
      setErrorMsg(null);
    } else if (val === 'DEL') {
      setPin(prev => prev.slice(0, -1));
      setErrorMsg(null);
    } else {
      if (pin.length < 12) {
        setPin(prev => prev + val);
        setErrorMsg(null);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-950 via-purple-950/40 to-gray-950 font-sans selection:bg-purple-600 selection:text-white relative overflow-hidden">
      {/* Luces de fondo decorativas */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="bg-gray-900/85 backdrop-blur-xl border border-purple-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/80 space-y-6">
          
          {/* Encabezado y Logo */}
          <div className="text-center space-y-3">
            <div className="relative inline-block">
              <div className="w-20 h-20 mx-auto rounded-2xl p-1 bg-gradient-to-br from-purple-500 via-indigo-600 to-purple-800 shadow-xl shadow-purple-900/50 flex items-center justify-center ring-2 ring-purple-400/40 overflow-hidden">
                {!imgError ? (
                  <img
                    src={LOGO_URL}
                    alt="Alquima Mizu Logo"
                    onError={() => setImgError(true)}
                    className="w-full h-full object-cover rounded-xl transform hover:scale-105 transition-transform"
                  />
                ) : (
                  <Sparkles className="w-10 h-10 text-white" />
                )}
              </div>
              <div className="absolute -bottom-1.5 -right-1.5 p-1 rounded-full bg-purple-600 border-2 border-gray-900 text-white shadow-xs">
                {isLocked ? <Lock size={14} /> : <Shield size={14} />}
              </div>
            </div>

            <div>
              <h1 className="text-2xl font-black tracking-tight text-white flex items-center justify-center gap-1.5">
                Alquima Mizu
              </h1>
              <p className="text-xs text-purple-300/80 font-medium tracking-wide uppercase mt-0.5">
                Gestor de Catálogo, Bodega y Ventas
              </p>
            </div>

            {isLocked ? (
              <div className="bg-amber-500/15 border border-amber-500/30 rounded-xl p-3 text-left">
                <div className="flex items-center gap-2 text-amber-300 font-semibold text-xs">
                  <Lock size={16} className="shrink-0" />
                  <span>Pantalla bloqueada por inactividad</span>
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  Sesión activa de <strong className="text-gray-200 capitalize">{user?.role}</strong> ({user?.email || 'usuario local'}). Ingresa tu PIN para reanudar.
                </p>
              </div>
            ) : null}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Selector de Rol (Solo en Login normal, no en pantalla bloqueada) */}
            {!isLocked && (
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-2">
                  Selecciona tu rol de acceso
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-gray-950/80 border border-gray-800 rounded-xl">
                  <button
                    type="button"
                    onClick={() => { setSelectedRole('vendedor'); setErrorMsg(null); }}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                      selectedRole === 'vendedor'
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-900/50'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                    }`}
                  >
                    <User size={15} />
                    <span>Vendedor</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setSelectedRole('admin'); setErrorMsg(null); }}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                      selectedRole === 'admin'
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-900/50'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                    }`}
                  >
                    <Shield size={15} />
                    <span>Administrador</span>
                  </button>
                </div>
                <p className="text-[11px] text-gray-500 mt-1.5 px-1">
                  {selectedRole === 'admin' 
                    ? 'Acceso total: Finanzas, Bodega, Costos y Sincronización.' 
                    : 'Acceso seguro: Catálogo y Venta Rápida (Costos protegidos).'}
                </p>
              </div>
            )}

            {/* Input de PIN */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-gray-300">
                  {isLocked ? 'PIN de desbloqueo' : `PIN de ${selectedRole === 'admin' ? 'Administrador' : 'Vendedor'}`}
                </label>
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="text-gray-400 hover:text-purple-300 text-xs flex items-center gap-1 font-medium transition-colors"
                >
                  {showPin ? <EyeOff size={14} /> : <Eye size={14} />}
                  <span>{showPin ? 'Ocultar' : 'Mostrar'}</span>
                </button>
              </div>

              <div className="relative">
                <input
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  value={pin}
                  onChange={(e) => { setPin(e.target.value); setErrorMsg(null); }}
                  placeholder="Ingresa tu PIN..."
                  autoFocus
                  required
                  className="w-full bg-gray-950/90 border border-gray-700/80 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 rounded-xl px-4 py-3 text-center text-lg sm:text-xl font-mono tracking-widest text-white placeholder-gray-600 outline-hidden transition-all shadow-inner"
                />
              </div>

              {/* Mensaje de Error */}
              {errorMsg && (
                <div className="mt-2 p-2.5 bg-red-950/80 border border-red-500/50 rounded-xl text-red-200 text-xs flex items-center gap-2 animate-in fade-in duration-150">
                  <span className="shrink-0 font-bold text-red-400">✕</span>
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>

            {/* Teclado numérico táctil (POS / Móvil) */}
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'DEL'].map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleKeypadPress(key)}
                  className={`py-2 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
                    key === 'C'
                      ? 'bg-gray-800/60 hover:bg-gray-800 text-amber-400 border border-gray-700/50'
                      : key === 'DEL'
                      ? 'bg-gray-800/60 hover:bg-gray-800 text-red-400 border border-gray-700/50'
                      : 'bg-gray-800/40 hover:bg-gray-700/60 text-gray-200 border border-gray-700/40 hover:text-white'
                  }`}
                >
                  {key === 'DEL' ? '⌫' : key}
                </button>
              ))}
            </div>

            {/* Botón de Envío */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-[0.99] text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-purple-900/40 transition-all disabled:opacity-50 text-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Verificando credencial...</span>
                </>
              ) : isLocked ? (
                <>
                  <Unlock size={16} />
                  <span>Desbloquear y Continuar</span>
                </>
              ) : (
                <>
                  <CheckCircle size={16} />
                  <span>Ingresar al Sistema</span>
                </>
              )}
            </button>

            {/* Opción para cambiar de usuario si está bloqueada */}
            {isLocked && (
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={logout}
                  className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 hover:underline transition-colors"
                >
                  <LogOut size={13} />
                  <span>Cerrar sesión / Cambiar de usuario</span>
                </button>
              </div>
            )}
          </form>

          {/* Pie de seguridad institucional sin credenciales visibles */}
          <div className="pt-2 border-t border-gray-800/80 text-center text-[11px] text-gray-500 space-y-1">
            <p className="flex items-center justify-center gap-1.5 text-purple-300/80 font-medium">
              <Shield size={12} className="text-purple-400" />
              <span>Acceso institucional protegido</span>
            </p>
            <p className="text-[10px] text-gray-600">
              Validación segura en tiempo real mediante Google Apps Script
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default LoginView;
