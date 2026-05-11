import { Pool } from 'pg';
import { IMemoryDb } from 'pg-mem';
import { Template, TemplateVersion, VariableDeclaration } from '../../domain/entities';
import { ITemplateRepository } from '../../domain/repository';

export function initSchema(db: IMemoryDb): void {
  db.public.none(`
    CREATE TABLE templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      tags TEXT[] DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  db.public.none(`
    CREATE TABLE template_versions (
      id TEXT PRIMARY KEY,
      template_id TEXT NOT NULL REFERENCES templates(id),
      version INTEGER NOT NULL,
      variables JSONB DEFAULT '[]',
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

export function createPool(db: IMemoryDb): Pool {
  const { Pool: PgMemPool } = db.adapters.createPg();
  return new PgMemPool() as unknown as Pool;
}

interface TemplateRow {
  id: string;
  name: string;
  tags: string[];
  created_at: string;
}

interface VersionRow {
  id: string;
  template_id: string;
  version: number;
  variables: VariableDeclaration[];
  content: string;
  created_at: string;
}

function toTemplate(row: TemplateRow): Template {
  return {
    id: row.id,
    name: row.name,
    tags: row.tags ?? [],
    createdAt: new Date(row.created_at),
  };
}

function toVersion(row: VersionRow): TemplateVersion {
  return {
    id: row.id,
    templateId: row.template_id,
    version: row.version,
    variables: typeof row.variables === 'string' ? JSON.parse(row.variables) : row.variables ?? [],
    content: row.content,
    createdAt: new Date(row.created_at),
  };
}

export class PgMemTemplateRepository implements ITemplateRepository {
  constructor(private readonly pool: Pool) {}

  async save(template: Template, version: TemplateVersion): Promise<void> {
    await this.pool.query(
      `INSERT INTO templates (id, name, tags, created_at) VALUES ($1, $2, $3, $4)`,
      [template.id, template.name, template.tags, template.createdAt.toISOString()],
    );

    await this.pool.query(
      `INSERT INTO template_versions (id, template_id, version, variables, content, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        version.id,
        version.templateId,
        version.version,
        JSON.stringify(version.variables),
        version.content,
        version.createdAt.toISOString(),
      ],
    );
  }

  async findById(id: string): Promise<Template | null> {
    const { rows } = await this.pool.query(
      `SELECT * FROM templates WHERE id = $1`,
      [id],
    );
    if (rows.length === 0) return null;
    return toTemplate(rows[0] as TemplateRow);
  }

  async findLatestVersion(templateId: string): Promise<TemplateVersion | null> {
    const { rows } = await this.pool.query(
      `SELECT * FROM template_versions WHERE template_id = $1 ORDER BY version DESC LIMIT 1`,
      [templateId],
    );
    if (rows.length === 0) return null;
    return toVersion(rows[0] as VersionRow);
  }

  async findVersion(templateId: string, version: number): Promise<TemplateVersion | null> {
    const { rows } = await this.pool.query(
      `SELECT * FROM template_versions WHERE template_id = $1 AND version = $2`,
      [templateId, version],
    );
    if (rows.length === 0) return null;
    return toVersion(rows[0] as VersionRow);
  }

  async addVersion(version: TemplateVersion): Promise<void> {
    await this.pool.query(
      `INSERT INTO template_versions (id, template_id, version, variables, content, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        version.id,
        version.templateId,
        version.version,
        JSON.stringify(version.variables),
        version.content,
        version.createdAt.toISOString(),
      ],
    );
  }

  async findAll(
    filters?: { tags?: string[]; name?: string },
  ): Promise<Array<{ template: Template; latestVersion: TemplateVersion }>> {
    // pg-mem has limited support for complex joins with aliases and subqueries,
    // so we fetch all templates first, then filter and get latest versions.
    const { rows: templateRows } = await this.pool.query(`SELECT * FROM templates`);

    let templates = templateRows as TemplateRow[];

    if (filters?.name) {
      const search = filters.name.toLowerCase();
      templates = templates.filter((t) => t.name.toLowerCase().includes(search));
    }

    if (filters?.tags && filters.tags.length > 0) {
      const filterTags = filters.tags;
      templates = templates.filter((t) => {
        const tags = t.tags ?? [];
        return filterTags.some((ft) => tags.includes(ft));
      });
    }

    const results: Array<{ template: Template; latestVersion: TemplateVersion }> = [];

    for (const row of templates) {
      const { rows: versionRows } = await this.pool.query(
        `SELECT * FROM template_versions WHERE template_id = $1 ORDER BY version DESC LIMIT 1`,
        [row.id],
      );
      if (versionRows.length === 0) continue;

      results.push({
        template: toTemplate(row),
        latestVersion: toVersion(versionRows[0] as VersionRow),
      });
    }

    return results;
  }
}
