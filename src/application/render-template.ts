import { ITemplateRepository } from '../domain/repository';
import { renderTemplate, MissingVariablesError } from '../domain/renderer';

export interface RenderTemplateInput {
  version?: number;
  variables: Record<string, string>;
}

export type RenderTemplateResult =
  | { success: true; renderedContent: string }
  | { success: false; error: 'not_found' }
  | { success: false; error: 'missing_variables'; missingVariables: string[] };

export class RenderTemplate {
  constructor(private readonly repository: ITemplateRepository) {}

  async execute(templateId: string, input: RenderTemplateInput): Promise<RenderTemplateResult> {
    const template = await this.repository.findById(templateId);
    if (!template) return { success: false, error: 'not_found' };

    const version = input.version
      ? await this.repository.findVersion(templateId, input.version)
      : await this.repository.findLatestVersion(templateId);

    if (!version) return { success: false, error: 'not_found' };

    try {
      const renderedContent = renderTemplate(version.content, version.variables, input.variables);
      return { success: true, renderedContent };
    } catch (err) {
      if (err instanceof MissingVariablesError) {
        return { success: false, error: 'missing_variables', missingVariables: err.missingVariables };
      }
      throw err;
    }
  }
}
