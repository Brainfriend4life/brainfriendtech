import { prisma } from "../lib/prisma";

async function main() {
  const transactions =
    await prisma.transaction.findMany({
      where: {
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

      orderBy: {
        createdAt: "desc",
      },

      take: 50,

      select: {
        id: true,
        type: true,
        amount: true,
        cost: true,
        profit: true,
        status: true,
        provider: true,
        reference: true,
        isTest: true,
        createdAt: true,
      },
    });

  console.table(transactions);

  const totals =
    await prisma.transaction.aggregate({
      where: {
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

      _sum: {
        amount: true,
        cost: true,
        profit: true,
      },

      _count: {
        id: true,
      },
    });

  console.log("\nTOTALS:");
  console.log(totals);
}

main()
  .catch(console.error)
  .finally(() =>
    prisma.$disconnect()
  );