const {
  createLogger,
  format,
  transports,
} = require('winston');
const { combine, timestamp, label, printf, json } = format;
const DailyRotateFile = require('winston-daily-rotate-file');

// 自定义日志格式
const logFormat = printf(
  ({
    level,
    message,
    timestamp,
    context,
    stack,
    service,
    hostname,
  }: {
    level: string;
    message: string;
    timestamp: string;
    context: any;
    stack: string;
    service: string;
    hostname: string;
  }) => {
    const base = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    if (stack) return `${base}\nStack: ${stack}`;
    if (context)
      return `${base}\nContext: ${JSON.stringify(
        context,
        null,
        2
      )}`;
    return base;
  }
);

// 创建 logger 实例
const logger = createLogger({
  level: 'error', // 只记录 error 及以上级别（生产环境建议）
  format: combine(
    label({ label: 'my-app' }),
    timestamp(),
    json() // 输出为 JSON 格式，便于 ELK/Splunk 分析
  ),
  transports: [
    // ✅ 错误日志：写入单独文件（只记录 error）
    new DailyRotateFile({
      filename: './logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d', // 保留14天
      level: 'error', // 只记录 error
    }),

    // ✅ 所有日志（含 error）也输出到控制台（开发环境有用）
    new transports.Console({
      format: combine(format.colorize(), logFormat),
      level: 'error',
    }),
  ],
});

// 捕获未处理的异常和拒绝的 Promise
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', { stack: err.stack });
  process.exit(1); // 强制退出，避免进程处于不稳定状态
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', {
    reason: reason instanceof Error ? reason.stack : reason,
    promise: promise.toString(),
  });
  process.exit(1);
});

export default logger;
