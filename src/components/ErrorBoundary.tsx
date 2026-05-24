import { Component, type ErrorInfo, type ReactNode } from "react";

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Dashboard render error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="board">
          <p className="error" role="alert">
            Something went wrong rendering the dashboard. Please refresh the page.
          </p>
        </main>
      );
    }

    return this.props.children;
  }
}
