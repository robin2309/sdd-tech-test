import { Request, Response } from 'express';
import { z } from 'zod';
import { CreateTemplate } from '../../application/create-template';
import { GetTemplate } from '../../application/get-template';
import { ListTemplates } from '../../application/list-templates';
import { UpdateTemplate } from '../../application/update-template';
import { RenderTemplate } from '../../application/render-template';

const VariableDeclarationSchema = z.object({
  name: z.string(),
  default: z.string().optional(),
});

const CreateTemplateBody = z.object({
  name: z.string().min(1),
  content: z.string().min(1),
  tags: z.array(z.string()).optional(),
  variables: z.array(VariableDeclarationSchema).optional(),
});

const UpdateTemplateBody = z.object({
  content: z.string().min(1),
  variables: z.array(VariableDeclarationSchema).optional(),
});

const RenderTemplateBody = z.object({
  version: z.number().int().positive().optional(),
  variables: z.record(z.string(), z.string()).optional(),
});

function formatZodError(error: z.ZodError): string {
  const issue = error.issues[0];
  const field = issue.path.join('.');
  return field ? `${field} is required` : issue.message;
}

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
    const parsed = CreateTemplateBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: formatZodError(parsed.error) });
      return;
    }

    const { name, tags, content, variables } = parsed.data;
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
    const parsed = UpdateTemplateBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: formatZodError(parsed.error) });
      return;
    }

    const { content, variables } = parsed.data;
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
    const parsed = RenderTemplateBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: formatZodError(parsed.error) });
      return;
    }
    const { version, variables } = parsed.data;

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
