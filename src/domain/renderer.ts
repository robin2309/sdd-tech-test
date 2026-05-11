import { VariableDeclaration } from './entities';

export class MissingVariablesError extends Error {
  constructor(public readonly missingVariables: string[]) {
    super(`Missing required variables: ${missingVariables.join(', ')}`);
    this.name = 'MissingVariablesError';
  }
}

export function renderTemplate(
  content: string,
  declaredVariables: VariableDeclaration[],
  providedVariables: Record<string, string>,
): string {
  const placeholders = content.match(/\{\{(\w+)\}\}/g);
  if (!placeholders) return content;

  const requiredNames = new Set(placeholders.map((p) => p.slice(2, -2)));
  const defaults = new Map(
    declaredVariables
      .filter((v) => v.default !== undefined)
      .map((v) => [v.name, v.default as string]),
  );

  const missing: string[] = [];
  const resolved: Record<string, string> = {};

  for (const name of requiredNames) {
    if (providedVariables[name] !== undefined) {
      resolved[name] = providedVariables[name];
    } else if (defaults.has(name)) {
      resolved[name] = defaults.get(name)!;
    } else {
      missing.push(name);
    }
  }

  if (missing.length > 0) {
    throw new MissingVariablesError(missing);
  }

  return content.replace(/\{\{(\w+)\}\}/g, (_, name) => resolved[name]);
}
