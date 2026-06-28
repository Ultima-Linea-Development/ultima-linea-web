import type { ProductVersion } from "@/lib/product-name";

export const HOME_LATEST_COUNT = 10;
export const HOME_CAROUSEL_COUNT = 20;

export type HomeProductSection = {
  id: string;
  title: string;
  type: ProductVersion;
  searchQuery: string;
};

export const HOME_PRODUCT_SECTIONS: HomeProductSection[] = [
  {
    id: "retro",
    title: "Camisetas Versión Retro",
    type: "retro",
    searchQuery: "Versión Retro",
  },
  {
    id: "fan",
    title: "Camisetas Versión Fan",
    type: "fan",
    searchQuery: "Versión Fan",
  },
  {
    id: "player",
    title: "Camisetas Versión Jugador",
    type: "player",
    searchQuery: "Versión Jugador",
  },
];
