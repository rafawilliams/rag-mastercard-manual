import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InputBar } from "../InputBar";

describe("InputBar", () => {
  it("llama onSend con el texto al hacer submit", async () => {
    const onSend = vi.fn();
    render(<InputBar onSend={onSend} disabled={false} />);

    await userEvent.type(screen.getByRole("textbox"), "¿Cuáles son las tarifas?");
    fireEvent.click(screen.getByRole("button", { name: /enviar/i }));

    expect(onSend).toHaveBeenCalledWith("¿Cuáles son las tarifas?");
  });

  it("llama onSend al presionar Enter", async () => {
    const onSend = vi.fn();
    render(<InputBar onSend={onSend} disabled={false} />);

    await userEvent.type(screen.getByRole("textbox"), "pregunta{Enter}");

    expect(onSend).toHaveBeenCalledWith("pregunta");
  });

  it("no llama onSend si el texto está vacío", async () => {
    const onSend = vi.fn();
    render(<InputBar onSend={onSend} disabled={false} />);

    fireEvent.click(screen.getByRole("button", { name: /enviar/i }));

    expect(onSend).not.toHaveBeenCalled();
  });

  it("deshabilita el botón cuando disabled=true", () => {
    render(<InputBar onSend={vi.fn()} disabled={true} />);
    expect(screen.getByRole("button", { name: /enviar/i })).toBeDisabled();
  });
});
