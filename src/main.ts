import pino from 'pino';
import { config } from './config';
import { initializeServices, setupHeliusWebhook } from './services';
import { startWebhookServer } from './server';
import { startSlotAndBlockhashTracker } from './utils/chain-utils';
import { BotContext } from './types';

async function main() {
  // 1. Настройка логгера
  const logger = pino({
    level: 'info', // Уровень логирования (info, debug, warn, error)
    transport: {
      target: 'pino-pretty', // Используем pino-pretty для красивого вывода в консоль
      options: {
        colorize: true,
        ignore: 'pid,hostname', // Не показываем PID и имя хоста
        translateTime: 'SYS:yyyy-mm-dd HH:MM:ss' // Формат времени
      }
    }
  });

  logger.info('Запуск Pump.fun Sniper Bot...');
  logger.info(`Загружена конфигурация: ${JSON.stringify({ ...config, tradingWalletPrivateKey: '***', jitoAuthPrivateKey: '***', heliusApiKey: '***' })}`); // Маскируем ключи

  try {
    // 2. Инициализация сервисов (Solana, Helius, Jito)
    const partialContext = await initializeServices(config, logger);

    // Дополняем контекст начальными значениями
    const context: BotContext = {
      ...partialContext,
      latestSlot: 0,
      latestBlockhash: '',
      // Убедимся, что все обязательные поля из BotContext присутствуют
      helius: partialContext.helius!,
      solanaConnection: partialContext.solanaConnection!,
      jitoSearcherClient: partialContext.jitoSearcherClient!,
      tradingWallet: partialContext.tradingWallet!,
      jitoAuthWallet: partialContext.jitoAuthWallet!,
      config: partialContext.config!,
      logger: partialContext.logger!,
    };

    // Проверка наличия критически важных компонентов
    if (!context.helius || !context.solanaConnection || !context.jitoSearcherClient || !context.tradingWallet || !context.jitoAuthWallet) {
        throw new Error('Не удалось инициализировать все необходимые компоненты контекста.');
    }

    // 3. Настройка Helius вебхука
    await setupHeliusWebhook(
      context.helius,
      config.heliusWebhookUrl,
      config.pumpFunProgramId,
      logger
    );

    // 4. Запуск отслеживания слота/блокхеша
    startSlotAndBlockhashTracker(context, 1000); // Обновляем раз в секунду

    // 5. Запуск HTTP сервера для вебхуков
    // Передаем полный контекст, если он понадобится обработчику вебхуков
    startWebhookServer(config.webhookServerPort, logger, context);

    logger.info('Бот успешно инициализирован и запущен.');

    // Здесь можно добавить graceful shutdown логику при необходимости

  } catch (error) {
    logger.fatal({ err: error }, 'Критическая ошибка при инициализации или запуске бота.');
    process.exit(1); // Завершаем процесс при фатальной ошибке
  }
}

main();
