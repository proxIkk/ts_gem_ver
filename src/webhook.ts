import { BotContext } from './types';
import pino from 'pino';

/**
 * Обрабатывает входящие данные вебхука от Helius.
 * На данный момент просто логирует payload.
 * @param payload Данные, полученные от Helius (ожидается массив транзакций).
 * @param context Контекст бота.
 */
export async function handleHeliusWebhook(payload: any, context: BotContext): Promise<void> {
  const { logger } = context;
  logger.info('Обработка Helius вебхука...');

  if (!Array.isArray(payload)) {
    logger.warn({ payload }, 'Получен неожиданный формат payload (не массив) от Helius');
    return;
  }

  if (payload.length === 0) {
    logger.debug('Получен пустой массив транзакций от Helius');
    return;
  }

  // Основная логика парсинга транзакций Pump.fun будет здесь
  for (const txInfo of payload) {
    logger.debug({ signature: txInfo.signature, type: txInfo.type }, 'Обработка транзакции из вебхука');

    // TODO: Проанализировать txInfo.instructions, txInfo.events.tokenTransfers и т.д.
    // чтобы найти вызовы функций Pump.fun (например, create, buy).
    // Определить mint созданного токена, bonding curve, creator.
    // Если это новая монета, изменить context.activeCoin и state.
  }

  logger.info(`Обработано ${payload.length} транзакций из вебхука.`);
}

// Функция setupHeliusWebhook остается в services.ts 