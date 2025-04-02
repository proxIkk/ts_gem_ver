import { Connection } from '@solana/web3.js';
import { BotContext } from '../types';
import pino from 'pino';

/**
 * Запускает периодическое обновление последнего слота и блокхеша.
 * @param context Контекст бота.
 * @param intervalMs Интервал обновления в миллисекундах.
 */
export function startSlotAndBlockhashTracker(
  context: BotContext,
  intervalMs: number = 1000 // Обновляем каждую секунду по умолчанию
): void {
  const { solanaConnection, logger } = context;

  let isFetching = false; // Флаг, чтобы избежать параллельных запросов

  const updateInfo = async () => {
    if (isFetching) {
      // logger.debug('Предыдущий запрос слота/блокхеша еще выполняется.');
      return;
    }

    isFetching = true;
    try {
      // Получаем одновременно последний слот и блокхеш
      const [latestSlot, latestBlockhashResult] = await Promise.all([
        solanaConnection.getSlot('confirmed'),
        solanaConnection.getLatestBlockhash('confirmed')
      ]);

      // Сравниваем и обновляем, если изменилось
      if (latestSlot > context.latestSlot) {
          // logger.debug(`Новый слот: ${latestSlot}`);
          context.latestSlot = latestSlot;
      }
      if (latestBlockhashResult.blockhash !== context.latestBlockhash) {
         // logger.debug(`Новый блокхеш: ${latestBlockhashResult.blockhash} (последний валидный слот: ${latestBlockhashResult.lastValidBlockHeight})`);
          context.latestBlockhash = latestBlockhashResult.blockhash;
          // Можно также сохранить lastValidBlockHeight, если нужно для проверки транзакций
      }

    } catch (error) {
      logger.error({ err: error }, 'Ошибка при получении слота/блокхеша');
    } finally {
      isFetching = false;
    }
  };

  // Немедленный вызов для инициализации
  updateInfo();

  // Установка интервала
  setInterval(updateInfo, intervalMs);

  logger.info(`Трекер слота/блокхеша запущен с интервалом ${intervalMs} мс`);
}
