import type { ProductVersion } from "@/lib/product-name";

export function parseProductVersionParam(
  value: string | null
): ProductVersion | null {
  if (value === "fan" || value === "player" || value === "retro") return value;
  return null;
}

export function buildProductVersionFilter(
  version: ProductVersion
): Record<string, unknown> {
  if (version === "player") {
    return {
      $or: [
        { type: "player" },
        { name: { $regex: "versi[oó]n\\s+jugador|versi[oó]n\\s+player", $options: "i" } },
      ],
    };
  }

  if (version === "retro") {
    return {
      $or: [
        { type: "retro" },
        { name: { $regex: "versi[oó]n\\s+retro|\\bretro\\b", $options: "i" } },
      ],
    };
  }

  return {
    $and: [
      { type: { $nin: ["player", "retro"] } },
      {
        name: {
          $not: /versi[oó]n\s+(?:jugador|player|retro)|\bretro\b/i,
        },
      },
    ],
  };
}
