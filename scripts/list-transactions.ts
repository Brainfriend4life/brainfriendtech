import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const transactions = await prisma.transaction.findMany({
    where: {
      status: "SUCCESS",
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
      createdAt: "asc",
    },
    select: {
      id: true,
      userId: true,
      type: true,
      amount: true,
      description: true,
      status: true,
      reference: true,
      provider: true,
      cost: true,
      profit: true,
      isTest: true,
      createdAt: true,
    },
  });

  console.table(transactions);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });