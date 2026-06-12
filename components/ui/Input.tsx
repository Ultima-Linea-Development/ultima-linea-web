import { cn } from "@/lib/utils";
import { forwardRef, type InputHTMLAttributes } from "react";

type InputWidth = "full" | "auto";
type InputPaddingY = 1 | 2 | 3 | 4;
type InputPaddingX = 2 | 3 | 4 | 6;
type InputBackground = "gray" | "default";
type InputSize = "sm" | "default";

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "className" | "size"> & {
  width?: InputWidth;
  py?: InputPaddingY;
  px?: InputPaddingX;
  background?: InputBackground;
  size?: InputSize;
};

const widthStyles: Record<InputWidth, string> = {
  full: "w-full",
  auto: "w-auto",
};

const paddingYStyles: Record<InputPaddingY, string> = {
  1: "py-1",
  2: "py-2",
  3: "py-3",
  4: "py-4",
};

const paddingXStyles: Record<InputPaddingX, string> = {
  2: "px-2",
  3: "px-3",
  4: "px-4",
  6: "px-6",
};

const backgroundStyles: Record<InputBackground, string> = {
  gray: "bg-gray-200",
  default: "bg-background",
};

const sizeStyles: Record<InputSize, string> = {
  sm: "text-base md:text-sm",
  default: "text-base",
};

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      width = "full",
      py = 2,
      px = 4,
      background = "gray",
      size = "sm",
      ...props
    },
    ref
  ) => {
    return (
      <input
        ref={ref}
        className={cn(
          widthStyles[width],
          paddingYStyles[py],
          paddingXStyles[px],
          backgroundStyles[background],
          size && sizeStyles[size as InputSize],
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        )}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

export default Input;
