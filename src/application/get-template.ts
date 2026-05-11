import { Template, TemplateVersion } from '../domain/entities';
import { ITemplateRepository } from '../domain/repository';

export interface GetTemplateOutput {
  template: Template;
  version: TemplateVersion;
}

export class GetTemplate {
  constructor(private readonly repository: ITemplateRepository) {}

  async execute(id: string, versionNumber?: number): Promise<GetTemplateOutput | null> {
    const template = await this.repository.findById(id);
    if (!template) return null;

    const version = versionNumber
      ? await this.repository.findVersion(id, versionNumber)
      : await this.repository.findLatestVersion(id);

    if (!version) return null;

    return { template, version };
  }
}
