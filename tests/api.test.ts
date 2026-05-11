import request from 'supertest';
import { createApp } from '../src/app';
import { InMemoryTemplateRepository } from '../src/infrastructure/persistence/in-memory-repository';

function buildApp() {
  const repository = new InMemoryTemplateRepository();
  const app = createApp(repository);
  return { app, repository };
}

describe('POST /templates', () => {
  it('should create a template with all fields', async () => {
    const { app } = buildApp();
    const res = await request(app)
      .post('/templates')
      .send({
        name: 'Translator',
        tags: ['translation', 'utility'],
        content: 'Translate {{text}} to {{language}}',
        variables: [
          { name: 'text' },
          { name: 'language', default: 'English' },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.name).toBe('Translator');
    expect(res.body.tags).toEqual(['translation', 'utility']);
    expect(res.body.version.version).toBe(1);
    expect(res.body.version.content).toBe('Translate {{text}} to {{language}}');
    expect(res.body.version.variables).toEqual([
      { name: 'text' },
      { name: 'language', default: 'English' },
    ]);
  });

  it('should return 400 when content is missing', async () => {
    const { app } = buildApp();
    const res = await request(app)
      .post('/templates')
      .send({ name: 'Test' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/content/i);
  });

  it('should return 400 when name is missing', async () => {
    const { app } = buildApp();
    const res = await request(app)
      .post('/templates')
      .send({ content: 'Hello {{name}}' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/name/i);
  });
});

describe('GET /templates/:id', () => {
  it('should retrieve the latest version by default', async () => {
    const { app } = buildApp();

    const createRes = await request(app)
      .post('/templates')
      .send({ name: 'Test', content: 'v1 content' });
    const id = createRes.body.id;

    await request(app).put(`/templates/${id}`).send({ content: 'v2 content' });
    await request(app).put(`/templates/${id}`).send({ content: 'v3 content' });

    const res = await request(app).get(`/templates/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.version.version).toBe(3);
    expect(res.body.version.content).toBe('v3 content');
  });

  it('should retrieve a specific historical version', async () => {
    const { app } = buildApp();

    const createRes = await request(app)
      .post('/templates')
      .send({ name: 'Test', content: 'v1 content' });
    const id = createRes.body.id;

    await request(app).put(`/templates/${id}`).send({ content: 'v2 content' });
    await request(app).put(`/templates/${id}`).send({ content: 'v3 content' });

    const res = await request(app).get(`/templates/${id}?version=1`);
    expect(res.status).toBe(200);
    expect(res.body.version.version).toBe(1);
    expect(res.body.version.content).toBe('v1 content');
  });

  it('should return 404 for non-existent template', async () => {
    const { app } = buildApp();
    const res = await request(app).get('/templates/non-existent-id');
    expect(res.status).toBe(404);
  });

  it('should return 404 for non-existent version', async () => {
    const { app } = buildApp();

    const createRes = await request(app)
      .post('/templates')
      .send({ name: 'Test', content: 'v1' });
    const id = createRes.body.id;

    const res = await request(app).get(`/templates/${id}?version=99`);
    expect(res.status).toBe(404);
  });
});

describe('GET /templates', () => {
  it('should filter templates by tag and name', async () => {
    const { app } = buildApp();

    await request(app)
      .post('/templates')
      .send({ name: 'Email Greeting', tags: ['email'], content: 'Hi {{name}}' });
    await request(app)
      .post('/templates')
      .send({ name: 'Email Signoff', tags: ['email'], content: 'Best, {{name}}' });
    await request(app)
      .post('/templates')
      .send({ name: 'SQL Generator', tags: ['code'], content: 'SELECT {{cols}}' });

    const res = await request(app).get('/templates?tags=email&name=Greeting');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Email Greeting');
  });

  it('should return empty array when no matches', async () => {
    const { app } = buildApp();

    await request(app)
      .post('/templates')
      .send({ name: 'Test', tags: ['foo'], content: 'Hello' });

    const res = await request(app).get('/templates?tags=nonexistent_tag');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe('PUT /templates/:id', () => {
  it('should create a new version with incremented version number', async () => {
    const { app } = buildApp();

    const createRes = await request(app)
      .post('/templates')
      .send({
        name: 'Test',
        content: 'v1',
        variables: [{ name: 'x' }],
      });
    const id = createRes.body.id;

    const res = await request(app)
      .put(`/templates/${id}`)
      .send({
        content: 'v2 {{y}}',
        variables: [{ name: 'y' }],
      });

    expect(res.status).toBe(201);
    expect(res.body.version.version).toBe(2);
    expect(res.body.version.content).toBe('v2 {{y}}');

    // Original version should still exist
    const v1Res = await request(app).get(`/templates/${id}?version=1`);
    expect(v1Res.body.version.content).toBe('v1');
  });

  it('should create a new version with empty variables when omitted', async () => {
    const { app } = buildApp();

    const createRes = await request(app)
      .post('/templates')
      .send({
        name: 'Test',
        content: 'v1',
        variables: [{ name: 'x' }],
      });
    const id = createRes.body.id;

    const res = await request(app)
      .put(`/templates/${id}`)
      .send({ content: 'v2 no vars' });

    expect(res.status).toBe(201);
    expect(res.body.version.version).toBe(2);
    expect(res.body.version.variables).toEqual([]);
  });

  it('should return 404 for non-existent template', async () => {
    const { app } = buildApp();
    const res = await request(app)
      .put('/templates/non-existent')
      .send({ content: 'test' });
    expect(res.status).toBe(404);
  });

  it('should return 400 when content is missing', async () => {
    const { app } = buildApp();
    const createRes = await request(app)
      .post('/templates')
      .send({ name: 'Test', content: 'v1' });
    const id = createRes.body.id;

    const res = await request(app)
      .put(`/templates/${id}`)
      .send({});
    expect(res.status).toBe(400);
  });
});

describe('POST /templates/:id/render', () => {
  it('should render with all variables provided', async () => {
    const { app } = buildApp();

    const createRes = await request(app)
      .post('/templates')
      .send({
        name: 'Email',
        content: 'Write a {{tone}} email to {{name}}',
        variables: [{ name: 'tone' }, { name: 'name' }],
      });
    const id = createRes.body.id;

    const res = await request(app)
      .post(`/templates/${id}/render`)
      .send({ variables: { tone: 'polite', name: 'Alice' } });

    expect(res.status).toBe(200);
    expect(res.body.rendered_content).toBe('Write a polite email to Alice');
  });

  it('should render using default variable values', async () => {
    const { app } = buildApp();

    const createRes = await request(app)
      .post('/templates')
      .send({
        name: 'Translator',
        content: 'Translate to {{language}}',
        variables: [{ name: 'language', default: 'English' }],
      });
    const id = createRes.body.id;

    const res = await request(app)
      .post(`/templates/${id}/render`)
      .send({ variables: {} });

    expect(res.status).toBe(200);
    expect(res.body.rendered_content).toBe('Translate to English');
  });

  it('should ignore unknown variables', async () => {
    const { app } = buildApp();

    const createRes = await request(app)
      .post('/templates')
      .send({
        name: 'Greeter',
        content: 'Hello {{name}}',
        variables: [{ name: 'name' }],
      });
    const id = createRes.body.id;

    const res = await request(app)
      .post(`/templates/${id}/render`)
      .send({ variables: { name: 'Bob', age: '30', role: 'admin' } });

    expect(res.status).toBe(200);
    expect(res.body.rendered_content).toBe('Hello Bob');
  });

  it('should return 400 when required variables are missing', async () => {
    const { app } = buildApp();

    const createRes = await request(app)
      .post('/templates')
      .send({
        name: 'Dual',
        content: 'Context: {{context}}, Task: {{task}}',
        variables: [{ name: 'context' }, { name: 'task' }],
      });
    const id = createRes.body.id;

    const res = await request(app)
      .post(`/templates/${id}/render`)
      .send({ variables: { context: 'Sales data' } });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/task/);
    expect(res.body.missing_variables).toContain('task');
  });

  it('should render a specific historical version', async () => {
    const { app } = buildApp();

    const createRes = await request(app)
      .post('/templates')
      .send({
        name: 'Greeter',
        content: 'Hi {{name}}',
        variables: [{ name: 'name' }],
      });
    const id = createRes.body.id;

    await request(app)
      .put(`/templates/${id}`)
      .send({
        content: 'Greetings {{full_name}}',
        variables: [{ name: 'full_name' }],
      });

    const res = await request(app)
      .post(`/templates/${id}/render`)
      .send({ version: 1, variables: { name: 'Alice' } });

    expect(res.status).toBe(200);
    expect(res.body.rendered_content).toBe('Hi Alice');
  });

  it('should return 404 for non-existent template', async () => {
    const { app } = buildApp();
    const res = await request(app)
      .post('/templates/non-existent/render')
      .send({ variables: {} });
    expect(res.status).toBe(404);
  });
});
