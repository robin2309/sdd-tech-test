import { Request, Response } from 'express';
import { CreateTemplate } from '../../application/create-template';
import { GetTemplate } from '../../application/get-template';
import { ListTemplates } from '../../application/list-templates';
import { UpdateTemplate } from '../../application/update-template';
import { RenderTemplate } from '../../application/render-template';

function formatTemplateResponse(result: { template: { id: string; name: string; tags: string[]; createdAt: Date }; version: { id: string; version: number; content: string; variables: unknown[]; createdAt: Date } }) {
  return {
    id: result.template.id,
    name: result.template.name,
    tags: result.template.tags,
    created_at: result.template.createdAt.toISOString(),
    version: {
      id: result.version.id,
      version: result.version.version,
      content: result.version.content,
      variables: result.version.variables,
      created_at: result.version.createdAt.toISOString(),
    },
  };
}

export function createTemplateController(useCase: CreateTemplate) {
  return async (req: Request, res: Response): Promise<void> => {
    const { name, tags, content, variables } = req.body;

    if (!name || typeof name !== 'string') {
      res.status(400).json({ error: 'name is required' });
      return;
    }
    if (!content || typeof content !== 'string') {
      res.status(400).json({ error: 'content is required' });
      return;
    }

    const result = await useCase.execute({ name, tags, content, variables });
    res.status(201).json(formatTemplateResponse(result));
  };
}

export function getTemplateController(useCase: GetTemplate) {
  return async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const versionParam = req.query.version;
    const versionNumber = versionParam ? parseInt(versionParam as string, 10) : undefined;

    const result = await useCase.execute(id, versionNumber);
    if (!result) {
      res.status(404).json({ error: 'Template or version not found' });
      return;
    }

    res.status(200).json(formatTemplateResponse(result));
  };
}

export function listTemplatesController(useCase: ListTemplates) {
  return async (req: Request, res: Response): Promise<void> => {
    const tagsParam = req.query.tags as string | undefined;
    const nameParam = req.query.name as string | undefined;

    const tags = tagsParam ? tagsParam.split(',').map((t) => t.trim()) : undefined;

    const results = await useCase.execute({ tags, name: nameParam });

    const response = results.map((r) => ({
      id: r.template.id,
      name: r.template.name,
      tags: r.template.tags,
      created_at: r.template.createdAt.toISOString(),
      latest_version: {
        version: r.latestVersion.version,
        content: r.latestVersion.content,
      },
    }));

    res.status(200).json(response);
  };
}

export function updateTemplateController(useCase: UpdateTemplate) {
  return async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const { content, variables } = req.body;

    if (!content || typeof content !== 'string') {
      res.status(400).json({ error: 'content is required' });
      return;
    }

    const result = await useCase.execute(id, { content, variables });
    if (!result) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }

    res.status(201).json(formatTemplateResponse(result));
  };
}

export function renderTemplateController(useCase: RenderTemplate) {
  return async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const { version, variables } = req.body;

    const result = await useCase.execute(id, {
      version,
      variables: variables ?? {},
    });

    if (!result.success) {
      if (result.error === 'not_found') {
        res.status(404).json({ error: 'Template or version not found' });
        return;
      }
      if (result.error === 'missing_variables') {
        res.status(400).json({
          error: `Missing required variables: ${result.missingVariables.join(', ')}`,
          missing_variables: result.missingVariables,
        });
        return;
      }
    }

    if (result.success) {
      res.status(200).json({ rendered_content: result.renderedContent });
    }
  };
}
