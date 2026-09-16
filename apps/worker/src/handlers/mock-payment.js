/**
 * Simulated Idempotent Financial/Inventory Task Handler
 */
const processedTransactions = new Map();

export async function handleMockPayment(payload = {}, context = {}) {
  const { transactionId = `tx_${Date.now()}`, amount = 100, currency = 'USD' } = payload;

  await new Promise((resolve) => setTimeout(resolve, 90));

  // Handler-level idempotency check
  if (processedTransactions.has(transactionId)) {
    const existing = processedTransactions.get(transactionId);
    return {
      ...existing,
      idempotentReplay: true,
      replayedAt: new Date().toISOString(),
    };
  }

  const result = {
    transactionId,
    amount,
    currency,
    status: 'settled',
    authorizationCode: `AUTH_${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
    processedAt: new Date().toISOString(),
  };

  processedTransactions.set(transactionId, result);
  return result;
}
