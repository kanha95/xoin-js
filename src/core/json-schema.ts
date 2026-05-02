import { z } from 'zod';
import { JsonSchema } from '../types';
import { ProviderConfigurationError } from './errors';

export function getStructuredJsonSchema<T>(options: {
  schema: z.ZodType<T>;
  jsonSchema?: JsonSchema;
}): JsonSchema {
  if (options.jsonSchema) {
    return options.jsonSchema;
  }

  return zodToJsonSchema(options.schema);
}

export function zodToJsonSchema(schema: z.ZodTypeAny): JsonSchema {
  const unwrapped = unwrap(schema);

  if (unwrapped instanceof z.ZodString) {
    return { type: 'string' };
  }

  if (unwrapped instanceof z.ZodNumber) {
    return { type: 'number' };
  }

  if (unwrapped instanceof z.ZodBoolean) {
    return { type: 'boolean' };
  }

  if (unwrapped instanceof z.ZodNull) {
    return { type: 'null' };
  }

  if (unwrapped instanceof z.ZodLiteral) {
    return { enum: [unwrapped._def.value] };
  }

  if (unwrapped instanceof z.ZodEnum) {
    return { type: 'string', enum: [...unwrapped._def.values] };
  }

  if (unwrapped instanceof z.ZodNativeEnum) {
    return { enum: nativeEnumValues(unwrapped._def.values) };
  }

  if (unwrapped instanceof z.ZodArray) {
    return {
      type: 'array',
      items: zodToJsonSchema(unwrapped._def.type),
    };
  }

  if (unwrapped instanceof z.ZodObject) {
    const shape = unwrapped.shape;
    const properties: Record<string, JsonSchema> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      const propertySchema = value as z.ZodTypeAny;
      properties[key] = zodToJsonSchema(propertySchema);
      if (!isOptionalLike(propertySchema)) {
        required.push(key);
      }
    }

    return {
      type: 'object',
      properties,
      required,
      additionalProperties: false,
    };
  }

  if (unwrapped instanceof z.ZodUnion) {
    return {
      oneOf: unwrapped._def.options.map((option: z.ZodTypeAny) => zodToJsonSchema(option)),
    };
  }

  if (unwrapped instanceof z.ZodDiscriminatedUnion) {
    return {
      oneOf: Array.from(unwrapped.options.values()).map((option) => zodToJsonSchema(option as z.ZodTypeAny)),
    };
  }

  if (unwrapped instanceof z.ZodNullable) {
    const inner = zodToJsonSchema(unwrapped.unwrap());
    return { ...inner, nullable: true };
  }

  if (unwrapped instanceof z.ZodTuple) {
    return {
      type: 'array',
      items: unwrapped.items.map((item: z.ZodTypeAny) => zodToJsonSchema(item)),
      minItems: unwrapped.items.length,
      maxItems: unwrapped.items.length,
    };
  }

  if (unwrapped instanceof z.ZodRecord) {
    return {
      type: 'object',
      additionalProperties: zodToJsonSchema(unwrapped._def.valueType),
    };
  }

  if (unwrapped instanceof z.ZodAny || unwrapped instanceof z.ZodUnknown) {
    return {};
  }

  throw new ProviderConfigurationError(
    `Unable to derive JSON Schema from Zod type "${unwrapped._def.typeName}". Pass structured.jsonSchema explicitly.`,
  );
}

function unwrap(schema: z.ZodTypeAny): z.ZodTypeAny {
  if (schema instanceof z.ZodEffects) {
    return unwrap(schema.innerType());
  }

  if (schema instanceof z.ZodDefault) {
    return unwrap(schema.removeDefault());
  }

  if (schema instanceof z.ZodCatch) {
    return unwrap(schema._def.innerType);
  }

  if (schema instanceof z.ZodBranded) {
    return unwrap(schema.unwrap());
  }

  if (schema instanceof z.ZodReadonly) {
    return unwrap(schema.unwrap());
  }

  if (schema instanceof z.ZodPipeline) {
    return unwrap(schema._def.out);
  }

  return schema;
}

function isOptionalLike(schema: z.ZodTypeAny): boolean {
  if (schema instanceof z.ZodOptional || schema instanceof z.ZodDefault) {
    return true;
  }

  if (schema instanceof z.ZodEffects) {
    return isOptionalLike(schema.innerType());
  }

  if (schema instanceof z.ZodBranded || schema instanceof z.ZodReadonly) {
    return isOptionalLike(schema.unwrap());
  }

  return false;
}

function nativeEnumValues(input: Record<string, string | number>): Array<string | number> {
  const values = Object.values(input);
  return values.filter((value) => typeof value !== 'number' || !values.includes(String(value)));
}
