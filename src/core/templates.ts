import path from 'node:path';
import yaml from 'js-yaml';
import { TemplateDefinition } from '../types';
import { TemplateError } from './errors';

export async function resolveTemplate(options: {
  inlineTemplate?: string;
  templateId?: string;
  templateFile?: string;
  templates?: Record<string, TemplateDefinition>;
}): Promise<TemplateDefinition | undefined> {
  if (options.inlineTemplate) {
    return { template: options.inlineTemplate };
  }

  if (options.templateId) {
    const template = options.templates?.[options.templateId];
    if (!template) {
      throw new TemplateError(`Unknown template id "${options.templateId}".`);
    }
    return template;
  }

  if (!options.templateFile) {
    return undefined;
  }

  try {
    const fs = await import('node:fs/promises');
    const file = await fs.readFile(options.templateFile, 'utf8');
    const extension = path.extname(options.templateFile).toLowerCase();

    if (extension === '.yaml' || extension === '.yml') {
      const parsed = yaml.load(file);
      return normalizeTemplateDefinition(parsed, options.templateFile);
    }

    if (extension === '.json') {
      const parsed = JSON.parse(file);
      return normalizeTemplateDefinition(parsed, options.templateFile);
    }

    return { template: file };
  } catch (error) {
    throw new TemplateError(`Unable to load template file "${options.templateFile}".`, { cause: error });
  }
}

export function renderTemplate(template: TemplateDefinition, input: Record<string, unknown> = {}): string {
  const values = { ...(template.defaults ?? {}), ...input };

  return template.template.replace(/{{\s*([a-zA-Z0-9_.$-]+)\s*}}/g, (_, key: string) => {
    if (!(key in values)) {
      throw new TemplateError(`Missing template variable "${key}".`);
    }

    const value = values[key];
    if (value === undefined || value === null) {
      return '';
    }

    return typeof value === 'string' ? value : JSON.stringify(value);
  });
}

function normalizeTemplateDefinition(value: unknown, label: string): TemplateDefinition {
  if (typeof value === 'string') {
    return { template: value };
  }

  if (!value || typeof value !== 'object' || typeof (value as TemplateDefinition).template !== 'string') {
    throw new TemplateError(`Template "${label}" must contain a "template" string.`);
  }

  return value as TemplateDefinition;
}
