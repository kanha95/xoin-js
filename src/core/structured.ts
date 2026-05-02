import { z } from 'zod';
import { JsonSchema } from '../types';
import { StructuredOutputError } from './errors';

export function buildStructuredInstructions(name: string, schema?: JsonSchema): string {
  const base = `Return ONLY valid JSON for "${name}". Do not wrap it in markdown fences or add any extra text.`;
  if (!schema) {
    return base;
  }

  return `${base}\nJSON schema:\n${JSON.stringify(schema, null, 2)}`;
}

export function parseStructuredData<T>(value: { rawText: string; rawData?: unknown; schema: z.ZodType<T> }): T {
  const candidate = value.rawData ?? parseJsonLike(value.rawText);

  try {
    return value.schema.parse(candidate);
  } catch (error) {
    throw new StructuredOutputError('Structured output validation failed.', { cause: error });
  }
}

export function parseJsonLike(text: string): unknown {
  const direct = text.trim();
  if (!direct) {
    throw new StructuredOutputError('Structured output was empty.');
  }

  try {
    return JSON.parse(direct);
  } catch {
    const fenced = direct.match(/```(?:json)?\s*([\s\S]+?)```/i)?.[1];
    if (fenced) {
      return parseJsonLike(fenced);
    }

    const extracted = extractBalancedJson(direct);
    if (extracted) {
      try {
        return JSON.parse(extracted);
      } catch {
        throw new StructuredOutputError('Unable to parse structured output as JSON.');
      }
    }

    throw new StructuredOutputError('Unable to locate a valid JSON object in the model response.');
  }
}

function extractBalancedJson(input: string): string | null {
  const starts = ['{', '['];

  for (let index = 0; index < input.length; index += 1) {
    if (!starts.includes(input[index])) {
      continue;
    }

    const stack: string[] = [];
    let inString = false;
    let escaped = false;

    for (let cursor = index; cursor < input.length; cursor += 1) {
      const char = input[cursor];

      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (char === '\\') {
          escaped = true;
        } else if (char === '"') {
          inString = false;
        }
        continue;
      }

      if (char === '"') {
        inString = true;
        continue;
      }

      if (char === '{' || char === '[') {
        stack.push(char);
        continue;
      }

      if (char === '}' || char === ']') {
        const opening = stack.pop();
        if (!opening || !matches(opening, char)) {
          break;
        }

        if (stack.length === 0) {
          return input.slice(index, cursor + 1);
        }
      }
    }
  }

  return null;
}

function matches(opening: string, closing: string): boolean {
  return (opening === '{' && closing === '}') || (opening === '[' && closing === ']');
}
