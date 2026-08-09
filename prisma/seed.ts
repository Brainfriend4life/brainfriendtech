import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding CBT data...");

  // Create JAMB exam
  const jamb = await prisma.cbtExam.upsert({
    where: {
      id: "jamb-2026",
    },
    update: {},
    create: {
      id: "jamb-2026",
      name: "JAMB CBT Practice",
      description:
        "Practice JAMB-style questions and prepare for your examination.",
      duration: 120,
      totalMarks: 0,
      isActive: true,
    },
  });

  // =========================
  // USE OF ENGLISH
  // =========================

  const english = await prisma.cbtSubject.upsert({
    where: {
      id: "jamb-english",
    },
    update: {},
    create: {
      id: "jamb-english",
      name: "Use of English",
      description:
        "JAMB Use of English CBT practice questions.",
      examId: jamb.id,
    },
  });

  await prisma.cbtQuestion.createMany({
    data: [
      {
        subjectId: english.id,
        question:
          "Choose the word that is nearest in meaning to 'abundant'.",
        optionA: "Scarce",
        optionB: "Plentiful",
        optionC: "Small",
        optionD: "Limited",
        correctAnswer: "B",
        explanation:
          "Abundant means available in large quantities. Therefore, plentiful is the closest meaning.",
        marks: 1,
        isActive: true,
      },
      {
        subjectId: english.id,
        question:
          "Choose the word opposite in meaning to 'ancient'.",
        optionA: "Old",
        optionB: "Historic",
        optionC: "Modern",
        optionD: "Traditional",
        correctAnswer: "C",
        explanation:
          "Modern is the opposite of ancient.",
        marks: 1,
        isActive: true,
      },
      {
        subjectId: english.id,
        question:
          "Complete the sentence: She has lived in Port Harcourt _____ 2020.",
        optionA: "for",
        optionB: "since",
        optionC: "from",
        optionD: "during",
        correctAnswer: "B",
        explanation:
          "Since is used with a specific point in time.",
        marks: 1,
        isActive: true,
      },
    ],
  });

  // =========================
  // MATHEMATICS
  // =========================

  const mathematics = await prisma.cbtSubject.upsert({
    where: {
      id: "jamb-mathematics",
    },
    update: {},
    create: {
      id: "jamb-mathematics",
      name: "Mathematics",
      description:
        "JAMB Mathematics CBT practice questions.",
      examId: jamb.id,
    },
  });

  await prisma.cbtQuestion.createMany({
    data: [
      {
        subjectId: mathematics.id,
        question:
          "What is 15 × 4?",
        optionA: "45",
        optionB: "50",
        optionC: "60",
        optionD: "75",
        correctAnswer: "C",
        explanation:
          "15 multiplied by 4 gives 60.",
        marks: 1,
        isActive: true,
      },
      {
        subjectId: mathematics.id,
        question:
          "Solve: 2x + 6 = 14.",
        optionA: "2",
        optionB: "4",
        optionC: "6",
        optionD: "8",
        correctAnswer: "B",
        explanation:
          "2x + 6 = 14, therefore 2x = 8 and x = 4.",
        marks: 1,
        isActive: true,
      },
      {
        subjectId: mathematics.id,
        question:
          "What is the square root of 144?",
        optionA: "10",
        optionB: "11",
        optionC: "12",
        optionD: "14",
        correctAnswer: "C",
        explanation:
          "12 × 12 = 144.",
        marks: 1,
        isActive: true,
      },
    ],
  });

  // =========================
  // PHYSICS
  // =========================

  const physics = await prisma.cbtSubject.upsert({
    where: {
      id: "jamb-physics",
    },
    update: {},
    create: {
      id: "jamb-physics",
      name: "Physics",
      description:
        "JAMB Physics CBT practice questions.",
      examId: jamb.id,
    },
  });

  await prisma.cbtQuestion.createMany({
    data: [
      {
        subjectId: physics.id,
        question:
          "What is the SI unit of force?",
        optionA: "Joule",
        optionB: "Newton",
        optionC: "Watt",
        optionD: "Pascal",
        correctAnswer: "B",
        explanation:
          "The SI unit of force is the Newton (N).",
        marks: 1,
        isActive: true,
      },
      {
        subjectId: physics.id,
        question:
          "Which instrument is used to measure electric current?",
        optionA: "Voltmeter",
        optionB: "Barometer",
        optionC: "Ammeter",
        optionD: "Thermometer",
        correctAnswer: "C",
        explanation:
          "An ammeter is used to measure electric current.",
        marks: 1,
        isActive: true,
      },
    ],
  });

  // =========================
  // CHEMISTRY
  // =========================

  const chemistry = await prisma.cbtSubject.upsert({
    where: {
      id: "jamb-chemistry",
    },
    update: {},
    create: {
      id: "jamb-chemistry",
      name: "Chemistry",
      description:
        "JAMB Chemistry CBT practice questions.",
      examId: jamb.id,
    },
  });

  await prisma.cbtQuestion.createMany({
    data: [
      {
        subjectId: chemistry.id,
        question:
          "What is the chemical symbol for sodium?",
        optionA: "S",
        optionB: "So",
        optionC: "Na",
        optionD: "N",
        correctAnswer: "C",
        explanation:
          "The chemical symbol for sodium is Na.",
        marks: 1,
        isActive: true,
      },
      {
        subjectId: chemistry.id,
        question:
          "Which gas is required for combustion?",
        optionA: "Nitrogen",
        optionB: "Oxygen",
        optionC: "Carbon dioxide",
        optionD: "Hydrogen",
        correctAnswer: "B",
        explanation:
          "Oxygen supports combustion.",
        marks: 1,
        isActive: true,
      },
    ],
  });

  // =========================
  // BIOLOGY
  // =========================

  const biology = await prisma.cbtSubject.upsert({
    where: {
      id: "jamb-biology",
    },
    update: {},
    create: {
      id: "jamb-biology",
      name: "Biology",
      description:
        "JAMB Biology CBT practice questions.",
      examId: jamb.id,
    },
  });

  await prisma.cbtQuestion.createMany({
    data: [
      {
        subjectId: biology.id,
        question:
          "Which organelle is known as the powerhouse of the cell?",
        optionA: "Nucleus",
        optionB: "Ribosome",
        optionC: "Mitochondrion",
        optionD: "Vacuole",
        correctAnswer: "C",
        explanation:
          "Mitochondria produce most of the usable energy in cells.",
        marks: 1,
        isActive: true,
      },
      {
        subjectId: biology.id,
        question:
          "Photosynthesis mainly takes place in which organelle?",
        optionA: "Mitochondrion",
        optionB: "Chloroplast",
        optionC: "Nucleus",
        optionD: "Ribosome",
        correctAnswer: "B",
        explanation:
          "Photosynthesis occurs mainly in chloroplasts.",
        marks: 1,
        isActive: true,
      },
    ],
  });

  // Update total marks
  const subjects = await prisma.cbtSubject.findMany({
    where: {
      examId: jamb.id,
    },
    include: {
      questions: {
        where: {
          isActive: true,
        },
      },
    },
  });

  const totalMarks = subjects.reduce(
    (total, subject) =>
      total +
      subject.questions.reduce(
        (sum, question) => sum + question.marks,
        0
      ),
    0
  );

  await prisma.cbtExam.update({
    where: {
      id: jamb.id,
    },
    data: {
      totalMarks,
    },
  });

  console.log("✅ JAMB CBT data seeded successfully!");
  console.log(`📚 Subjects: ${subjects.length}`);
  console.log(`📝 Total questions: ${subjects.reduce(
    (total, subject) => total + subject.questions.length,
    0
  )}`);
}

main()
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });