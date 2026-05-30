/**
 * client/src/components/shared/ErrorBoundary.tsx
 *
 * React error boundary for graceful error recovery.
 *
 * What this component will do:
 *  - Catch uncaught React render errors in the subtree.
 *  - Display a friendly "Something went wrong" fallback UI.
 *  - Provide a "Try again" button that resets the error boundary state.
 *  - Log the error to the console (and later to a logging service).
 */

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? <div>Something went wrong.</div>;
    }
    return this.props.children;
  }
}
