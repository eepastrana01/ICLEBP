import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Capturó un error de renderizado:', error, errorInfo);
  }

  public handleRetry = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center p-8 min-h-[350px] text-center bg-white/70 backdrop-blur-md rounded-3xl border border-rose-200/80 shadow-xs max-w-lg mx-auto my-8">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 mb-4 shadow-2xs">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <h3 className="text-base font-bold text-slate-800">No se pudo cargar este módulo</h3>
          <p className="text-xs text-slate-500 mt-1.5 max-w-sm leading-relaxed">
            Ocurrió un error inesperado al renderizar la vista. Pulsa el botón para recargar la aplicación limpiamente.
          </p>
          <button
            type="button"
            onClick={this.handleRetry}
            className="mt-5 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer active:scale-95"
          >
            Recargar Módulo
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
