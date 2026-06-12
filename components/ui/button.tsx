import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap text-base font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer hover:before:absolute hover:before:inset-0 hover:before:bg-black/10 hover:before:rounded-inherit [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:relative [&_svg]:z-10",
  {
    variants: {
      variant: {
        default:
          "border border-input bg-primary text-primary-foreground hover:bg-primary/90 dark:hover:bg-black dark:hover:text-white dark:hover:before:bg-transparent",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        delete:
          "bg-transparent text-delete-foreground hover:bg-delete hover:before:hidden",
        warning:
          "bg-transparent text-warning-foreground hover:bg-warning hover:before:hidden",
        outline:
          "border border-input bg-background hover:bg-black hover:text-white hover:border-black dark:hover:bg-accent dark:hover:text-accent-foreground dark:hover:border-input",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline hover:before:hidden",
        /** Negro por defecto; hover con negro un poco más claro */
        ctaSolid:
          "rounded-none border-2 border-black bg-black text-base text-white transition-colors hover:bg-neutral-800 hover:before:hidden",
        /** Blanco con borde negro; hover mantiene fondo blanco y aclara el borde */
        ctaOutline:
          "rounded-none border-2 border-black bg-white text-base text-black transition-[background-color,border-color] hover:bg-white hover:text-black hover:border-neutral-600 hover:before:hidden",
      },
      size: {
        default: "h-11 px-4 py-2 [&_svg]:size-4",
        sm: "h-9 px-3 text-sm [&_svg]:size-4",
        lg: "h-12 px-8 [&_svg]:size-5",
        xl: "min-h-14 h-auto px-8 py-4 text-lg font-semibold uppercase tracking-[0.06em] [&_svg]:size-5 sm:min-h-[3.75rem] sm:px-10 sm:text-xl",
        /** CTA compacto de tienda (PDP, galería); normal-case como el resto de la UI */
        cta: "h-11 min-h-11 px-5 py-2.5 text-base font-medium normal-case tracking-normal [&_svg]:size-[1.125rem] sm:min-h-12 sm:px-6",
        icon: "h-10 w-10",
      },
      rounded: {
        default: "",
        full: "rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      rounded: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, rounded, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, rounded, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
