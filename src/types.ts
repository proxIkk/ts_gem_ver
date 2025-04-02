import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { Helius } from 'helius-sdk';
import { SearcherClient } from 'jito-ts/dist/sdk/block-engine/searcher';
// import { PumpFunSDK } from 'pumpdotfun-sdk'; // Удален импорт
import pino from 'pino';

/**
 * Представляет открытую позицию по конкретному токену.
 */
export interface CoinPosition {
  mint: PublicKey;          // Адрес минта токена
  ammId: PublicKey;         // Адрес AMM пула (если применимо, например для Raydium)
  initialSolInvestment: number; // Сколько SOL было вложено изначально
  tokenBalance: bigint;     // Текущий баланс токена (в наименьших единицах)
  purchaseTxSignature?: string; // Сигнатура транзакции покупки
  sellTriggered: boolean;   // Флаг, что продажа инициирована
  purchaseTimestamp: number; // Время покупки (Unix timestamp)
  // Можно добавить поля для TP/SL, статуса и т.д.
}

/**
 * Контекст приложения, содержащий инициализированные клиенты и состояние.
 */
export interface BotContext {
  helius: Helius;
  solanaConnection: Connection;
  jitoSearcherClient: SearcherClient;
  // pumpFunSdk: PumpFunSDK; // Удалено поле
  tradingWallet: Keypair; // Ключевая пара торгового кошелька
  jitoAuthWallet: Keypair; // Ключевая пара для аутентификации Jito
  config: Record<string, any>; // Загруженная конфигурация (можно использовать AppConfig)
  logger: pino.Logger;      // Экземпляр логгера
  latestSlot: number;       // Последний обработанный слот
  latestBlockhash: string;  // Последний полученный блокхеш
  // Дополнительные поля состояния по мере необходимости
}
