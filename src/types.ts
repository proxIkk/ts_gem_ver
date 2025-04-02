import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { Helius } from 'helius-sdk';
import { SearcherClient } from 'jito-ts/dist/sdk/block-engine/searcher';
import pino from 'pino';
import { AppConfig } from './config'; // Импортируем AppConfig

/**
 * Состояние отслеживания/торговли конкретным токеном.
 */
export type CoinState = 'monitoring' | 'buying' | 'holding' | 'selling' | 'sold';

/**
 * Представляет позицию или отслеживаемый токен Pump.fun.
 */
export interface CoinPosition {
  mint: PublicKey;
  bondingCurve: PublicKey;
  creator: PublicKey;
  state: CoinState;
  initialMarketCap?: number; // Начальная капитализация (если удастся получить)
  tokensHeld?: bigint;      // Количество купленных токенов
  purchaseTimestamp?: number; // Время покупки
  purchaseTxSignature?: string; // Сигнатура транзакции покупки
  // Дополнительные поля для стратегии продажи, истории цен и т.д.
}

/**
 * Контекст приложения, содержащий инициализированные клиенты и состояние.
 */
export interface BotContext {
  config: AppConfig; // Используем типизированный конфиг
  solanaConnection: Connection;
  heliusClient: Helius;
  jitoClient: SearcherClient;
  pumpSdk: any; // Заглушка для будущего SDK/взаимодействия с Pump.fun
  tradingWallet: Keypair; // Ключевая пара торгового кошелька
  jitoAuthWallet: Keypair; // Ключевая пара для аутентификации Jito
  logger: pino.Logger;      // Экземпляр логгера
  latestSlot: number;       // Последний полученный слот
  latestBlockhash: string;  // Последний полученный блокхеш
  activeCoin: CoinPosition | null; // Текущий отслеживаемый/обрабатываемый токен
  // Другие глобальные состояния, например, список открытых позиций
  // openPositions: Map<string, CoinPosition>;
}
