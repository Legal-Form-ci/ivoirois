import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Search as SearchIcon, 
  User, 
  FileText, 
  Users, 
  Building2, 
  Loader2,
  X,
  TrendingUp,
  Clock,
  Hash
} from "lucide-react";

interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url?: string;
  profession?: string;
  region?: string;
}

interface Post {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  image_url?: string;
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
  group_members: { count: number }[];
}

interface Page {
  id: string;
  name: string;
  description?: string;
  profile_image?: string;
  category?: string;
  page_followers: { count: number }[];
}

const Search = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [trendingTopics] = useState([
    "Abidjan", "Technologie", "Emploi", "Innovation", "Entrepreneuriat"
  ]);

  useEffect(() => {
    // Load recent searches from localStorage
    const saved = localStorage.getItem("recentSearches");
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

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
          .select("id, username, full_name, avatar_url, profession, region")
          .or(`username.ilike.%${query}%,full_name.ilike.%${query}%,profession.ilike.%${query}%`)
          .limit(20),
        supabase
          .from("posts")
          .select(`id, content, created_at, user_id, image_url, profiles!posts_user_id_fkey(full_name, avatar_url)`)
          .ilike("content", `%${query}%`)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("groups")
          .select("id, name, description, cover_image, privacy, group_members(count)")
          .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
          .limit(20),
        supabase
          .from("pages")
          .select("id, name, description, profile_image, category, page_followers(count)")
          .or(`name.ilike.%${query}%,description.ilike.%${query}%,category.ilike.%${query}%`)
          .limit(20),
      ]);

      setProfiles(profilesRes.data || []);
      setPosts(postsRes.data || []);
      setGroups(groupsRes.data || []);
      setPages(pagesRes.data || []);

      // Save to recent searches
      if (query.trim()) {
        const newRecent = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
        setRecentSearches(newRecent);
        localStorage.setItem("recentSearches", JSON.stringify(newRecent));
      }
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

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem("recentSearches");
  };

  const totalResults = profiles.length + posts.length + groups.length + pages.length;
  const hasSearched = query.length >= 2;

  return (
    <div className="min-h-screen bg-muted/30 pb-20 md:pb-6">
      <Header />
      <main className="container py-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Search Input */}
          <div className="relative">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Rechercher des personnes, publications, groupes, pages..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-12 pr-12 h-14 text-lg rounded-full"
              autoFocus
            />
            {query && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2"
                onClick={() => setQuery("")}
              >
                <X className="h-5 w-5" />
              </Button>
            )}
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {/* No Results */}
          {!loading && hasSearched && totalResults === 0 && (
            <Card className="p-8 text-center">
              <SearchIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-lg font-medium">Aucun résultat trouvé</p>
              <p className="text-muted-foreground">
                Essayez d'autres mots-clés ou vérifiez l'orthographe
              </p>
            </Card>
          )}

          {/* Search Results */}
          {!loading && hasSearched && totalResults > 0 && (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full grid grid-cols-5 h-12">
                <TabsTrigger value="all" className="text-sm">
                  Tout ({totalResults})
                </TabsTrigger>
                <TabsTrigger value="users" className="text-sm">
                  <User className="h-4 w-4 mr-1" />
                  {profiles.length}
                </TabsTrigger>
                <TabsTrigger value="posts" className="text-sm">
                  <FileText className="h-4 w-4 mr-1" />
                  {posts.length}
                </TabsTrigger>
                <TabsTrigger value="groups" className="text-sm">
                  <Users className="h-4 w-4 mr-1" />
                  {groups.length}
                </TabsTrigger>
                <TabsTrigger value="pages" className="text-sm">
                  <Building2 className="h-4 w-4 mr-1" />
                  {pages.length}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-6 mt-6">
                {/* Users Section */}
                {profiles.length > 0 && (
                  <section>
                    <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                      <User className="h-5 w-5 text-primary" />
                      Personnes
                    </h3>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {profiles.slice(0, 4).map((profile) => (
                        <Card
                          key={profile.id}
                          className="cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => navigate(`/profile/${profile.id}`)}
                        >
                          <CardContent className="p-4 flex items-center gap-3">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={profile.avatar_url} />
                              <AvatarFallback>{profile.full_name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold truncate">{profile.full_name}</p>
                              <p className="text-sm text-muted-foreground truncate">
                                @{profile.username}
                              </p>
                              {profile.profession && (
                                <p className="text-xs text-primary truncate">{profile.profession}</p>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    {profiles.length > 4 && (
                      <Button
                        variant="ghost"
                        className="w-full mt-2"
                        onClick={() => setActiveTab("users")}
                      >
                        Voir tous ({profiles.length})
                      </Button>
                    )}
                  </section>
                )}

                {/* Groups Section */}
                {groups.length > 0 && (
                  <section>
                    <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      Groupes
                    </h3>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {groups.slice(0, 4).map((group) => (
                        <Card
                          key={group.id}
                          className="cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => navigate(`/groups/${group.id}`)}
                        >
                          <CardContent className="p-4 flex items-center gap-3">
                            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Users className="h-6 w-6 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold truncate">{group.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {group.group_members?.[0]?.count || 0} membres • {group.privacy === 'public' ? 'Public' : 'Privé'}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </section>
                )}

                {/* Pages Section */}
                {pages.length > 0 && (
                  <section>
                    <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      Pages
                    </h3>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {pages.slice(0, 4).map((page) => (
                        <Card
                          key={page.id}
                          className="cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => navigate(`/pages`)}
                        >
                          <CardContent className="p-4 flex items-center gap-3">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={page.profile_image} />
                              <AvatarFallback>{page.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold truncate">{page.name}</p>
                              <p className="text-sm text-muted-foreground truncate">
                                {page.category}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {page.page_followers?.[0]?.count || 0} abonnés
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </section>
                )}
              </TabsContent>

              <TabsContent value="users" className="space-y-3 mt-6">
                {profiles.map((profile) => (
                  <Card
                    key={profile.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => navigate(`/profile/${profile.id}`)}
                  >
                    <CardContent className="p-4 flex items-center gap-4">
                      <Avatar className="h-14 w-14">
                        <AvatarImage src={profile.avatar_url} />
                        <AvatarFallback className="text-lg">{profile.full_name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-lg truncate">{profile.full_name}</p>
                        <p className="text-muted-foreground truncate">@{profile.username}</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {profile.profession && (
                            <Badge variant="secondary">{profile.profession}</Badge>
                          )}
                          {profile.region && (
                            <Badge variant="outline">{profile.region}</Badge>
                          )}
                        </div>
                      </div>
                      <Button>Voir le profil</Button>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="posts" className="space-y-3 mt-6">
                {posts.map((post) => (
                  <Card key={post.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={post.profiles?.avatar_url} />
                          <AvatarFallback>{post.profiles?.full_name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-semibold">{post.profiles?.full_name}</p>
                          <p className="text-muted-foreground line-clamp-3 mt-1">
                            {post.content.replace(/<[^>]*>/g, '')}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="groups" className="space-y-3 mt-6">
                {groups.map((group) => (
                  <Card
                    key={group.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => navigate(`/groups/${group.id}`)}
                  >
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Users className="h-8 w-8 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-lg">{group.name}</p>
                        {group.description && (
                          <p className="text-muted-foreground line-clamp-2">{group.description}</p>
                        )}
                        <p className="text-sm text-muted-foreground mt-1">
                          {group.group_members?.[0]?.count || 0} membres
                        </p>
                      </div>
                      <Badge variant={group.privacy === 'public' ? 'secondary' : 'outline'}>
                        {group.privacy === 'public' ? 'Public' : 'Privé'}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="pages" className="space-y-3 mt-6">
                {pages.map((page) => (
                  <Card
                    key={page.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => navigate(`/pages`)}
                  >
                    <CardContent className="p-4 flex items-center gap-4">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={page.profile_image} />
                        <AvatarFallback className="text-xl">{page.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-bold text-lg">{page.name}</p>
                        {page.category && (
                          <Badge variant="secondary" className="mb-1">{page.category}</Badge>
                        )}
                        {page.description && (
                          <p className="text-muted-foreground line-clamp-2">{page.description}</p>
                        )}
                        <p className="text-sm text-muted-foreground mt-1">
                          {page.page_followers?.[0]?.count || 0} abonnés
                        </p>
                      </div>
                      <Button>Suivre</Button>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            </Tabs>
          )}

          {/* Initial State - Trending & Recent */}
          {!loading && !hasSearched && (
            <div className="space-y-6">
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between py-4">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Recherches récentes
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={clearRecentSearches}>
                      Effacer
                    </Button>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex flex-wrap gap-2">
                      {recentSearches.map((term, idx) => (
                        <Button
                          key={idx}
                          variant="outline"
                          size="sm"
                          className="rounded-full"
                          onClick={() => setQuery(term)}
                        >
                          {term}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Trending Topics */}
              <Card>
                <CardHeader className="py-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Tendances
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-2">
                    {trendingTopics.map((topic, idx) => (
                      <Button
                        key={idx}
                        variant="secondary"
                        size="sm"
                        className="rounded-full"
                        onClick={() => setQuery(topic)}
                      >
                        <Hash className="h-3 w-3 mr-1" />
                        {topic}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Search;
