# Mastercard Manuals Chatbot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir un chatbot en React que permite a usuarios preguntar sobre manuales de Mastercard usando Amazon Bedrock Knowledge Bases (RAG), con las respuestas servidas a través de un backend Lambda + API Gateway.

**Architecture:** Frontend React/Vite (Amplify) → `POST /chat` → Lambda → `bedrock-agent-runtime.RetrieveAndGenerate` → Bedrock KB (S3 + OpenSearch Serverless). El frontend nunca toca AWS directamente.

**Tech Stack:** React 18, Vite, TypeScript, AWS SAM, Lambda (Node 20), `@aws-sdk/client-bedrock-agent-runtime`, AWS Amplify (hosting), Jest, `aws-sdk-client-mock`, Vitest + React Testing Library.

---

## File Structure

```
rag-aws/
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── chatApi.ts          # fetch wrapper para POST /chat
│   │   ├── components/Chat/
│   │   │   ├── ChatContainer.tsx   # wrapper principal, usa useChat
│   │   │   ├── CitationList.tsx    # lista de fuentes de un mensaje
│   │   │   ├── InputBar.tsx        # textarea + botón enviar
│   │   │   ├── MessageBubble.tsx   # burbuja individual (user/assistant)
│   │   │   └── MessageList.tsx     # lista de mensajes + auto-scroll
│   │   ├── hooks/
│   │   │   └── useChat.ts          # estado del chat + llamada a API
│   │   ├── types/
│   │   │   └── chat.ts             # interfaces TypeScript compartidas
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── .env.local                  # VITE_API_URL (solo URL del backend)
│   ├── amplify.yml                 # build config para Amplify
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── backend/
│   ├── src/
│   │   ├── bedrock/
│   │   │   ├── __tests__/
│   │   │   │   └── retrieveAndGenerate.test.ts
│   │   │   └── retrieveAndGenerate.ts  # única llamada al SDK de Bedrock
│   │   └── handlers/
│   │       ├── __tests__/
│   │       │   └── chat.test.ts
│   │       └── chat.ts             # Lambda handler para POST /chat
│   ├── jest.config.ts
│   ├── package.json
│   ├── samconfig.toml
│   ├── template.yaml               # SAM template (Lambda + API GW)
│   └── tsconfig.json
├── infra/
│   └── s3-setup.sh                 # crea bucket S3 + bloquea acceso público
├── CLAUDE.md
└── README.md
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `frontend/` (vacío por ahora)
- Create: `backend/` (vacío por ahora)
- Create: `infra/` (vacío por ahora)
- Create: `.gitignore`
- Create: `README.md`

- [ ] **Step 1: Inicializar git y crear estructura de carpetas**

```bash
cd C:/apps/AppiA/rag-aws
git init
mkdir -p frontend backend infra
```

- [ ] **Step 2: Crear `.gitignore`**

```
# Node
node_modules/
dist/
.build/
*.js.map

# Env
.env
.env.local
*.env

# AWS SAM
.aws-sam/
samconfig.toml

# OS
.DS_Store
Thumbs.db
```

- [ ] **Step 3: Crear `README.md`**

```markdown
# Mastercard Manuals Chatbot

Chat sobre manuales de Mastercard usando Amazon Bedrock Knowledge Bases.

## Prerrequisitos
- Node.js 20+
- AWS CLI configurado con permisos de administrador
- AWS SAM CLI instalado

## Desarrollo local
```bash
# Backend
cd backend && npm install && sam local start-api

# Frontend
cd frontend && npm install && npm run dev
```
```

- [ ] **Step 4: Primer commit**

```bash
git add .gitignore README.md
git commit -m "chore: initialize project structure"
```

---

## Task 2: S3 Bucket para Manuales

**Files:**
- Create: `infra/s3-setup.sh`

> **Prerrequisito:** Tener AWS CLI configurado. Reemplazar `ACCOUNT_ID` con tu ID de cuenta AWS real.

- [ ] **Step 1: Crear `infra/s3-setup.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail

