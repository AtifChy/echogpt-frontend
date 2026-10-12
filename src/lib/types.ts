export type UserRole = "USER" | "ADMIN";

export type ProviderType = "OPENAI" | "ANTHROPIC" | "GEMINI";

export interface AiProvider {
  id: number;
  name: string;
  type: ProviderType;
  model: string;
  enabled: boolean;
  isDefault: boolean;
  hasApiKey?: boolean;
}

export interface User {
  id: number;
  email: string;
  displayName: string | null;
  role: { name: UserRole };
  status: "ACTIVE" | "SUSPENDED";
  createdAt: string;
}

export interface Conversation {
  id: number;
  title: string;
  providerId: number;
  createdAt: string;
  updatedAt: string;
}

export interface Source {
  citation: number;
  title: string;
  url: string;
  snippets?: string[];
  hostname?: string | null;
  siteName?: string;
  publishedAt?: string | null;
}

export interface Message {
  id: number;
  role: "USER" | "ASSISTANT" | "SYSTEM";
  content: string;
  inputTokens: number;
  outputTokens: number;
  createdAt: string;
  sources?: Source[];
}

export interface Usage {
  plan: "FREE" | "PREMIUM";
  status: "ACTIVE" | "CANCELED";
  limit: number;
  used: number;
  remaining: number;
  periodStart: string;
  periodEnd: string;
}

export interface SearchRecord {
  id: number;
  query: string;
  createdAt: string;
}

export interface SearchResult {
  searchId: number;
  query: string;
  sources: Source[];
}
