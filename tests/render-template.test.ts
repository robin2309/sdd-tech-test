import { RenderTemplate } from '../src/application/render-template';
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

describe('RenderTemplate', () => {
  let repository: jest.Mocked<ITemplateRepository>;
  let useCase: RenderTemplate;

  beforeEach(() => {
    repository = {
      findById: jest.fn(),
      findLatestVersion: jest.fn(),
      findVersion: jest.fn(),
      save: jest.fn(),
      addVersion: jest.fn(),
      findAll: jest.fn(),
    };
    useCase = new RenderTemplate(repository);
  });

  describe('template not found', () => {
    it('returns not_found when the template does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      const result = await useCase.execute('tpl-1', { variables: {} });

      expect(result).toEqual({ success: false, error: 'not_found' });
    });

    it('does not query for versions when the template is missing', async () => {
      repository.findById.mockResolvedValue(null);

      await useCase.execute('tpl-1', { variables: {} });

      expect(repository.findLatestVersion).not.toHaveBeenCalled();
      expect(repository.findVersion).not.toHaveBeenCalled();
    });
  });

  describe('version not found', () => {
    it('returns not_found when no specific version is requested and the latest is missing', async () => {
      repository.findById.mockResolvedValue(makeTemplate());
      repository.findLatestVersion.mockResolvedValue(null);

      const result = await useCase.execute('tpl-1', { variables: {} });

      expect(result).toEqual({ success: false, error: 'not_found' });
      expect(repository.findLatestVersion).toHaveBeenCalledWith('tpl-1');
      expect(repository.findVersion).not.toHaveBeenCalled();
    });

    it('returns not_found when a specific version is requested but does not exist', async () => {
      repository.findById.mockResolvedValue(makeTemplate());
      repository.findVersion.mockResolvedValue(null);

      const result = await useCase.execute('tpl-1', { version: 3, variables: {} });

      expect(result).toEqual({ success: false, error: 'not_found' });
      expect(repository.findVersion).toHaveBeenCalledWith('tpl-1', 3);
      expect(repository.findLatestVersion).not.toHaveBeenCalled();
    });
  });

  describe('successful render', () => {
    it('renders using the latest version when no version is requested', async () => {
      repository.findById.mockResolvedValue(makeTemplate());
      repository.findLatestVersion.mockResolvedValue(
        makeVersion({ content: 'Hello {{name}}', variables: [] }),
      );

      const result = await useCase.execute('tpl-1', { variables: { name: 'Alice' } });

      expect(result).toEqual({ success: true, renderedContent: 'Hello Alice' });
      expect(repository.findLatestVersion).toHaveBeenCalledWith('tpl-1');
      expect(repository.findVersion).not.toHaveBeenCalled();
    });

    it('renders using the specific version when one is requested', async () => {
      repository.findById.mockResolvedValue(makeTemplate());
      repository.findVersion.mockResolvedValue(
        makeVersion({ version: 2, content: 'Task: {{task}}', variables: [] }),
      );

      const result = await useCase.execute('tpl-1', { version: 2, variables: { task: 'Write tests' } });

      expect(result).toEqual({ success: true, renderedContent: 'Task: Write tests' });
      expect(repository.findVersion).toHaveBeenCalledWith('tpl-1', 2);
      expect(repository.findLatestVersion).not.toHaveBeenCalled();
    });

    it('uses declared variable defaults when no value is provided', async () => {
      repository.findById.mockResolvedValue(makeTemplate());
      repository.findLatestVersion.mockResolvedValue(
        makeVersion({
          content: 'Hello {{name}}',
          variables: [{ name: 'name', default: 'World' }],
        }),
      );

      const result = await useCase.execute('tpl-1', { variables: {} });

      expect(result).toEqual({ success: true, renderedContent: 'Hello World' });
    });
  });

  describe('missing variables', () => {
    it('returns missing_variables when a placeholder cannot be resolved', async () => {
      repository.findById.mockResolvedValue(makeTemplate());
      repository.findLatestVersion.mockResolvedValue(
        makeVersion({ content: 'Hello {{name}}', variables: [] }),
      );

      const result = await useCase.execute('tpl-1', { variables: {} });

      expect(result).toEqual({
        success: false,
        error: 'missing_variables',
        missingVariables: ['name'],
      });
    });

    it('lists all unresolved variable names', async () => {
      repository.findById.mockResolvedValue(makeTemplate());
      repository.findLatestVersion.mockResolvedValue(
        makeVersion({ content: '{{a}} {{b}} {{c}}', variables: [] }),
      );

      const result = await useCase.execute('tpl-1', { variables: {} });

      expect(result).toMatchObject({ success: false, error: 'missing_variables' });
      if (!result.success && result.error === 'missing_variables') {
        expect(result.missingVariables).toContain('a');
        expect(result.missingVariables).toContain('b');
        expect(result.missingVariables).toContain('c');
      }
    });
  });

  describe('unexpected errors', () => {
    it('re-throws errors that are not MissingVariablesError', async () => {
      const boom = new Error('db connection lost');
      repository.findById.mockRejectedValue(boom);

      await expect(useCase.execute('tpl-1', { variables: {} })).rejects.toThrow('db connection lost');
    });
  });
});
