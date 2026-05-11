import { v4 as uuidv4 } from 'uuid';
import { Template, TemplateVersion, VariableDeclaration } from '../domain/entities';
import { ITemplateRepository } from '../domain/repository';

export interface CreateTemplateInput {
  name: string;
  tags?: string[];
  content: string;
  variables?: VariableDeclaration[];
}

export interface CreateTemplateOutput {
  template: Template;
  version: TemplateVersion;
}

export class CreateTemplate {
  constructor(private readonly repository: ITemplateRepository) {}

  async execute(input: CreateTemplateInput): Promise<CreateTemplateOutput> {
    const now = new Date();
    const template: Template = {
      id: uuidv4(),
      name: input.name,
      tags: input.tags ?? [],
      createdAt: now,
    };

    const version: TemplateVersion = {
      id: uuidv4(),
      templateId: template.id,
      version: 1,
      variables: input.variables ?? [],
      content: input.content,
      createdAt: now,
    };

    await this.repository.save(template, version);
    return { template, version };
  }
}
