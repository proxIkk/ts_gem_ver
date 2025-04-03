import { Connection, Keypair } from '@solana/web3.js';
import { Helius, CreateWebhookRequest, WebhookType, TransactionType } from 'helius-sdk';
import {
  SearcherClient,
  searcherClient,
  // BundleResult,
  // Tip,
} from 'jito-ts/dist/sdk/block-engine/searcher';
import bs58 from 'bs58';
import { AppConfig } from './config';
import { BotContext } from './types';
import pino from 'pino';
// Импорты для PumpFunSDK
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet'; // Используем NodeWallet для AnchorProvider
import { PumpFunSDK } from 'pumpdotfun-sdk';

// Вспомогательная функция для получения Keypair из приватного ключа Base58
function getKeypairFromPrivateKey(privateKey: string): Keypair {
  try {
    return Keypair.fromSecretKey(bs58.decode(privateKey));
  } catch (error) {
    console.error("Ошибка декодирования приватного ключа:", error);
    throw new Error('Неверный формат приватного ключа. Используйте Base58.');
  }
}

/**
 * Инициализирует все необходимые сервисы и клиенты для работы бота.
 * @param config Типизированная конфигурация приложения.
 * @param logger Экземпляр логгера.
 * @returns Промис с частичным контекстом бота (без latestSlot, latestBlockhash, activeCoin).
 */
export async function initializeServices(
  config: AppConfig,
  logger: pino.Logger
): Promise<Partial<BotContext>> { // Возвращаем Partial<BotContext>
  logger.info('Инициализация сервисов...');

  // 1. Загрузка ключевых пар
  logger.info('Загрузка ключевых пар...');
  const tradingWallet = getKeypairFromPrivateKey(config.tradingWalletPrivateKey);
  const jitoAuthWallet = getKeypairFromPrivateKey(config.jitoAuthPrivateKey);
  logger.info(`Торговый кошелек загружен: ${tradingWallet.publicKey.toBase58()}`);
  logger.info(`Jito кошелек загружен: ${jitoAuthWallet.publicKey.toBase58()}`);

  // 2. Создание Solana Connection через Helius RPC
  logger.info(`Подключение к Solana RPC: ${config.heliusRpcUrl}`);
  const solanaConnection = new Connection(config.heliusRpcUrl, 'confirmed');
  try {
    const epochInfo = await solanaConnection.getEpochInfo();
    logger.info(`Успешное подключение к Solana RPC. Эпоха: ${epochInfo.epoch}, Слот: ${epochInfo.absoluteSlot}`);
  } catch (error) {
    logger.error({ err: error }, 'Ошибка подключения к Solana RPC');
    throw new Error('Не удалось подключиться к Solana RPC.');
  }

  // 3. Создание Helius клиента
  logger.info('Инициализация Helius клиента...');
  const heliusClient = new Helius(config.heliusApiKey);
  try {
    // Простая проверка, что ключ не вызывает немедленную ошибку
    await heliusClient.getAllWebhooks(); // Пример вызова метода API
    logger.info('Helius клиент инициализирован успешно (проверка API прошла).');
  } catch (error) {
    logger.error({ err: error }, 'Ошибка инициализации Helius клиента или проверки API ключа');
    // Настройка вебхука не сработает, но бот может работать частично
  }

  // 4. Создание Jito Searcher клиента
  logger.info(`Подключение к Jito Block Engine: ${config.jitoBlockEngineUrl}`);
  const jitoClient: SearcherClient = searcherClient(
    config.jitoBlockEngineUrl,
    jitoAuthWallet,
    { 'grpc.keepalive_time_ms': 5000 }
  );

  jitoClient.onBundleResult(
    (bundleResult: any) => {
      logger.info(`Jito Bundle Result: ${bundleResult?.bundleId} - Accepted: ${bundleResult?.accepted}, Rejected: ${!!bundleResult?.rejected}`);
      if (bundleResult?.rejected) {
        logger.warn({ rejection: bundleResult.rejected }, 'Jito Bundle Rejected');
      }
    },
    (error: Error) => {
      logger.error({ err: error }, 'Ошибка в Jito Bundle Stream');
    }
  );

  // Попытка подписаться на поток советов (tips)
  // Закомментировано, так как метод subscribeTips вызывает ошибку линтера.
  // Возможно, требует другой версии jito-ts или другой конфигурации клиента.
  /*
  try {
    // const tipStream = await jitoSearcherClient.subscribeTips(); // Ошибка линтера здесь
    // logger.info('Подписка на Jito Tip Stream активна.');
    // tipStream.on('data', (tip: Tip) => { // Добавляем явный тип Tip
    //   // Логируем только каждые N секунд или при изменении, чтобы не спамить
    //   // logger.info({ tip }, 'New Jito Tip Received');
    // });
    // tipStream.on('error', (err: Error) => { // Добавляем явный тип Error
    //     logger.error({ err: err }, 'Error in Jito Tip Stream');
    // });

  } catch (error) {
      logger.error({ err: error }, 'Не удалось подписаться на Jito Tip Stream');
  }
  */

  logger.info('Jito Searcher клиент инициализирован');

  // 5. Инициализация PumpFun SDK
  logger.info('Инициализация PumpFun SDK...');
  // Создаем Anchor Provider, необходимый для SDK
  const provider = new AnchorProvider(
      solanaConnection,
      new NodeWallet(tradingWallet), // Используем наш торговый кошелек
      { commitment: 'confirmed' } // Можно настроить commitment
  );
  // Инициализируем SDK
  const pumpSdk = new PumpFunSDK(provider);
  // Проверка (опционально, можно вызвать метод типа getGlobalAccount)
  try {
    const globalAcc = await pumpSdk.getGlobalAccount();
    if (!globalAcc) {
        throw new Error('Не удалось получить GlobalAccount от Pump.fun');
    }
    logger.info('PumpFun SDK инициализирован успешно.');
  } catch (error) {
      logger.error({ err: error }, 'Ошибка при инициализации PumpFun SDK или получении GlobalAccount.');
      // Можно решить, критична ли эта ошибка для запуска
      // throw new Error('Не удалось инициализировать PumpFun SDK.');
  }

  logger.info('Инициализация сервисов завершена.');

  return {
    config, // Передаем полный конфиг
    solanaConnection,
    heliusClient,
    jitoClient,
    pumpSdk, // Передаем инициализированный SDK
    tradingWallet,
    jitoAuthWallet,
    logger,
    // latestSlot, latestBlockhash, activeCoin инициализируются в main
  };
}

