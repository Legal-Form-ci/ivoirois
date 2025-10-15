import { Home, Users, Bell, MessageCircle, User, LogOut, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import appLogo from "@/assets/app-logo.png";

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
              <Button variant="ghost" size="icon" onClick={signOut}>
                <LogOut />
              </Button>
            </div>
          </>
        )}
      </div>
    </header>
  );
};

export default Header;