REGION="${AWS_REGION:-us-east-1}"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
BUCKET_NAME="mastercard-manuals-${ACCOUNT_ID}"

echo "Creando bucket: $BUCKET_NAME en $REGION"

aws s3 mb "s3://${BUCKET_NAME}" --region "$REGION"

aws s3api put-public-access-block \
  --bucket "$BUCKET_NAME" \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

aws s3api put-bucket-versioning \
  --bucket "$BUCKET_NAME" \
  --versioning-configuration Status=Enabled

echo "Bucket listo: s3://${BUCKET_NAME}"
echo "Anota el nombre del bucket para el siguiente paso."
```

- [ ] **Step 2: Ejecutar el script**

```bash
cd infra
chmod +x s3-setup.sh
./s3-setup.sh
```

Salida esperada:
```
Creando bucket: mastercard-manuals-123456789012 en us-east-1
Bucket listo: s3://mastercard-manuals-123456789012
```

- [ ] **Step 3: Subir al menos un manual de prueba en PDF**

```bash
aws s3 cp /ruta/a/manual.pdf s3://mastercard-manuals-ACCOUNT_ID/manuals/
```

- [ ] **Step 4: Commit**

```bash
git add infra/s3-setup.sh
git commit -m "feat: S3 bucket setup script for manuals"
```

---

## Task 3: Bedrock Knowledge Base (Console)

> Esta tarea se hace en la consola de AWS. No hay código que commitear; al final se anotan los IDs en el `.env` del backend.

- [ ] **Step 1: Crear la Knowledge Base en la consola de Bedrock**

  1. Ir a: AWS Console → Amazon Bedrock → Knowledge Bases → **Create knowledge base**
  2. Nombre: `mastercard-manuals-kb`
  3. IAM Role: seleccionar **Create and use a new service role**
  4. Embedding model: **Titan Embeddings G1 - Text** (`amazon.titan-embed-text-v1`)
  5. Vector store: **Amazon OpenSearch Serverless** (crear nueva colección automáticamente)
  6. Data source type: **Amazon S3**
  7. S3 URI: `s3://mastercard-manuals-ACCOUNT_ID/manuals/`
  8. Hacer clic en **Create knowledge base** y esperar ~5 minutos.

- [ ] **Step 2: Sincronizar el data source**

  Una vez creada la KB:
  1. En la KB, ir a **Data sources** → seleccionar el data source S3
  2. Hacer clic en **Sync**
  3. Esperar a que el estado cambie a **Available**

- [ ] **Step 3: Verificar el modelo generador disponible**

  1. Ir a: Bedrock → **Model access**
  2. Verificar que **Claude 3.5 Sonnet** (`anthropic.claude-3-5-sonnet-20241022-v2:0`) tiene acceso **Granted**
  3. Si no, solicitar acceso y esperar aprobación (puede ser inmediata o tardar horas)

- [ ] **Step 4: Anotar IDs necesarios**

  Copiar estos valores para usar en el backend:

  | Variable | Dónde encontrarlo |
  |---|---|
  | `BEDROCK_KNOWLEDGE_BASE_ID` | Bedrock → Knowledge Bases → tu KB → Overview → Knowledge base ID |
  | `BEDROCK_MODEL_ARN` | `arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0` (o el model ID habilitado) |
  | `S3_MANUALS_BUCKET` | `mastercard-manuals-ACCOUNT_ID` |

---

## Task 4: Backend — Configuración del Proyecto

**Files:**
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/jest.config.ts`

- [ ] **Step 1: Crear `backend/package.json`**

```json
{
  "name": "mastercard-chatbot-backend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "build": "tsc --noEmit",
    "test": "jest",
    "test:watch": "jest --watch"
  },
  "dependencies": {
    "@aws-sdk/client-bedrock-agent-runtime": "^3.600.0"
  },
  "devDependencies": {
    "@types/aws-lambda": "^8.10.140",
    "@types/jest": "^29.5.12",
    "@types/node": "^20.14.0",
    "aws-sdk-client-mock": "^4.0.1",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.5",
    "typescript": "^5.5.2"
  }
}
```

- [ ] **Step 2: Crear `backend/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "dist",
    "rootDir": "src",
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Crear `backend/jest.config.ts`**

