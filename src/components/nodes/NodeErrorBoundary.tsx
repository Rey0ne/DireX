/* === Node Error Boundary === */
/* Isolates render crashes per-node — one broken node won't crash the entire canvas */

import React from 'react';

interface NodeErrorBoundaryProps {
  nodeId: string;
  nodeType: string;
  children: React.ReactNode;
}

interface NodeErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

// ── Keep track of crashed nodes across the session ──
const CRASHED_NODES_KEY = 'direx-crashed-nodes';

function recordCrash(nodeId: string): void {
  try {
    const raw = localStorage.getItem(CRASHED_NODES_KEY);
    const crashed: string[] = raw ? JSON.parse(raw) : [];
    if (!crashed.includes(nodeId)) {
      crashed.push(nodeId);
      localStorage.setItem(CRASHED_NODES_KEY, JSON.stringify(crashed));
    }
  } catch {
    // localStorage may be full or unavailable — ignore
  }
}

export function getCrashedNodeIds(): string[] {
  try {
    const raw = localStorage.getItem(CRASHED_NODES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function clearCrashedNodes(): void {
  try {
    localStorage.removeItem(CRASHED_NODES_KEY);
  } catch {
    // ignore
  }
}

export class NodeErrorBoundary extends React.Component<
  NodeErrorBoundaryProps,
  NodeErrorBoundaryState
> {
  constructor(props: NodeErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): NodeErrorBoundaryState {
    return { hasError: true, errorMessage: error.message || String(error) };
  }

  componentDidCatch(error: Error, _errorInfo: React.ErrorInfo): void {
    console.error(
      `[NodeErrorBoundary] Node ${this.props.nodeId} (${this.props.nodeType}) crashed:`,
      error.message
    );
    recordCrash(this.props.nodeId);
  }

  componentDidUpdate(prevProps: NodeErrorBoundaryProps): void {
    // Reset error state if the node type or ID changes (e.g. hot reload)
    if (
      prevProps.nodeId !== this.props.nodeId ||
      prevProps.nodeType !== this.props.nodeType
    ) {
      if (this.state.hasError) {
        this.setState({ hasError: false, errorMessage: '' });
      }
    }
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div
          style={{
            width: 300,
            minHeight: 100,
            padding: '16px 20px',
            background: 'rgba(40, 0, 0, 0.95)',
            border: '1px solid rgba(255, 80, 80, 0.6)',
            borderRadius: 12,
            color: '#ff8888',
            fontFamily: 'system-ui, sans-serif',
            fontSize: 13,
            lineHeight: 1.5,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            cursor: 'default',
            userSelect: 'none',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 14, color: '#ff5555' }}>
            ⚠ 此节点渲染异常
          </div>
          <div style={{ color: '#999', fontSize: 11 }}>
            {this.props.nodeType} · {this.props.nodeId.slice(-8)}
          </div>
          {this.state.errorMessage && (
            <div
              style={{
                marginTop: 4,
                padding: '6px 10px',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: 6,
                wordBreak: 'break-word',
                fontSize: 11,
                color: '#cc6666',
                maxHeight: 80,
                overflow: 'auto',
              }}
            >
              {this.state.errorMessage}
            </div>
          )}
          <button
            onClick={() => {
              this.setState({ hasError: false, errorMessage: '' });
            }}
            style={{
              marginTop: 6,
              padding: '4px 14px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 6,
              color: '#ccc',
              fontSize: 12,
              cursor: 'pointer',
              alignSelf: 'flex-start',
            }}
          >
            尝试恢复
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// ── HOC: wrap a node component with the error boundary ──
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withNodeErrorBoundary(
  Component: React.ComponentType<any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): React.FC<any> {
  const Wrapped: React.FC<any> = (props) => (
    <NodeErrorBoundary nodeId={props.id} nodeType={props.type}>
      <Component {...props} />
    </NodeErrorBoundary>
  );
  Wrapped.displayName = `NodeErrorBoundary(${
    Component.displayName || Component.name || 'Unknown'
  })`;
  return Wrapped;
}
