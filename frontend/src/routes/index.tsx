import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { googleLoginUrl } from "@/lib/api";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Résumé Lab — tailor your résumé in minutes" },
      { name: "description", content: "AI-assisted HTML résumé editor. Pick a template, tailor to any job description, edit code or preview live." },
      { property: "og:title", content: "Résumé Lab" },
      { property: "og:description", content: "Craft polished HTML résumés, tailored to any role." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { isAuthed, loading } = useAuth();

  return (
    <div className="grain min-h-screen overflow-hidden">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-accent" />
          <span className="font-display text-lg tracking-tight">Résumé Lab</span>
        </Link>
        {!loading && (
          isAuthed ? (
            <Link to="/app" className="rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground">Open app →</Link>
          ) : (
            <a href={googleLoginUrl()} className="rounded-full border border-border px-4 py-1.5 text-sm font-medium hover:bg-secondary">Sign in</a>
          )
        )}
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-32 pt-16 md:pt-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-3xl"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs uppercase tracking-widest text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Résumés, made effortless
          </span>
          <h1 className="mt-6 font-display text-5xl leading-[1.05] tracking-tight md:text-7xl">
            Your résumé,
            <br />
            <span className="italic text-muted-foreground">tailored</span> to every role.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Pick a template. Paste a job description. Watch your résumé reshape itself —
            then edit code or PDF, side by side.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <a
              href={googleLoginUrl()}
              className="group inline-flex items-center gap-3 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            >
              <GoogleMark />
              Continue with Google
              <span className="transition group-hover:translate-x-0.5">→</span>
            </a>
            <span className="text-xs text-muted-foreground">No credit card. Free while in beta.</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="mt-24 grid gap-6 md:grid-cols-3"
        >
          {[
            { k: "01", t: "Templates that don't look templated", d: "Clean HTML and CSS. ATS-friendly. Editorially calm." },
            { k: "02", t: "Tailor to any JD", d: "Paste the job description. Get a draft tuned to its language." },
            { k: "03", t: "Code or PDF — your call", d: "An island toggle flips between an editor and the live PDF." },
          ].map((f) => (
            <div key={f.k} className="rounded-2xl border border-border bg-card p-6 shadow-soft">
              <div className="font-mono text-xs text-muted-foreground">{f.k}</div>
              <h3 className="mt-3 font-display text-xl">{f.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </motion.div>
      </main>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.4-1.6 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.2.8 3.9 1.5l2.7-2.6C17 3.4 14.7 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.7H12z"/>
    </svg>
  );
}
