import React from "react";
import Image, { ImageProps } from "next/image";

interface OptimizedImageProps extends Omit<ImageProps, "onLoadingComplete"> {
  priority?: boolean;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className = "",
  priority = false,
  width,
  height,
  fill,
  sizes,
  ...props
}) => {
  const isGif = typeof src === "string" && src.endsWith(".gif");
  const isSvg = typeof src === "string" && src.endsWith(".svg");
  const isBoxImage = typeof src === "string" && src.includes("/boxes/");

  // Automatic aspect ratio handling for SVGs and box images
  const imageProps: Partial<ImageProps> = {};
  
  if (fill) {
    imageProps.fill = true;
    imageProps.sizes = sizes || "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw";
  } else if (width || height) {
    if (width && !height && (isSvg || isBoxImage)) {
      imageProps.width = width;
      imageProps.height = width; // Square aspect ratio for boxes
      imageProps.style = { ...props.style, height: "auto" };
    } else if (height && !width && (isSvg || isBoxImage)) {
      imageProps.height = height;
      imageProps.width = height; // Square aspect ratio for boxes
      imageProps.style = { ...props.style, width: "auto" };
    } else {
      imageProps.width = width;
      imageProps.height = height;
    }
  }

  return (
    <Image
      src={src}
      alt={alt}
      className={`${className} ${!isGif && !isSvg ? "transition-opacity duration-300" : ""}`}
      unoptimized={isGif || isBoxImage}
      priority={priority}
      loading={priority ? "eager" : "lazy"}
      quality={isSvg ? 100 : 75}
      {...imageProps}
      {...props}
    />
  );
};

export default OptimizedImage;
