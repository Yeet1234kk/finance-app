import { Component } from "react";

// Keeps a runtime error from white-screening the whole app and offers a recovery path.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error("App crashed:", error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{ maxWidth: 430, margin: "0 auto", padding: "48px 24px", fontFamily: "'IBM Plex Sans Thai','Kanit',-apple-system,sans-serif", textAlign: "center" }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>⚠️</div>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: "#0F172A", margin: "0 0 8px" }}>Something went wrong</h1>
        <p style={{ fontSize: 13, color: "#94A3B8", margin: "0 0 20px", lineHeight: 1.6 }}>
          The app hit an unexpected error. Your saved data is untouched — try reloading.
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{ padding: "12px 24px", borderRadius: 14, border: "none", background: "#4F46E5", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
        >
          Reload
        </button>
      </div>
    );
  }
}
