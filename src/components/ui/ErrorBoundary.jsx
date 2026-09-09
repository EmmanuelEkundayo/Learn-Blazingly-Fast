import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { error: null, info: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary]', error, info.componentStack);
    }
  }

  handleReset = () => {
    this.setState({ error: null, info: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-surface-900 px-6">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-red-600/10 border border-red-500/20 flex items-center justify-center">
              <span className="text-3xl font-black text-red-400">!</span>
            </div>
            <h1 className="text-2xl font-bold text-white">Something went wrong</h1>
            <p className="text-gray-400 text-sm leading-relaxed">
              An unexpected error occurred while rendering this page. Your progress and data are safe.
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={this.handleReset}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-colors active:scale-95"
              >
                Try Again
              </button>
              <button
                onClick={() => { window.location.href = '/'; }}
                className="px-6 py-2.5 bg-surface-700 hover:bg-surface-600 text-gray-300 rounded-xl font-bold transition-colors active:scale-95"
              >
                Go Home
              </button>
            </div>
            {import.meta.env.DEV && this.state.info && (
              <details className="text-left mt-4">
                <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-400">Stack trace</summary>
                <pre className="mt-2 text-xs text-red-300 bg-surface-800 border border-surface-700 rounded-xl p-4 overflow-auto max-h-48">
                  {this.state.error?.message}
                  {'\n\n'}
                  {this.state.info.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}