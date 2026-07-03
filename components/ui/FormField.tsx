import Label from "@/components/ui/Label";
import Typography from "@/components/ui/Typography";
import { cn } from "@/lib/utils";
import { type ReactNode } from "react";

type FormFieldProps = {
  htmlFor?: string;
  label: ReactNode;
  required?: boolean;
  children: ReactNode;
  className?: string;
};

function FieldLabel({ label, required }: { label: ReactNode; required?: boolean }) {
  return (
    <Typography variant="body2" mb={1}>
      {label}
      {required ? " *" : ""}
    </Typography>
  );
}

export default function FormField({
  htmlFor,
  label,
  required,
  children,
  className,
}: FormFieldProps) {
  if (htmlFor) {
    return (
      <Label
        htmlFor={htmlFor}
        display="block"
        spacing="sm"
        className={cn("w-full min-w-0", className)}
      >
        <FieldLabel label={label} required={required} />
        {children}
      </Label>
    );
  }

  return (
    <div className={cn("block w-full min-w-0 space-y-1", className)}>
      <FieldLabel label={label} required={required} />
      {children}
    </div>
  );
}
