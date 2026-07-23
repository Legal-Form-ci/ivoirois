import { Home, Users, Bell, MessageCircle, User, LogOut, UsersRound, Menu, Settings, Briefcase, UserCircle, Building2, FileText, Shield, Radio, Film, ShoppingBag, CalendarDays, Globe, FolderKanban, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import appLogo from "@/assets/app-logo.png";
import NotificationBell from "./NotificationBell";
import GlobalSearch from "./GlobalSearch";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const Header = () => {
  const { user, signOut } = useAuth();
  const { pathname } = useLocation();
  const navBtn = (to: string) =>
    cn(
      "relative transition-colors",
      pathname === to || pathname.startsWith(to + "/")
        ? "text-primary bg-primary/10 hover:bg-primary/15"
        : "text-foreground/70 hover:text-foreground"
    );

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/85 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:bg-primary focus:text-primary-foreground focus:px-3 focus:py-2 focus:rounded-md focus:shadow-lg">
        Aller au contenu principal
      </a>
      <div className="mx-auto flex h-14 md:h-16 max-w-screen-2xl items-center justify-between gap-3 px-3 sm:px-6">
        <Link to="/feed" aria-label="E'nvlé Space — Accueil" className="flex items-center gap-1.5 sm:gap-2 shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <img src={appLogo} alt="E'nvlé Space" className="h-10 w-10 md:h-12 md:w-12 object-contain drop-shadow-sm" />
          <span className="font-display text-base md:text-xl font-extrabold text-primary hidden sm:inline tracking-tight">
            E'nvlé Space
          </span>
        </Link>

        {user && (
          <>
            <div className="hidden md:flex flex-1 max-w-xl mx-2 lg:mx-4">
              <GlobalSearch />
            </div>
            <nav className="hidden md:flex items-center gap-1" aria-label="Navigation principale">
              <Button variant="ghost" size="icon" asChild className={navBtn("/feed")}>
                <Link to="/feed" aria-label="Accueil"><Home className="h-5 w-5" aria-hidden="true" /></Link>
              </Button>
              <Button variant="ghost" size="icon" asChild className={navBtn("/reels")}>
                <Link to="/reels" aria-label="Reels"><Film className="h-5 w-5" aria-hidden="true" /></Link>
              </Button>
              <Button variant="ghost" size="icon" asChild className={navBtn("/live")}>
                <Link to="/live" aria-label="Lives"><Radio className="h-5 w-5" aria-hidden="true" /></Link>
              </Button>
              <Button variant="ghost" size="icon" asChild className={navBtn("/jobs")}>
                <Link to="/jobs" aria-label="Emplois"><Briefcase className="h-5 w-5" aria-hidden="true" /></Link>
              </Button>
              <Button variant="ghost" size="icon" asChild className={navBtn("/marketplace")}>
                <Link to="/marketplace" aria-label="Marketplace"><ShoppingBag className="h-5 w-5" aria-hidden="true" /></Link>
              </Button>
              <Button variant="ghost" size="icon" asChild className={navBtn("/learning")}>
                <Link to="/learning" aria-label="Formations"><GraduationCap className="h-5 w-5" aria-hidden="true" /></Link>
              </Button>
              <Button variant="ghost" size="icon" asChild className={navBtn("/friends")}>
                <Link to="/friends" aria-label="Amis"><Users className="h-5 w-5" aria-hidden="true" /></Link>
              </Button>
              <Button variant="ghost" size="icon" asChild className={navBtn("/messages")}>
                <Link to="/messages" aria-label="Messages"><MessageCircle className="h-5 w-5" aria-hidden="true" /></Link>
              </Button>
              <Button variant="ghost" size="icon" asChild className={navBtn("/groups")}>
                <Link to="/groups" aria-label="Groupes"><UsersRound className="h-5 w-5" aria-hidden="true" /></Link>
              </Button>
              <NotificationBell />
              <Button variant="ghost" size="icon" asChild className={navBtn(`/profile/${user.id}`)}>
                <Link to={`/profile/${user.id}`} aria-label="Mon profil"><User className="h-5 w-5" aria-hidden="true" /></Link>
              </Button>
            </nav>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="hidden md:flex" onClick={signOut} aria-label="Se déconnecter">
                <LogOut aria-hidden="true" />
              </Button>
              
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden" aria-label="Ouvrir le menu">
                    <Menu aria-hidden="true" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[280px] overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle className="text-left">Menu</SheetTitle>
                  </SheetHeader>
                  <nav className="flex flex-col gap-1 mt-6">
                    <Button variant="ghost" className="justify-start gap-3" asChild>
                      <Link to="/feed"><Home className="h-5 w-5" /><span>Accueil</span></Link>
                    </Button>
                    <Button variant="ghost" className="justify-start gap-3" asChild>
                      <Link to={`/profile/${user.id}`}><UserCircle className="h-5 w-5" /><span>Mon Profil</span></Link>
                    </Button>
                    <Button variant="ghost" className="justify-start gap-3" asChild>
                      <Link to="/reels"><Film className="h-5 w-5" /><span>Reels</span></Link>
                    </Button>
                    <Button variant="ghost" className="justify-start gap-3" asChild>
                      <Link to="/live"><Radio className="h-5 w-5" /><span>Live</span></Link>
                    </Button>
                    <Button variant="ghost" className="justify-start gap-3" asChild>
                      <Link to="/jobs"><Briefcase className="h-5 w-5" /><span>Emplois</span></Link>
                    </Button>
                    <Button variant="ghost" className="justify-start gap-3" asChild>
                      <Link to="/companies"><Building2 className="h-5 w-5" /><span>Entreprises</span></Link>
                    </Button>
                    <Button variant="ghost" className="justify-start gap-3" asChild>
                      <Link to="/marketplace"><ShoppingBag className="h-5 w-5" /><span>Marketplace</span></Link>
                    </Button>
                    <Button variant="ghost" className="justify-start gap-3" asChild>
                      <Link to="/events"><CalendarDays className="h-5 w-5" /><span>Événements</span></Link>
                    </Button>
                    <Button variant="ghost" className="justify-start gap-3" asChild>
                      <Link to="/learning"><GraduationCap className="h-5 w-5" /><span>Formations</span></Link>
                    </Button>
                    <Button variant="ghost" className="justify-start gap-3" asChild>
                      <Link to="/resume"><FileText className="h-5 w-5" /><span>Mon CV</span></Link>
                    </Button>
                    <Button variant="ghost" className="justify-start gap-3" asChild>
                      <Link to="/pages"><Globe className="h-5 w-5" /><span>Pages</span></Link>
                    </Button>
                    <Button variant="ghost" className="justify-start gap-3" asChild>
                      <Link to="/projects"><FolderKanban className="h-5 w-5" /><span>Projets</span></Link>
                    </Button>
                    <Button variant="ghost" className="justify-start gap-3" asChild>
                      <Link to="/friends"><Users className="h-5 w-5" /><span>Amis</span></Link>
                    </Button>
                    <Button variant="ghost" className="justify-start gap-3" asChild>
                      <Link to="/messages"><MessageCircle className="h-5 w-5" /><span>Messages</span></Link>
                    </Button>
                    <Button variant="ghost" className="justify-start gap-3" asChild>
                      <Link to="/groups"><UsersRound className="h-5 w-5" /><span>Groupes</span></Link>
                    </Button>
                    <Button variant="ghost" className="justify-start gap-3" asChild>
                      <Link to="/notifications"><Bell className="h-5 w-5" /><span>Notifications</span></Link>
                    </Button>
                    <Button variant="ghost" className="justify-start gap-3" asChild>
                      <Link to="/settings"><Settings className="h-5 w-5" /><span>Paramètres</span></Link>
                    </Button>
                    <Button variant="ghost" className="justify-start gap-3" asChild>
                      <Link to="/admin"><Shield className="h-5 w-5" /><span>Admin</span></Link>
                    </Button>
                    <div className="border-t my-4" />
                    <Button variant="destructive" className="justify-start gap-3" onClick={signOut}>
                      <LogOut className="h-5 w-5" /><span>Déconnexion</span>
                    </Button>
                  </nav>
                </SheetContent>
              </Sheet>
            </div>
          </>
        )}
      </div>
    </header>
  );
};

export default Header;
