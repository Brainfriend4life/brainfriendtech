import { PrismaClient, TransactionType } from "@prisma/client";

const prisma = new PrismaClient();

const REVENUE_TYPES: TransactionType[] = [
  "AIRTIME",
  "DATA",
  "ELECTRICITY",
  "CABLE",
  "EXAM_PIN",
];

async function main() {
  console.log("========================================");
  console.log("BRAINFRIEND TECH BUSINESS WALLET REBUILD");
  console.log("========================================\n");

  /*
   * IMPORTANT:
   * This rebuild only uses REAL successful transactions.
   *
   * It ignores:
   * - FAILED transactions
   * - UNKNOWN transactions
   * - TEST transactions
   * - FUND_WALLET transactions
   * - WITHDRAWAL transactions
   */

  const transactions = await prisma.transaction.findMany({
    where: {
      status: "SUCCESS",
      isTest: false,
      type: {
        in: REVENUE_TYPES,
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  console.log(
    `Found ${transactions.length} real successful service transactions.\n`
  );

  if (transactions.length === 0) {
    console.log("No eligible transactions found.");
    return;
  }

  /*
   * GET OR CREATE BUSINESS WALLET
   */
  let businessWallet = await prisma.businessWallet.findUnique({
    where: {
      name: "Brainfriend Tech",
    },
  });

  if (!businessWallet) {
    console.log("Creating Brainfriend Tech business wallet...");

    businessWallet = await prisma.businessWallet.create({
      data: {
        name: "Brainfriend Tech",
      },
    });
  }

  /*
   * CLEAR OLD BUSINESS REVENUE RECORDS
   *
   * This does NOT delete customer transactions.
   * It only rebuilds the business accounting records.
   */
  console.log("Clearing old business revenue records...");

  await prisma.businessRevenue.deleteMany({
    where: {
      businessWalletId: businessWallet.id,
    },
  });

  /*
   * CALCULATE TOTALS
   */
  let totalRevenue = 0;
  let totalCost = 0;
  let totalProfit = 0;

  /*
   * RECREATE BUSINESS REVENUE RECORDS
   */
  console.log("Rebuilding business revenue records...\n");

  for (const transaction of transactions) {
    const amount = Number(transaction.amount || 0);
    const cost = Number(transaction.cost || 0);

    /*
     * IMPORTANT:
     * Use the profit already recorded on the transaction.
     *
     * This avoids treating transactions with cost = 0
     * as 100% profit.
     */
    const profit = Number(transaction.profit || 0);

    totalRevenue += amount;
    totalCost += cost;
    totalProfit += profit;

    await prisma.businessRevenue.create({
      data: {
        transactionId: transaction.id,

        type: transaction.type,

        provider: transaction.provider,

        amount,

        cost,

        profit,

        reference: `BUSINESS-${transaction.reference}`,

        description:
          transaction.description ||
          `${transaction.type} revenue`,

        businessWalletId: businessWallet.id,
      },
    });
  }

  /*
   * ROUND MONEY VALUES
   */
  totalRevenue = Number(totalRevenue.toFixed(2));
  totalCost = Number(totalCost.toFixed(2));
  totalProfit = Number(totalProfit.toFixed(2));

  /*
   * PRESERVE ANY REAL PROFIT THAT HAS ALREADY
   * BEEN WITHDRAWN FROM THE BUSINESS WALLET.
   *
   * We do NOT want a rebuild to accidentally
   * make previously withdrawn money available again.
   */
  const existingWithdrawnProfit = Number(
    businessWallet.withdrawnProfit || 0
  );

  const withdrawnProfit = Number(
    Math.max(0, Math.min(existingWithdrawnProfit, totalProfit)).toFixed(2)
  );

  const availableProfit = Number(
    Math.max(0, totalProfit - withdrawnProfit).toFixed(2)
  );

  /*
   * BUSINESS WALLET BALANCE
   *
   * For now, the balance represents profit available
   * to the business.
   *
   * Customer wallet money is NOT included here.
   */
  const balance = availableProfit;

  /*
   * UPDATE BUSINESS WALLET
   */
  const updatedWallet = await prisma.businessWallet.update({
    where: {
      id: businessWallet.id,
    },
    data: {
      totalRevenue,
      totalCost,
      totalProfit,

      withdrawnProfit,

      availableProfit,

      balance,
    },
  });

  /*
   * DISPLAY RESULT
   */
  console.log("\n========================================");
  console.log("BUSINESS WALLET REBUILT");
  console.log("========================================");

  console.log(`Business:       ${updatedWallet.name}`);
  console.log(`Transactions:   ${transactions.length}`);

  console.log("\nFINANCIAL SUMMARY");

  console.log(
    `Total Revenue:  ₦${updatedWallet.totalRevenue.toLocaleString()}`
  );

  console.log(
    `Total Cost:     ₦${updatedWallet.totalCost.toLocaleString()}`
  );

  console.log(
    `Total Profit:   ₦${updatedWallet.totalProfit.toLocaleString()}`
  );

  console.log(
    `Withdrawn:      ₦${updatedWallet.withdrawnProfit.toLocaleString()}`
  );

  console.log(
    `Available:      ₦${updatedWallet.availableProfit.toLocaleString()}`
  );

  console.log(
    `Wallet Balance: ₦${updatedWallet.balance.toLocaleString()}`
  );

  console.log("\n========================================");
  console.log("PROFIT BY SERVICE");
  console.log("========================================");

  /*
   * SERVICE BREAKDOWN
   */
  const serviceTypes: TransactionType[] = [
    "AIRTIME",
    "DATA",
    "ELECTRICITY",
    "CABLE",
    "EXAM_PIN",
  ];

  for (const type of serviceTypes) {
    const service = await prisma.businessRevenue.aggregate({
      where: {
        businessWalletId: updatedWallet.id,
        type,
      },

      _sum: {
        amount: true,
        cost: true,
        profit: true,
      },

      _count: {
        id: true,
      },
    });

    const revenue = Number(service._sum.amount || 0);
    const cost = Number(service._sum.cost || 0);
    const profit = Number(service._sum.profit || 0);
    const count = service._count.id;

    console.log(`\n${type}`);
    console.log(`  Transactions: ${count}`);
    console.log(`  Revenue:      ₦${revenue.toLocaleString()}`);
    console.log(`  Cost:         ₦${cost.toLocaleString()}`);
    console.log(`  Profit:       ₦${profit.toLocaleString()}`);
  }

  console.log("\n========================================");
  console.log("DONE");
  console.log("========================================");
}

main()
  .catch((error) => {
    console.error("\nBUSINESS WALLET REBUILD FAILED:");
    console.error(error);

    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });