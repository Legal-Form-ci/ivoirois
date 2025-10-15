import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";

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

  const uploadStory = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user!.id}/${Date.now()}.${fileExt}`;
      const mediaType = file.type.startsWith("video") ? "video" : "image";

      const { error: uploadError } = await supabase.storage
        .from("stories")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("stories")
        .getPublicUrl(fileName);

      await supabase.from("stories" as any).insert({
        user_id: user!.id,
        media_url: publicUrl,
        media_type: mediaType,
      });

      toast.success("Story publiée !");
    } catch (error) {
      toast.error("Erreur lors de la publication");
    } finally {
      setUploading(false);
    }
  };

  const viewStory = async (story: Story) => {
    setSelectedStory(story);
    
    await supabase.from("story_views" as any).insert({
      story_id: story.id,
      viewer_id: user!.id,
    });
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 mb-6">
      <div className="flex flex-col items-center gap-2 min-w-[80px]">
        <div className="relative">
          <Avatar className="h-16 w-16 border-2 border-primary cursor-pointer">
            <AvatarImage src={user?.user_metadata?.avatar_url} />
            <AvatarFallback>Vous</AvatarFallback>
          </Avatar>
          <label
            htmlFor="story-upload"
            className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-1 cursor-pointer hover:opacity-80"
          >
            <Plus className="h-4 w-4" />
          </label>
          <input
            id="story-upload"
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={uploadStory}
            disabled={uploading}
          />
        </div>
        <span className="text-xs text-center">Votre story</span>
      </div>

      {stories.map((story) => (
        <div
          key={story.id}
          className="flex flex-col items-center gap-2 min-w-[80px] cursor-pointer"
          onClick={() => viewStory(story)}
        >
          <Avatar className="h-16 w-16 border-2 border-primary ring-2 ring-primary/20">
            <AvatarImage src={story.profiles.avatar_url} />
            <AvatarFallback>{story.profiles.full_name.charAt(0)}</AvatarFallback>
          </Avatar>
          <span className="text-xs text-center truncate max-w-[80px]">
            {story.profiles.full_name}
          </span>
        </div>
      ))}

      <Dialog open={!!selectedStory} onOpenChange={() => setSelectedStory(null)}>
        <DialogContent className="max-w-md p-0 bg-black">
          {selectedStory && (
            <div className="relative">
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
                  <AvatarImage src={selectedStory.profiles.avatar_url} />
                  <AvatarFallback className="bg-white text-black">
                    {selectedStory.profiles.full_name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-white font-semibold">
                    {selectedStory.profiles.full_name}
                  </p>
                  <p className="text-white/80 text-xs">
                    {new Date(selectedStory.created_at).toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
              {selectedStory.media_type === "video" ? (
                <video
                  src={selectedStory.media_url}
                  className="w-full h-auto max-h-[80vh]"
                  controls
                  autoPlay
                />
              ) : (
                <img
                  src={selectedStory.media_url}
                  alt="Story"
                  className="w-full h-auto max-h-[80vh] object-contain"
                />
              )}
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
