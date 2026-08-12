// scripts/cleanup-test-revenue.ts

import { prisma } from "../lib/prisma";

async function main() {
  console.log(
    "Starting test revenue cleanup..."
  );

  // Find all test transactions
  const testTransactions =
    await prisma.transaction.findMany({
      where: {
        isTest: true,
      },

      select: {
        id: true,
        reference: true,
        type: true,
        amount: true,
      },
    });

  console.log(
    `Found ${testTransactions.length} test transactions.`
  );

  if (
    testTransactions.length === 0
  ) {
    console.log(
      "No test transactions found."
    );

    return;
  }

  const transactionIds =
    testTransactions.map(
      (transaction) =>
        transaction.id
    );

  // Remove BusinessRevenue records
  // connected to test transactions.
  const deletedRevenue =
    await prisma.businessRevenue.deleteMany({
      where: {
        transactionId: {
          in: transactionIds,
        },
      },
    });

  console.log(
    `Deleted ${deletedRevenue.count} test business revenue records.`
  );

  // Remove test transactions
  const deletedTransactions =
    await prisma.transaction.deleteMany({
      where: {
        isTest: true,
      },
    });

  console.log(
    `Deleted ${deletedTransactions.count} test transactions.`
  );

  // Reset the accounting wallet.
  await prisma.businessWallet.updateMany({
    data: {
      totalRevenue: 0,
      totalCost: 0,
      totalProfit: 0,
      withdrawnProfit: 0,
      availableProfit: 0,
      balance: 0,
    },
  });

  console.log(
    "Business wallet reset successfully."
  );

  console.log(
    "Test revenue cleanup completed."
  );
}

main()
  .catch((error) => {
    console.error(
      "TEST CLEANUP FAILED:",
      error
    );

    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });