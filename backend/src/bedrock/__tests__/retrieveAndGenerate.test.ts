import {
  BedrockAgentRuntimeClient,
  RetrieveAndGenerateCommand,
} from "@aws-sdk/client-bedrock-agent-runtime";
import { mockClient } from "aws-sdk-client-mock";
import { retrieveAndGenerate } from "../retrieveAndGenerate";

const bedrockMock = mockClient(BedrockAgentRuntimeClient);

beforeEach(() => {
  bedrockMock.reset();
  process.env.BEDROCK_KNOWLEDGE_BASE_ID = "test-kb-id";
  process.env.BEDROCK_MODEL_ARN =
    "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0";
  process.env.AWS_REGION = "us-east-1";
});

test("returns answer and citations from Bedrock response", async () => {
  bedrockMock.on(RetrieveAndGenerateCommand).resolves({
    output: { text: "Las tarifas son 2.5% por transacción." },
    citations: [
      {
        retrievedReferences: [
          {
            content: { text: "La tarifa estándar es 2.5%." },
            location: {
              type: "S3",
              s3Location: { uri: "s3://manuals/fees.pdf" },
            },
          },
        ],
      },
    ],
    $metadata: {},
  });

  const result = await retrieveAndGenerate(
    "¿Cuáles son las tarifas?",
    "session-123"
  );

  expect(result.answer).toBe("Las tarifas son 2.5% por transacción.");
  expect(result.citations).toHaveLength(1);
  expect(result.citations[0].location).toBe("s3://manuals/fees.pdf");
  expect(result.citations[0].text).toBe("La tarifa estándar es 2.5%.");
});

test("returns empty citations when Bedrock returns none", async () => {
  bedrockMock.on(RetrieveAndGenerateCommand).resolves({
    output: { text: "No encontré información relevante." },
    citations: [],
    $metadata: {},
  });

  const result = await retrieveAndGenerate("pregunta sin fuentes", "session-456");

  expect(result.answer).toBe("No encontré información relevante.");
  expect(result.citations).toEqual([]);
});

test("returns empty answer when Bedrock output is undefined", async () => {
  bedrockMock.on(RetrieveAndGenerateCommand).resolves({
    $metadata: {},
  });

  const result = await retrieveAndGenerate("pregunta", "session-789");

  expect(result.answer).toBe("");
  expect(result.citations).toEqual([]);
});

test("omits sessionId from the Bedrock command when none is provided", async () => {
  bedrockMock.on(RetrieveAndGenerateCommand).resolves({
    output: { text: "Respuesta" },
    citations: [],
    sessionId: "new-session-from-bedrock",
    $metadata: {},
  });

  const result = await retrieveAndGenerate("primera pregunta");

  const call = bedrockMock.commandCalls(RetrieveAndGenerateCommand)[0];
  expect(call.args[0].input.sessionId).toBeUndefined();
  expect(result.sessionId).toBe("new-session-from-bedrock");
});
