"use client";
import { useSyncExternalStore } from "react";

/** A tiny external store for cross-component UI state (no extra dependency). */
export type UiState = {
  /** Slug of the service shown in the detail modal. */
  modal: string | null;
  /** Element that opened the modal, to return focus on close. */
  modalOrigin: HTMLElement | null;
  /** Shared-element id of the card that opened the modal (Framer Motion layoutId). */
  modalLayoutId: string | null;
  searchOpen: boolean;
  bootDone: boolean;
  /** Pre-fill for the enquiry form's Service field. */
  quoteService: string | null;
  quoteNonce: number;
  soundOn: boolean;
};

let state: UiState = {
  modal: null,
  modalOrigin: null,
  modalLayoutId: null,
  searchOpen: false,
  bootDone: false,
  quoteService: null,
  quoteNonce: 0,
  soundOn: false,
};

const listeners = new Set<() => void>();

export function getUi(): UiState {
  return state;
}

export function setUi(patch: Partial<UiState> | ((s: UiState) => Partial<UiState>)): void {
  const next = typeof patch === "function" ? patch(state) : patch;
  state = { ...state, ...next };
  for (const l of listeners) l();
}

export function subscribeUi(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useUi<T>(selector: (s: UiState) => T): T {
  return useSyncExternalStore(
    subscribeUi,
    () => selector(state),
    () => selector(state),
  );
}

/** Scroll to the enquiry form and pre-select a service. */
export function requestQuote(service: string | null): void {
  setUi((s) => ({
    quoteService: service,
    quoteNonce: s.quoteNonce + 1,
    modal: null,
    searchOpen: false,
  }));
}

export function openService(
  slug: string,
  origin: HTMLElement | null,
  layoutId: string | null = null,
): void {
  setUi({ modal: slug, modalOrigin: origin, modalLayoutId: layoutId, searchOpen: false });
}
