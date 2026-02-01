import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Plus, X, Music, Image, Video } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Story {
  id: string;
  user_id: string;
  media_url: string;
  media_type: string;
  content: string;
  created_at: string;
  profiles: {
    full_name: string;
    avatar_url: string;
  };
}

const Stories = () => {
  const { user } = useAuth();
  const [stories, setStories] = useState<Story[]>([]);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchStories();
      
      const channel = supabase
        .channel("stories-changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "stories",
          },
          () => {
            fetchStories();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchStories = async () => {
    const { data } = await supabase
      .from("stories" as any)
      .select("*, profiles(full_name, avatar_url)")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (data) {
      const grouped = data.reduce((acc: Story[], story: any) => {
        const existing = acc.find((s) => s.user_id === story.user_id);
        if (!existing) acc.push(story);
        return acc;
      }, []);
      setStories(grouped as Story[]);
    }
  };

  const uploadStory = async (event: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video' | 'audio') => {
    const file = event.target.files?.[0];
    
    console.log('[Stories] uploadStory called');
    console.log('[Stories] File:', file);
    console.log('[Stories] User:', user);
    console.log('[Stories] Type:', type);
    
    if (!file) {
      console.error('[Stories] No file selected');
      return;
    }
    
    if (!user) {
      console.error('[Stories] No user found - cannot upload story');
      toast.error('Vous devez être connecté pour publier une story');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      let mediaType = type;
      if (file.type.startsWith("video")) mediaType = "video";
      else if (file.type.startsWith("audio")) mediaType = "audio";
      else if (file.type.startsWith("image")) mediaType = "image";

      console.log('[Stories] Uploading file:', fileName, 'Type:', mediaType);

      const { error: uploadError } = await supabase.storage
        .from("stories")
        .upload(fileName, file);

      if (uploadError) {
        console.error('[Stories] Storage upload error:', uploadError);
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("stories")
        .getPublicUrl(fileName);

      console.log('[Stories] File uploaded, public URL:', publicUrl);
      console.log('[Stories] Inserting story into database...');

      const { error: insertError } = await supabase.from("stories").insert({
        user_id: user.id,
        media_url: publicUrl,
        media_type: mediaType,
      });

      if (insertError) {
        console.error('[Stories] Database insert error:', insertError);
        throw insertError;
      }

      console.log('[Stories] Story published successfully!');
      toast.success("Story publiée !");
      fetchStories();
    } catch (error: any) {
      console.error('[Stories] Error:', error);
      toast.error(`Erreur lors de la publication: ${error.message || 'Erreur inconnue'}`);
    } finally {
      setUploading(false);
    }
  };

  const viewStory = async (story: Story) => {
    setSelectedStory(story);
    
    if (user) {
      await supabase.from("story_views" as any).upsert({
        story_id: story.id,
        viewer_id: user.id,
      }, { onConflict: 'story_id,viewer_id' });
    }
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 mb-6 scrollbar-hide">
      <div className="flex flex-col items-center gap-2 min-w-[80px] flex-shrink-0">
        <div className="relative">
          <Avatar className="h-16 w-16 border-2 border-primary cursor-pointer">
            <AvatarImage src={user?.user_metadata?.avatar_url} />
            <AvatarFallback>Vous</AvatarFallback>
          </Avatar>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-1 cursor-pointer hover:opacity-80 disabled:opacity-50"
                disabled={uploading}
              >
                <Plus className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem asChild>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Image className="h-4 w-4" />
                  Photo
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => uploadStory(e, 'image')}
                    disabled={uploading}
                  />
                </label>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Video className="h-4 w-4" />
                  Vidéo
                  <input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => uploadStory(e, 'video')}
                    disabled={uploading}
                  />
                </label>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Music className="h-4 w-4" />
                  Audio
                  <input
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={(e) => uploadStory(e, 'audio')}
                    disabled={uploading}
                  />
                </label>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <span className="text-xs text-center">
          {uploading ? "Envoi..." : "Votre story"}
        </span>
      </div>

      {stories.map((story) => (
        <div
          key={story.id}
          className="flex flex-col items-center gap-2 min-w-[80px] flex-shrink-0 cursor-pointer"
          onClick={() => viewStory(story)}
        >
          <Avatar className="h-16 w-16 border-2 border-primary ring-2 ring-primary/20">
            <AvatarImage src={story.profiles?.avatar_url} />
            <AvatarFallback>{story.profiles?.full_name?.charAt(0) || "?"}</AvatarFallback>
          </Avatar>
          <span className="text-xs text-center truncate max-w-[80px]">
            {story.profiles?.full_name || "Utilisateur"}
          </span>
        </div>
      ))}

      <Dialog open={!!selectedStory} onOpenChange={() => setSelectedStory(null)}>
        <DialogContent className="max-w-md p-0 bg-black overflow-hidden">
          {selectedStory && (
            <div className="relative min-h-[400px] flex flex-col">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 z-10 text-white hover:bg-white/20"
                onClick={() => setSelectedStory(null)}
              >
                <X className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3 absolute top-4 left-4 z-10">
                <Avatar className="h-10 w-10 border-2 border-white">
                  <AvatarImage src={selectedStory.profiles?.avatar_url} />
                  <AvatarFallback className="bg-white text-black">
                    {selectedStory.profiles?.full_name?.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-white font-semibold">
                    {selectedStory.profiles?.full_name || "Utilisateur"}
                  </p>
                  <p className="text-white/80 text-xs">
                    {new Date(selectedStory.created_at).toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
              
              <div className="flex-1 flex items-center justify-center pt-16 pb-4">
                {selectedStory.media_type === "video" ? (
                  <video
                    src={selectedStory.media_url}
                    className="w-full max-h-[70vh] object-contain"
                    controls
                    autoPlay
                  />
                ) : selectedStory.media_type === "audio" ? (
                  <div className="flex flex-col items-center gap-4 p-8">
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center animate-pulse">
                      <Music className="h-16 w-16 text-white" />
                    </div>
                    <audio
                      src={selectedStory.media_url}
                      className="w-full max-w-xs"
                      controls
                      autoPlay
                    />
                  </div>
                ) : (
                  <img
                    src={selectedStory.media_url}
                    alt="Story"
                    className="w-full max-h-[70vh] object-contain"
                  />
                )}
              </div>
              
              {selectedStory.content && (
                <p className="absolute bottom-4 left-4 right-4 text-white text-center bg-black/50 p-2 rounded">
                  {selectedStory.content}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Stories;
