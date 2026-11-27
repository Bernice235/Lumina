import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logCrashReport } from '../services/analyticsService';
import { scrubLegacySensitiveKeys } from '../services/secureStorage';
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
      scrubLegacySensitiveKeys();
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
        <div className="min-h-[350px] w-full flex items-center justify-center p-6 bg-[#faf8f6] dark:bg-[#11100f] text-stone-900 dark:text-stone-100 rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] my-4">
          <div className="max-w-md w-full bg-white dark:bg-[#1a1816] p-7 rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] shadow-sm text-center space-y-5">
            <div className="w-14 h-14 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-2xl mx-auto flex items-center justify-center border border-rose-200/70 dark:border-rose-900/50">
              <Sparkles size={24} />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-serif font-semibold text-stone-900 dark:text-stone-100">
                We encountered an unexpected view state
              </h3>
              <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
                Lumina protected your health logs and caught a rendering issue. Your records remain intact.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3.5 bg-[#faf8f6] dark:bg-[#23201d] rounded-xl border border-stone-200/80 dark:border-[#342f2b] text-left text-xs text-rose-700 dark:text-rose-300 font-mono overflow-x-auto max-h-24">
                <p className="font-sans font-semibold flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 mb-1">
                  <AlertCircle size={13} /> Details
                </p>
                {this.state.error.message || 'Temporary display glitch'}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 py-2.5 px-4 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw size={14} /> Refresh View
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="py-2.5 px-4 bg-[#faf8f6] dark:bg-[#23201d] hover:bg-stone-100 dark:hover:bg-[#2c2824] text-stone-700 dark:text-stone-200 rounded-xl text-xs font-semibold border border-stone-200/80 dark:border-[#342f2b] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Home size={14} /> Home
              </button>
            </div>

            <button
              type="button"
              onClick={this.handleResetCache}
              className="text-xs text-stone-500 dark:text-stone-400 hover:text-pink-600 dark:hover:text-pink-400 transition-colors font-medium underline underline-offset-2 cursor-pointer pt-1"
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
