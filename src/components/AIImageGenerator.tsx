import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Wand2, Loader2, Download, ImagePlus } from "lucide-react";
import { toast } from "sonner";

interface AIImageGeneratorProps {
  onImageGenerated: (imageDataUrl: string) => void;
  triggerLabel?: string;
  className?: string;
}

const AIImageGenerator = ({ onImageGenerated, triggerLabel, className }: AIImageGeneratorProps) => {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  const generateImage = async () => {
    if (!prompt.trim()) {
      toast.error("Décrivez l'image que vous souhaitez générer");
      return;
    }

    setGenerating(true);
    setGeneratedImage(null);

    try {
      const { data, error } = await supabase.functions.invoke("ai-image-generate", {
        body: { prompt: prompt.trim(), action: "generate" },
      });

      if (error) throw error;

      if (data?.images?.[0]) {
        setGeneratedImage(data.images[0]);
        toast.success("Image générée avec succès !");
      } else {
        throw new Error("Aucune image générée");
      }
    } catch (err: any) {
      console.error("AI image generation error:", err);
      toast.error(err.message || "Erreur lors de la génération");
    } finally {
      setGenerating(false);
    }
  };

  const useImage = () => {
    if (generatedImage) {
      onImageGenerated(generatedImage);
      setOpen(false);
      setGeneratedImage(null);
      setPrompt("");
      toast.success("Image ajoutée !");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <Wand2 className="h-4 w-4 mr-2" />
          {triggerLabel || "Générer une image IA"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImagePlus className="h-5 w-5 text-primary" />
            Génération d'image par IA
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Input
              placeholder="Ex: Un coucher de soleil sur Abidjan, style moderne..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && generateImage()}
              disabled={generating}
            />
            <p className="text-xs text-muted-foreground">
              Décrivez l'image en détail pour un meilleur résultat
            </p>
          </div>

          <Button onClick={generateImage} disabled={generating || !prompt.trim()} className="w-full">
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Génération en cours...
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4 mr-2" />
                Générer l'image
              </>
            )}
          </Button>

          {generatedImage && (
            <div className="space-y-3">
              <div className="rounded-lg overflow-hidden border">
                <img
                  src={generatedImage}
                  alt="Image générée par IA"
                  className="w-full max-h-80 object-contain bg-muted"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={useImage} className="flex-1">
                  <Download className="h-4 w-4 mr-2" />
                  Utiliser cette image
                </Button>
                <Button variant="outline" onClick={generateImage} disabled={generating}>
                  Régénérer
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AIImageGenerator;
