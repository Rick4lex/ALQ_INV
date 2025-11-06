import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCw, Trash2 } from 'lucide-react';
import { resetRepository } from '../lib/automerge-repo';

// Fallback Component
interface ErrorFallbackProps {
  error: Error | null;
  resetErrorBoundary: () => void;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetErrorBoundary }) => {
  const handleHardReset = async () => {
    if (window.confirm("ADVERTENCIA: ¿Estás seguro de que quieres borrar TODOS los datos de la aplicación de este dispositivo? Esta acción es el último recurso y es irreversible.")) {
      try {
        await resetRepository();
        localStorage.clear(); // Clear everything else too
        window.location.reload();
      } catch (e) {
        alert("No se pudo reiniciar. Por favor, cierra todas las pestañas de esta aplicación y vuelve a intentarlo, o borra los datos del sitio manualmente desde la configuración de tu navegador.");
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-900 via-gray-900 to-black p-4">
      <div className="w-full max-w-lg bg-gray-800/80 backdrop-blur-sm border border-red-500/50 rounded-2xl shadow-2xl p-6 md:p-8 text-white">
        <div className="text-center mb-6">
          <AlertTriangle className="mx-auto h-16 w-16 text-red-400 animate-pulse" />
          <h1 className="text-3xl font-bold mt-4 text-red-300">Ocurrió un Error Inesperado</h1>
          <p className="text-red-200/80 mt-2">La aplicación encontró un problema y no puede continuar.</p>
        </div>
        
        {error && (
          <div className="bg-red-900/50 border border-red-500/30 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-red-300 mb-2">Detalles del Error:</h3>
            <pre className="text-sm text-red-200 whitespace-pre-wrap font-mono break-all">
              {error.message}
            </pre>
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={resetErrorBoundary}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center justify-center gap-2"
          >
            <RotateCw size={20} />
            Reintentar Cargar
          </button>
          <button
            onClick={handleHardReset}
            className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center justify-center gap-2"
          >
            <Trash2 size={20} />
            Reiniciar Aplicación (Borrar Datos)
          </button>
        </div>
        <p className="text-center text-xs text-gray-400 mt-6">
          Si el problema persiste después de reintentar, un reinicio puede solucionarlo. Esto eliminará todos los datos locales.
        </p>
      </div>
    </div>
  );
};


// Error Boundary Class Component
interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  private resetErrorBoundary = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} resetErrorBoundary={this.resetErrorBoundary} />;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;