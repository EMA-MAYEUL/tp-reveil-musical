import { loadConfig } from './config.js';
import { buildContainer } from './container.js';
import { buildApp } from './presentation/http/buildApp.js';

const config = loadConfig(process.env);
const container = buildContainer(config);
const app = buildApp(container.cradle);

await app.listen({ port: config.port, host: '127.0.0.1' });
console.info(`Réveil musical listening on http://127.0.0.1:${config.port} (music: ${config.musicProviders.join(' > ')})`);
