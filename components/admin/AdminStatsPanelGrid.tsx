import { Children, isValidElement, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type AdminStatsPanelGridProps = {
  children: ReactNode;
  className?: string;
};

export default function AdminStatsPanelGrid({
  children,
  className,
}: AdminStatsPanelGridProps) {
  const items = Children.toArray(children).filter(isValidElement);

  if (items.length === 0) return null;

  if (items.length === 1) {
    return <div className={cn("w-full min-w-0", className)}>{items[0]}</div>;
  }

  const hasLoneLastRow = items.length % 2 === 1;
  const lastIndex = items.length - 1;

  return (
    <div
      className={cn(
        "grid w-full min-w-0 grid-cols-1 gap-4 lg:grid-cols-2",
        className
      )}
    >
      {items.map((item, index) => (
        <div
          key={item.key ?? index}
          className={cn(
            "min-w-0 w-full",
            hasLoneLastRow && index === lastIndex && "lg:col-span-2"
          )}
        >
          {item}
        </div>
      ))}
    </div>
  );
}
