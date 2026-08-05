import type { ChatRequest, ChatResponse } from "../types/chat";

const API_URL = import.meta.env.VITE_API_URL;

export async function sendMessage(req: ChatRequest): Promise<ChatResponse> {
  const res = await fetch(`${API_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Error desconocido" }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }

  return res.json();
}
