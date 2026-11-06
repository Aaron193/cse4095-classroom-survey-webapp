// Keeps an unexpected rendering or lazy-loading error from blanking the app.
import { Component, type ReactNode } from "react";
import { Button } from "./Button";

type Props = { children: ReactNode };
type State = { hasError: boolean };

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="center-page">
          <div role="alert">
            <h1>Something went wrong</h1>
            <p>Please reload the page and try again.</p>
            <Button onClick={() => window.location.reload()}>
              Reload page
            </Button>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}
