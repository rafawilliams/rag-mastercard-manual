import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MessageBubble } from "../MessageBubble";
import type { Message } from "../../../types/chat";

const userMsg: Message = {
  id: "1",
  role: "user",
  content: "¿Cuáles son las tarifas?",
  timestamp: new Date("2026-01-01"),
};

const assistantMsg: Message = {
  id: "2",
  role: "assistant",
  content: "Las tarifas son 2.5%.",
  citations: [{ text: "Fuente: manual de tarifas", location: "s3://bucket/fees.pdf" }],
  timestamp: new Date("2026-01-01"),
};

describe("MessageBubble", () => {
  it("muestra el contenido del mensaje", () => {
    render(<MessageBubble message={userMsg} />);
    expect(screen.getByText("¿Cuáles son las tarifas?")).toBeInTheDocument();
  });

  it("muestra las citations cuando el rol es assistant", () => {
    render(<MessageBubble message={assistantMsg} />);
    expect(screen.getByText(/fees.pdf/)).toBeInTheDocument();
  });

  it("no muestra citations en mensajes de usuario", () => {
    render(<MessageBubble message={userMsg} />);
    expect(screen.queryByText(/Fuente/)).not.toBeInTheDocument();
  });
});
