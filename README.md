# sdd-tech-test

Prompt template management API built with Node.js, TypeScript, and Express. Uses an in-memory PostgreSQL database (pg-mem) for persistence — no external database required.

## Prerequisites

- Node.js >= 20

## Install

```bash
npm install
```

## Run

```bash
# Development (with ts-node)
npm run dev

# Production build
npm run build
npm start
```

The server starts on port 3000 by default. Set the `PORT` environment variable to change it.

## Test

```bash
npm test
```

## Lint

```bash
npm run lint

# Auto-fix
npm run lint:fix
```

## API Endpoints

### Create a template

```bash
curl -X POST http://localhost:3000/templates \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Greeting",
    "tags": ["email"],
    "content": "Hello {{name}}, welcome to {{company}}!",
    "variables": [
      { "name": "name" },
      { "name": "company", "default": "Acme" }
    ]
  }'
```

### Get a template

```bash
# Latest version
curl http://localhost:3000/templates/:id

# Specific version
curl http://localhost:3000/templates/:id?version=1
```

### List and filter templates

```bash
curl 'http://localhost:3000/templates?tags=email&name=Greeting'
```

### Update a template (creates a new version)

```bash
curl -X PUT http://localhost:3000/templates/:id \
  -H 'Content-Type: application/json' \
  -d '{
    "content": "Hi {{first_name}}, welcome to {{company}}!",
    "variables": [
      { "name": "first_name" },
      { "name": "company", "default": "Acme" }
    ]
  }'
```

### Render a template

```bash
curl -X POST http://localhost:3000/templates/:id/render \
  -H 'Content-Type: application/json' \
  -d '{
    "variables": { "name": "Alice" }
  }'
```

## Project Structure

```
src/
  domain/          # Entities, renderer, repository interface (zero dependencies)
  application/     # Use cases (CreateTemplate, GetTemplate, etc.)
  infrastructure/
    persistence/   # pg-mem repository implementation
    http/          # Express controllers and router
  app.ts           # Express app factory
  index.ts         # Entry point
tests/
  api.test.ts      # Integration tests for all endpoints
```
