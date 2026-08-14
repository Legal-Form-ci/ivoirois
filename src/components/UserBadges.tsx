import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Award, Crown, Shield, Rocket, Sparkles, Briefcase, GraduationCap, Users, BadgeCheck } from "lucide-react";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  crown: Crown,
  shield: Shield,
  rocket: Rocket,
  sparkles: Sparkles,
  briefcase: Briefcase,
  "graduation-cap": GraduationCap,
  users: Users,
  "badge-check": BadgeCheck,
  award: Award,
};

export interface UserBadgeItem {
  id: string;
  badge_definitions: {
    code: string;
    name: string;
    description: string | null;
    icon: string;
    color: string;
    tier: string;
  } | null;
}

export const BadgePill = ({ badge, size = "sm" }: { badge: NonNullable<UserBadgeItem["badge_definitions"]>; size?: "sm" | "md" }) => {
  const Icon = ICONS[badge.icon] || Award;
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={`inline-flex items-center gap-1 rounded-full border border-border/60 bg-card font-medium ${
              size === "md" ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-xs"
            }`}
            style={{ color: badge.color, borderColor: `${badge.color}55` }}
          >
            <Icon className={size === "md" ? "h-4 w-4" : "h-3 w-3"} aria-hidden="true" />
            {badge.name}
          </span>
        </TooltipTrigger>
        <TooltipContent>{badge.description || badge.name}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

const UserBadges = ({ userId, size = "sm", limit = 4 }: { userId?: string; size?: "sm" | "md"; limit?: number }) => {
  const [badges, setBadges] = useState<UserBadgeItem[]>([]);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("user_badges")
        .select("id, badge_definitions(code, name, description, icon, color, tier)")
        .eq("user_id", userId)
        .is("revoked_at", null)
        .limit(limit);
      if (active) setBadges((data as unknown as UserBadgeItem[]) || []);
    })();
    return () => {
      active = false;
    };
  }, [userId, limit]);

  if (!badges.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {badges.map((b) => (b.badge_definitions ? <BadgePill key={b.id} badge={b.badge_definitions} size={size} /> : null))}
    </div>
  );
};

export default UserBadges;
