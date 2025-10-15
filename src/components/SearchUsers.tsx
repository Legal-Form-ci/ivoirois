import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Search } from "lucide-react";

interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url?: string;
  bio?: string;
}

const SearchUsers = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    const timeoutId = setTimeout(() => {
      searchUsers();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  const searchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, bio")
        .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
        .limit(10);

      setResults(data || []);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Rechercher des personnes..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {results.length > 0 && (
        <Card className="absolute top-full mt-2 w-full max-h-96 overflow-y-auto z-50 shadow-lg">
          <div className="p-2 space-y-1">
            {results.map((profile) => (
              <div
                key={profile.id}
                className="flex items-center gap-3 p-3 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors"
                onClick={() => {
                  navigate(`/profile/${profile.id}`);
                  setQuery("");
                  setResults([]);
                }}
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={profile.avatar_url} />
                  <AvatarFallback>{profile.full_name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{profile.full_name}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    @{profile.username}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {loading && query.length >= 2 && (
        <Card className="absolute top-full mt-2 w-full p-4 z-50">
          <p className="text-center text-muted-foreground">Recherche en cours...</p>
        </Card>
      )}
    </div>
  );
};

export default SearchUsers;