// Экспортируем вспомогательную функцию, если она нужна где-то еще
export { getKeypairFromPrivateKey };

// Экспортируем здесь же функцию для настройки вебхука
/**
 * Создает или обновляет вебхук Helius для отслеживания транзакций Pump.fun.
 * @param heliusClient Helius клиент.
 * @param webhookUrl URL для получения вебхуков.
 * @param pumpFunProgramId Адрес программы Pump.fun.
 * @param logger Экземпляр логгера.
 */
export async function setupHeliusWebhook(
  heliusClient: Helius,
  webhookUrl: string,
  pumpFunProgramId: string,
  logger: pino.Logger
): Promise<void> {
  logger.info(`Настройка Helius вебхука для программы ${pumpFunProgramId} на URL: ${webhookUrl}`);

  const webhookOptions: CreateWebhookRequest = {
    webhookURL: webhookUrl,
    webhookType: WebhookType.ENHANCED,
    accountAddresses: [pumpFunProgramId],
    transactionTypes: [TransactionType.ANY],
  };

  try {
    const existingWebhooks = await heliusClient.getAllWebhooks();
    const existingWebhook = existingWebhooks.find(wh =>
      wh.webhookURL === webhookUrl &&
      wh.accountAddresses.includes(pumpFunProgramId) &&
      wh.webhookType === WebhookType.ENHANCED
    );

    if (existingWebhook) {
      logger.info(`Найден существующий вебхук типа ENHANCED с ID: ${existingWebhook.webhookID}. Обновление...`);
      const updatedWebhook = await heliusClient.editWebhook(existingWebhook.webhookID, webhookOptions);
      logger.info(`Вебхук успешно обновлен с ID: ${updatedWebhook.webhookID}`);
    } else {
      logger.info('Создание нового ENHANCED вебхука...');
      const newWebhook = await heliusClient.createWebhook(webhookOptions);
      logger.info(`Вебхук успешно создан с ID: ${newWebhook.webhookID}`);
    }
  } catch (error) {
    logger.error({ err: error, webhookOptions }, 'Ошибка при создании/обновлении Helius вебхука');
  }
}
