import { CONSTANTS } from '../config/constants.js';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

const COLORS: Record<LogLevel, string> = {
  debug: '\x1b[36m',   // Cyan
  info: '\x1b[32m',    // Green
  warn: '\x1b[33m',    // Yellow
  error: '\x1b[31m'    // Red
};

const RESET = '\x1b[0m';

export const logger = {
  debug: (message: string, data?: any) => log('debug', message, data),
  info: (message: string, data?: any) => log('info', message, data),
  warn: (message: string, data?: any) => log('warn', message, data),
  error: (message: string, data?: any) => log('error', message, data),
};

function log(level: LogLevel, message: string, data?: any) {
  const threshold = LEVELS[CONSTANTS.LOG_LEVEL as LogLevel] || LEVELS.info;
  if (LEVELS[level] < threshold) return;

  const timestamp = new Date().toISOString();
  const color = COLORS[level];
  const levelStr = level.toUpperCase().padEnd(6);

  let output = `${color}[${timestamp}] ${levelStr}${RESET} ${message}`;
  if (data) {
    output += ` ${JSON.stringify(data)}`;
  }

  console.log(output);
}
