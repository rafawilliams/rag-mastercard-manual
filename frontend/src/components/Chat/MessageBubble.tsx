import type { Message } from "../../types/chat";
import { CitationList } from "./CitationList";

interface Props {
  message: Message;
}

const styles: Record<string, React.CSSProperties> = {
  user: {
    alignSelf: "flex-end",
    background: "#0070f3",
    color: "#fff",
    borderRadius: "12px 12px 2px 12px",
    padding: "10px 14px",
    maxWidth: "75%",
  },
  assistant: {
    alignSelf: "flex-start",
    background: "#f0f0f0",
    color: "#111",
    borderRadius: "12px 12px 12px 2px",
    padding: "10px 14px",
    maxWidth: "75%",
  },
};

export function MessageBubble({ message }: Props) {
  return (
    <div style={styles[message.role]}>
      <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{message.content}</p>
      {message.role === "assistant" && message.citations && (
        <CitationList citations={message.citations} />
      )}
    </div>
  );
}
