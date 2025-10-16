import { Home, Users, Bell, MessageCircle, User, LogOut, UsersRound, Menu, Settings, Briefcase, UserCircle, Building2, FileText, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import appLogo from "@/assets/app-logo.png";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const Header = () => {
  const { user, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 shadow-[var(--shadow-card)]">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/feed" className="flex items-center gap-2">
          <img src={appLogo} alt="Ivoi'Rois" className="h-10 w-10 rounded-lg" />
          <span className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Ivoi'Rois
          </span>
        </Link>

        {user && (
          <>
            <nav className="hidden md:flex items-center gap-2">
              <Button variant="ghost" size="icon" asChild>
                <Link to="/feed">
                  <Home />
                </Link>
              </Button>
              <Button variant="ghost" size="icon" asChild>
                <Link to="/jobs">
                  <Briefcase />
                </Link>
              </Button>
              <Button variant="ghost" size="icon" asChild>
                <Link to="/companies">
                  <Building2 />
                </Link>
              </Button>
              <Button variant="ghost" size="icon" asChild>
                <Link to="/friends">
                  <Users />
                </Link>
              </Button>
              <Button variant="ghost" size="icon" asChild>
                <Link to="/messages">
                  <MessageCircle />
                </Link>
              </Button>
              <Button variant="ghost" size="icon" asChild>
                <Link to="/groups">
                  <UsersRound />
                </Link>
              </Button>
              <Button variant="ghost" size="icon" asChild>
                <Link to="/notifications">
                  <Bell />
                </Link>
              </Button>
              <Button variant="ghost" size="icon" asChild>
                <Link to={`/profile/${user.id}`}>
                  <User />
                </Link>
              </Button>
            </nav>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="hidden md:flex" onClick={signOut}>
                <LogOut />
              </Button>
              
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[280px]">
                  <SheetHeader>
                    <SheetTitle className="text-left">Menu</SheetTitle>
                  </SheetHeader>
                  <nav className="flex flex-col gap-2 mt-6">
                    <Button variant="ghost" className="justify-start gap-3" asChild>
                      <Link to="/feed">
                        <Home className="h-5 w-5" />
                        <span>Accueil</span>
                      </Link>
                    </Button>
                    <Button variant="ghost" className="justify-start gap-3" asChild>
                      <Link to={`/profile/${user.id}`}>
                        <UserCircle className="h-5 w-5" />
                        <span>Mon Profil</span>
                      </Link>
                    </Button>
                    <Button variant="ghost" className="justify-start gap-3" asChild>
                      <Link to="/jobs">
                        <Briefcase className="h-5 w-5" />
                        <span>Emplois</span>
                      </Link>
                    </Button>
                    <Button variant="ghost" className="justify-start gap-3" asChild>
                      <Link to="/companies">
                        <Building2 className="h-5 w-5" />
                        <span>Entreprises</span>
                      </Link>
                    </Button>
                    <Button variant="ghost" className="justify-start gap-3" asChild>
                      <Link to="/resume">
                        <FileText className="h-5 w-5" />
                        <span>Mon CV</span>
                      </Link>
                    </Button>
                    <Button variant="ghost" className="justify-start gap-3" asChild>
                      <Link to="/friends">
                        <Users className="h-5 w-5" />
                        <span>Amis</span>
                      </Link>
                    </Button>
                    <Button variant="ghost" className="justify-start gap-3" asChild>
                      <Link to="/messages">
                        <MessageCircle className="h-5 w-5" />
                        <span>Messages</span>
                      </Link>
                    </Button>
                    <Button variant="ghost" className="justify-start gap-3" asChild>
                      <Link to="/groups">
                        <UsersRound className="h-5 w-5" />
                        <span>Groupes</span>
                      </Link>
                    </Button>
                    <Button variant="ghost" className="justify-start gap-3" asChild>
                      <Link to="/notifications">
                        <Bell className="h-5 w-5" />
                        <span>Notifications</span>
                      </Link>
                    </Button>
                    <Button variant="ghost" className="justify-start gap-3" asChild>
                      <Link to="/settings">
                        <Settings className="h-5 w-5" />
                        <span>Paramètres</span>
                      </Link>
                    </Button>
                    <Button variant="ghost" className="justify-start gap-3" asChild>
                      <Link to="/admin">
                        <Shield className="h-5 w-5" />
                        <span>Admin</span>
                      </Link>
                    </Button>
                    <div className="border-t my-4" />
                    <Button variant="destructive" className="justify-start gap-3" onClick={signOut}>
                      <LogOut className="h-5 w-5" />
                      <span>Déconnexion</span>
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
