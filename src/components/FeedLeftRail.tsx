import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Home, Users, MessageCircle, Briefcase, ShoppingBag, GraduationCap, Radio, Film, UsersRound, Bookmark, CalendarDays, FolderKanban } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const items = [
  { icon: Home, label: "Accueil", to: "/feed" },
  { icon: Film, label: "Reels", to: "/reels" },
  { icon: Radio, label: "Live", to: "/live" },
  { icon: Briefcase, label: "Emplois", to: "/jobs" },
  { icon: ShoppingBag, label: "Marketplace", to: "/marketplace" },
  { icon: GraduationCap, label: "Formations", to: "/learning" },
  { icon: Users, label: "Amis", to: "/friends" },
  { icon: MessageCircle, label: "Messages", to: "/messages" },
  { icon: UsersRound, label: "Groupes", to: "/groups" },
  { icon: CalendarDays, label: "Événements", to: "/events" },
  { icon: FolderKanban, label: "Projets", to: "/projects" },
  { icon: Bookmark, label: "Enregistrés", to: "/saved" },
];

const FeedLeftRail = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<{ full_name?: string; avatar_url?: string; username?: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("full_name, avatar_url, username").eq("id", user.id).maybeSingle().then(({ data }) => setProfile(data));
  }, [user?.id]);

  if (!user) return null;
  const initials = (profile?.full_name || profile?.username || "E").slice(0, 2).toUpperCase();

  return (
    <aside className="hidden lg:block sticky top-20 self-start w-64 shrink-0">
      <div className="surface-card overflow-hidden">
        <Link to={`/profile/${user.id}`} className="block bg-gradient-brand h-16" />
        <div className="px-4 pb-4 -mt-8">
          <Link to={`/profile/${user.id}`}>
            <Avatar className="h-16 w-16 border-4 border-card shadow-premium">
              <AvatarImage src={profile?.avatar_url} />
              <AvatarFallback className="bg-primary/10 text-primary font-bold">{initials}</AvatarFallback>
            </Avatar>
          </Link>
          <Link to={`/profile/${user.id}`} className="block mt-2 font-display font-bold text-sm hover:text-primary transition-colors truncate">
            {profile?.full_name || "Mon profil"}
          </Link>
          {profile?.username && <p className="text-xs text-muted-foreground truncate">@{profile.username}</p>}
        </div>
      </div>

      <nav className="mt-4 surface-card p-2 space-y-0.5">
        {items.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-primary/10 transition-colors"
          >
            <item.icon className="h-4 w-4 text-primary" />
            {item.label}
          </Link>
        ))}
      </nav>

      <p className="text-[10px] text-muted-foreground text-center mt-4 font-medium tracking-wide">
        E'nvlé Space · Notre peuple. Notre espace.
      </p>
    </aside>
  );
};

export default FeedLeftRail;