import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logCrashReport } from '../services/analyticsService';
import { RotateCcw, Home, Sparkles, AlertCircle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary Caught]', error, errorInfo);
    this.setState({ errorInfo });
    logCrashReport(error, 'Screen Rendering', {
      componentStack: errorInfo.componentStack
    });
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  private handleResetCache = () => {
    try {
      localStorage.removeItem('pregnancy_weight_undefined');
      localStorage.removeItem('lumina_recent_undefined');
      // Keep primary user safe but clean potentially corrupted cached sub-states
      const current = localStorage.getItem('lumina_user');
      if (current) {
        try {
          JSON.parse(current);
        } catch {
          localStorage.removeItem('lumina_user');
        }
      }
    } catch {}
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[350px] w-full flex items-center justify-center p-6 bg-gradient-to-br from-rose-50/70 via-pink-50/40 to-indigo-50/50 text-gray-800 rounded-3xl border border-pink-100 shadow-sm animate-fadeIn my-4">
          <div className="max-w-md w-full bg-white/90 backdrop-blur-md p-8 rounded-[2.5rem] border border-pink-100/80 shadow-lg text-center space-y-5">
            <div className="w-16 h-16 bg-gradient-to-tr from-pink-100 to-rose-200 text-rose-500 rounded-3xl mx-auto flex items-center justify-center shadow-inner">
              <Sparkles size={28} className="text-pink-500 animate-pulse" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-serif font-bold text-gray-800 italic">
                We encountered a gentle pause
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed font-sans">
                Lumina protected your health logs and caught an unexpected rendering state. Your records remain safe.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-pink-50/50 rounded-2xl border border-pink-100 text-left text-[11px] text-pink-700/80 font-mono overflow-x-auto max-h-24">
                <p className="font-semibold flex items-center gap-1 text-[10px] text-rose-600 mb-1">
                  <AlertCircle size={12} /> Notice
                </p>
                {this.state.error.message || 'Temporary display glitch'}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-2xl text-xs font-bold uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw size={14} /> Refresh View
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="py-3 px-4 bg-white hover:bg-pink-50 text-gray-700 rounded-2xl text-xs font-bold border border-pink-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Home size={14} /> Home
              </button>
            </div>

            <button
              type="button"
              onClick={this.handleResetCache}
              className="text-[10px] text-gray-400 hover:text-pink-500 transition-colors font-medium underline underline-offset-2 cursor-pointer pt-1"
            >
              Clear display cache & reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
