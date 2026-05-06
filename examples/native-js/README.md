# Native JS Examples

Every file in this folder is standalone.

- No shared helper file
- No mock provider
- No demo runner
- Each example loads env with `dotenv`
- Each example creates its own `xoin` client
- Each example keeps its own schema, prompt, config, and comments

Each file loads:

- `examples/native-js/.env` (create by copying `.env.example`; never commit real keys)
- current working directory `.env`

You can run any file directly after building the library:

```bash
cp examples/native-js/.env.example examples/native-js/.env
# edit .env and add API keys
npm run build
node examples/native-js/openai-structured-output.js
```

Available examples:

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

Common env vars:

```bash
OPENAI_API_KEY=
OPENAI_MODEL=
OPENAI_EMBEDDING_MODEL=

ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=

MISTRAL_API_KEY=
MISTRAL_MODEL=

DEEPSEEK_API_KEY=
DEEPSEEK_MODEL=

GEMINI_API_KEY=
GEMINI_MODEL=
GEMINI_EMBEDDING_MODEL=

GROQ_API_KEY=
GROQ_BASE_URL=
GROQ_MODEL=
```
