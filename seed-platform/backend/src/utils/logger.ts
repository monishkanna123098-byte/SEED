import winston from 'winston'

const { combine, timestamp, errors, json, colorize, simple } = winston.format

const isDev = process.env.NODE_ENV === 'development'

export const logger = winston.createLogger({
  level: isDev ? 'debug' : 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    json()
  ),
  defaultMeta: { service: 'seed-backend' },
  transports: [
    new winston.transports.Console({
      format: isDev ? combine(colorize(), simple()) : combine(timestamp(), json()),
    }),
  ],
})
