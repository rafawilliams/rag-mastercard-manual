import { useChat } from "../../hooks/useChat";
import { MessageList } from "./MessageList";
import { InputBar } from "./InputBar";

export function ChatContainer() {
  const { messages, loading, error, send } = useChat();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        maxWidth: 800,
        margin: "0 auto",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <header
        style={{
          padding: "16px",
          borderBottom: "1px solid #e0e0e0",
          fontWeight: 600,
          fontSize: 18,
        }}
      >
        Asistente de Manuales Mastercard
      </header>
      <MessageList messages={messages} loading={loading} />
      {error && (
        <div
          style={{
            padding: "8px 16px",
            background: "#fff0f0",
            color: "#c00",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}
      <InputBar onSend={send} disabled={loading} />
    </div>
  );
}
