export function validateRequiredProductFields(fields: {
  name: string;
  team: string;
  league: string;
  season: string;
}): string | null {
  if (!fields.name.trim()) return "El nombre es obligatorio.";
  if (!fields.team.trim()) return "El equipo es obligatorio.";
  if (!fields.league.trim()) return "La liga es obligatoria.";
  if (!fields.season.trim()) return "La temporada es obligatoria.";
  return null;
}