```typescript
import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.ts"],
  clearMocks: true,
};

export default config;
```

- [ ] **Step 4: Instalar dependencias**

```bash
cd backend && npm install
```

Salida esperada: `added N packages` sin errores.

- [ ] **Step 5: Commit**

```bash
git add backend/package.json backend/package-lock.json backend/tsconfig.json backend/jest.config.ts
git commit -m "feat: backend project setup with TypeScript and Jest"
```

---

## Task 5: Backend — Módulo Bedrock (retrieveAndGenerate)

**Files:**
- Create: `backend/src/bedrock/retrieveAndGenerate.ts`
- Create: `backend/src/bedrock/__tests__/retrieveAndGenerate.test.ts`

- [ ] **Step 1: Crear el test `backend/src/bedrock/__tests__/retrieveAndGenerate.test.ts`**

```typescript
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
            location: { s3Location: { uri: "s3://manuals/fees.pdf" } },
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
```

- [ ] **Step 2: Ejecutar el test — debe fallar**

```bash
cd backend && npx jest src/bedrock/__tests__/retrieveAndGenerate.test.ts --no-coverage
```

Salida esperada: `FAIL — Cannot find module '../retrieveAndGenerate'`

- [ ] **Step 3: Crear `backend/src/bedrock/retrieveAndGenerate.ts`**

```typescript
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
}

export async function retrieveAndGenerate(
  message: string,
  sessionId: string
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
    sessionId,
  });

  const response = await client.send(command);

  return {
    answer: response.output?.text ?? "",
    citations: mapCitations(response),
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
```

- [ ] **Step 4: Ejecutar el test — debe pasar**

```bash
cd backend && npx jest src/bedrock/__tests__/retrieveAndGenerate.test.ts --no-coverage
```

Salida esperada:
```
PASS src/bedrock/__tests__/retrieveAndGenerate.test.ts
  ✓ returns answer and citations from Bedrock response
  ✓ returns empty citations when Bedrock returns none
  ✓ returns empty answer when Bedrock output is undefined
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/
git commit -m "feat: Bedrock retrieveAndGenerate module with tests"
```

---

## Task 6: Backend — Lambda Handler

**Files:**
- Create: `backend/src/handlers/chat.ts`
- Create: `backend/src/handlers/__tests__/chat.test.ts`

- [ ] **Step 1: Crear el test `backend/src/handlers/__tests__/chat.test.ts`**

```typescript
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
```

- [ ] **Step 2: Ejecutar el test — debe fallar**

```bash
cd backend && npx jest src/handlers/__tests__/chat.test.ts --no-coverage
```

Salida esperada: `FAIL — Cannot find module '../chat'`

- [ ] **Step 3: Crear `backend/src/handlers/chat.ts`**

```typescript
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
```

- [ ] **Step 4: Ejecutar todos los tests del backend — deben pasar**

```bash
cd backend && npx jest --no-coverage
```

Salida esperada:
```
PASS src/bedrock/__tests__/retrieveAndGenerate.test.ts (3 tests)
PASS src/handlers/__tests__/chat.test.ts (8 tests)
Test Suites: 2 passed, 2 total
Tests:       11 passed, 11 total
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/handlers/
git commit -m "feat: Lambda chat handler with error handling and CORS"
```

---

## Task 7: Backend — SAM Template y Configuración

**Files:**
- Create: `backend/template.yaml`
- Create: `backend/samconfig.toml`
- Create: `backend/.env` (no se commitea)

- [ ] **Step 1: Crear `backend/template.yaml`**

