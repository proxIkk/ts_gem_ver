import express, { Request, Response, NextFunction } from 'express';
import { BotContext } from './types'; // Нужен для передачи контекста, если потребуется обработка
import pino from 'pino';
import { handleHeliusWebhook } from './webhook'; // Импортируем обработчик

/**
 * Создает и запускает HTTP сервер для приема вебхуков.
 * @param port Порт, на котором будет слушать сервер.
 * @param logger Экземпляр логгера.
 * @param context Контекст бота (если обработка хуков будет здесь).
 */
export function startWebhookServer(
  port: number,
  logger: pino.Logger,
  context: BotContext // Пока не используется, но может понадобиться
): void {
  const app = express();

  // Middleware для парсинга JSON тела запроса
  app.use(express.json());

  // Middleware для логирования запросов
  app.use((req: Request, res: Response, next: NextFunction) => {
    logger.info({ method: req.method, url: req.url, ip: req.ip }, 'Входящий запрос');
    next();
  });

  // Эндпоинт для приема вебхуков Helius
  app.post('/webhooks/helius', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const signature = req.headers['helius-signature'] as string;
      // TODO: Реализовать проверку подписи Helius для безопасности
      // if (!verifySignature(req.body, signature, HELIUS_AUTH_SECRET)) {
      //   logger.warn('Неверная подпись Helius вебхука');
      //   return res.status(401).send('Unauthorized');
      // }

      const payload = req.body;
      logger.debug({ payload }, 'Получен вебхук Helius');

      // Вызываем внешний обработчик, передавая ему контекст и payload
      await handleHeliusWebhook(payload, context);

      res.status(200).send('OK');
    } catch (error) {
      logger.error({ err: error }, 'Ошибка при обработке Helius вебхука');
      // Передаем ошибку в глобальный обработчик ошибок Express
      next(error);
    }
  });

  // Обработчик ошибок
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    logger.error({ err, stack: err.stack }, 'Необработанная ошибка сервера');
    res.status(500).send('Internal Server Error');
  });

  app.listen(port, () => {
    logger.info(`Сервер вебхуков запущен и слушает порт ${port}`);
  });
}
