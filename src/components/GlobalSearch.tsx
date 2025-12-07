import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, User, FileText, Users, Building2, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url?: string;
  profession?: string;
}

interface Post {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: {
    full_name: string;
    avatar_url?: string;
  };
}

interface Group {
  id: string;
  name: string;
  description?: string;
  cover_image?: string;
  privacy: string;
}

interface Page {
  id: string;
  name: string;
  description?: string;
  profile_image?: string;
  category?: string;
}

const GlobalSearch = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [pages, setPages] = useState<Page[]>([]);

  const search = useCallback(async () => {
    if (query.trim().length < 2) {
      setProfiles([]);
      setPosts([]);
      setGroups([]);
      setPages([]);
      return;
    }

    setLoading(true);
    try {
      const [profilesRes, postsRes, groupsRes, pagesRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, username, full_name, avatar_url, profession")
          .or(`username.ilike.%${query}%,full_name.ilike.%${query}%,profession.ilike.%${query}%`)
          .limit(10),
        supabase
          .from("posts")
          .select(`id, content, created_at, user_id, profiles!posts_user_id_fkey(full_name, avatar_url)`)
          .ilike("content", `%${query}%`)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("groups")
          .select("id, name, description, cover_image, privacy")
          .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
          .limit(10),
        supabase
          .from("pages")
          .select("id, name, description, profile_image, category")
          .or(`name.ilike.%${query}%,description.ilike.%${query}%,category.ilike.%${query}%`)
          .limit(10),
      ]);

      setProfiles(profilesRes.data || []);
      setPosts(postsRes.data || []);
      setGroups(groupsRes.data || []);
      setPages(pagesRes.data || []);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      search();
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [search]);

  const handleNavigate = (path: string) => {
    setOpen(false);
    setQuery("");
    navigate(path);
  };

  const totalResults = profiles.length + posts.length + groups.length + pages.length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-start gap-2 text-muted-foreground">
          <Search className="h-4 w-4" />
          <span className="hidden sm:inline">Rechercher...</span>
          <kbd className="hidden sm:inline-flex pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground ml-auto">
            ⌘K
          </kbd>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] p-0 gap-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="sr-only">Recherche globale</DialogTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Rechercher des personnes, publications, groupes, pages..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 pr-10"
              autoFocus
            />
            {query && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setQuery("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="p-4 pt-2 overflow-y-auto max-h-[60vh]">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}

          {!loading && query.length >= 2 && totalResults === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Aucun résultat trouvé pour "{query}"
            </div>
          )}

          {!loading && totalResults > 0 && (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full grid grid-cols-5 mb-4">
                <TabsTrigger value="all">Tout ({totalResults})</TabsTrigger>
                <TabsTrigger value="users">
                  <User className="h-4 w-4 mr-1" />
                  {profiles.length}
                </TabsTrigger>
                <TabsTrigger value="posts">
                  <FileText className="h-4 w-4 mr-1" />
                  {posts.length}
                </TabsTrigger>
                <TabsTrigger value="groups">
                  <Users className="h-4 w-4 mr-1" />
                  {groups.length}
                </TabsTrigger>
                <TabsTrigger value="pages">
                  <Building2 className="h-4 w-4 mr-1" />
                  {pages.length}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-4 mt-0">
                {profiles.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground mb-2">Personnes</h3>
                    <div className="space-y-1">
                      {profiles.slice(0, 3).map((profile) => (
                        <div
                          key={profile.id}
                          className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors"
                          onClick={() => handleNavigate(`/profile/${profile.id}`)}
                        >
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={profile.avatar_url} />
                            <AvatarFallback>{profile.full_name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{profile.full_name}</p>
                            <p className="text-sm text-muted-foreground truncate">
                              @{profile.username} {profile.profession && `• ${profile.profession}`}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {posts.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground mb-2">Publications</h3>
                    <div className="space-y-1">
                      {posts.slice(0, 3).map((post) => (
                        <div
                          key={post.id}
                          className="flex items-start gap-3 p-2 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors"
                          onClick={() => handleNavigate(`/feed`)}
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={post.profiles?.avatar_url} />
                            <AvatarFallback>{post.profiles?.full_name?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{post.profiles?.full_name}</p>
                            <p className="text-sm text-muted-foreground line-clamp-2">{post.content.replace(/<[^>]*>/g, '')}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {groups.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground mb-2">Groupes</h3>
                    <div className="space-y-1">
                      {groups.slice(0, 3).map((group) => (
                        <div
                          key={group.id}
                          className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors"
                          onClick={() => handleNavigate(`/groups/${group.id}`)}
                        >
                          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                            <Users className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{group.name}</p>
                            <p className="text-sm text-muted-foreground truncate">
                              {group.privacy === 'public' ? 'Public' : 'Privé'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {pages.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground mb-2">Pages</h3>
                    <div className="space-y-1">
                      {pages.slice(0, 3).map((page) => (
                        <div
                          key={page.id}
                          className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors"
                          onClick={() => handleNavigate(`/pages`)}
                        >
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={page.profile_image} />
                            <AvatarFallback>{page.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{page.name}</p>
                            <p className="text-sm text-muted-foreground truncate">{page.category}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="users" className="space-y-1 mt-0">
                {profiles.map((profile) => (
                  <div
                    key={profile.id}
                    className="flex items-center gap-3 p-3 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors"
                    onClick={() => handleNavigate(`/profile/${profile.id}`)}
                  >
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={profile.avatar_url} />
                      <AvatarFallback>{profile.full_name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{profile.full_name}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        @{profile.username} {profile.profession && `• ${profile.profession}`}
                      </p>
                    </div>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="posts" className="space-y-1 mt-0">
                {posts.map((post) => (
                  <div
                    key={post.id}
                    className="flex items-start gap-3 p-3 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors"
                    onClick={() => handleNavigate(`/feed`)}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={post.profiles?.avatar_url} />
                      <AvatarFallback>{post.profiles?.full_name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{post.profiles?.full_name}</p>
                      <p className="text-sm text-muted-foreground line-clamp-3">{post.content.replace(/<[^>]*>/g, '')}</p>
                    </div>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="groups" className="space-y-1 mt-0">
                {groups.map((group) => (
                  <div
                    key={group.id}
                    className="flex items-center gap-3 p-3 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors"
                    onClick={() => handleNavigate(`/groups/${group.id}`)}
                  >
                    <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                      <Users className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{group.name}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {group.description || (group.privacy === 'public' ? 'Groupe public' : 'Groupe privé')}
                      </p>
                    </div>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="pages" className="space-y-1 mt-0">
                {pages.map((page) => (
                  <div
                    key={page.id}
                    className="flex items-center gap-3 p-3 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors"
                    onClick={() => handleNavigate(`/pages`)}
                  >
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={page.profile_image} />
                      <AvatarFallback>{page.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{page.name}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {page.category} {page.description && `• ${page.description}`}
                      </p>
                    </div>
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          )}

          {!loading && query.length < 2 && (
            <div className="text-center py-8 text-muted-foreground">
              Tapez au moins 2 caractères pour rechercher
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GlobalSearch;
