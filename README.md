# xoin

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/kanha95/xoin-js/main/assets/XOIN_LOGO_RACT.png" />
    <img src="https://raw.githubusercontent.com/kanha95/xoin-js/main/assets/XOIN_LOGO_LIGHT_BG.png" alt="xoin — JavaScript LLM API client: OpenAI, Anthropic Claude, Gemini, Mistral, DeepSeek, OpenAI-compatible APIs, Zod structured outputs, embeddings, RAG" width="240" />
  </picture>
</p>

<p align="center">
  <strong>JavaScript / Node.js LLM client for OpenAI, Claude, Gemini, Deepseek &amp; More</strong> — multi-provider chat completions, structured outputs, text embeddings, prompt templates, and provider fallback for production backends.
</p>

<p align="center">
  <img alt="Open Source" src="https://img.shields.io/badge/open%20source-yes-22c55e">
  <img alt="Free to Use" src="https://img.shields.io/badge/free%20to%20use-yes-0ea5e9">
  <img alt="JavaScript" src="https://img.shields.io/badge/javascript-friendly-f59e0b">
  <img alt="Structured Output" src="https://img.shields.io/badge/structured%20output-zod%20validated-8b5cf6">
</p>

**xoin** is an open source **LLM API client** for **JavaScript** and **TypeScript** that lets you connect to multiple AI providers—**OpenAI**, **Anthropic**, **Gemini**, **Mistral**, **DeepSeek**, and **OpenAI-compatible** APIs—through a **single, consistent interface**.

It helps you build **production-ready AI apps** with:

✅ **Chat Completions API** (OpenAI-style)  
✅ **Structured output** using **Zod** (JSON validation)  
✅ **Text embeddings** for semantic search & **RAG**  
✅ **Prompt templates** (file-based and inline)  
✅ **Automatic provider fallback** (failover support)  
✅ **Multi-LLM routing** (avoid vendor lock-in)

Free, open source, and built for production server-side JavaScript (**Node.js**, **Bun**, **Next.js** route handlers, workers).

## Table of Contents

