import { useState, type CSSProperties, type ImgHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type AdaptiveImageProps = {
  src?: string | null;
  alt: string;
  className?: string;
  imgClassName?: string;
  fallback?: ReactNode;
  rounded?: "none" | "sm" | "md" | "lg" | "xl" | "full";
  variant?: "profile" | "cover" | "screenshot" | "post" | "story";
  fit?: "contain" | "safe-cover";
  loading?: ImgHTMLAttributes<HTMLImageElement>["loading"];
  sizes?: string;
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
  variant = "post",
  fit = "contain",
  loading = "lazy",
  sizes,
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
       data-adaptive-variant={variant}
       data-adaptive-fit={fit}
      style={{ "--adaptive-src": `url(${src})` } as CSSProperties}
    >
      <img
        src={src}
        alt={alt}
         loading={loading}
         sizes={sizes}
        decoding="async"
        className={cn("adaptive-media-img", imgClassName)}
        style={{ objectPosition }}
        onLoad={(event) => {
          const image = event.currentTarget;
          const ratio = image.naturalWidth / Math.max(image.naturalHeight, 1);
           if (variant === "profile") setObjectPosition(ratio < 0.9 ? "50% 36%" : "50% 42%");
           else if (variant === "cover") setObjectPosition(ratio < 1 ? "50% 34%" : "50% 50%");
           else if (variant === "story") setObjectPosition(ratio < 0.75 ? "50% 40%" : "50% 50%");
           else setObjectPosition(ratio < 0.85 ? "50% 38%" : "50% 50%");
        }}
      />
    </div>
  );
}