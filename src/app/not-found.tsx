import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="gutter grid min-h-[100svh] place-items-center text-center">
      <div>
        <p className="text-sm font-semibold text-tally">Error 404</p>
        <h1 className="display mt-3 text-[clamp(3rem,10vw,7rem)]">
          This episode doesn&rsquo;t exist.
        </h1>
        <p className="mx-auto mt-4 max-w-[40ch] text-paper-dim">
          The page you asked for isn&rsquo;t on this channel.
        </p>
        <Link href="/" className="btn btn-primary mt-8">
          Back to browse
        </Link>
      </div>
    </main>
  );
}
