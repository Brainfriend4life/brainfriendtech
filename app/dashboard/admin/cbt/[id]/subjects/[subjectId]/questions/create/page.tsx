import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import AddQuestionForm from "./AddQuestionForm";

type Props = {
  params: Promise<{
    id: string;
    subjectId: string;
  }>;
};

export default async function AddQuestionPage({
  params,
}: Props) {
  const { id, subjectId } = await params;

  const subject = await prisma.cbtSubject.findFirst({
    where: {
      id: subjectId,
      examId: id,
    },
    include: {
      exam: true,
    },
  });

  if (!subject) {
    notFound();
  }

  return (
    <AddQuestionForm
      examId={id}
      subjectId={subject.id}
      subjectName={subject.name}
    />
  );
}