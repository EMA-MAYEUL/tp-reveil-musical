import Fastify, { type FastifyError, type FastifyInstance } from 'fastify';
import type { WakeUpService } from '../../application/WakeUpService.js';
import { UnknownUserError } from '../../domain/errors.js';
import { DAYS_OF_WEEK, WEATHER_TYPES, type WakeUpRequest } from '../../domain/wakeUp.js';

const wakeUpBodySchema = {
  type: 'object',
  required: ['userId', 'dayOfWeek', 'weather'],
  additionalProperties: false,
  properties: {
    userId: { type: 'string', minLength: 1 },
    dayOfWeek: { type: 'string', enum: [...DAYS_OF_WEEK] },
    weather: { type: 'string', enum: [...WEATHER_TYPES] },
  },
} as const;

/** HTTP layer: validates the input and delegates to the use case, nothing else. */
export function buildApp({ wakeUpService }: { wakeUpService: WakeUpService }): FastifyInstance {
  const app = Fastify({ logger: false });

  app.post<{ Body: WakeUpRequest }>('/wake-up', { schema: { body: wakeUpBodySchema } }, async (request) =>
    wakeUpService.wakeUp(request.body),
  );

  app.setErrorHandler((error: FastifyError, _request, reply) => {
    if (error instanceof UnknownUserError) {
      return reply.status(404).send({ error: error.message });
    }
    if (error.validation) {
      return reply.status(400).send({ error: error.message });
    }
    app.log.error(error);
    return reply.status(500).send({ error: 'Internal error' });
  });

  return app;
}
