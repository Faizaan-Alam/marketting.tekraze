"use client";

import { Component, type ReactNode } from "react";

/**
 * Contains failures of optional enhancements (3D scene, WebGL hover). If one throws — a chunk
 * fails to load, WebGL is unavailable — it disappears and the 2D fallback underneath remains,
 * instead of the error reaching the page-level boundary.
 */
export class SafeBoundary extends Component<
  { children: ReactNode; onError?: () => void },
  { failed: boolean }
> {
  override state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  override componentDidCatch(): void {
    this.props.onError?.();
  }

  override render(): ReactNode {
    return this.state.failed ? null : this.props.children;
  }
}
