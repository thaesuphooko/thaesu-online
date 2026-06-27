'use client';
import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center glass-card p-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-red-500 mb-4">Something went wrong</h1>
            <p className="text-muted-foreground mb-4">{this.state.error?.message}</p>
            <button onClick={() => this.setState({ hasError: false })} className="px-6 py-2 bg-primary text-primary-foreground rounded-xl">Try again</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
