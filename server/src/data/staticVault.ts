/**
 * server/src/data/staticVault.ts
 *
 * Pre-constructed fallback passages are completely disabled as requested.
 */

export interface VaultQuestion {
  type: "main_idea" | "inference" | "vocab";
  stem: string;
  options: [string, string, string, string];
  correct_index: number;
}

export interface VaultPassage {
  body: string;
  domain: "business" | "science" | "history" | "abstract" | "social";
  level: number;
  topic_key: string;
  questions: [VaultQuestion, VaultQuestion, VaultQuestion];
}

export const staticVault: VaultPassage[] = [];
