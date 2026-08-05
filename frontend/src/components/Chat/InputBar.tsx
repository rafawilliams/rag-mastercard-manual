import { useState } from "react";

interface Props {
  onSend: (message: string) => void;
  disabled: boolean;
}

export function InputBar({ onSend, disabled }: Props) {
  const [text, setText] = useState("");

  function submit() {
    if (!text.trim()) return;
    onSend(text.trim());
    setText("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        padding: "12px 16px",
        borderTop: "1px solid #e0e0e0",
      }}
    >
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Escribe tu pregunta sobre los manuales de Mastercard…"
        rows={2}
        disabled={disabled}
        style={{
          flex: 1,
          resize: "none",
          padding: "8px 12px",
          borderRadius: 8,
          border: "1px solid #ccc",
          fontSize: 14,
          fontFamily: "inherit",
        }}
      />
      <button
        onClick={submit}
        disabled={disabled}
        aria-label="Enviar"
        style={{
          padding: "0 20px",
          background: "#0070f3",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.6 : 1,
          fontSize: 14,
        }}
      >
        Enviar
      </button>
    </div>
  );
}
