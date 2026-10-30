import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";

export function RequireAuth({ children, requireProfile = false }: { children: ReactNode; requireProfile?: boolean }) {
  const { loading, isAuthed, hasProfile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!isAuthed) navigate({ to: "/" });
    else if (requireProfile && !hasProfile) navigate({ to: "/onboarding" });
  }, [loading, isAuthed, hasProfile, requireProfile, navigate]);

  if (loading || !isAuthed || (requireProfile && !hasProfile)) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
      </div>
    );
  }
  return <>{children}</>;
}
