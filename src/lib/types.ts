export const NODE_TYPES = ["COURSE", "SUBJECT", "CHAPTER", "TOPIC", "CONCEPT"] as const;
export type NodeType = (typeof NODE_TYPES)[number];

export const ASSET_TYPES = ["READING", "PRESENTATION", "NOTE"] as const;
export type AssetType = (typeof ASSET_TYPES)[number];

export const NOTE_SOURCES = ["AI", "MANUAL"] as const;
export type NoteSource = (typeof NOTE_SOURCES)[number];
