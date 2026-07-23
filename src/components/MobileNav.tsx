import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Home, Film, Radio, MessageCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";

const MobileNav = () => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const navItems = [
    { icon: Home, path: "/feed", label: "Accueil" },
    { icon: Film, path: "/reels", label: "Reels" },
    { icon: Radio, path: "/live", label: "Live" },
    { icon: MessageCircle, path: "/messages", label: "Messages" },
    { icon: User, path: `/profile/${user.id}`, label: "Profil" },
  ];

  return (
    <nav aria-label="Navigation mobile" className="fixed bottom-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-xl border-t border-border/60 md:hidden safe-area-pb">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || 
            (item.path.startsWith("/profile") && location.pathname.startsWith("/profile"));
          
          return (
            <Link
              key={item.path}
              to={item.path}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "group relative flex flex-col items-center justify-center flex-1 h-full min-h-11 gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {isActive && (
                <span className="absolute top-0 h-0.5 w-8 rounded-full bg-primary" />
              )}
              <item.icon aria-hidden="true" className={cn("h-5 w-5 transition-transform", isActive && "scale-110")} />
              <span className="text-[10px] font-semibold tracking-wide">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileNav;
