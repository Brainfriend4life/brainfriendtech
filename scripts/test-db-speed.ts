import { prisma } from "../lib/prisma";

async function main() {
  console.log("================================");
  console.log("DATABASE SPEED TEST");
  console.log("================================");

  console.log("1. Testing connection...");

  const start1 = Date.now();

  await prisma.$queryRaw`SELECT 1`;

  console.log(
    "Connection:",
    Date.now() - start1,
    "ms"
  );

  console.log("2. Testing transaction count...");

  const start2 = Date.now();

  const count = await prisma.transaction.count();

  console.log(
    "Transaction count:",
    count
  );

  console.log(
    "Count query:",
    Date.now() - start2,
    "ms"
  );

  console.log(
    "3. Testing successful transaction query..."
  );

  const start3 = Date.now();

  const transactions =
    await prisma.transaction.findMany({
      where: {
        status: "SUCCESS",
        isTest: false,
        type: {
          in: [
            "AIRTIME",
            "DATA",
            "ELECTRICITY",
            "CABLE",
            "EXAM_PIN",
          ],
        },
      },

      select: {
        id: true,
        type: true,
        provider: true,
        amount: true,
        cost: true,
        profit: true,
        reference: true,
        description: true,
        createdAt: true,
      },

      take: 42,
    });

  console.log(
    "Transactions found:",
    transactions.length
  );

  console.log(
    "Transaction query:",
    Date.now() - start3,
    "ms"
  );

  console.log("================================");
  console.log("TEST COMPLETE");
  console.log("================================");
}

main()
  .catch((error) => {
    console.error("DATABASE TEST ERROR:");
    console.error(error);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });