import { useEffect, useState, useRef } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [isReady, setIsReady] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // If loading is done and we have a user, we're ready immediately
    if (!loading && user) {
      setIsReady(true);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    // If loading is done and no user, wait a bit more (session might be propagating)
    if (!loading && !user) {
      // Give extra time for session to propagate after page load
      timeoutRef.current = setTimeout(() => {
        setIsReady(true);
      }, 800);
      
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }
  }, [loading, user]);

  // Still loading or waiting for grace period
  if (loading || !isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  // Ready and no user = redirect to auth
  if (!user) {
    // Clean the redirect URL - remove internal lovable tokens
    const cleanPath = location.pathname;
    const cleanSearch = location.search.replace(/[?&]__lovable_token=[^&]+/, '').replace(/^\?$/, '');
    const redirect = encodeURIComponent(`${cleanPath}${cleanSearch}`);
    return <Navigate to={`/auth?redirect=${redirect}`} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
