import express, { Request, Response, NextFunction } from 'express';
import { BotContext } from './types'; // Нужен для передачи контекста, если потребуется обработка
import pino from 'pino';

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
  app.post('/webhooks/helius', (req: Request, res: Response) => {
    const payload = req.body;
    // TODO: Добавить проверку подписи/заголовка авторизации от Helius, если настроено
    logger.info({ payload }, 'Получен вебхук Helius');

    // Здесь будет основная логика обработки вебхука.
    // Например, парсинг payload, определение типа события (создание пула, обмен и т.д.),
    // и запуск логики покупки, если это новый токен.

    // Пример обработки (просто логирование типа транзакции, если есть)
    if (Array.isArray(payload) && payload.length > 0) {
        payload.forEach((txInfo, index) => {
            logger.info(`Вебхук[${index}]: Тип=${txInfo.type}, Сигнатура=${txInfo.signature}`);
            // Детальный разбор txInfo.events, txInfo.instructions и т.д. для Pump.fun
        });
    } else {
        logger.warn('Получен неожиданный формат payload от Helius вебхука');
    }


    // Отвечаем Helius, что вебхук успешно получен
    res.status(200).send('OK');
  });

  // Обработчик ошибок
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    logger.error({ err }, 'Ошибка при обработке запроса');
    res.status(500).send('Internal Server Error');
  });

  app.listen(port, () => {
    logger.info(`Сервер вебхуков запущен и слушает порт ${port}`);
  });
}
