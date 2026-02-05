import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [gracePeriod, setGracePeriod] = useState(true);

  // Avoid redirect flicker right after sign-in while auth state is still propagating.
  useEffect(() => {
    if (loading) return;
    if (user) {
      setGracePeriod(false);
      return;
    }

    const t = window.setTimeout(() => setGracePeriod(false), 1200);
    return () => window.clearTimeout(t);
  }, [loading, user]);

  if (loading || (!user && gracePeriod)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    const redirect = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/auth?redirect=${redirect}`} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
