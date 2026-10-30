import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/require-auth";
import { AppHeader } from "@/components/app-header";
import { useAuth } from "@/lib/auth-context";
import { api, type Profile } from "@/lib/api";
import { toast } from "sonner";
import { Sparkles, ArrowUp } from "lucide-react";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Your profile — Résumé Lab" }] }),
  component: () => (
    <RequireAuth requireProfile>
      <div className="min-h-screen">
        <AppHeader />
        <ProfilePage />
      </div>
    </RequireAuth>
  ),
});

// Top-level keys we render with friendlier labels; everything else falls through
// the generic renderer so the backend can introduce new fields without UI changes.
const TOP_LEVEL_LABELS: Record<string, string> = {
  username: "Name",
  email: "Email",
  phone: "Phone",
  summary: "Summary",
  skills: "Skills",
  experience: "Experience",
  projects: "Projects",
  education: "Education",
  certifications: "Certifications",
  languages: "Languages",
  links: "Links",
};

function humanize(key: string) {
  if (TOP_LEVEL_LABELS[key]) return TOP_LEVEL_LABELS[key];
  return key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function ProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const [data, setData] = useState<Profile>(profile ?? {});
  const [aiBusy, setAiBusy] = useState(false);

  useEffect(() => { setData(profile ?? {}); }, [profile]);

  const KNOWN = new Set(Object.keys(TOP_LEVEL_LABELS));
  const allEntries = Object.entries(data).filter(([, v]) => v !== undefined && v !== null && v !== "");
  const knownEntries = allEntries.filter(([k]) => KNOWN.has(k));
  const otherEntries = allEntries.filter(([k]) => !KNOWN.has(k));

  return (
    <main className="mx-auto max-w-3xl px-6 py-12 pb-40">
      <h1 className="font-display text-4xl tracking-tight">Your profile</h1>
      <p className="mt-2 text-muted-foreground">
        The source of truth that fuels every résumé. Use the AI bar below to update it — no manual editing.
      </p>

      <div className="mt-10 space-y-6">
        {allEntries.length === 0 && (
          <p className="text-sm text-muted-foreground">No profile data yet. Ask the AI to add some.</p>
        )}
        {knownEntries.map(([key, value]) => (
          <Section key={key} title={humanize(key)}>
            <ValueRenderer value={value} />
          </Section>
        ))}
        {otherEntries.length > 0 && (
          <Section title="Other">
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-[max-content_1fr]">
              {otherEntries.map(([key, value]) => (
                <div key={key} className="contents">
                  <dt className="text-xs uppercase tracking-wider text-muted-foreground sm:pt-0.5">
                    {humanize(key)}
                  </dt>
                  <dd className="text-sm text-foreground/90">
                    <ValueRenderer value={value} />
                  </dd>
                </div>
              ))}
            </dl>
          </Section>
        )}
      </div>

      <AiProfileBar
        busy={aiBusy}
        onSubmit={async (instruction) => {
          setAiBusy(true);
          try {
            const updated = await api<Profile>("/updateprofile", {
              method: "POST",
              json: { instruction },
            });
            setData(updated);
            await refreshProfile();
            toast.success("AI updated your profile.");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "AI update failed");
          } finally {
            setAiBusy(false);
          }
        }}
      />
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
      <h2 className="font-display text-xl">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Dynamic renderer — handles strings, numbers, arrays of primitives,
 *  arrays of objects (with arbitrary keys), and nested objects. */
function ValueRenderer({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === "") {
    return <span className="text-sm text-muted-foreground">—</span>;
  }

  if (typeof value === "string") {
    return <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{value}</p>;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return <p className="text-sm text-foreground/90">{String(value)}</p>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-sm text-muted-foreground">—</span>;
    }
    const allPrimitive = value.every((v) => typeof v === "string" || typeof v === "number");
    if (allPrimitive) {
      return (
        <ul className="flex flex-wrap gap-2">
          {value.map((v, i) => (
            <li key={i} className="rounded-full border border-border bg-background px-3 py-1 text-xs">
              {String(v)}
            </li>
          ))}
        </ul>
      );
    }
    return (
      <div className="space-y-3">
        {value.map((item, i) => (
          <div key={i} className="rounded-xl border border-border bg-background/50 p-4">
            <ValueRenderer value={item} />
          </div>
        ))}
      </div>
    );
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).filter((k) => obj[k] !== undefined && obj[k] !== null && obj[k] !== "");
    if (keys.length === 0) {
      return <span className="text-sm text-muted-foreground">—</span>;
    }
    return (
      <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-[max-content_1fr]">
        {keys.map((k) => (
          <div key={k} className="contents">
            <dt className="text-xs uppercase tracking-wider text-muted-foreground sm:pt-0.5">
              {humanize(k)}
            </dt>
            <dd className="text-sm text-foreground/90">
              <ValueRenderer value={obj[k]} />
            </dd>
          </div>
        ))}
      </dl>
    );
  }

  return <span className="text-sm text-muted-foreground">{String(value)}</span>;
}

function AiProfileBar({ busy, onSubmit }: { busy: boolean; onSubmit: (instruction: string) => void }) {
  const [v, setV] = useState("");
  function send() {
    const t = v.trim();
    if (!t || busy) return;
    onSubmit(t);
    setV("");
  }
  return (
    <div className="fixed inset-x-0 bottom-6 z-30 px-6">
      <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-border bg-background/95 p-2 shadow-soft backdrop-blur focus-within:ring-2 focus-within:ring-ring">
        <Sparkles className="ml-2 mb-2 h-4 w-4 shrink-0 text-accent" />
        <textarea
          value={v}
          onChange={(e) => setV(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          placeholder={busy ? "Updating your profile…" : "Ask AI to update your profile… e.g. ‘add my grade to King's’ or ‘add a senior role at Vercel’"}
          disabled={busy}
          className="max-h-40 flex-1 resize-none bg-transparent px-1 py-2 text-sm outline-none placeholder:text-muted-foreground"
        />
        <button
          onClick={send}
          disabled={busy || !v.trim()}
          className="grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
          aria-label="Send to AI"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
