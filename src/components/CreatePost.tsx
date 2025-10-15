import { useState } from "react";
import { Image, Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface CreatePostProps {
  onPostCreated?: () => void;
}

const CreatePost = ({ onPostCreated }: CreatePostProps) => {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim() || !user) return;

    setLoading(true);
    try {
      const { error } = await supabase.from("posts").insert({
        user_id: user.id,
        content: content.trim(),
      });

      if (error) throw error;

      toast.success("Publication créée !");
      setContent("");
      onPostCreated?.();
    } catch (error: any) {
      toast.error("Erreur lors de la publication");
    } finally {
      setLoading(false);
    }
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
          <Textarea
            placeholder="Quoi de neuf en Côte d'Ivoire ?"
            className="min-h-[100px] resize-none border-0 focus-visible:ring-0 bg-muted/50"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-between border-t pt-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" disabled>
              <Image className="h-5 w-5 text-secondary" />
            </Button>
            <Button variant="ghost" size="sm" disabled>
              <Smile className="h-5 w-5 text-accent" />
            </Button>
          </div>
          <Button
            variant="default"
            onClick={handleSubmit}
            disabled={!content.trim() || loading}
          >
            {loading ? "Publication..." : "Publier"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CreatePost;