```yaml
AWSTemplateFormatVersion: "2010-09-09"
Transform: AWS::Serverless-2016-10-31
Description: Mastercard Manuals Chatbot Backend

Globals:
  Function:
    Timeout: 30
    Runtime: nodejs20.x
    Architectures:
      - x86_64

Parameters:
  KnowledgeBaseId:
    Type: String
    Description: Bedrock Knowledge Base ID
  ModelArn:
    Type: String
    Description: Bedrock generator model ARN (ej. arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0)
  FrontendOrigin:
    Type: String
    Description: "Origin del frontend para CORS (ej: https://main.abc123.amplifyapp.com)"
    Default: "*"

Resources:
  ChatFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: ./
      Handler: src/handlers/chat.handler
      Environment:
        Variables:
          BEDROCK_KNOWLEDGE_BASE_ID: !Ref KnowledgeBaseId
          BEDROCK_MODEL_ARN: !Ref ModelArn
          FRONTEND_ORIGIN: !Ref FrontendOrigin
      Policies:
        - Statement:
            - Effect: Allow
              Action:
                - bedrock:RetrieveAndGenerate
                - bedrock:Retrieve
                - bedrock:InvokeModel
              Resource: "*"
      Events:
        ChatPost:
          Type: Api
          Properties:
            Path: /chat
            Method: post
        ChatOptions:
          Type: Api
          Properties:
            Path: /chat
            Method: options

Outputs:
  ApiUrl:
    Description: API Gateway endpoint URL
    Value: !Sub "https://${ServerlessRestApi}.execute-api.${AWS::Region}.amazonaws.com/Prod"
  ChatFunctionArn:
    Description: Lambda function ARN
    Value: !GetAtt ChatFunction.Arn
```

- [ ] **Step 2: Agregar `Metadata` de esbuild a `ChatFunction` en `template.yaml`**

  Añadir este bloque justo después de `Properties:` en `ChatFunction`, al mismo nivel que `Properties`:

```yaml
    Metadata:
      BuildMethod: esbuild
      BuildProperties:
        Minify: false
        Target: es2020
        Sourcemap: true
        EntryPoints:
          - src/handlers/chat.ts
        External:
          - "@aws-sdk/client-bedrock-agent-runtime"
```

  El `template.yaml` completo de `ChatFunction` debe verse así:

```yaml
  ChatFunction:
    Type: AWS::Serverless::Function
    Metadata:
      BuildMethod: esbuild
      BuildProperties:
        Minify: false
        Target: es2020
        Sourcemap: true
        EntryPoints:
          - src/handlers/chat.ts
        External:
          - "@aws-sdk/client-bedrock-agent-runtime"
    Properties:
      CodeUri: ./
      Handler: src/handlers/chat.handler
      Environment:
        Variables:
          BEDROCK_KNOWLEDGE_BASE_ID: !Ref KnowledgeBaseId
          BEDROCK_MODEL_ARN: !Ref ModelArn
          FRONTEND_ORIGIN: !Ref FrontendOrigin
      Policies:
        - Statement:
            - Effect: Allow
              Action:
                - bedrock:RetrieveAndGenerate
                - bedrock:Retrieve
                - bedrock:InvokeModel
              Resource: "*"
      Events:
        ChatPost:
          Type: Api
          Properties:
            Path: /chat
            Method: post
        ChatOptions:
          Type: Api
          Properties:
            Path: /chat
            Method: options
```

- [ ] **Step 3: Crear `backend/samconfig.toml`**

  > Reemplazar `YOUR_REGION` (ej. `us-east-1`) y `YOUR_S3_BUCKET` con un bucket de SAM deployment (diferente al de manuales).

```toml
version = 0.1

[default.global.parameters]
stack_name = "mastercard-manuals-chatbot"

[default.build.parameters]
cached = true
parallel = true

[default.deploy.parameters]
capabilities = "CAPABILITY_IAM"
confirm_changeset = true
resolve_s3 = true
region = "YOUR_REGION"
parameter_overrides = [
  "KnowledgeBaseId=TU_KB_ID_AQUI",
  "ModelArn=arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0",
  "FrontendOrigin=*"
]
```

- [ ] **Step 4: Crear `backend/.env` (local dev, no commitear)**

```bash
AWS_REGION=us-east-1
BEDROCK_KNOWLEDGE_BASE_ID=TU_KB_ID_AQUI
BEDROCK_MODEL_ARN=arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0
S3_MANUALS_BUCKET=mastercard-manuals-ACCOUNT_ID
FRONTEND_ORIGIN=http://localhost:5173
```

