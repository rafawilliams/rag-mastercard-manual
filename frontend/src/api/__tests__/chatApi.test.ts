import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendMessage } from "../chatApi";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

describe("sendMessage", () => {
  it("calls POST /chat and returns answer + citations", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          answer: "Respuesta de prueba",
          citations: [{ text: "fuente", location: "s3://bucket/file.pdf" }],
        }),
    });

    const result = await sendMessage({
      message: "¿Tarifas?",
      sessionId: "test-session",
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/chat"),
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
    );
    expect(result.answer).toBe("Respuesta de prueba");
    expect(result.citations).toHaveLength(1);
  });

  it("throws when response is not ok", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: "Internal error" }),
    });

    await expect(
      sendMessage({ message: "pregunta", sessionId: "s1" })
    ).rejects.toThrow("Internal error");
  });
});
