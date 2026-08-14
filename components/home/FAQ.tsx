
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "How do I fund my Brainfriend Global Tech wallet?",
    answer:
      "You can securely fund your Brainfriend Global Tech wallet using Paystack or bank transfer. Once your payment is successful, your wallet balance is updated automatically.",
  },
  {
    question: "How long does airtime or data delivery take?",
    answer:
      "Most airtime and data purchases are processed and delivered within seconds. In rare cases, a transaction may take a few minutes because of delays from the network provider.",
  },
  {
    question: "Can I buy airtime and data for any Nigerian network?",
    answer:
      "Yes. Brainfriend Global Tech supports airtime and data purchases for major Nigerian networks, including MTN, Airtel, Glo and 9mobile.",
  },
  {
    question: "What other VTU services does Brainfriend Global Tech provide?",
    answer:
      "Our platform provides several digital services, including airtime, data bundles, electricity payments, cable TV subscriptions, exam PINs, CBT examinations and NIN verification.",
  },
  {
    question: "Is my payment and wallet secure?",
    answer:
      "Yes. We use trusted payment gateways and security practices designed to protect your wallet, payment information and transactions.",
  },
  {
    question: "Can I view my transaction history?",
    answer:
      "Yes. Your successful and failed transactions are recorded in your dashboard, allowing you to easily view and track your VTU purchases and payment history.",
  },
];

export default function FAQ() {
  return (
    <section
      aria-labelledby="faq-heading"
      className="bg-white py-16 sm:py-20"
    >
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* HEADER */}

        <div className="mb-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
            FAQ
          </p>

          <h2
            id="faq-heading"
            className="mt-2 text-3xl font-bold text-gray-900 sm:text-4xl"
          >
            Frequently Asked Questions About Our VTU Services
          </h2>

          <p className="mt-4 text-gray-600">
            Find answers to common questions about airtime, data,
            wallet funding, payments and other services on
            Brainfriend Global Tech.
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

