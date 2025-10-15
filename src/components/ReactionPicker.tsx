import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Heart, Smile, Angry, Frown, ThumbsUp } from "lucide-react";

interface ReactionPickerProps {
  onReact: (reaction: string) => void;
  currentReaction?: string;
}

const reactions = [
  { type: "like", icon: ThumbsUp, label: "J'aime", color: "text-primary" },
  { type: "love", icon: Heart, label: "J'adore", color: "text-red-500" },
  { type: "haha", icon: Smile, label: "Haha", color: "text-yellow-500" },
  { type: "wow", icon: Smile, label: "Wow", color: "text-blue-500" },
  { type: "sad", icon: Frown, label: "Triste", color: "text-yellow-600" },
  { type: "angry", icon: Angry, label: "Grrr", color: "text-orange-500" },
];

const ReactionPicker = ({ onReact, currentReaction }: ReactionPickerProps) => {
  const [open, setOpen] = useState(false);

  const handleReact = (type: string) => {
    onReact(type);
    setOpen(false);
  };

  const CurrentIcon = reactions.find((r) => r.type === currentReaction)?.icon || ThumbsUp;
  const currentColor = reactions.find((r) => r.type === currentReaction)?.color || "text-muted-foreground";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <CurrentIcon className={`h-4 w-4 ${currentReaction ? currentColor : ""}`} />
          <span>{currentReaction ? reactions.find((r) => r.type === currentReaction)?.label : "J'aime"}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2">
        <div className="flex gap-2">
          {reactions.map((reaction) => (
            <Button
              key={reaction.type}
              variant="ghost"
              size="icon"
              className="h-10 w-10 hover:scale-125 transition-transform"
              onClick={() => handleReact(reaction.type)}
              title={reaction.label}
            >
              <reaction.icon className={`h-6 w-6 ${reaction.color}`} />
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default ReactionPicker;
