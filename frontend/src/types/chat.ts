export interface Citation {
  text: string;
  location: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  timestamp: Date;
}

export interface ChatRequest {
  message: string;
  sessionId: string;
}

export interface ChatResponse {
  answer: string;
  citations: Citation[];
}
