'use client';

import { Component, ReactNode } from 'react';

// ── WebGL detection ────────────────────────────────────────────────────────

export function isWebGLAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl');
    if (gl) {
      // Dispose the context immediately
      if (gl instanceof WebGLRenderingContext || gl instanceof WebGL2RenderingContext) {
        const ext = gl.getExtension('WEBGL_lose_context');
        ext?.loseContext();
      }
      return true;
    }
  } catch {
    // silent
  }
  return false;
}

// ── Error boundary ─────────────────────────────────────────────────────────

interface Props {
  children: ReactNode;
  fallback: ReactNode;
}

interface State {
  hasError: boolean;
}

export class WebGLErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn('[WebGL Error]', error.message);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}
