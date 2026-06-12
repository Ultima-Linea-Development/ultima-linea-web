"use client";

import { cn } from "@/lib/utils";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  type TextareaHTMLAttributes,
} from "react";

type TextareaWidth = "full" | "auto";
type TextareaPaddingY = 1 | 2 | 3 | 4;
type TextareaPaddingX = 2 | 3 | 4 | 6;
type TextareaBackground = "gray" | "default";
type TextareaSize = "sm" | "default";

type TextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className"> & {
  width?: TextareaWidth;
  py?: TextareaPaddingY;
  px?: TextareaPaddingX;
  background?: TextareaBackground;
  size?: TextareaSize;
  className?: string;
};

const widthStyles: Record<TextareaWidth, string> = {
  full: "w-full",
  auto: "w-auto",
};

const paddingYStyles: Record<TextareaPaddingY, string> = {
  1: "py-1",
  2: "py-2",
  3: "py-3",
  4: "py-4",
};

const paddingXStyles: Record<TextareaPaddingX, string> = {
  2: "px-2",
  3: "px-3",
  4: "px-4",
  6: "px-6",
};

const backgroundStyles: Record<TextareaBackground, string> = {
  gray: "bg-gray-200",
  default: "bg-background",
};

const sizeStyles: Record<TextareaSize, string> = {
  sm: "text-base md:text-sm",
  default: "text-base",
};

function adjustHeight(element: HTMLTextAreaElement) {
  element.style.height = "auto";
  element.style.height = `${element.scrollHeight}px`;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      width = "full",
      py = 2,
      px = 4,
      background = "gray",
      size = "sm",
      className,
      rows = 1,
      onInput,
      value,
      defaultValue,
      ...props
    },
    ref
  ) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useImperativeHandle(ref, () => textareaRef.current as HTMLTextAreaElement);

    const resize = useCallback((element: HTMLTextAreaElement | null) => {
      if (!element) return;
      adjustHeight(element);
    }, []);

    useEffect(() => {
      resize(textareaRef.current);
    }, [resize, value, defaultValue]);

    return (
      <textarea
        ref={textareaRef}
        rows={rows}
        value={value}
        defaultValue={defaultValue}
        onInput={(event) => {
          adjustHeight(event.currentTarget);
          onInput?.(event);
        }}
        className={cn(
          widthStyles[width],
          paddingYStyles[py],
          paddingXStyles[px],
          backgroundStyles[background],
          size && sizeStyles[size as TextareaSize],
          "min-h-[2.75rem] resize-none overflow-hidden leading-normal",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          className
        )}
        {...props}
      />
    );
  }
);

Textarea.displayName = "Textarea";

export default Textarea;
