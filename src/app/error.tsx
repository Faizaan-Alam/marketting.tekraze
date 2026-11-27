"use client";

/** Generic error screen: never shows the error message or stack to visitors. */
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main id="main" className="gutter grid min-h-[100svh] place-items-center text-center">
      <div>
        <h1 className="display text-[clamp(3rem,9vw,6rem)]">Signal lost.</h1>
        <p className="mx-auto mt-4 max-w-[40ch] text-paper-dim">
          Something went wrong loading this page. Try again in a moment.
        </p>
        <button type="button" onClick={reset} className="btn btn-primary mt-8">
          Try again
        </button>
      </div>
    </main>
  );
}
