import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  isSubView?: boolean;
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
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  private handleClearCache = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.error(e);
    }
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.isSubView) {
        return (
          <div className="p-8 rounded-2xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 text-center my-6 max-w-xl mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-rose-950 dark:text-rose-200 uppercase tracking-wide">
              {this.props.fallbackTitle || 'মডিউলটি লোড হতে সাময়িক সমস্যা হয়েছে'}
            </h3>
            <p className="text-xs text-rose-700 dark:text-rose-300 mt-1.5 leading-relaxed font-medium">
              {this.props.fallbackMessage || 'ডেটা প্রসেসিংয়ে অপ্রত্যাশিত ত্রুটি দেখা দিয়েছে। নিচের বাটনে ক্লিক করে আবার চেষ্টা করুন।'}
            </p>
            <div className="flex items-center justify-center gap-3 mt-5">
              <button
                type="button"
                onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 transition-all shadow-xs cursor-pointer"
              >
                <ArrowLeft size={14} />
                Try Again
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-all shadow-xs cursor-pointer"
              >
                <RefreshCw size={14} />
                Reload View
              </button>
            </div>
          </div>
        );
      }

      return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] text-gray-900 dark:text-white flex items-center justify-center p-4 selection:bg-rose-500/20">
          <div className="max-w-lg w-full bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-8 md:p-10 shadow-xl text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60 flex items-center justify-center mx-auto mb-6 shadow-inner">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight text-gray-900 dark:text-white">
              {this.props.fallbackTitle || 'পৃষ্ঠাটি লোড করতে সমস্যা হয়েছে'}
            </h1>
            
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 font-medium leading-relaxed">
              {this.props.fallbackMessage || 'সিস্টেমে সাময়িক সমস্যা বা সংযোগ ত্রুটির কারণে পেইজটি প্রদর্শিত হচ্ছে না। দয়া করে পেজটি রিলোড করুন।'}
            </p>

            {this.state.error && (
              <div className="mt-4 p-3 rounded-xl bg-gray-100 dark:bg-gray-800/80 text-left font-mono text-[11px] text-gray-600 dark:text-gray-300 max-h-24 overflow-y-auto break-all border border-gray-200 dark:border-gray-700">
                {this.state.error.toString()}
              </div>
            )}

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-[#0F172A] hover:bg-black text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <RefreshCw size={15} />
                পেজ রিলোড করুন
              </button>
              <button
                type="button"
                onClick={() => (window.location.href = '/')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold text-xs uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
              >
                <Home size={15} />
                হোম পেইজ
              </button>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={this.handleClearCache}
                className="text-xs font-semibold text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors underline underline-offset-4 cursor-pointer"
              >
                ক্যাশ মেমোরি ক্লিয়ার করে ফ্রেশ রিলোড দিন
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
