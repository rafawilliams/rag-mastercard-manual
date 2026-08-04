import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { retrieveAndGenerate } from "../bedrock/retrieveAndGenerate";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": process.env.FRONTEND_ORIGIN ?? "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function respond(status: number, body: unknown): APIGatewayProxyResult {
  return {
    statusCode: status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  if (event.httpMethod === "OPTIONS") return respond(200, {});

  if (!event.body) return respond(400, { error: "Request body is required" });

  let message: string;
  let sessionId: string;

  try {
    const parsed = JSON.parse(event.body);
    message = parsed.message;
    sessionId = parsed.sessionId;
  } catch {
    return respond(400, { error: "Invalid JSON body" });
  }

  if (!message || typeof message !== "string")
    return respond(400, { error: "message is required" });
  if (!sessionId || typeof sessionId !== "string")
    return respond(400, { error: "sessionId is required" });

  try {
    const result = await retrieveAndGenerate(message, sessionId);
    return respond(200, result);
  } catch (err) {
    console.error("Bedrock error:", err);
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("throttling") || msg.includes("ThrottlingException")) {
      return respond(429, {
        error: "El servicio está ocupado, intenta de nuevo en unos segundos.",
      });
    }
    return respond(500, {
      error: "Error al consultar la Knowledge Base. Intenta de nuevo.",
    });
  }
};
