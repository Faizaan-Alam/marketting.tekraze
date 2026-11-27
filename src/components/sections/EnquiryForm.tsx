"use client";

import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react";
import { enquiryServiceOptions } from "@/content/services";
import { site } from "@/content/site";
import {
  ENQUIRY_FIELDS,
  ENQUIRY_LIMITS,
  enquirySchema,
  fieldErrors,
  type EnquiryField,
  type EnquiryResponse,
} from "@/lib/enquiry-schema";
import { afterModalsClose, scrollToId } from "@/lib/client/motion";
import { playCue } from "@/lib/client/sound";
import { getUi, subscribeUi } from "@/lib/client/store";

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id?: string) => void;
  remove: (id: string) => void;
};
declare global {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- global augmentation needs an interface
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
const CAPTCHA = (process.env.NEXT_PUBLIC_CAPTCHA_PROVIDER ?? "turnstile") === "turnstile";
const TURNSTILE_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type Values = Record<EnquiryField, string>;
const EMPTY: Values = { firstName: "", lastName: "", email: "", service: "", message: "" };

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${TURNSTILE_SRC}"]`);
    const script = existing ?? document.createElement("script");
    script.addEventListener("load", () =>
      window.turnstile ? resolve(window.turnstile) : reject(new Error("turnstile")),
    );
    script.addEventListener("error", () => reject(new Error("turnstile")));
    if (!existing) {
      script.src = TURNSTILE_SRC;
      script.async = true;
      document.head.appendChild(script);
    }
  });
}

