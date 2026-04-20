export interface OutfitItem {
  _id: string;
  name: string;
  category: string;
  dominantColourHex: string;
  imageUrl: string;
}

export interface GapSuggestion {
  itemName: string;
  reason: string;
  priority: "high" | "medium" | "low";
  searchQuery: string;
}

export interface GeneratedOutfit {
  _id: string;
  outfitIndex: number;
  itemIds: string[];
  heroItemId: string;
  items: OutfitItem[];
  occasion: string;
  weatherCondition: string | null;
  weatherTempC: number | null;
  season: string;
  reasoning: string;
  colourPalette: string[];
  styleTags: string[];
  gapSuggestion: GapSuggestion | null;
}

export interface GeneratedBatch {
  outfits: GeneratedOutfit[];
  batchId: string;
  isPartial?: boolean;
}

export interface WeatherState {
  condition: string | null;
  tempC: number | null;
}
