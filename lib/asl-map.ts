export type AslConfig = {
  aslUrl: string;
  defaultLayout?: "left" | "below";
};

export const ASL_MAP: Record<string, AslConfig> = {
  // Example:
  // "dQw4w9WgXcQ": { aslUrl: "https://cdn.inclusivequest.co/asl/dQw4w9WgXcQ.mp4", defaultLayout: "left" }
};
