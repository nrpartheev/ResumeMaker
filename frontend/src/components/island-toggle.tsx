import { motion } from "framer-motion";

export type IslandMode = "code" | "pdf";

export function IslandToggle({ value, onChange }: { value: IslandMode; onChange: (v: IslandMode) => void }) {
  const opts: IslandMode[] = ["code", "pdf"];
  return (
    <div className="pointer-events-auto inline-flex items-center gap-1 rounded-full bg-island p-1 text-island-foreground shadow-island">
      {opts.map((o) => {
        const active = o === value;
        return (
          <button
            key={o}
            onClick={() => onChange(o)}
            className="relative rounded-full px-4 py-1.5 text-xs font-medium uppercase tracking-wider"
          >
            {active && (
              <motion.span
                layoutId="island-pill"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
                className="absolute inset-0 rounded-full bg-accent"
              />
            )}
            <span className={`relative ${active ? "text-accent-foreground" : "text-island-foreground/70"}`}>
              {o === "code" ? "Code" : "PDF"}
            </span>
          </button>
        );
      })}
    </div>
  );
}
