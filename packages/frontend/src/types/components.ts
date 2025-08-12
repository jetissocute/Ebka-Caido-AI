export interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface ClaudeModel {
  id: string;
  name: string;
  description: string;
}

export interface ChatSession {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}