- [ ] **Step 5: Verificar que `.env` está en `.gitignore`** (ya lo agregamos en Task 1)

- [ ] **Step 6: Commit**

```bash
git add backend/template.yaml backend/samconfig.toml
git commit -m "feat: SAM template for Lambda + API Gateway deployment"
```

---

## Task 8: Backend — Prueba Local con SAM

> **Prerrequisito:** AWS SAM CLI instalado (`sam --version` debe funcionar). Credenciales AWS configuradas con permisos de Bedrock.

- [ ] **Step 1: Build del backend**

```bash
cd backend && sam build
```

Salida esperada:
```
Build Succeeded
Built Artifacts  : .aws-sam/build
```

- [ ] **Step 2: Crear `backend/events/chat-request.json` para prueba local**

```json
{
  "httpMethod": "POST",
  "body": "{\"message\": \"¿Cuáles son las tarifas de Mastercard?\", \"sessionId\": \"local-test-001\"}",
  "headers": {
    "Content-Type": "application/json"
  },
  "path": "/chat",
  "queryStringParameters": null,
  "pathParameters": null,
  "requestContext": {},
  "resource": "",
  "isBase64Encoded": false,
  "multiValueHeaders": {},
  "stageVariables": null,
  "multiValueQueryStringParameters": null
}
```

- [ ] **Step 3: Invocar la función localmente (requiere KB real en .env)**

```bash
cd backend && sam local invoke ChatFunction \
  --event events/chat-request.json \
  --env-vars .env
```

Salida esperada (con KB real configurada):
```json
{"statusCode": 200, "body": "{\"answer\":\"...\",\"citations\":[...]}"}
```

- [ ] **Step 4: Iniciar API local para prueba end-to-end**

```bash
cd backend && sam local start-api --env-vars .env --port 3001
```

Probar con:
```bash
curl -X POST http://localhost:3001/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"¿Qué son las tarifas?","sessionId":"test-001"}'
```

- [ ] **Step 5: Commit del evento de prueba**

```bash
git add backend/events/
git commit -m "chore: add SAM local test event for chat endpoint"
```

---

## Task 9: Deploy del Backend

- [ ] **Step 1: Actualizar `samconfig.toml` con valores reales**

  Editar `backend/samconfig.toml` y reemplazar:
  - `TU_KB_ID_AQUI` → el Knowledge Base ID obtenido en Task 3
  - `YOUR_REGION` → tu región AWS (ej. `us-east-1`)

- [ ] **Step 2: Deploy**

```bash
cd backend && sam build && sam deploy
```

  Confirmar el changeset cuando pregunte: `y`

  Salida esperada al final:
  ```
  CloudFormation outputs from deployed stack
  -------------------------------------------------------
  Key     ApiUrl
  Value   https://ABCDEFG.execute-api.us-east-1.amazonaws.com/Prod
  ```

- [ ] **Step 3: Anotar la URL de la API**

  Guardar la URL (`ApiUrl`) — se usará como `VITE_API_URL` en el frontend.

- [ ] **Step 4: Probar el endpoint desplegado**

```bash
curl -X POST https://TU_API_URL/Prod/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"¿Qué son las tarifas de Mastercard?","sessionId":"deploy-test-001"}'
```

  Salida esperada: `{"answer":"...","citations":[...]}`

---

## Task 10: Frontend — Scaffold con Vite

**Files:**
- Create: `frontend/` (generado por Vite)
- Modify: `frontend/vite.config.ts`
- Create: `frontend/.env.local`

- [ ] **Step 1: Crear proyecto React + TypeScript**

```bash
cd C:/apps/AppiA/rag-aws
npm create vite@latest frontend -- --template react-ts
cd frontend && npm install
```

- [ ] **Step 2: Instalar dependencias adicionales**

```bash
cd frontend && npm install uuid
npm install -D @types/uuid vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

- [ ] **Step 3: Reemplazar `frontend/vite.config.ts`**

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
```

- [ ] **Step 4: Crear `frontend/src/test/setup.ts`**

