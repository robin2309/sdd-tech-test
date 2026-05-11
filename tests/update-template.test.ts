import { UpdateTemplate } from '../src/application/update-template';
import { ITemplateRepository } from '../src/domain/repository';
import { Template, TemplateVersion } from '../src/domain/entities';

const makeTemplate = (overrides: Partial<Template> = {}): Template => ({
  id: 'tpl-1',
  name: 'My Template',
  tags: [],
  createdAt: new Date('2024-01-01'),
  ...overrides,
});

const makeVersion = (overrides: Partial<TemplateVersion> = {}): TemplateVersion => ({
  id: 'ver-1',
  templateId: 'tpl-1',
  version: 1,
  content: 'Hello {{name}}',
  variables: [],
  createdAt: new Date('2024-01-01'),
  ...overrides,
});

describe('UpdateTemplate', () => {
  let repository: jest.Mocked<ITemplateRepository>;
  let useCase: UpdateTemplate;

  beforeEach(() => {
    repository = {
      findById: jest.fn(),
      findLatestVersion: jest.fn(),
      addVersion: jest.fn(),
      save: jest.fn(),
      findVersion: jest.fn(),
      findAll: jest.fn(),
    };
    useCase = new UpdateTemplate(repository);
  });

  describe('template not found', () => {
    it('returns null when the template does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      const result = await useCase.execute('tpl-1', { content: 'Hi' });

      expect(result).toBeNull();
    });

    it('does not query versions or persist when the template is missing', async () => {
      repository.findById.mockResolvedValue(null);

      await useCase.execute('tpl-1', { content: 'Hi' });

      expect(repository.findLatestVersion).not.toHaveBeenCalled();
      expect(repository.addVersion).not.toHaveBeenCalled();
    });
  });

  describe('version numbering', () => {
    it('assigns version 1 when there are no existing versions', async () => {
      repository.findById.mockResolvedValue(makeTemplate());
      repository.findLatestVersion.mockResolvedValue(null);
      repository.addVersion.mockResolvedValue(undefined);

      const result = await useCase.execute('tpl-1', { content: 'Hi' });

      expect(result!.version.version).toBe(1);
    });

    it('increments the latest version number by 1', async () => {
      repository.findById.mockResolvedValue(makeTemplate());
      repository.findLatestVersion.mockResolvedValue(makeVersion({ version: 3 }));
      repository.addVersion.mockResolvedValue(undefined);

      const result = await useCase.execute('tpl-1', { content: 'Hi' });

      expect(result!.version.version).toBe(4);
    });

    it('calls addVersion with the computed version number', async () => {
      repository.findById.mockResolvedValue(makeTemplate());
      repository.findLatestVersion.mockResolvedValue(null);
      repository.addVersion.mockResolvedValue(undefined);

      await useCase.execute('tpl-1', { content: 'Hi' });

      expect(repository.addVersion).toHaveBeenCalledTimes(1);
      expect(repository.addVersion).toHaveBeenCalledWith(
        expect.objectContaining({ version: 1, templateId: 'tpl-1' }),
      );
    });
  });

  describe('return value', () => {
    it('returns the template fetched from the repository', async () => {
      const template = makeTemplate({ name: 'Special' });
      repository.findById.mockResolvedValue(template);
      repository.findLatestVersion.mockResolvedValue(null);
      repository.addVersion.mockResolvedValue(undefined);

      const result = await useCase.execute('tpl-1', { content: 'Hi' });

      expect(result!.template).toBe(template);
    });

    it('returns a version with the correct content and templateId', async () => {
      repository.findById.mockResolvedValue(makeTemplate());
      repository.findLatestVersion.mockResolvedValue(null);
      repository.addVersion.mockResolvedValue(undefined);

      const result = await useCase.execute('tpl-1', { content: 'Hello {{name}}' });

      expect(result!.version.content).toBe('Hello {{name}}');
      expect(result!.version.templateId).toBe('tpl-1');
    });
  });

  describe('variables', () => {
    it('defaults variables to an empty array when not provided', async () => {
      repository.findById.mockResolvedValue(makeTemplate());
      repository.findLatestVersion.mockResolvedValue(null);
      repository.addVersion.mockResolvedValue(undefined);

      const result = await useCase.execute('tpl-1', { content: 'Hi' });

      expect(result!.version.variables).toEqual([]);
    });

    it('passes provided variables through to the new version', async () => {
      repository.findById.mockResolvedValue(makeTemplate());
      repository.findLatestVersion.mockResolvedValue(null);
      repository.addVersion.mockResolvedValue(undefined);

      const variables = [{ name: 'title' }, { name: 'body', default: 'n/a' }];
      const result = await useCase.execute('tpl-1', { content: 'Hi', variables });

      expect(result!.version.variables).toEqual(variables);
    });
  });

  describe('unexpected errors', () => {
    it('re-throws errors from the repository', async () => {
      const boom = new Error('db connection lost');
      repository.findById.mockRejectedValue(boom);

      await expect(useCase.execute('tpl-1', { content: 'Hi' })).rejects.toThrow('db connection lost');
    });
  });
});
