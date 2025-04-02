import pino from 'pino';
import { config, AppConfig } from './config';
import { initializeServices, setupHeliusWebhook } from './services';
import { startWebhookServer } from './server';
import { startSlotAndBlockhashTracker } from './utils/chain-utils';
import { BotContext } from './types';

async function main() {
  const logger = pino({
    level: process.env.LOG_LEVEL || 'info', // Берем уровень из .env или по умолчанию info
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        ignore: 'pid,hostname',
        translateTime: 'SYS:yyyy-mm-dd HH:MM:ss'
      }
    }
  });

  logger.info('Запуск Pump.fun Sniper Bot...');
  // Создаем объект для логирования, исключая чувствительные поля
  const { 
    tradingWalletPrivateKey, 
    jitoAuthPrivateKey, 
    heliusApiKey, 
    ...loggableConfig // Остальные поля конфига
  } = config;
  logger.info({ config: loggableConfig }, 'Загружена конфигурация (чувствительные поля скрыты)');

  try {
    // Инициализация сервисов
    const partialContext = await initializeServices(config, logger);

    // Создание полного контекста
    const context: BotContext = {
      // Проверяем наличие обязательных полей из partialContext
      config: partialContext.config!,
      solanaConnection: partialContext.solanaConnection!,
      heliusClient: partialContext.heliusClient!,
      jitoClient: partialContext.jitoClient!,
      pumpSdk: partialContext.pumpSdk, // Может быть null/any
      tradingWallet: partialContext.tradingWallet!,
      jitoAuthWallet: partialContext.jitoAuthWallet!,
      logger: partialContext.logger!,
      // Добавляем поля состояния
      latestSlot: 0,
      latestBlockhash: '',
      activeCoin: null,
    };

    // Проверка на случай, если initializeServices вернул не все ожидаемые поля
    if (!context.config || !context.solanaConnection || !context.heliusClient || !context.jitoClient || !context.tradingWallet || !context.jitoAuthWallet || !context.logger) {
        throw new Error('Критическая ошибка: Не удалось инициализировать все компоненты контекста.');
    }

    // Настройка Helius вебхука (выполняется до запуска сервера)
    await setupHeliusWebhook(
      context.heliusClient,
      config.heliusWebhookUrl,
      config.pumpFunProgramId,
      logger
    );

    // Запуск отслеживания слота/блокхеша (дожидаемся первого обновления)
    // Указываем интервал здесь, например, 500 мс
    await startSlotAndBlockhashTracker(context, 500);

    // Запуск HTTP сервера для вебхуков
    startWebhookServer(config.webhookServerPort, logger, context);

    logger.info('Бот успешно инициализирован и готов к работе.');

    // Graceful shutdown (пример)
    process.on('SIGINT', () => {
      logger.info('Получен SIGINT. Завершение работы...');
      // Здесь можно добавить логику очистки, например, закрытие соединений
      process.exit(0);
    });
    process.on('SIGTERM', () => {
      logger.info('Получен SIGTERM. Завершение работы...');
      process.exit(0);
    });

  } catch (error) {
    logger.fatal({ err: error }, 'Критическая ошибка при инициализации или запуске бота.');
    process.exit(1);
  }
}

main();
