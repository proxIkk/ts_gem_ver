import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') }); // Загружаем .env из корня проекта

/**
 * Проверяет, установлена ли переменная окружения.
 * @param key Имя переменной окружения.
 * @returns Значение переменной.
 * @throws Error, если переменная не установлена.
 */
function getEnvVariable(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Переменная окружения ${key} не установлена.`);
  }
  return value;
}

/**
 * Типизированная конфигурация приложения.
 */
export interface AppConfig {
  tradingWalletPrivateKey: string;
  jitoAuthPrivateKey: string;
  heliusApiKey: string;
  heliusRpcUrl: string;
  jitoBlockEngineUrl: string;
  heliusWebhookUrl: string;
  webhookServerPort: number;
  pumpFunProgramId: string;
  buyAmountSol: number;
  slippageBps: number;
  priorityFeeMicroLamports: number;
  maxRetries: number;
}

/**
 * Экземпляр конфигурации приложения.
 */
export const config: AppConfig = {
  tradingWalletPrivateKey: getEnvVariable('TRADING_WALLET_PRIVATE_KEY'),
  jitoAuthPrivateKey: getEnvVariable('JITO_AUTH_PRIVATE_KEY'),
  heliusApiKey: getEnvVariable('HELIUS_API_KEY'),
  heliusRpcUrl: getEnvVariable('HELIUS_RPC_URL'),
  jitoBlockEngineUrl: getEnvVariable('JITO_BLOCK_ENGINE_URL'),
  heliusWebhookUrl: getEnvVariable('HELIUS_WEBHOOK_URL'),
  webhookServerPort: parseInt(getEnvVariable('WEBHOOK_SERVER_PORT'), 10),
  pumpFunProgramId: getEnvVariable('PUMP_FUN_PROGRAM_ID'),
  buyAmountSol: parseFloat(getEnvVariable('BUY_AMOUNT_SOL')),
  slippageBps: parseInt(getEnvVariable('SLIPPAGE_BPS'), 10),
  priorityFeeMicroLamports: parseInt(getEnvVariable('PRIORITY_FEE_MICRO_LAMPORTS'), 10),
  maxRetries: parseInt(getEnvVariable('MAX_RETRIES'), 10),
};

// Проверка на NaN после парсинга числовых значений
if (isNaN(config.webhookServerPort)) throw new Error('WEBHOOK_SERVER_PORT должен быть числом.');
if (isNaN(config.buyAmountSol)) throw new Error('BUY_AMOUNT_SOL должен быть числом.');
if (isNaN(config.slippageBps)) throw new Error('SLIPPAGE_BPS должен быть числом.');
if (isNaN(config.priorityFeeMicroLamports)) throw new Error('PRIORITY_FEE_MICRO_LAMPORTS должен быть числом.');
if (isNaN(config.maxRetries)) throw new Error('MAX_RETRIES должен быть числом.');
