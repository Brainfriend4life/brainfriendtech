import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "How do I fund my wallet?",
    answer:
      "You can fund your wallet securely using Paystack or bank transfer. Your balance is updated automatically after successful payment.",
  },
  {
    question: "How long does airtime or data delivery take?",
    answer:
      "Most purchases are completed instantly. In rare cases, they may take a few minutes due to network provider delays.",
  },
  {
    question: "Is my payment secure?",
    answer:
      "Yes. We use trusted payment gateways and industry-standard security practices to protect your transactions.",
  },
  {
    question: "Can I view my transaction history?",
    answer:
      "Yes. Every successful and failed transaction is saved in your dashboard for easy reference.",
  },
];

export default function FAQ() {
  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* HEADER */}
        <div className="mb-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
            FAQ
          </p>

          <h2 className="mt-2 text-3xl font-bold text-gray-900 sm:text-4xl">
            Frequently Asked Questions
          </h2>

          <p className="mt-4 text-gray-600">
            Here are answers to some of the questions our customers ask most
            often.
          </p>
        </div>

        {/* FAQ */}
        <Accordion className="w-full">
          {faqs.map((faq, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
            >
              <AccordionTrigger>
                {faq.question}
              </AccordionTrigger>

              <AccordionContent>
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}