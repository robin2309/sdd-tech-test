import { newDb } from 'pg-mem';
import { createApp } from './app';
import { PgMemTemplateRepository, initSchema, createPool } from './infrastructure/persistence/pg-mem-repository';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

const db = newDb();
initSchema(db);
const pool = createPool(db);
const repository = new PgMemTemplateRepository(pool);
const app = createApp(repository);

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server running on port ${PORT}`);
});
