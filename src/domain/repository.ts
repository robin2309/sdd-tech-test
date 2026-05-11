import { Template, TemplateVersion } from './entities';

export interface ITemplateRepository {
  save(template: Template, version: TemplateVersion): Promise<void>;
  findById(id: string): Promise<Template | null>;
  findLatestVersion(templateId: string): Promise<TemplateVersion | null>;
  findVersion(templateId: string, version: number): Promise<TemplateVersion | null>;
  addVersion(version: TemplateVersion): Promise<void>;
  findAll(filters?: { tags?: string[]; name?: string }): Promise<
    Array<{ template: Template; latestVersion: TemplateVersion }>
  >;
}
