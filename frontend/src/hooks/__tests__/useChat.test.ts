import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useChat } from "../useChat";
import { sendMessage } from "../../api/chatApi";

vi.mock("../../api/chatApi");
const mockSend = sendMessage as ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockSend.mockReset();
});

describe("useChat", () => {
  it("starts with empty messages", () => {
    const { result } = renderHook(() => useChat());
    expect(result.current.messages).toHaveLength(0);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("adds user message immediately when send is called", async () => {
    mockSend.mockResolvedValueOnce({ answer: "Respuesta", citations: [] });

    const { result } = renderHook(() => useChat());
    await act(async () => {
      await result.current.send("¿Cuáles son las tarifas?");
    });

    expect(result.current.messages[0].role).toBe("user");
    expect(result.current.messages[0].content).toBe("¿Cuáles son las tarifas?");
  });

  it("adds assistant message after API response", async () => {
    mockSend.mockResolvedValueOnce({
      answer: "Las tarifas son 2.5%.",
      citations: [{ text: "fuente", location: "s3://bucket/fees.pdf" }],
    });

    const { result } = renderHook(() => useChat());
    await act(async () => {
      await result.current.send("¿Tarifas?");
    });

    const assistantMsg = result.current.messages[1];
    expect(assistantMsg.role).toBe("assistant");
    expect(assistantMsg.content).toBe("Las tarifas son 2.5%.");
    expect(assistantMsg.citations).toHaveLength(1);
  });

  it("sets error on API failure", async () => {
    mockSend.mockRejectedValueOnce(new Error("Error de red"));

    const { result } = renderHook(() => useChat());
    await act(async () => {
      await result.current.send("pregunta");
    });

    expect(result.current.error).toBe("Error de red");
    expect(result.current.messages).toHaveLength(1);
  });

  it("ignores empty messages", async () => {
    const { result } = renderHook(() => useChat());
    await act(async () => {
      await result.current.send("   ");
    });

    expect(mockSend).not.toHaveBeenCalled();
    expect(result.current.messages).toHaveLength(0);
  });
});
