import { Router } from 'express';
import { ITemplateRepository } from '../../domain/repository';
import { CreateTemplate } from '../../application/create-template';
import { GetTemplate } from '../../application/get-template';
import { ListTemplates } from '../../application/list-templates';
import { UpdateTemplate } from '../../application/update-template';
import { RenderTemplate } from '../../application/render-template';
import {
  createTemplateController,
  getTemplateController,
  listTemplatesController,
  updateTemplateController,
  renderTemplateController,
} from './controllers';

export function createRouter(repository: ITemplateRepository): Router {
  const router = Router();

  const createTemplate = new CreateTemplate(repository);
  const getTemplate = new GetTemplate(repository);
  const listTemplates = new ListTemplates(repository);
  const updateTemplate = new UpdateTemplate(repository);
  const renderTemplate = new RenderTemplate(repository);

  router.post('/templates', createTemplateController(createTemplate));
  router.get('/templates', listTemplatesController(listTemplates));
  router.get('/templates/:id', getTemplateController(getTemplate));
  router.put('/templates/:id', updateTemplateController(updateTemplate));
  router.post('/templates/:id/render', renderTemplateController(renderTemplate));

  return router;
}
