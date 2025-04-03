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

    // Проверка наличия критически важных компонентов перед созданием полного контекста
    if (!partialContext.config || !partialContext.solanaConnection || !partialContext.heliusClient || !partialContext.jitoClient || !partialContext.tradingWallet || !partialContext.jitoAuthWallet || !partialContext.logger) {
      throw new Error('Критическая ошибка: Не удалось инициализировать базовые компоненты контекста.');
    }
    // Отдельная проверка для pumpSdk, так как его инициализация может упасть без падения всего initializeServices
    if (!partialContext.pumpSdk) {
        throw new Error('Критическая ошибка: Не удалось инициализировать PumpFun SDK.');
    }

    // Создание полного контекста (теперь мы уверены, что все поля есть)
    const context: BotContext = {
      config: partialContext.config,
      solanaConnection: partialContext.solanaConnection,
      heliusClient: partialContext.heliusClient,
      jitoClient: partialContext.jitoClient,
      pumpSdk: partialContext.pumpSdk, // Теперь TS знает, что он не undefined
      tradingWallet: partialContext.tradingWallet,
      jitoAuthWallet: partialContext.jitoAuthWallet,
      logger: partialContext.logger,
      latestSlot: 0,
      latestBlockhash: '',
      activeCoin: null,
    };

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
