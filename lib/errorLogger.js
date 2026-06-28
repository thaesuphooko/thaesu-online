import winston from 'winston';
import { query } from './db.js';

const logger = winston.createLogger({
  level: 'error',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: '/tmp/thaesu-errors.log' }),
  ],
});

export async function logError(errorCode, errorMessage, stack, module) {
  // Save to database
  await query(
    'INSERT INTO error_logs (error_code, error_message, stack, module) VALUES ($1,$2,$3,$4)',
    [errorCode, errorMessage, stack, module]
  ).catch(console.error);

  // Winston log
  logger.error({ errorCode, errorMessage, module, timestamp: new Date() });
}
