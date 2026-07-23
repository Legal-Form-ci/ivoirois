import SuggestedUsers from "./SuggestedUsers";
import { Link } from "react-router-dom";
import { Sparkles, TrendingUp, Radio, GraduationCap } from "lucide-react";

const shortcuts = [
  { icon: Radio, label: "Lives en direct", to: "/live", tone: "text-red-500" },
  { icon: TrendingUp, label: "Tendances", to: "/search", tone: "text-primary" },
  { icon: GraduationCap, label: "Nouvelles formations", to: "/learning", tone: "text-primary" },
  { icon: Sparkles, label: "Assistant IA", to: "#", tone: "text-primary" },
];

const FeedRightRail = () => {
  return (
    <aside className="hidden xl:block sticky top-20 self-start w-80 shrink-0 space-y-4">
      <div className="surface-card p-4">
        <h3 className="font-display font-bold text-sm mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Découvrir
        </h3>
        <div className="space-y-1">
          {shortcuts.map((s) => (
            <Link key={s.label} to={s.to} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-primary/10 transition-colors">
              <s.icon className={`h-4 w-4 ${s.tone}`} />
              <span className="font-medium">{s.label}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="surface-card p-4">
        <SuggestedUsers />
      </div>

      <div className="text-[10px] text-muted-foreground/70 space-x-2 px-2">
        <Link to="/about" className="hover:text-foreground">À propos</Link>
        <span>·</span>
        <Link to="/privacy" className="hover:text-foreground">Confidentialité</Link>
        <span>·</span>
        <Link to="/terms" className="hover:text-foreground">Conditions</Link>
        <span>·</span>
        <span>© {new Date().getFullYear()} E'nvlé Space</span>
      </div>
    </aside>
  );
};

export default FeedRightRail;