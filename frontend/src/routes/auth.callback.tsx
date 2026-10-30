import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallback,
});

function AuthCallback() {
  const { setToken, refreshProfile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, "")) ;
    const search = new URLSearchParams(window.location.search);
    const token = params.get("token") || search.get("token");
    const error = params.get("error") || search.get("error");

    if (error) {
      toast.error("Sign-in failed: " + error);
      navigate({ to: "/" });
      return;
    }
    if (!token) {
      toast.error("No token returned by the server.");
      navigate({ to: "/" });
      return;
    }

    (async () => {
      await setToken(token);
      // Decide where to send them based on profile presence
      try {
        await refreshProfile();
      } catch {
        // ignore
      }
      // We can't read state synchronously here; just go to /app and it will redirect to onboarding if needed.
      navigate({ to: "/app" });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex items-center gap-3 text-muted-foreground">
        <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
        Signing you in…
      </div>
    </div>
  );
}
