import type { APIGatewayProxyEvent } from "aws-lambda";
import { handler } from "../chat";
import { retrieveAndGenerate } from "../../bedrock/retrieveAndGenerate";

jest.mock("../../bedrock/retrieveAndGenerate");
const mockRetrieve = retrieveAndGenerate as jest.MockedFunction<
  typeof retrieveAndGenerate
>;

function makeEvent(
  body: unknown,
  method = "POST"
): APIGatewayProxyEvent {
  return {
    httpMethod: method,
    body: body !== null ? JSON.stringify(body) : null,
    headers: {},
    multiValueHeaders: {},
    isBase64Encoded: false,
    path: "/chat",
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    requestContext: {} as APIGatewayProxyEvent["requestContext"],
    resource: "",
    stageVariables: null,
  };
}

test("returns 200 with answer and citations on valid request", async () => {
  mockRetrieve.mockResolvedValueOnce({
    answer: "Respuesta de prueba",
    citations: [{ text: "fuente", location: "s3://bucket/file.pdf" }],
  });

  const result = await handler(
    makeEvent({ message: "¿Qué son las tarifas?", sessionId: "abc-123" })
  );

  expect(result.statusCode).toBe(200);
  const body = JSON.parse(result.body);
  expect(body.answer).toBe("Respuesta de prueba");
  expect(body.citations).toHaveLength(1);
});

test("returns 400 when body is null", async () => {
  const result = await handler(makeEvent(null));
  expect(result.statusCode).toBe(400);
});

test("returns 400 when message is missing", async () => {
  const result = await handler(makeEvent({ sessionId: "abc-123" }));
  expect(result.statusCode).toBe(400);
});

test("returns 400 when sessionId is missing", async () => {
  const result = await handler(makeEvent({ message: "hola" }));
  expect(result.statusCode).toBe(400);
});

test("returns 400 on invalid JSON body", async () => {
  const event = makeEvent(null);
  event.body = "no es json{{{";
  const result = await handler(event);
  expect(result.statusCode).toBe(400);
});

test("returns 429 on ThrottlingException", async () => {
  mockRetrieve.mockRejectedValueOnce(
    new Error("ThrottlingException: Rate exceeded")
  );
  const result = await handler(
    makeEvent({ message: "pregunta", sessionId: "abc-123" })
  );
  expect(result.statusCode).toBe(429);
});

test("returns 500 on generic Bedrock error", async () => {
  mockRetrieve.mockRejectedValueOnce(new Error("Internal service error"));
  const result = await handler(
    makeEvent({ message: "pregunta", sessionId: "abc-123" })
  );
  expect(result.statusCode).toBe(500);
});

test("returns 200 on OPTIONS preflight", async () => {
  const result = await handler(makeEvent({}, "OPTIONS"));
  expect(result.statusCode).toBe(200);
});
