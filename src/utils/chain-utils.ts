import { Connection } from '@solana/web3.js';
import { BotContext } from '../types';
import pino from 'pino';

/**
 * Однократно обновляет последний слот и блокхеш в контексте.
 * @param context Контекст бота.
 */
async function updateSlotAndBlockhash(context: BotContext): Promise<void> {
  const { solanaConnection, logger } = context;
  try {
    const [latestSlot, latestBlockhashResult] = await Promise.all([
      solanaConnection.getSlot('confirmed'),
      solanaConnection.getLatestBlockhash('confirmed'),
    ]);

    if (latestSlot > context.latestSlot) {
      context.latestSlot = latestSlot;
    }
    if (latestBlockhashResult.blockhash !== context.latestBlockhash) {
      context.latestBlockhash = latestBlockhashResult.blockhash;
      // logger.debug({...latestBlockhashResult}, 'New blockhash');
    }
    logger.trace({ slot: context.latestSlot, blockhash: context.latestBlockhash }, 'Slot/Blockhash Updated');

  } catch (error) {
    logger.error({ err: error }, 'Ошибка при получении слота/блокхеша');
  }
}

/**
 * Запускает периодическое обновление последнего слота и блокхеша.
 * Сначала выполняет однократное обновление.
 * @param context Контекст бота.
 * @param intervalMs Интервал обновления в миллисекундах.
 */
export async function startSlotAndBlockhashTracker(
  context: BotContext,
  intervalMs: number // Интервал теперь обязательный
): Promise<void> { // Возвращаем Promise для ожидания первого вызова
  const { logger } = context;

  logger.info('Запуск трекера слота/блокхеша...');

  // Выполняем первый вызов синхронно
  await updateSlotAndBlockhash(context);
  logger.info(`Первичный слот: ${context.latestSlot}, Блокхеш: ${context.latestBlockhash}`);

  // Установка интервала
  setInterval(() => updateSlotAndBlockhash(context), intervalMs);

  logger.info(`Трекер слота/блокхеша успешно запущен с интервалом ${intervalMs} мс`);
}
