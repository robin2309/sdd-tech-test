import { Template, TemplateVersion } from '../domain/entities';
import { ITemplateRepository } from '../domain/repository';

export interface ListTemplatesOutput {
  template: Template;
  latestVersion: TemplateVersion;
}

export class ListTemplates {
  constructor(private readonly repository: ITemplateRepository) {}

  async execute(filters?: { tags?: string[]; name?: string }): Promise<ListTemplatesOutput[]> {
    return this.repository.findAll(filters);
  }
}