export function EnquiryForm() {
  const ids = useId();
  const [values, setValues] = useState<Values>(EMPTY);
  const [honeypot, setHoneypot] = useState("");
  const [errors, setErrors] = useState<Partial<Record<EnquiryField, string>>>({});
  const [status, setStatus] = useState<{
    kind: "idle" | "sending" | "sent" | "error";
    message: string;
  }>({ kind: "idle", message: "" });
  const [captchaToken, setCaptchaToken] = useState("");
  const csrf = useRef<string | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const widget = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const started = useRef(false);
  const sentHeading = useRef<HTMLParagraphElement>(null);

  const fetchToken = useCallback(async () => {
    try {
      const res = await fetch("/api/enquiry", {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      });
      const data: unknown = await res.json();
      if (
        res.ok &&
        typeof data === "object" &&
        data &&
        typeof (data as { token?: unknown }).token === "string"
      ) {
        csrf.current = (data as { token: string }).token;
      }
    } catch {
      csrf.current = null;
    }
  }, []);

  // Start the session (CSRF token + CAPTCHA) when the form approaches the viewport.
  const start = useCallback(() => {
    if (started.current) return;
    started.current = true;
    void fetchToken();
    if (CAPTCHA && SITE_KEY && widget.current) {
      loadTurnstile()
        .then((api) => {
          if (!widget.current || widgetId.current) return;
          widgetId.current = api.render(widget.current, {
            sitekey: SITE_KEY,
            theme: "dark",
            action: "enquiry",
            callback: (token: string) => setCaptchaToken(token),
            "expired-callback": () => setCaptchaToken(""),
            "error-callback": () => setCaptchaToken(""),
          });
        })
        .catch(() =>
          setStatus({
            kind: "error",
            message:
              "The verification check couldn't load. Check your connection and reload the page.",
          }),
        );
    }
  }, [fetchToken]);

  useEffect(() => {
    const el = form.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e?.isIntersecting && start(), {
      rootMargin: "600px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, [start]);

  // "Get a quote" anywhere on the page: pre-select the service, scroll here, focus the form.
  useEffect(() => {
    let seen = getUi().quoteNonce;
    const timers: number[] = [];
    const cancels: Array<() => void> = [];
    const unsubscribe = subscribeUi(() => {
      const { quoteNonce, quoteService } = getUi();
      if (quoteNonce === seen) return;
      seen = quoteNonce;
      if (quoteService && enquiryServiceOptions.includes(quoteService)) {
        setValues((v) => ({ ...v, service: quoteService }));
      }
      start();
      cancels.push(
        afterModalsClose(() => {
          scrollToId("quote", { focus: false });
          timers.push(
            window.setTimeout(
              () => document.getElementById(`${ids}-firstName`)?.focus({ preventScroll: true }),
              900,
            ),
          );
        }),
      );
    });
    return () => {
      unsubscribe();
      timers.forEach((t) => window.clearTimeout(t));
      cancels.forEach((c) => c());
    };
  }, [ids, start]);

  const set = (field: EnquiryField, value: string) => {
    setValues((v) => ({ ...v, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (status.kind === "sending") return;
    const parsed = enquirySchema.safeParse({ ...values, website: honeypot, captchaToken });
    if (!parsed.success) {
      const fe = fieldErrors(parsed.error);
      setErrors(fe);
      setStatus({ kind: "error", message: "Please fix the highlighted fields." });
      const first = ENQUIRY_FIELDS.find((f) => fe[f]);
      if (first) document.getElementById(`${ids}-${first}`)?.focus();
      return;
    }
    if (CAPTCHA && SITE_KEY && !captchaToken) {
      setStatus({ kind: "error", message: "Please complete the verification check below." });
      return;
    }
    setStatus({ kind: "sending", message: "Sending your enquiry…" });
    if (!csrf.current) await fetchToken();
    try {
      const res = await fetch("/api/enquiry", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf.current ?? "" },
        body: JSON.stringify({ ...values, website: honeypot, captchaToken }),
      });
      const data = (await res.json().catch(() => null)) as EnquiryResponse | null;
      if (res.ok && data?.ok) {
        playCue("confirm");
        setStatus({ kind: "sent", message: "Tekraze replies within 1 to 2 business days." });
        setValues(EMPTY);
        setErrors({});
        csrf.current = null;
        void fetchToken();
      } else {
        const fail = data && !data.ok ? data : null;
        if (fail?.fields) setErrors(fail.fields);
        setStatus({
          kind: "error",
          message: fail?.message ?? "We couldn't send your enquiry. Please try again.",
        });
        if (fail?.code === "forbidden") {
          csrf.current = null;
          void fetchToken();
        }
      }
    } catch {
      setStatus({
        kind: "error",
        message: "You seem to be offline. Check your connection and try again.",
      });
    } finally {
      if (widgetId.current) {
        window.turnstile?.reset(widgetId.current);
        setCaptchaToken("");
      }
    }
  };

  // After sending, move focus to the confirmation so keyboard and screen-reader users land on it.
  useEffect(() => {
    if (status.kind !== "sent") return;
    const el = sentHeading.current;
    el?.focus({ preventScroll: true });
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [status.kind]);

  const field = (name: EnquiryField) => ({
    id: `${ids}-${name}`,
    name,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `${ids}-${name}-error` : undefined,
  });
  const err = (name: EnquiryField) =>
    errors[name] ? (
      <p id={`${ids}-${name}-error`} className="mt-1.5 text-sm text-[#ff8a96]">
        {errors[name]}
      </p>
    ) : null;
  const input =
    "mt-1.5 block w-full rounded-lg border border-line bg-ink-3 px-4 py-3 text-paper placeholder:text-paper-faint focus:border-paper focus:outline-none aria-[invalid=true]:border-[#ff6b7a]";

  if (status.kind === "sent") {
    return (
      <div className="rounded-[1rem] border border-line bg-ink-2 p-8" role="status">
        <span className="tally-dot text-xl" aria-hidden="true" />
        <p className="display mt-4 text-4xl outline-none" tabIndex={-1} ref={sentHeading}>
          Enquiry sent.
        </p>
        <p className="mt-3 text-paper-dim">
          {status.message} If needed, we&rsquo;ll also set up a short call.
        </p>
        <button
          type="button"
          className="btn btn-ghost mt-6"
          onClick={() => setStatus({ kind: "idle", message: "" })}
        >
          Send another enquiry
        </button>
      </div>
    );
  }

  return (
    <form
      ref={form}
      onSubmit={onSubmit}
      noValidate
      className="rounded-[1rem] border border-line bg-ink-2 p-[clamp(1.25rem,3vw,2.25rem)]"
      onFocusCapture={start}
      aria-describedby={`${ids}-note`}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor={`${ids}-firstName`} className="text-sm font-semibold">
            First name
          </label>
          <input
            {...field("firstName")}
            className={input}
            autoComplete="given-name"
            maxLength={ENQUIRY_LIMITS.name}
            value={values.firstName}
            onChange={(e) => set("firstName", e.target.value)}
            required
          />
          {err("firstName")}
        </div>
        <div>
          <label htmlFor={`${ids}-lastName`} className="text-sm font-semibold">
            Last name
          </label>
          <input
            {...field("lastName")}
            className={input}
            autoComplete="family-name"
            maxLength={ENQUIRY_LIMITS.name}
            value={values.lastName}
            onChange={(e) => set("lastName", e.target.value)}
            required
          />
          {err("lastName")}
        </div>
        <div className="sm:col-span-2">
          <label htmlFor={`${ids}-email`} className="text-sm font-semibold">
            Email
          </label>
          <input
            {...field("email")}
            type="email"
            inputMode="email"
            className={input}
            autoComplete="email"
            maxLength={ENQUIRY_LIMITS.email}
            value={values.email}
            onChange={(e) => set("email", e.target.value)}
            required
          />
          {err("email")}
        </div>
        <div className="sm:col-span-2">
          <label htmlFor={`${ids}-service`} className="text-sm font-semibold">
            Service
          </label>
          <select
            {...field("service")}
            className={`${input} appearance-none`}
            value={values.service}
            onChange={(e) => set("service", e.target.value)}
            required
          >
            <option value="">Choose a service</option>
            {enquiryServiceOptions.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
          {err("service")}
        </div>
        <div className="sm:col-span-2">
          <div className="flex items-baseline justify-between">
            <label htmlFor={`${ids}-message`} className="text-sm font-semibold">
              Message
            </label>
            <span className="text-xs text-paper-faint" aria-hidden="true">
              {values.message.length}/{ENQUIRY_LIMITS.messageMax}
            </span>
          </div>
          <textarea
            {...field("message")}
            rows={6}
            className={`${input} resize-y`}
            maxLength={ENQUIRY_LIMITS.messageMax}
            value={values.message}
            onChange={(e) => set("message", e.target.value)}
            placeholder="What do you need, and by when?"
            required
          />
          {err("message")}
        </div>
        {/* Honeypot: invisible to people and screen readers; bots that fill it are dropped. */}
        <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
          <label htmlFor={`${ids}-website`}>Leave this field empty</label>
          <input
            id={`${ids}-website`}
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
          />
        </div>
        {CAPTCHA ? (
          <div className="sm:col-span-2">
            <div ref={widget} className="min-h-[65px]" />
            {!SITE_KEY && process.env.NODE_ENV !== "production" ? (
              <p className="text-xs text-paper-faint">
                Dev note: set NEXT_PUBLIC_TURNSTILE_SITE_KEY to show the verification widget.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button type="submit" className="btn btn-primary px-8" disabled={status.kind === "sending"}>
          {status.kind === "sending" ? "Sending…" : "Send enquiry"}
        </button>
        <p id={`${ids}-note`} className="text-sm text-paper-dim">
          {site.formNote}
        </p>
      </div>
      <p
        className={`mt-4 text-sm ${status.kind === "error" ? "text-[#ff8a96]" : "text-paper-dim"}`}
        role="status"
        aria-live="polite"
      >
        {status.message}
      </p>
    </form>
  );
}