```typescript
import "@testing-library/jest-dom";
```

- [ ] **Step 5: Crear `frontend/.env.local`**

```
VITE_API_URL=http://localhost:3001
```

  > En producción (Amplify), este valor será la URL de API Gateway.

- [ ] **Step 6: Actualizar `frontend/package.json` — agregar script de test**

  En la sección `"scripts"`, agregar:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 7: Verificar que el proyecto corre**

```bash
cd frontend && npm run dev
```

  Abrir `http://localhost:5173` — debe aparecer la página por defecto de Vite + React.

- [ ] **Step 8: Commit**

```bash
git add frontend/
git commit -m "feat: frontend scaffold with Vite + React + TypeScript"
```

---

## Task 11: Frontend — Tipos y API Client

**Files:**
- Create: `frontend/src/types/chat.ts`
- Create: `frontend/src/api/chatApi.ts`
- Create: `frontend/src/api/__tests__/chatApi.test.ts`

- [ ] **Step 1: Crear `frontend/src/types/chat.ts`**

```typescript
export interface Citation {
  text: string;
  location: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  timestamp: Date;
}

export interface ChatRequest {
  message: string;
  sessionId: string;
}

export interface ChatResponse {
  answer: string;
  citations: Citation[];
}
```

- [ ] **Step 2: Crear test `frontend/src/api/__tests__/chatApi.test.ts`**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendMessage } from "../chatApi";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const mockEnv = { VITE_API_URL: "http://localhost:3001" };
vi.stubGlobal("import.meta", { env: mockEnv });

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

    expect(mockFetch).toHaveBeenCalledWith("http://localhost:3001/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "¿Tarifas?", sessionId: "test-session" }),
    });
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
```

- [ ] **Step 3: Ejecutar tests — deben fallar**

```bash
cd frontend && npm test
```

Salida esperada: `FAIL — Cannot find module '../chatApi'`

- [ ] **Step 4: Crear `frontend/src/api/chatApi.ts`**

```typescript
import type { ChatRequest, ChatResponse } from "../types/chat";

const API_URL = import.meta.env.VITE_API_URL;

