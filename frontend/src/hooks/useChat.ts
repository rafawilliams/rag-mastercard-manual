import { useState, useCallback, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import type { Message } from "../types/chat";
import { sendMessage } from "../api/chatApi";

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionId = useRef<string>(uuidv4());

  const send = useCallback(
    async (text: string) => {
      if (!text.trim() || loading) return;

      const userMsg: Message = {
        id: uuidv4(),
        role: "user",
        content: text.trim(),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);
      setError(null);

      try {
        const response = await sendMessage({
          message: text.trim(),
          sessionId: sessionId.current,
        });

        const assistantMsg: Message = {
          id: uuidv4(),
          role: "assistant",
          content: response.answer,
          citations: response.citations,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMsg]);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Error al enviar el mensaje"
        );
      } finally {
        setLoading(false);
      }
    },
    [loading]
  );

  return { messages, loading, error, send };
}
