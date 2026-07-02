import { useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type AdaptiveImageProps = {
  src?: string | null;
  alt: string;
  className?: string;
  imgClassName?: string;
  fallback?: ReactNode;
  rounded?: "none" | "sm" | "md" | "lg" | "xl" | "full";
};

const roundedClass = {
  none: "rounded-none",
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  full: "rounded-full",
};

export function AdaptiveImage({
  src,
  alt,
  className,
  imgClassName,
  fallback,
  rounded = "lg",
}: AdaptiveImageProps) {
  const [objectPosition, setObjectPosition] = useState("50% 50%");

  if (!src) {
    return (
      <div className={cn("adaptive-media-empty", roundedClass[rounded], className)}>
        {fallback}
      </div>
    );
  }

  return (
    <div
      className={cn("img-adaptive-frame", roundedClass[rounded], className)}
      style={{ "--adaptive-src": `url(${src})` } as CSSProperties}
    >
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={cn("adaptive-media-img", imgClassName)}
        style={{ objectPosition }}
        onLoad={(event) => {
          const image = event.currentTarget;
          const ratio = image.naturalWidth / Math.max(image.naturalHeight, 1);
          setObjectPosition(ratio < 0.85 ? "50% 38%" : "50% 50%");
        }}
      />
    </div>
  );
}