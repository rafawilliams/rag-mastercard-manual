import {
  BedrockAgentRuntimeClient,
  RetrieveAndGenerateCommand,
  type RetrieveAndGenerateCommandOutput,
} from "@aws-sdk/client-bedrock-agent-runtime";

const client = new BedrockAgentRuntimeClient({
  region: process.env.AWS_REGION ?? "us-east-1",
});

export interface Citation {
  text: string;
  location: string;
}

export interface ChatResponse {
  answer: string;
  citations: Citation[];
  sessionId?: string;
}

export async function retrieveAndGenerate(
  message: string,
  sessionId?: string
): Promise<ChatResponse> {
  const command = new RetrieveAndGenerateCommand({
    input: { text: message },
    retrieveAndGenerateConfiguration: {
      type: "KNOWLEDGE_BASE",
      knowledgeBaseConfiguration: {
        knowledgeBaseId: process.env.BEDROCK_KNOWLEDGE_BASE_ID!,
        modelArn: process.env.BEDROCK_MODEL_ARN!,
      },
    },
    // Bedrock only accepts a sessionId it issued itself in a prior response;
    // omit it to start a new session instead of passing a client-generated id.
    sessionId: sessionId || undefined,
  });

  const response = await client.send(command);

  return {
    answer: response.output?.text ?? "",
    citations: mapCitations(response),
    sessionId: response.sessionId,
  };
}

function mapCitations(response: RetrieveAndGenerateCommandOutput): Citation[] {
  const citations: Citation[] = [];
  for (const citation of response.citations ?? []) {
    for (const ref of citation.retrievedReferences ?? []) {
      citations.push({
        text: ref.content?.text ?? "",
        location: ref.location?.s3Location?.uri ?? "",
      });
    }
  }
  return citations;
}
