import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Plus, X, Music, Image, Video, ChevronLeft, ChevronRight, Heart, Send, Wand2, Loader2, Camera, Eye } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

const STORY_DURATION = 6000;

const Stories = () => {
  const { user } = useAuth();
  const [stories, setStories] = useState<Story[]>([]);
  const [allUserStories, setAllUserStories] = useState<Story[]>([]);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [caption, setCaption] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [reactionText, setReactionText] = useState("");
  const [viewCount, setViewCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const progressRef = useRef<ReturnType<typeof setInterval>>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      fetchStories();
      const channel = supabase
        .channel("stories-changes")
        .on("postgres_changes", { event: "*", schema: "public", table: "stories" }, () => fetchStories())
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [user]);

  const fetchStories = async () => {
    try {
      const { data, error } = await supabase
        .from("stories")
        .select("*, profiles(full_name, avatar_url)")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });

      if (error) { console.error("[Stories] Fetch error:", error); return; }
      if (data) {
        setAllUserStories(data as Story[]);
        const grouped = data.reduce((acc: Story[], story: any) => {
          if (!acc.find((s) => s.user_id === story.user_id)) acc.push(story);
          return acc;
        }, []);
        setStories(grouped as Story[]);
      }
    } catch (err) { console.error("[Stories] Error:", err); }
  };

  const startAutoAdvance = useCallback(() => {
    clearTimers();
    setProgress(0);
    const startTime = Date.now();
    
    progressRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setProgress(Math.min((elapsed / STORY_DURATION) * 100, 100));
    }, 50);

    timerRef.current = setTimeout(() => {
      goToNext();
    }, STORY_DURATION);
  }, [currentIndex, allUserStories]);

  const clearTimers = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (progressRef.current) clearInterval(progressRef.current);
  };

  useEffect(() => {
    if (selectedStory) {
      startAutoAdvance();
    }
    return clearTimers;
  }, [selectedStory, currentIndex]);

  const goToNext = () => {
    const userStories = allUserStories.filter(s => s.user_id === selectedStory?.user_id);
    const nextIdx = currentIndex + 1;
    if (nextIdx < userStories.length) {
      setCurrentIndex(nextIdx);
      setSelectedStory(userStories[nextIdx]);
    } else {
      const currentUserIdx = stories.findIndex(s => s.user_id === selectedStory?.user_id);
      if (currentUserIdx < stories.length - 1) {
        const nextUser = stories[currentUserIdx + 1];
        const nextUserStories = allUserStories.filter(s => s.user_id === nextUser.user_id);
        setCurrentIndex(0);
        setSelectedStory(nextUserStories[0]);
      } else {
        setSelectedStory(null);
      }
    }
  };

  const goToPrev = () => {
    if (currentIndex > 0) {
      const userStories = allUserStories.filter(s => s.user_id === selectedStory?.user_id);
      setCurrentIndex(currentIndex - 1);
      setSelectedStory(userStories[currentIndex - 1]);
    }
  };

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setSelectedFile(file);
    setFilePreview(URL.createObjectURL(file));
    setShowCreateDialog(true);
  };

  const publishStory = async () => {
    if (!selectedFile || !user) return;

    setUploading(true);
    try {
      const fileExt = selectedFile.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      let mediaType = "image";
      if (selectedFile.type.startsWith("video")) mediaType = "video";
      else if (selectedFile.type.startsWith("audio")) mediaType = "audio";

      const { error: uploadError } = await supabase.storage.from("stories").upload(fileName, selectedFile);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("stories").getPublicUrl(fileName);

      const { error: insertError } = await supabase.from("stories").insert({
        user_id: user.id,
        media_url: publicUrl,
        media_type: mediaType,
        content: caption || null,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });

      if (insertError) throw insertError;
      toast.success("Story publiée ! 🎉");
      setCaption("");
      setSelectedFile(null);
      setFilePreview(null);
      setShowCreateDialog(false);
      fetchStories();
    } catch (error: any) {
      toast.error(`Erreur: ${error.message || "Erreur inconnue"}`);
    } finally {
      setUploading(false);
    }
  };

  const generateAICaption = async () => {
    if (!filePreview || !selectedFile?.type.startsWith("image")) {
      toast.error("La légende IA fonctionne uniquement avec les images");
      return;
    }
    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        const { data, error } = await supabase.functions.invoke("ai-image-generate", {
          body: { action: "caption", imageBase64: base64 }
        });
        if (!error && data?.text) {
          setCaption(data.text);
          toast.success("Légende générée !");
        } else {
          toast.error("Erreur de génération");
        }
      };
      reader.readAsDataURL(selectedFile);
    } catch (err) {
      toast.error("Erreur IA");
    }
  };

  const viewStory = async (story: Story) => {
    const userStories = allUserStories.filter(s => s.user_id === story.user_id);
    setCurrentIndex(0);
    setSelectedStory(userStories[0] || story);

    if (user) {
      try {
        await supabase.from("story_views" as any).upsert(
          { story_id: story.id, viewer_id: user.id },
          { onConflict: "story_id,viewer_id" }
        );
      } catch (err) { /* silent */ }
    }

    // Fetch view count
    try {
      const { count } = await supabase
        .from("story_views" as any)
        .select("*", { count: "exact", head: true })
        .eq("story_id", story.id);
      setViewCount(count || 0);
    } catch (e) { /* silent */ }
  };

  const sendReaction = async () => {
    if (!reactionText.trim() || !selectedStory || !user) return;
    
    // Send as a story reaction
    try {
      await supabase.from("story_reactions").insert({
        story_id: selectedStory.id,
        user_id: user.id,
        reaction_type: reactionText.trim(),
      });
      toast.success("Réaction envoyée !");
      setReactionText("");
    } catch (err) {
      toast.error("Erreur");
    }
  };

  const sendHeartReaction = async () => {
    if (!selectedStory || !user) return;
    try {
      await supabase.from("story_reactions").insert({
        story_id: selectedStory.id,
        user_id: user.id,
        reaction_type: "❤️",
      });
      toast.success("❤️");
    } catch (err) { /* already reacted */ }
  };

  const currentUserStories = selectedStory
    ? allUserStories.filter(s => s.user_id === selectedStory.user_id)
    : [];

  const hasMyStory = stories.some(s => s.user_id === user?.id);

  return (
    <>
      <div className="flex gap-3 overflow-x-auto pb-4 mb-6 scrollbar-hide">
        {/* Add Story */}
        <div className="flex flex-col items-center gap-2 min-w-[80px] flex-shrink-0">
          <div className="relative">
            <Avatar className={`h-16 w-16 border-2 ${hasMyStory ? 'border-primary ring-2 ring-primary/30' : 'border-dashed border-muted-foreground/50'} cursor-pointer`}>
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback className="bg-muted">
                <Plus className="h-5 w-5 text-muted-foreground" />
              </AvatarFallback>
            </Avatar>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*,audio/*"
              className="hidden"
              onChange={handleFileSelected}
            />
            <button 
              className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-1 cursor-pointer hover:opacity-80 disabled:opacity-50 shadow-md"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
            </button>
          </div>
          <span className="text-xs text-center text-muted-foreground">{uploading ? "Envoi..." : "Votre story"}</span>
        </div>

        {/* Story list */}
        {stories.map((story) => {
          const userStoryCount = allUserStories.filter(s => s.user_id === story.user_id).length;
          const isOwn = story.user_id === user?.id;
          return (
            <div
              key={story.id}
              className="flex flex-col items-center gap-2 min-w-[80px] flex-shrink-0 cursor-pointer group"
              onClick={() => viewStory(story)}
            >
              <div className="relative">
                <div className="p-[2px] rounded-full bg-gradient-to-tr from-primary via-primary/80 to-accent group-hover:scale-105 transition-transform">
                  <Avatar className="h-16 w-16 border-2 border-background">
                    <AvatarImage src={story.profiles?.avatar_url} />
                    <AvatarFallback>{story.profiles?.full_name?.charAt(0) || "?"}</AvatarFallback>
                  </Avatar>
                </div>
                {userStoryCount > 1 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] rounded-full h-5 w-5 flex items-center justify-center font-bold shadow">
                    {userStoryCount}
                  </span>
                )}
              </div>
              <span className="text-xs text-center truncate max-w-[80px] font-medium">
                {isOwn ? "Votre story" : story.profiles?.full_name || "Utilisateur"}
              </span>
            </div>
          );
        })}
      </div>

      {/* Create Story Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => {
        if (!open) {
          setShowCreateDialog(false);
          setSelectedFile(null);
          setFilePreview(null);
          setCaption("");
        }
      }}>
        <DialogContent className="max-w-md p-0 bg-black overflow-hidden">
          <div className="relative min-h-[500px] flex flex-col">
            {/* Preview */}
            <div className="flex-1 flex items-center justify-center p-4">
              {filePreview && selectedFile?.type.startsWith("image") && (
                <img src={filePreview} alt="Preview" className="max-h-[50vh] rounded-lg object-contain" />
              )}
              {filePreview && selectedFile?.type.startsWith("video") && (
                <video src={filePreview} className="max-h-[50vh] rounded-lg" controls />
              )}
              {filePreview && selectedFile?.type.startsWith("audio") && (
                <div className="flex flex-col items-center gap-4 p-8">
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center">
                    <Music className="h-16 w-16 text-white" />
                  </div>
                  <audio src={filePreview} controls className="w-full max-w-xs" />
                </div>
              )}
            </div>

            {/* Caption & Actions */}
            <div className="p-4 space-y-3">
              <div className="flex gap-2">
                <Textarea
                  placeholder="Ajouter une légende..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50 resize-none h-20"
                />
              </div>
              <div className="flex gap-2">
                {selectedFile?.type.startsWith("image") && (
                  <Button variant="outline" size="sm" onClick={generateAICaption} className="gap-1 border-white/20 text-white hover:bg-white/10">
                    <Wand2 className="h-3 w-3" /> Légende IA
                  </Button>
                )}
                <div className="flex-1" />
                <Button onClick={publishStory} disabled={uploading} className="gap-2">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Publier
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Story Viewer Dialog */}
      <Dialog open={!!selectedStory} onOpenChange={() => { setSelectedStory(null); clearTimers(); }}>
        <DialogContent className="max-w-md p-0 bg-black overflow-hidden">
          {selectedStory && (
            <div className="relative min-h-[500px] flex flex-col">
              {/* Progress bars */}
              <div className="absolute top-2 left-3 right-3 z-20 flex gap-1">
                {currentUserStories.map((_, idx) => (
                  <div key={idx} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full transition-all"
                      style={{
                        width: idx < currentIndex ? "100%" : idx === currentIndex ? `${progress}%` : "0%",
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Close button */}
              <Button variant="ghost" size="icon" className="absolute top-6 right-2 z-20 text-white hover:bg-white/20" onClick={() => { setSelectedStory(null); clearTimers(); }}>
                <X className="h-5 w-5" />
              </Button>

              {/* User info */}
              <div className="flex items-center gap-3 absolute top-8 left-4 z-10">
                <Avatar className="h-8 w-8 border-2 border-white">
                  <AvatarImage src={selectedStory.profiles?.avatar_url} />
                  <AvatarFallback className="bg-white text-black text-xs">
                    {selectedStory.profiles?.full_name?.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-white font-semibold text-sm">{selectedStory.profiles?.full_name || "Utilisateur"}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-white/70 text-[10px]">
                      {new Date(selectedStory.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    {viewCount > 0 && (
                      <span className="text-white/50 text-[10px] flex items-center gap-0.5">
                        <Eye className="h-2.5 w-2.5" /> {viewCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Navigation zones */}
              <button className="absolute left-0 top-0 bottom-0 w-1/3 z-10" onClick={goToPrev} />
              <button className="absolute right-0 top-0 bottom-0 w-1/3 z-10" onClick={goToNext} />

              {/* Media content */}
              <div className="flex-1 flex items-center justify-center pt-20 pb-16">
                {selectedStory.media_type === "video" ? (
                  <video src={selectedStory.media_url} className="w-full max-h-[70vh] object-contain" autoPlay muted playsInline />
                ) : selectedStory.media_type === "audio" ? (
                  <div className="flex flex-col items-center gap-4 p-8">
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center animate-pulse">
                      <Music className="h-16 w-16 text-white" />
                    </div>
                    <audio src={selectedStory.media_url} className="w-full max-w-xs" controls autoPlay />
                  </div>
                ) : (
                  <img src={selectedStory.media_url} alt="Story" className="w-full max-h-[70vh] object-contain" />
                )}
              </div>

              {/* Caption */}
              {selectedStory.content && (
                <p className="absolute bottom-14 left-4 right-4 text-white text-center bg-black/60 backdrop-blur-sm p-3 rounded-xl text-sm">
                  {selectedStory.content}
                </p>
              )}

              {/* Reply bar */}
              <div className="absolute bottom-2 left-2 right-2 flex gap-2 z-20">
                <Input
                  placeholder="Répondre à la story..."
                  value={reactionText}
                  onChange={(e) => setReactionText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendReaction()}
                  className="bg-white/20 border-white/30 text-white placeholder:text-white/50 h-9 text-sm backdrop-blur-sm"
                />
                <Button size="icon" variant="ghost" className="text-white h-9 w-9 hover:bg-white/20" onClick={sendReaction}>
                  <Send className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="text-white h-9 w-9 hover:bg-white/20 hover:text-red-400" onClick={sendHeartReaction}>
                  <Heart className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Stories;
