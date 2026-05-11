import { Template, TemplateVersion } from '../../domain/entities';
import { ITemplateRepository } from '../../domain/repository';

export class InMemoryTemplateRepository implements ITemplateRepository {
  private templates: Map<string, Template> = new Map();
  private versions: Map<string, TemplateVersion[]> = new Map();

  async save(template: Template, version: TemplateVersion): Promise<void> {
    this.templates.set(template.id, template);
    this.versions.set(template.id, [version]);
  }

  async findById(id: string): Promise<Template | null> {
    return this.templates.get(id) ?? null;
  }

  async findLatestVersion(templateId: string): Promise<TemplateVersion | null> {
    const versions = this.versions.get(templateId);
    if (!versions || versions.length === 0) return null;
    return versions.reduce((latest, v) => (v.version > latest.version ? v : latest));
  }

  async findVersion(templateId: string, version: number): Promise<TemplateVersion | null> {
    const versions = this.versions.get(templateId);
    if (!versions) return null;
    return versions.find((v) => v.version === version) ?? null;
  }

  async addVersion(version: TemplateVersion): Promise<void> {
    const versions = this.versions.get(version.templateId);
    if (!versions) throw new Error(`Template ${version.templateId} not found`);
    versions.push(version);
  }

  async findAll(
    filters?: { tags?: string[]; name?: string },
  ): Promise<Array<{ template: Template; latestVersion: TemplateVersion }>> {
    const results: Array<{ template: Template; latestVersion: TemplateVersion }> = [];

    for (const [id, template] of this.templates) {
      if (filters?.tags && filters.tags.length > 0) {
        const hasMatchingTag = filters.tags.some((tag) => template.tags.includes(tag));
        if (!hasMatchingTag) continue;
      }

      if (filters?.name) {
        if (!template.name.toLowerCase().includes(filters.name.toLowerCase())) continue;
      }

      const versions = this.versions.get(id);
      if (!versions || versions.length === 0) continue;

      const latestVersion = versions.reduce((latest, v) =>
        v.version > latest.version ? v : latest,
      );

      results.push({ template, latestVersion });
    }

    return results;
  }
}