export async function sendMessage(req: ChatRequest): Promise<ChatResponse> {
  const res = await fetch(`${API_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Error desconocido" }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }

  return res.json();
}
```

- [ ] **Step 5: Ejecutar tests — deben pasar**

```bash
cd frontend && npm test
```

Salida esperada: `✓ chatApi.test.ts (2 tests)`

- [ ] **Step 6: Commit**

```bash
git add frontend/src/types/ frontend/src/api/
git commit -m "feat: chat types and API client"
```

---

## Task 12: Frontend — Componentes de Chat

**Files:**
- Create: `frontend/src/components/Chat/InputBar.tsx`
- Create: `frontend/src/components/Chat/CitationList.tsx`
- Create: `frontend/src/components/Chat/MessageBubble.tsx`
- Create: `frontend/src/components/Chat/MessageList.tsx`
- Create: `frontend/src/components/Chat/ChatContainer.tsx`
- Create: `frontend/src/components/Chat/__tests__/InputBar.test.tsx`
- Create: `frontend/src/components/Chat/__tests__/MessageBubble.test.tsx`

- [ ] **Step 1: Crear test `frontend/src/components/Chat/__tests__/InputBar.test.tsx`**

```typescript
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
```

- [ ] **Step 2: Crear test `frontend/src/components/Chat/__tests__/MessageBubble.test.tsx`**

```typescript
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
```

- [ ] **Step 3: Ejecutar tests — deben fallar**

```bash
cd frontend && npm test
```

- [ ] **Step 4: Crear `frontend/src/components/Chat/CitationList.tsx`**

```tsx
import type { Citation } from "../../types/chat";

interface Props {
  citations: Citation[];
}

export function CitationList({ citations }: Props) {
  if (citations.length === 0) return null;

  return (
    <div style={{ marginTop: 8, fontSize: 12, color: "#666" }}>
      <strong>Fuentes:</strong>
      <ul style={{ margin: "4px 0 0", paddingLeft: 16 }}>
        {citations.map((c, i) => {
          const filename = c.location.split("/").pop() ?? c.location;
          return (
            <li key={i} title={c.text}>
              {filename}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
```

- [ ] **Step 5: Crear `frontend/src/components/Chat/MessageBubble.tsx`**

```tsx
import type { Message } from "../../types/chat";
import { CitationList } from "./CitationList";

interface Props {
  message: Message;
}

const styles: Record<string, React.CSSProperties> = {
  user: {
    alignSelf: "flex-end",
    background: "#0070f3",
    color: "#fff",
    borderRadius: "12px 12px 2px 12px",
    padding: "10px 14px",
    maxWidth: "75%",
  },
  assistant: {
    alignSelf: "flex-start",
    background: "#f0f0f0",
    color: "#111",
    borderRadius: "12px 12px 12px 2px",
    padding: "10px 14px",
    maxWidth: "75%",
  },
};

export function MessageBubble({ message }: Props) {
  return (
    <div style={styles[message.role]}>
      <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{message.content}</p>
      {message.role === "assistant" && message.citations && (
        <CitationList citations={message.citations} />
      )}
    </div>
  );
}
```

- [ ] **Step 6: Crear `frontend/src/components/Chat/MessageList.tsx`**

```tsx
import { useEffect, useRef } from "react";
import type { Message } from "../../types/chat";
import { MessageBubble } from "./MessageBubble";

interface Props {
  messages: Message[];
  loading: boolean;
}

export function MessageList({ messages, loading }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: "16px",
      }}
    >
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
      {loading && (
        <div style={{ alignSelf: "flex-start", color: "#999", fontStyle: "italic" }}>
          Consultando manuales…
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
```

- [ ] **Step 7: Crear `frontend/src/components/Chat/InputBar.tsx`**

```tsx
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
```

- [ ] **Step 8: Crear `frontend/src/components/Chat/ChatContainer.tsx`**

```tsx
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
```

- [ ] **Step 9: Ejecutar todos los tests del frontend**

```bash
cd frontend && npm test
```

Salida esperada:
```
✓ chatApi.test.ts (2 tests)
✓ InputBar.test.tsx (4 tests)
✓ MessageBubble.test.tsx (3 tests)
Test Files: 3 passed
```

- [ ] **Step 10: Commit**

```bash
git add frontend/src/components/
git commit -m "feat: chat UI components (InputBar, MessageBubble, CitationList, MessageList, ChatContainer)"
```

---

## Task 13: Frontend — Hook useChat

**Files:**
- Create: `frontend/src/hooks/useChat.ts`
- Create: `frontend/src/hooks/__tests__/useChat.test.ts`

- [ ] **Step 1: Crear test `frontend/src/hooks/__tests__/useChat.test.ts`**

```typescript
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
    expect(result.current.messages).toHaveLength(1); // solo el mensaje del usuario
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
```

- [ ] **Step 2: Ejecutar tests — deben fallar**

```bash
cd frontend && npm test
```

- [ ] **Step 3: Crear `frontend/src/hooks/useChat.ts`**

```typescript
import { useState, useCallback, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import type { Message } from "../types/chat";
import { sendMessage } from "../api/chatApi";

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionId = useRef<string>(uuidv4());

  const send = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = {
      id: uuidv4(),
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    setError(null);

    try {
      const response = await sendMessage({
        message: text.trim(),
        sessionId: sessionId.current,
      });

      const assistantMsg: Message = {
        id: uuidv4(),
        role: "assistant",
        content: response.answer,
        citations: response.citations,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al enviar el mensaje"
      );
    } finally {
      setLoading(false);
    }
  }, [loading]);

  return { messages, loading, error, send };
}
```

- [ ] **Step 4: Ejecutar todos los tests del frontend**

```bash
cd frontend && npm test
```

Salida esperada:
```
✓ chatApi.test.ts (2 tests)
✓ InputBar.test.tsx (4 tests)
✓ MessageBubble.test.tsx (3 tests)
✓ useChat.test.ts (5 tests)
Test Files: 4 passed, Tests: 14 passed
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/
git commit -m "feat: useChat hook with session management and error handling"
```

---

## Task 14: Frontend — App Integration

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/index.css`

- [ ] **Step 1: Reemplazar `frontend/src/App.tsx`**

```tsx
import { ChatContainer } from "./components/Chat/ChatContainer";

export default function App() {
  return <ChatContainer />;
}
```

- [ ] **Step 2: Reemplazar `frontend/src/index.css`**

```css
*, *::before, *::after {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: #fafafa;
}
```

- [ ] **Step 3: Verificar en el navegador (con SAM local corriendo)**

  Terminal 1:
  ```bash
  cd backend && sam local start-api --env-vars .env --port 3001
  ```

  Terminal 2:
  ```bash
  cd frontend && npm run dev
  ```

  Abrir `http://localhost:5173`, enviar una pregunta y verificar que:
  - El mensaje del usuario aparece a la derecha
  - El indicador "Consultando manuales…" aparece mientras carga
  - La respuesta y las fuentes aparecen a la izquierda

- [ ] **Step 4: Commit**

```bash
git add frontend/src/App.tsx frontend/src/index.css
git commit -m "feat: integrate chat into App — full chat UI working"
```

---

## Task 15: Deploy Frontend a AWS Amplify

**Files:**
- Create: `frontend/amplify.yml`

- [ ] **Step 1: Crear `frontend/amplify.yml`**

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - cd frontend
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: frontend/dist
    files:
      - "**/*"
  cache:
    paths:
      - frontend/node_modules/**/*
```

- [ ] **Step 2: Hacer push del repositorio a GitHub (o CodeCommit)**

```bash
git remote add origin https://github.com/TU_USUARIO/mastercard-manuals-chatbot.git
git push -u origin main
```

- [ ] **Step 3: Conectar a AWS Amplify**

  1. Ir a: AWS Console → AWS Amplify → **New app** → **Host web app**
  2. Conectar con GitHub → seleccionar el repositorio
  3. Branch: `main`
  4. Build settings: Amplify detectará el `amplify.yml` automáticamente
  5. Agregar variable de entorno:
     - `VITE_API_URL` = `https://TU_API_ID.execute-api.us-east-1.amazonaws.com/Prod`
  6. Hacer clic en **Save and deploy**

- [ ] **Step 4: Actualizar CORS en el backend con el dominio de Amplify**

  Una vez que Amplify asigne el dominio (ej. `https://main.abc123.amplifyapp.com`):

  Editar `backend/samconfig.toml`:
  ```toml
  parameter_overrides = [
    "KnowledgeBaseId=TU_KB_ID",
    "ModelArn=arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0",
    "FrontendOrigin=https://main.abc123.amplifyapp.com"
  ]
  ```

  Re-deploy:
  ```bash
  cd backend && sam build && sam deploy
  ```

- [ ] **Step 5: Verificar en producción**

  Abrir la URL de Amplify, enviar una pregunta y confirmar que:
  - El chatbot responde
  - Las fuentes/citas se muestran
  - No hay errores CORS en la consola del navegador

- [ ] **Step 6: Commit final**

```bash
git add frontend/amplify.yml backend/samconfig.toml
git commit -m "feat: Amplify build config and production CORS setup"
git push
```

---

## Checklist de Spec Coverage

- [x] Frontend → backend → Bedrock (nunca directo desde frontend)
- [x] `POST /api/chat` con `{ message, sessionId }`
- [x] Backend devuelve `{ answer, citations }`
- [x] Citations mostradas en el chat
- [x] Manejo de errores Bedrock (throttling, error genérico)
- [x] Variables de entorno, sin hardcodear credenciales
- [x] S3 bucket privado (script en Task 2)
- [x] IAM permisos mínimos en SAM policy (solo Bedrock, no wildcard en acciones sensibles)
- [x] CORS configurado con el dominio de Amplify en producción
- [x] TypeScript en frontend y backend
- [x] Llamadas AWS SDK encapsuladas en `backend/src/bedrock/`
- [x] Componentes de chat en `frontend/src/components/Chat/`
