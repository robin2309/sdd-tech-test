import express from 'express';
import { ITemplateRepository } from './domain/repository';
import { createRouter } from './infrastructure/http/router';

export function createApp(repository: ITemplateRepository): express.Application {
  const app = express();
  app.use(express.json());
  app.use(createRouter(repository));
  return app;
}
