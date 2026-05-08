import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { hasError: boolean; message: string };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message || 'Unknown error' };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled UI error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-100 p-6 text-gray-900 dark:bg-gray-900 dark:text-white">
          <div className="mx-auto max-w-2xl rounded-xl border border-red-300 bg-white p-6 dark:border-red-700 dark:bg-gray-800">
            <h1 className="text-xl font-semibold text-red-700 dark:text-red-300">Application error</h1>
            <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
              A runtime error prevented the app from rendering.
            </p>
            <p className="mt-3 break-all rounded bg-gray-100 p-3 font-mono text-xs dark:bg-gray-900">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
            >
              Reload app
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