- [Why Xoin](#why-xoin)
- [Installation](#installation)
- [Who It Is For](#who-it-is-for)
- [Works Well In](#works-well-in)
- [Quick Start](#quick-start)
- [Built-in Providers](#built-in-providers)
- [Core Concepts](#core-concepts)
- [API Overview](#api-overview)
- [createXoin Configuration](#createxoin-configuration)
- [generate Parameters](#generate-parameters)
- [structured Parameters](#structured-parameters)
- [Schema Examples](#schema-examples)
- [generateMany Parameters](#generatemany-parameters)
- [Retry and Fallback Strategy](#retry-and-fallback-strategy)
- [embed Parameters](#embed-parameters)
- [Provider Factory Parameters](#provider-factory-parameters)
- [Examples By Use Case](#examples-by-use-case)
- [Platform Examples](#platform-examples)
- [Template Files](#template-files)
- [Custom Providers](#custom-providers)
- [Error Handling](#error-handling)
- [Native JS Examples](#native-js-examples)
- [Development](#development)

## Why Xoin

Production **Node.js** and server-side JavaScript that talks to **large language model APIs** usually outgrows a single raw `fetch()` or vendor-specific SDK wrapper.

You typically want:

- one **multi-provider LLM client** for OpenAI, Anthropic, Gemini, Mistral, DeepSeek, and **OpenAI-compatible** backends
- **structured outputs** validated with **Zod** before your business logic runs
- **provider fallback** when a model errors or rate-limits
- **prompt templates** (files or inline) so you do not duplicate strings across models
- **text embeddings** for search, RAG, and similarity

**xoin** is built for that workflow: **unified provider access**, **Zod-validated structured outputs**, **embeddings**, **templates**, and **resilient failover**—so you ship dependable AI features without juggling separate SDKs for every vendor.

## Installation

```bash
npm install @xoin/xoin-js zod
```

If your runtime does not automatically load environment variables, you may also want:

```bash
npm install dotenv
```

## Who It Is For

`xoin` is a good fit if you are building:

- Node.js backends that **call LLM APIs** (generation, extraction, classification)
- API routes in Next.js that proxy structured model responses
- Express or Fastify services
- background jobs and worker scripts
- internal tools that need structured extraction
- RAG pipelines that need embeddings

## Works Well In

`xoin` works best in server-side JavaScript environments where your API keys stay private:

- Node.js
- Bun
- Next.js route handlers
- Express
- Fastify
- server-side scripts and cron jobs

For browser apps, use `xoin` through your own backend or API route. Do not expose provider API keys in client-side code.

## Quick Start

Here is a complete example you can adapt or run as-is.

```js
import { z } from 'zod';
import dotenv from 'dotenv';

import { createOpenAIProvider, createXoin } from '@xoin/xoin-js';

dotenv.config();

const userSchema = z.object({
  name: z.string(),
  age: z.number(),
});

const xoin = createXoin({
  providers: {
    openai: createOpenAIProvider({
      apiKey: process.env.OPENAI_API_KEY,
      defaultModel: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
    }),
  },
});

const result = await xoin.generate({
  provider: 'openai',
  prompt: 'Extract a JSON object from: "Ava is 31 years old."',
  structured: {
    name: 'user_profile',
    schema: userSchema,
  },
});

console.log(result.data);
```

Why this is useful:

- you write one prompt
- `xoin` asks the provider for JSON when possible
- `zod` validates the response
- your app receives parsed data in `result.data`

## Built-in Providers

`xoin` ships with helpers for:

- OpenAI
- Anthropic
- Gemini
- Mistral
- DeepSeek
- any OpenAI-compatible API

```js
import dotenv from 'dotenv';

import {
  createAnthropicProvider,
  createDeepSeekProvider,
  createGeminiProvider,
  createMistralProvider,
  createOpenAICompatibleProvider,
  createOpenAIProvider,
  createXoin,
} from '@xoin/xoin-js';

dotenv.config();

const xoin = createXoin({
  defaultProvider: 'openai',
  fallbackProviders: ['anthropic', 'deepseek'],
  providers: {
    openai: createOpenAIProvider({
      apiKey: process.env.OPENAI_API_KEY,
      defaultModel: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
    }),
    anthropic: createAnthropicProvider({
      apiKey: process.env.ANTHROPIC_API_KEY,
      defaultModel: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
    }),
    gemini: createGeminiProvider({
      apiKey: process.env.GEMINI_API_KEY,
      defaultModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      defaultEmbeddingModel: process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004',
    }),
    mistral: createMistralProvider({
      apiKey: process.env.MISTRAL_API_KEY,
      defaultModel: process.env.MISTRAL_MODEL || 'mistral-small-latest',
    }),
    deepseek: createDeepSeekProvider({
      apiKey: process.env.DEEPSEEK_API_KEY,
      defaultModel: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
    }),
    groq: createOpenAICompatibleProvider({
      name: 'groq',
      apiKey: process.env.GROQ_API_KEY,
      baseUrl: process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1',
      defaultModel: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
      structuredOutputs: 'json-object',
      embeddings: false,
    }),
  },
});
```

## Core Concepts

### 1. One Client, Many Providers

Create one `xoin` client and register all the providers your app may use.

### 2. Structured Output First

Instead of parsing loose text by hand, ask for validated JSON using `zod`.

### 3. Fallback Without Extra Glue Code

If one provider fails, `xoin` can move to the next provider automatically.

### 4. Templates For Repeatable Prompts

Store prompts in YAML, JSON, plain text files, or inline config.

### 5. Embeddings In The Same Library

Generate vectors using the same provider abstraction.

## API Overview

Main exports:

- `createXoin`
- `Xoin`
- `createOpenAIProvider`
- `createAnthropicProvider`
- `createGeminiProvider`
- `createMistralProvider`
- `createDeepSeekProvider`
- `createOpenAICompatibleProvider`
- `XoinError`
- `TemplateError`
- `StructuredOutputError`
- `ProviderExecutionError`
- `ProviderConfigurationError`
- `EmbeddingError`
- `AggregateProviderError`

Main methods:

- `xoin.generate(request)`
- `xoin.generateMany(request)`
- `xoin.embed(request)`
- `xoin.registerProvider(name, provider)`

## createXoin Configuration

`createXoin(config)` accepts the following options:

| Parameter | Type | What it does | Example use case |
| --- | --- | --- | --- |
| `providers` | `Record<string, ProviderEntry>` | Registers all providers available to the client. | Add OpenAI and Anthropic to one app. |
| `defaultProvider` | `string` | Provider name used when a request does not specify `provider`. | Make OpenAI your default. |
| `fallbackProviders` | `string[]` | Providers tried after the main provider fails. | Fall back from OpenAI to Anthropic. |
| `templates` | `Record<string, TemplateDefinition>` | Named in-memory templates you can reference with `templateId`. | Store reusable extraction prompts in app config. |
| `fetch` | `typeof fetch` | Custom fetch implementation for testing or special runtimes. | Inject mocked fetch in tests. |

Example:

```js
const xoin = createXoin({
  defaultProvider: 'openai',
  fallbackProviders: ['anthropic'],
  providers: {
    openai: createOpenAIProvider({
      apiKey: process.env.OPENAI_API_KEY,
    }),
    anthropic: createAnthropicProvider({
      apiKey: process.env.ANTHROPIC_API_KEY,
    }),
  },
  templates: {
    support_ticket: {
      template: 'Classify this message: {{message}}',
      defaults: {
        message: '',
      },
    },
  },
});
```

## generate Parameters

`xoin.generate(request)` is the main method for text and structured output.

| Parameter | Type | What it does | Example |
| --- | --- | --- | --- |
| `provider` | `string` | Chooses a specific provider for this request. | `'openai'` |
| `providerOrder` | `string[]` | Adds request-level fallback order. | `['anthropic', 'deepseek']` |
| `providerTargets` | `Array<{ priority: number; provider: string; model?: string }>` | Explicit provider plan sorted by priority. | OpenAI first, Anthropic second, Groq third |
| `model` | `string` | Overrides the provider default model. | `'gpt-4.1-mini'` |
| `prompt` | `string` | Simple one-shot user prompt. | `'Summarize this article.'` |
| `system` | `string` | System instruction added before the user prompt. | `'Answer like a billing assistant.'` |
| `messages` | `ChatMessage[]` | Full chat history when you need multi-turn control. | previous user and assistant messages |
| `template` | `string` | Inline template string with `{{variables}}`. | `'Extract from {{text}}'` |
| `templateId` | `string` | Uses a named template from `createXoin({ templates })`. | `'support_ticket'` |
| `templateFile` | `string` | Loads a template from a file. | `'./templates/extract-user.yaml'` |
| `input` | `Record<string, unknown>` | Values injected into a template. | `{ text: 'Ava is 31.' }` |
| `temperature` | `number` | Sampling control. Lower is more deterministic. | `0` for extraction |
| `maxTokens` | `number` | Upper bound for output tokens. | `300` |
| `timeoutMs` | `number` | Request timeout in milliseconds. | `15000` |
| `metadata` | `Record<string, unknown>` | Extra metadata you want to attach to provider requests. | tracing or audit fields |
| `structured` | `StructuredOutputOptions<T>` | Enables structured parsing and validation. | `{ schema: userSchema }` |
| `providerOptions` | `Record<string, unknown>` | Provider-specific request fields. | pass extra backend options |
| `retry` | `number \| RetryOptions` | Retries the same provider before moving to fallback. | `2` or `{ retries: 2, delayMs: 300 }` |
| `signal` | `AbortSignal` | Abort or cancel a request. | `controller.signal` |

`templateFile` is best used in server-side runtimes because it reads from the filesystem.

Simple text example:

```js
const result = await xoin.generate({
  provider: 'openai',
  prompt: 'Write a short welcome message for a new SaaS customer.',
  temperature: 0.7,
  maxTokens: 120,
});

console.log(result.text);
```

Chat-style example with `messages`:

```js
const result = await xoin.generate({
  provider: 'openai',
  system: 'You are a concise support assistant.',
  messages: [
    { role: 'user', content: 'My payment failed yesterday.' },
    { role: 'assistant', content: 'I can help with that.' },
    { role: 'user', content: 'What should I check first?' },
  ],
});
```

Priority-based fallback example:

```js
const result = await xoin.generate({
  providerTargets: [
    {
      priority: 1,
      provider: 'openai',
      model: 'gpt-4.1-mini',
    },
    {
      priority: 2,
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
    },
    {
      priority: 3,
      provider: 'groq',
      model: 'openai/gpt-oss-120b',
    },
  ],
  prompt: 'Extract the customer profile from this message.',
  structured: {
    schema: userSchema,
  },
});
```

Retry example:

```js
const result = await xoin.generate({
  provider: 'openai',
  retry: {
    retries: 2,
    delayMs: 300,
    backoffMultiplier: 2,
  },
  prompt: 'Extract the invoice summary from this OCR text.',
  structured: {
    schema: invoiceSummarySchema,
  },
});
```

## structured Parameters

Use the `structured` field when you want validated JSON instead of loose text.

| Parameter | Type | What it does | Example |
| --- | --- | --- | --- |
| `schema` | `z.ZodType<T>` | Required validation schema for the response. | `z.object({ name: z.string() })` |
| `jsonSchema` | `JsonSchema` | Optional manual JSON Schema override. | add custom schema details |
| `mode` | `'auto' \| 'native' \| 'prompted'` | Controls how structured output is requested. | `'native'` for providers that support it |
| `name` | `string` | Name of the structured response or tool. | `'shipping_address'` |
| `description` | `string` | Extra explanation for the structured output. | `'Normalized address fields'` |

Mode behavior:

- `auto`: use native structured output when the provider supports it, otherwise use prompt-based JSON instructions
- `native`: require native provider support such as JSON Schema or JSON object mode
- `prompted`: always use prompt instructions and local parsing

Important behavior:

- if the model returns JSON that does not match your Zod schema, `xoin` treats that as a provider failure
- if you configured fallback providers, `xoin` automatically tries the next one
- invalid structured output is not returned as a successful result

Extraction example:

```js
import { z } from 'zod';

const shippingAddressSchema = z.object({
  line1: z.string(),
  city: z.string(),
  postalCode: z.string(),
  country: z.string(),
});

const result = await xoin.generate({
  provider: 'anthropic',
  prompt: 'Extract the shipping address from: "Ship this to 10 Park Street, Pune 411001, India."',
  structured: {
    name: 'shipping_address',
    description: 'Normalized shipping address extracted from user input',
    schema: shippingAddressSchema,
    mode: 'auto',
  },
});

console.log(result.data);
```

Manual `jsonSchema` override example:

```js
const result = await xoin.generate({
  provider: 'openai',
  prompt: 'Extract a person object.',
  structured: {
    schema: z.object({
      name: z.string(),
      age: z.number(),
    }),
    jsonSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' },
        note: { type: 'string' },
      },
      required: ['name', 'age'],
      additionalProperties: false,
    },
  },
});
```

## Schema Examples

One of the biggest strengths of `xoin` is that you can describe the response shape up front and receive validated data back.

Below are practical schema patterns you can use in real applications.

### 1. Basic object

Use this when you want a small, predictable JSON object.

```js
import { z } from 'zod';

const userSchema = z.object({
  name: z.string(),
  age: z.number(),
});

const result = await xoin.generate({
  provider: 'openai',
  prompt: 'Extract a JSON object from: "Ava is 31 years old."',
  structured: {
    name: 'user_profile',
    schema: userSchema,
  },
});

console.log(result.data);
```

Good for:

- simple extraction
- first-time onboarding examples
- user profile parsing

### 2. Array of objects

Use this when the model should return a list.

```js
import { z } from 'zod';

const orderListSchema = z.array(
  z.object({
    product: z.string(),
    quantity: z.number(),
    price: z.number(),
  }),
);

const result = await xoin.generate({
  provider: 'openai',
  prompt: `
    Extract all purchased items from this message:
    "2 wireless mice at 25 each, 1 keyboard at 70, and 3 mouse pads at 10 each."
  `,
  structured: {
    name: 'order_items',
    schema: orderListSchema,
  },
});
```

Good for:

- shopping carts
- invoice parsing
- bulk item extraction

### 3. Nested object with lists

Use this when your output has sections inside sections.

```js
import { z } from 'zod';

const customerOrderSchema = z.object({
  customer: z.object({
    name: z.string(),
    email: z.string(),
  }),
  shippingAddress: z.object({
    line1: z.string(),
    city: z.string(),
    postalCode: z.string(),
    country: z.string(),
  }),
  items: z.array(
    z.object({
      sku: z.string(),
      title: z.string(),
      quantity: z.number(),
    }),
  ),
});

const result = await xoin.generate({
  provider: 'anthropic',
  prompt: `Extract the order details from this customer email: ${emailText}`,
  structured: {
    name: 'customer_order',
    schema: customerOrderSchema,
  },
});
```

Good for:

- ecommerce flows
- order extraction
- CRM enrichment

### 4. Enums for strict categories

Use enums when you want the model to stay inside a fixed set of allowed values.

```js
import { z } from 'zod';

const ticketSchema = z.object({
  category: z.enum(['billing', 'technical', 'account', 'other']),
  priority: z.enum(['low', 'medium', 'high']),
  summary: z.string(),
});

const result = await xoin.generate({
  provider: 'anthropic',
  prompt: 'My card was charged twice and I still cannot access premium features.',
  structured: {
    name: 'ticket_classification',
    schema: ticketSchema,
  },
});
```

Good for:

- support ticket classification
- workflow routing
- business logic decisions

### 5. Optional fields

Use optional fields when some information may or may not appear in the source text.

```js
import { z } from 'zod';

const leadSchema = z.object({
  name: z.string(),
  company: z.string(),
  email: z.string().optional(),
  phone: z.string().optional(),
  budget: z.string().optional(),
});

const result = await xoin.generate({
  provider: 'openai',
  prompt: `Extract the lead details from this message: ${leadMessage}`,
  structured: {
    name: 'lead_profile',
    schema: leadSchema,
  },
});
```

Good for:

- messy form submissions
- sales leads
- partial contact extraction

### 6. Nullable fields

Use nullable fields when a field should always exist but can intentionally be `null`.

```js
import { z } from 'zod';

const bookingSchema = z.object({
  guestName: z.string(),
  roomType: z.string(),
  specialRequest: z.string().nullable(),
});

const result = await xoin.generate({
  provider: 'openai',
  prompt: `Extract the hotel booking details from this request: ${bookingText}`,
  structured: {
    name: 'booking',
    schema: bookingSchema,
  },
});
```

Good for:

- forms with empty-but-known fields
- booking systems
- normalized database inserts

### 7. Records and dynamic keys

Use records when the keys are not fixed in advance.

```js
import { z } from 'zod';

const metricsSchema = z.object({
  campaign: z.string(),
  dailyMetrics: z.record(z.number()),
});

const result = await xoin.generate({
  provider: 'openai',
  prompt: `
    Extract the campaign report from this text and return a map of day-to-clicks.
    Example days can be mon, tue, wed, thu, fri.
  `,
  structured: {
    name: 'campaign_metrics',
    schema: metricsSchema,
  },
});
```

Good for:

- analytics maps
- grouped statistics
- dynamic lookup objects

### 8. Union schemas

Use unions when the response can validly have more than one shape.

```js
import { z } from 'zod';

const emailActionSchema = z.union([
  z.object({
    action: z.literal('refund'),
    orderId: z.string(),
    reason: z.string(),
  }),
  z.object({
    action: z.literal('replace'),
    orderId: z.string(),
    item: z.string(),
  }),
]);

const result = await xoin.generate({
  provider: 'openai',
  prompt: `Read this support message and determine the action needed: ${supportMessage}`,
  structured: {
    name: 'email_action',
    schema: emailActionSchema,
  },
});
```

Good for:

- action routing
- multi-outcome workflows
- support automation

### 9. Discriminated union for cleaner branching

Use discriminated unions when each variant has a known type field.

```js
import { z } from 'zod';

const notificationSchema = z.discriminatedUnion('channel', [
  z.object({
    channel: z.literal('email'),
    subject: z.string(),
    body: z.string(),
  }),
  z.object({
    channel: z.literal('sms'),
    message: z.string(),
  }),
]);

const result = await xoin.generate({
  provider: 'openai',
  prompt: `Create the correct notification payload from this event: ${eventText}`,
  structured: {
    name: 'notification_payload',
    schema: notificationSchema,
  },
});
```

Good for:

- notification systems
- action dispatching
- downstream branching logic

### 10. Tuple for fixed-position arrays

Use tuples when the array length and item order must stay fixed.

```js
import { z } from 'zod';

const coordinateSchema = z.tuple([z.number(), z.number()]);

const result = await xoin.generate({
  provider: 'openai',
  prompt: 'Extract the map coordinates from: "The office is at 18.5204, 73.8567."',
  structured: {
    name: 'coordinates',
    schema: coordinateSchema,
  },
});
```

Good for:

- coordinates
- fixed-size vectors
- ordered value pairs

### 11. Large real-world schema

This is the kind of schema you might use in production for a detailed extraction pipeline.

```js
import { z } from 'zod';

const invoiceSchema = z.object({
  invoiceNumber: z.string(),
  vendor: z.object({
    name: z.string(),
    taxId: z.string().optional(),
    address: z.string().optional(),
  }),
  customer: z.object({
    name: z.string(),
    address: z.string().optional(),
  }),
  currency: z.string(),
  issueDate: z.string(),
  dueDate: z.string().nullable(),
  lineItems: z.array(
    z.object({
      description: z.string(),
      quantity: z.number(),
      unitPrice: z.number(),
      total: z.number(),
      category: z.enum(['software', 'service', 'hardware', 'other']),
    }),
  ),
  subtotal: z.number(),
  tax: z.number().optional(),
  discount: z.number().optional(),
  total: z.number(),
  notes: z.string().nullable(),
});

const result = await xoin.generate({
  provider: 'openai',
  prompt: `Extract the invoice data from this OCR text: ${ocrInvoiceText}`,
  structured: {
    name: 'invoice',
    schema: invoiceSchema,
  },
});
```

Good for:

- invoice OCR
- document processing
- accounting automation

### 12. When to use `jsonSchema` manually

Most normal use cases work directly from `zod`, but you can pass `structured.jsonSchema` if you want to control the provider-facing schema more explicitly.

This is useful when:

- you want to fine-tune the exact schema sent to the provider
- you hit a Zod shape that you do not want auto-derived
- you want stricter provider-side guidance before local validation happens

```js
import { z } from 'zod';

const schema = z.object({
  status: z.string(),
  tags: z.array(z.string()),
});

const result = await xoin.generate({
  provider: 'openai',
  prompt: 'Extract the workflow status and labels from the note.',
  structured: {
    schema,
    jsonSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['todo', 'in_progress', 'done'] },
        tags: {
          type: 'array',
          items: { type: 'string' },
        },
      },
      required: ['status', 'tags'],
      additionalProperties: false,
    },
  },
});
```

### 13. Choosing the right schema style

Use this quick rule of thumb:

- use `z.object(...)` for most business responses
- use `z.array(...)` when the model should return a list
- use `z.enum(...)` when downstream logic depends on fixed values
- use `.optional()` when a field may be missing
- use `.nullable()` when a field should exist but may be empty
- use `z.union(...)` or `z.discriminatedUnion(...)` for branching workflows
- use `z.record(...)` for dynamic key maps
- use `jsonSchema` when you need tighter control over the provider-facing schema

## generateMany Parameters

Use `xoin.generateMany(request)` when you want to run the same prompt against multiple providers or models.

Extra parameter:

| Parameter | Type | What it does | Example |
| --- | --- | --- | --- |
| `targets` | `Array<{ provider: string; model?: string }>` | List of provider/model targets to run in parallel. | compare OpenAI and Anthropic |

The rest of the request is the same as `generate`, except `provider`, `providerOrder`, and `model` are replaced by `targets`.

Example:

```js
const results = await xoin.generateMany({
  targets: [
    { provider: 'openai', model: 'gpt-4.1-mini' },
    { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
    { provider: 'mistral', model: 'mistral-small-latest' },
  ],
  prompt: 'Summarize this support transcript in exactly 3 bullets.',
});

for (const item of results) {
  console.log(item.provider, item.text);
}
```

Good use cases:

- compare output quality
- compare latency
- compare cost/performance tradeoffs
- generate backup answers

## Retry and Fallback Strategy

`xoin` supports two useful reliability controls for generation requests.

### Retry the same provider

Use `retry` when you want to retry temporary failures before moving to another provider.

```js
const result = await xoin.generate({
  provider: 'openai',
  retry: 2,
  prompt: 'Extract the user profile from this message.',
  structured: {
    schema: userSchema,
  },
});
```

Object form:

```js
const result = await xoin.generate({
  provider: 'openai',
  retry: {
    retries: 2,
    delayMs: 500,
    backoffMultiplier: 2,
  },
  prompt: 'Extract the user profile from this message.',
  structured: {
    schema: userSchema,
  },
});
```

Retry fields:

| Field | Type | What it does |
| --- | --- | --- |
| `retries` | `number` | Additional attempts for the same provider before fallback |
| `delayMs` | `number` | Wait time before the next retry |
| `backoffMultiplier` | `number` | Multiplies the delay for each retry |

### Define fallback priority explicitly

Use `providerTargets` when you want full control over the order and model selection.

```js
const result = await xoin.generate({
  providerTargets: [
    {
      priority: 1,
      provider: 'openai',
      model: 'gpt-4.1-mini',
    },
    {
      priority: 2,
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
    },
    {
      priority: 3,
      provider: 'groq',
      model: 'openai/gpt-oss-120b',
    },
  ],
  retry: {
    retries: 1,
    delayMs: 250,
  },
  prompt: 'Extract the order details from this message.',
  structured: {
    schema: orderSchema,
  },
});
```

Why this matters:

- you can define provider order in a single list
- each fallback step can use a different model
- retries happen on the current provider before moving to the next one
- schema-invalid responses also trigger fallback
- you do not receive invalid structured output as a successful response

## embed Parameters

Use `xoin.embed(request)` for vector embeddings.

| Parameter | Type | What it does | Example |
| --- | --- | --- | --- |
| `provider` | `string` | Provider to use for embeddings. | `'openai'` |
| `model` | `string` | Embedding model override. | `'text-embedding-3-small'` |
| `input` | `string \| string[]` | One text or multiple texts to embed. | `['faq', 'refund policy']` |
| `timeoutMs` | `number` | Request timeout in milliseconds. | `10000` |
| `metadata` | `Record<string, unknown>` | Optional metadata. | trace info |
| `providerOptions` | `Record<string, unknown>` | Provider-specific embedding options. | backend-specific fields |
| `signal` | `AbortSignal` | Allows cancellation. | `controller.signal` |

Example:

```js
const result = await xoin.embed({
  provider: 'openai',
  model: 'text-embedding-3-small',
  input: [
    'How do I reset my password?',
    'How do I update my billing card?',
  ],
});

console.log(result.embeddings.length);
console.log(result.embeddings[0].length);
```

Real-life use cases:

- semantic search
- duplicate detection
- FAQ matching
- RAG chunk indexing
- recommendation systems

## Provider Factory Parameters

### createOpenAIProvider

| Parameter | Type | Description |
| --- | --- | --- |
| `apiKey` | `string` | Required OpenAI API key |
| `baseUrl` | `string` | Optional custom OpenAI-compatible base URL |
| `defaultModel` | `string` | Default chat model |
| `defaultEmbeddingModel` | `string` | Default embedding model |
| `fetch` | `typeof fetch` | Custom fetch implementation |

### createAnthropicProvider

| Parameter | Type | Description |
| --- | --- | --- |
| `apiKey` | `string` | Required Anthropic API key |
| `baseUrl` | `string` | Optional custom base URL |
| `defaultModel` | `string` | Default Anthropic model |
| `fetch` | `typeof fetch` | Custom fetch implementation |
| `headers` | `Record<string, string>` | Extra headers |

### createMistralProvider

| Parameter | Type | Description |
| --- | --- | --- |
| `apiKey` | `string` | Required Mistral API key |
| `baseUrl` | `string` | Optional custom base URL |
| `defaultModel` | `string` | Default chat model |
| `defaultEmbeddingModel` | `string` | Default embedding model |
| `fetch` | `typeof fetch` | Custom fetch implementation |

### createGeminiProvider

| Parameter | Type | Description |
| --- | --- | --- |
| `apiKey` | `string` | Required Gemini API key |
| `baseUrl` | `string` | Optional custom base URL (defaults to `https://generativelanguage.googleapis.com/v1beta/openai`) |
| `defaultModel` | `string` | Default chat model (`gemini-2.5-flash`) |
| `defaultEmbeddingModel` | `string` | Default embedding model (`text-embedding-004`) |
| `fetch` | `typeof fetch` | Custom fetch implementation |

### createDeepSeekProvider

| Parameter | Type | Description |
| --- | --- | --- |
| `apiKey` | `string` | Required DeepSeek API key |
| `baseUrl` | `string` | Optional custom base URL |
| `defaultModel` | `string` | Default chat model |
| `fetch` | `typeof fetch` | Custom fetch implementation |

### createOpenAICompatibleProvider

| Parameter | Type | Description |
| --- | --- | --- |
| `name` | `string` | Provider name you want to register |
| `apiKey` | `string` | API key |
| `baseUrl` | `string` | Base URL of the OpenAI-compatible API |
| `defaultModel` | `string` | Default chat model |
| `defaultEmbeddingModel` | `string` | Default embedding model |
| `fetch` | `typeof fetch` | Custom fetch implementation |
| `headers` | `Record<string, string>` | Extra headers |
| `structuredOutputs` | `'json-schema' \| 'json-object' \| 'prompt-only'` | Structured output capability |
| `embeddings` | `boolean` | Whether the backend supports embeddings |

Groq example:

```js
const groq = createOpenAICompatibleProvider({
  name: 'groq',
  apiKey: process.env.GROQ_API_KEY,
  baseUrl: 'https://api.groq.com/openai/v1',
  defaultModel: 'openai/gpt-oss-120b',
  structuredOutputs: 'json-object',
  embeddings: false,
});
```

## Examples By Use Case

### 1. Extract customer data from free text

```js
import { z } from 'zod';

const leadSchema = z.object({
  company: z.string(),
  contactName: z.string(),
  email: z.string(),
  budget: z.string(),
});

const result = await xoin.generate({
  provider: 'openai',
  prompt: 'Extract the company, contact, email, and budget from: "Hi, this is Sarah from Northwind. Reach me at sarah@northwind.com. Our budget is around $15k."',
  structured: {
    name: 'lead_info',
    schema: leadSchema,
  },
});
```

Use this for:

- CRM automation
- lead capture forms
- sales ops workflows

### 2. Classify support tickets

```js
import { z } from 'zod';

const ticketSchema = z.object({
  category: z.enum(['billing', 'technical', 'account', 'other']),
  priority: z.enum(['low', 'medium', 'high']),
  summary: z.string(),
});

const result = await xoin.generate({
  provider: 'anthropic',
  system: 'You classify support tickets.',
  prompt: 'My card was charged twice and I still cannot access premium features.',
  structured: {
    name: 'ticket_classification',
    schema: ticketSchema,
  },
});
```

Use this for:

- support triage
- routing rules
- analytics dashboards

### 3. Summarize long content

```js
const result = await xoin.generate({
  provider: 'openai',
  prompt: `Summarize this meeting transcript in 5 bullet points:\n\n${transcript}`,
  temperature: 0.2,
  maxTokens: 250,
});
```

Use this for:

- meeting notes
- call summaries
- internal reports

### 4. Build search embeddings

```js
const result = await xoin.embed({
  provider: 'openai',
  input: documents.map((doc) => doc.content),
});
```

Use this for:

- semantic search
- vector indexing
- RAG document pipelines

### 5. Use fallback for reliability

```js
const result = await xoin.generate({
  provider: 'openai',
  providerOrder: ['anthropic', 'mistral'],
  prompt: 'Extract the order summary from the customer message.',
  structured: {
    schema: orderSchema,
  },
});
```

Use this for:

- production APIs
- high-availability workflows
- backup generation paths

## Platform Examples

### Node.js Script

```js
import dotenv from 'dotenv';
import { z } from 'zod';
import { createOpenAIProvider, createXoin } from '@xoin/xoin-js';

dotenv.config();

const xoin = createXoin({
  providers: {
    openai: createOpenAIProvider({
      apiKey: process.env.OPENAI_API_KEY,
    }),
  },
});

const schema = z.object({
  sentiment: z.enum(['positive', 'neutral', 'negative']),
});

const result = await xoin.generate({
  prompt: 'Classify the sentiment of: "The onboarding was surprisingly smooth."',
  structured: { schema },
});

console.log(result.data);
```

### Express API Route

```js
import express from 'express';
import { z } from 'zod';
import { createOpenAIProvider, createXoin } from '@xoin/xoin-js';

const app = express();
app.use(express.json());

const xoin = createXoin({
  providers: {
    openai: createOpenAIProvider({
      apiKey: process.env.OPENAI_API_KEY,
    }),
  },
});

const schema = z.object({
  summary: z.string(),
});

app.post('/summarize', async (req, res) => {
  try {
    const result = await xoin.generate({
      provider: 'openai',
      prompt: `Summarize this text: ${req.body.text}`,
      structured: { schema },
    });

    res.json(result.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Next.js Route Handler

```js
import { z } from 'zod';
import { createOpenAIProvider, createXoin } from '@xoin/xoin-js';

const xoin = createXoin({
  providers: {
    openai: createOpenAIProvider({
      apiKey: process.env.OPENAI_API_KEY,
    }),
  },
});

const schema = z.object({
  keywords: z.array(z.string()),
});

export async function POST(request) {
  const body = await request.json();

  const result = await xoin.generate({
    provider: 'openai',
    prompt: `Extract SEO keywords from: ${body.text}`,
    structured: { schema },
  });

  return Response.json(result.data);
}
```

### Bun Script

```js
import { createOpenAIProvider, createXoin } from '@xoin/xoin-js';

const xoin = createXoin({
  providers: {
    openai: createOpenAIProvider({
      apiKey: process.env.OPENAI_API_KEY,
    }),
  },
});

const result = await xoin.generate({
  provider: 'openai',
  prompt: 'Write a short product tagline for a developer analytics tool.',
});

console.log(result.text);
```

## Template Files

You can keep prompts in YAML, JSON, or plain text files.

YAML example:

```yaml
template: |
  Extract the user profile from the text below.

  Input:
  {{user_query}}

  Return only JSON.
defaults:
  user_query: ""
description: Extract user info from free text
```

Use it like this:

```js
const result = await xoin.generate({
  provider: 'openai',
  templateFile: './templates/extract-user.yaml',
  input: {
    user_query: 'Nina is 28 and lives in Pune.',
  },
  structured: {
    schema: z.object({
      name: z.string(),
      age: z.number(),
    }),
  },
});
```

You can also use named templates:

```js
const xoin = createXoin({
  templates: {
    extract_user: {
      template: 'Extract a user object from: {{text}}',
      defaults: {
        text: '',
      },
    },
  },
  providers: {
    openai: createOpenAIProvider({
      apiKey: process.env.OPENAI_API_KEY,
    }),
  },
});

const result = await xoin.generate({
  provider: 'openai',
  templateId: 'extract_user',
  input: {
    text: 'Ravi is 34 years old.',
  },
  structured: {
    schema: z.object({
      name: z.string(),
      age: z.number(),
    }),
  },
});
```

## Custom Providers

If a provider is not built in, you can register your own adapter.

```js
import { createXoin } from '@xoin/xoin-js';

const xoin = createXoin({
  providers: {
    internalGateway: {
      name: 'internal-gateway',
      capabilities: {
        structuredOutputs: 'prompt-only',
        embeddings: true,
      },
      defaultModel: 'gateway-chat',
      defaultEmbeddingModel: 'gateway-embed',
      async generate(options) {
        const response = await fetch('https://my-gateway.example.com/chat', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(options),
        });

        const data = await response.json();

        return {
          model: data.model,
          text: data.text,
          raw: data,
        };
      },
      async embed(options) {
        const response = await fetch('https://my-gateway.example.com/embed', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(options),
        });

        const data = await response.json();

        return {
          model: data.model,
          embeddings: data.embeddings,
          raw: data,
        };
      },
    },
  },
});
```

You can also register later:

```js
xoin.registerProvider('backup', createOpenAIProvider({
  apiKey: process.env.BACKUP_OPENAI_KEY,
}));
```

## Error Handling

`xoin` exposes predictable error classes so you can handle failures cleanly.

Available error classes:

- `XoinError`
- `TemplateError`
- `StructuredOutputError`
- `ProviderExecutionError`
- `ProviderConfigurationError`
- `EmbeddingError`
- `AggregateProviderError`

Example:

```js
import {
  AggregateProviderError,
  ProviderConfigurationError,
  ProviderExecutionError,
  StructuredOutputError,
} from '@xoin/xoin-js';

try {
  const result = await xoin.generate({
    provider: 'openai',
    prompt: 'Extract a user.',
    structured: { schema: userSchema },
  });

  console.log(result.data);
} catch (error) {
  if (error instanceof StructuredOutputError) {
    console.error('The model returned invalid JSON for the schema.');
  } else if (error instanceof ProviderConfigurationError) {
    console.error('The provider is missing config or a default model.');
  } else if (error instanceof ProviderExecutionError) {
    console.error(`Provider failed: ${error.provider}`, error.message);
  } else if (error instanceof AggregateProviderError) {
    console.error('All fallback providers failed.', error.errors);
  } else {
    console.error('Unknown error', error);
  }
}
```

## Native JS Examples

Standalone copy-pasteable JavaScript examples live in `examples/native-js`.

Each file is independent:

- its own env loading
- its own provider config
- its own `createXoin(...)` setup
- no shared helper module
- no mock providers

Included examples:

- `openai-structured-output.js`
- `anthropic-structured-output.js`
- `mistral-structured-output.js`
- `deepseek-structured-output.js`
- `gemini-structured-output.js`
- `groq-openai-compatible.js`
- `template-file.js`
- `generate-many.js`
- `fallback-order.js`
- `embeddings-openai.js`

Run one directly:

```bash
npm run build
node examples/native-js/openai-structured-output.js
```

Gemini setup in `.env`:

```bash
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
GEMINI_EMBEDDING_MODEL=text-embedding-004
```

## Development

```bash
npm run typecheck
npm run build
npm test
npm run example:native
```

If you are contributing, read the examples folder first. It shows the intended library style in concise, standalone JavaScript files.
