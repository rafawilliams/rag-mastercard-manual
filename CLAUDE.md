# Mastercard Manuals Chatbot

Chatbot en React que responde preguntas sobre manuales de Mastercard usando AWS Bedrock Knowledge Bases (RAG). Este documento orienta a Claude Code para construir y mantener el proyecto.

## Objetivo

Un chat donde el usuario pregunta sobre contenido de los manuales de Mastercard y recibe respuestas generadas por un modelo de Bedrock, apoyadas en fragmentos recuperados de una Knowledge Base (S3 + vector store), con citas a la fuente.

## Arquitectura

```
React (frontend)  -->  API propia (backend)  -->  Bedrock Agent Runtime
                                                     - RetrieveAndGenerate
                                                     - Knowledge Base (S3 + vector store)
```

Reglas fijas de arquitectura (no cambiar sin discutirlo):

- El frontend NUNCA llama a AWS directamente ni contiene credenciales. Todas las llamadas a Bedrock pasan por el backend.
- El backend es la única capa con permisos IAM para `bedrock:RetrieveAndGenerate` / `bedrock:InvokeModel` / lectura de la Knowledge Base.
- Los manuales viven en S3 y se indexan solo a través de la Knowledge Base de Bedrock (no se reimplementa chunking/embeddings a mano).

## Stack técnico

- **Frontend:** React (Vite), fetch/axios para llamar al backend.
- **Backend:** Node.js/Express o AWS Lambda + API Gateway (usar lo que ya exista en el repo; si no hay nada, preferir Lambda + API Gateway para desplegar junto con el resto en AWS).
- **IA/RAG:** Amazon Bedrock Knowledge Bases, modelo de embeddings Titan, vector store OpenSearch Serverless.
- **Modelo generador:** Claude en Bedrock (verificar el model ID habilitado en la cuenta antes de asumir uno).
- **Infraestructura:** S3 (manuales), IAM (roles/políticas), API Gateway/Lambda o contenedor.

## Estructura de carpetas esperada

```
/frontend        React app (chat UI)
/backend         API que llama a Bedrock (Lambda handlers o servidor Express)
/infra           IaC opcional (CDK/Terraform) para KB, S3, IAM, Lambda
CLAUDE.md
README.md
```

Si el repo aún no tiene esta estructura, crearla al iniciar el proyecto.

## Variables de entorno (backend)

```
AWS_REGION=
BEDROCK_KNOWLEDGE_BASE_ID=
BEDROCK_MODEL_ARN=          # modelo generador usado en RetrieveAndGenerate
S3_MANUALS_BUCKET=
```

Nunca hardcodear estos valores ni credenciales de AWS en el código. Usar `.env` (backend) y `.env.local` (frontend, solo para la URL del backend, jamás para secretos de AWS).

## Flujo de una pregunta del usuario

1. React envía `POST /api/chat` con `{ message, sessionId }` al backend.
2. El backend llama a `bedrock-agent-runtime.RetrieveAndGenerate` con `knowledgeBaseId` y `modelArn`.
3. El backend devuelve `{ answer, citations }` (citations = fragmentos/fuentes de los manuales).
4. React muestra la respuesta y las fuentes debajo del mensaje.

## Comandos de desarrollo

Ajustar según lo que exista realmente en el repo; completar esta sección la primera vez que se configure el proyecto.

```
# Frontend
cd frontend && npm install && npm run dev

# Backend
cd backend && npm install && npm run dev
```

## Convenciones de código

- TypeScript preferido en frontend y backend si el proyecto lo permite.
- Componentes de chat en `frontend/src/components/Chat/`.
- Toda llamada a AWS SDK vive en `backend/src/bedrock/` — no dispersar llamadas a Bedrock por el código.
- Manejar errores de Bedrock (throttling, KB no sincronizada) mostrando un mensaje claro en el chat, no un stack trace.

## Seguridad

- Datos de manuales de Mastercard son sensibles: el bucket S3 y la Knowledge Base deben ser privados, sin acceso público.
- Activar logging de invocaciones de Bedrock para auditoría.
- Revisar CORS del backend para permitir solo el dominio del frontend desplegado.

## Pendientes / decisiones a confirmar con el usuario

- ID de la Knowledge Base y del modelo generador una vez creados en la consola de Bedrock.
- Si el backend será Lambda+API Gateway o un servidor Express tradicional.
- Dónde se desplegará el frontend (Amplify, S3+CloudFront, Vercel).
