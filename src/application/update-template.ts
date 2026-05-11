import { v4 as uuidv4 } from 'uuid';
import { Template, TemplateVersion, VariableDeclaration } from '../domain/entities';
import { ITemplateRepository } from '../domain/repository';

export interface UpdateTemplateInput {
  content: string;
  variables?: VariableDeclaration[];
}

export interface UpdateTemplateOutput {
  template: Template;
  version: TemplateVersion;
}

export class UpdateTemplate {
  constructor(private readonly repository: ITemplateRepository) {}

  async execute(
    templateId: string,
    input: UpdateTemplateInput,
  ): Promise<UpdateTemplateOutput | null> {
    const template = await this.repository.findById(templateId);
    if (!template) return null;

    const latest = await this.repository.findLatestVersion(templateId);
    const nextVersion = latest ? latest.version + 1 : 1;

    const version: TemplateVersion = {
      id: uuidv4(),
      templateId,
      version: nextVersion,
      variables: input.variables ?? [],
      content: input.content,
      createdAt: new Date(),
    };

    await this.repository.addVersion(version);
    return { template, version };
  }
}
