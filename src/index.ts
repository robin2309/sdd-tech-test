import { createApp } from './app';
import { InMemoryTemplateRepository } from './infrastructure/persistence/in-memory-repository';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

const repository = new InMemoryTemplateRepository();
const app = createApp(repository);

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server running on port ${PORT}`);
});
