import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, detail: null };
  }
  static getDerivedStateFromError(error) { return { hasError: true, detail: error?.message || String(error) }; }
  componentDidCatch(error, info) { /* log opcional */ }

  render() {
    if (this.state.hasError) {
      return (
        <section className="section container" style={{maxWidth: 720}}>
          <h1>Ocurrió un error</h1>
          <p style={{opacity:.8}}>Intentá recargar la página. Si el problema persiste, contactá soporte.</p>
          {import.meta.env.DEV && (
            <details style={{whiteSpace:"pre-wrap", background:"#fafafa", border:"1px solid #eee", padding:12, borderRadius:8}}>
              <summary>Detalle técnico</summary>
              {this.state.detail}
            </details>
          )}
          <button onClick={() => location.reload()} className="btn btn--primary" style={{marginTop:12}}>
            Recargar
          </button>
        </section>
      );
    }
    return this.props.children;
  }
}
