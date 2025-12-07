import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Home, Users, MessageCircle, Bell, User, Search, PlusCircle, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

const MobileNav = () => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const navItems = [
    { icon: Home, path: "/feed", label: "Accueil" },
    { icon: Search, path: "/search", label: "Rechercher" },
    { icon: PlusCircle, path: "/create", label: "Créer" },
    { icon: MessageCircle, path: "/messages", label: "Messages" },
    { icon: User, path: `/profile/${user.id}`, label: "Profil" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t md:hidden safe-area-pb">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || 
            (item.path.startsWith("/profile") && location.pathname.startsWith("/profile"));
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive && "fill-current")} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileNav;
