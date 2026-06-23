export function validateRequiredProductFields(fields: {
  name: string;
}): string | null {
  if (!fields.name.trim()) return "El nombre es obligatorio.";
  return null;
}
