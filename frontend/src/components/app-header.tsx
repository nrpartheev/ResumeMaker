import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";

/** Header shown across authenticated screens. */
export function AppHeader() {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const onApp = loc.pathname.startsWith("/app");

  return (
    <header className="flex items-center justify-between border-b border-border bg-card/60 px-4 py-3 backdrop-blur md:px-5">
      <div className="flex items-center gap-4 md:gap-6">
        <Link to="/app" className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-accent" />
          <span className="font-display text-base">Résumé Lab</span>
        </Link>
        <nav className="flex items-center gap-3 text-sm text-muted-foreground md:gap-4">
          <Link to="/app" className={onApp ? "text-foreground" : "hover:text-foreground"}>Studio</Link>
          <Link to="/profile" className={loc.pathname.startsWith("/profile") ? "text-foreground" : "hover:text-foreground"}>Profile</Link>
        </nav>
      </div>
      <div className="flex items-center gap-2 md:gap-3">
        <span className="hidden text-xs text-muted-foreground sm:block md:inline">{profile?.email ?? profile?.name ?? profile?.username ?? ""}</span>
        <button
          onClick={() => { logout(); navigate({ to: "/" }); }}
          className="rounded-full border border-border px-3 py-1 text-xs hover:bg-secondary"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
