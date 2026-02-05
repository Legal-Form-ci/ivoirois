import { useState, useRef } from "react";
import { Image, Smile, Video, Music, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import RichTextEditor from "@/components/RichTextEditor";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { postSchema } from "@/lib/validation";
import { handleError } from "@/lib/errorHandler";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface CreatePostProps {
  onPostCreated?: () => void;
}

const CreatePost = ({ onPostCreated }: CreatePostProps) => {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const emojis = ["😀", "😂", "😍", "🥰", "😎", "🤔", "👍", "❤️", "🔥", "✨", "🎉", "👏", "💪", "🙏", "😊", "😢"];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast.error("Le fichier ne doit pas dépasser 50 Mo");
      return;
    }

    setSelectedFile(file);
    
    // Create preview for images and videos
    if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(null);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async () => {
    if ((!content.trim() && !selectedFile) || !user) return;

    // Validate content if present
    if (content.trim()) {
      const validation = postSchema.safeParse({ content: content.trim() });
      if (!validation.success) {
        toast.error(validation.error.errors[0]?.message || "Contenu invalide");
        return;
      }
    }

    setLoading(true);
    try {
      let imageUrl = null;

      // Upload file if selected
      if (selectedFile) {
        const fileExt = selectedFile.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("posts")
          .upload(fileName, selectedFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("posts")
          .getPublicUrl(fileName);

        imageUrl = publicUrl;
      }

      const { error } = await supabase.from("posts").insert({
        user_id: user.id,
        content: content.trim() || null,
        image_url: imageUrl,
      });

      if (error) throw error;

      toast.success("Publication créée !");
      setContent("");
      removeFile();
      onPostCreated?.();
    } catch (error: unknown) {
      toast.error(handleError(error));
    } finally {
      setLoading(false);
    }
  };

  const insertEmoji = (emoji: string) => {
    setContent(content + emoji);
  };

  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-start gap-3">
          <Avatar>
            <AvatarFallback className="bg-primary text-primary-foreground">
              {user?.email?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <RichTextEditor
            content={content}
            onChange={setContent}
            placeholder="Quoi de neuf en Côte d'Ivoire ?"
            minHeight="140px"
          />
        </div>

        {previewUrl && (
          <div className="relative">
            {selectedFile?.type.startsWith("image/") && (
              <img src={previewUrl} alt="Preview" className="max-h-64 rounded-lg object-cover w-full" />
            )}
            {selectedFile?.type.startsWith("video/") && (
              <video src={previewUrl} controls className="max-h-64 rounded-lg w-full" />
            )}
            <Button
              variant="destructive"
              size="sm"
              className="absolute top-2 right-2"
              onClick={removeFile}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {selectedFile && !previewUrl && (
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm truncate flex-1">{selectedFile.name}</span>
            <Button variant="ghost" size="sm" onClick={removeFile}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div className="flex items-center justify-between border-t pt-4">
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
              onChange={handleFileSelect}
            />
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Image className="h-5 w-5 text-secondary" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                fileInputRef.current?.click();
              }}
            >
              <Video className="h-5 w-5 text-secondary" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                fileInputRef.current?.click();
              }}
            >
              <Music className="h-5 w-5 text-secondary" />
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Smile className="h-5 w-5 text-accent" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="grid grid-cols-8 gap-2">
                  {emojis.map((emoji, index) => (
                    <Button
                      key={index}
                      variant="ghost"
                      size="sm"
                      className="text-2xl p-0 h-10 w-10"
                      onClick={() => insertEmoji(emoji)}
                    >
                      {emoji}
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <Button
            variant="default"
            onClick={handleSubmit}
            disabled={(!content.trim() && !selectedFile) || loading}
          >
            {loading ? "Publication..." : "Publier"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CreatePost;
