import { Star } from "lucide-react";

const testimonials = [
  {
    name: "David Johnson",
    role: "Business Owner",
    review:
      "I've been using Brainfriend VTU for months. Airtime and data purchases are always instant.",
  },
  {
    name: "Grace Williams",
    role: "Student",
    review:
      "The platform is easy to use and the prices are affordable. I recommend it to everyone.",
  },
  {
    name: "Michael Daniel",
    role: "Software Developer",
    review:
      "Funding my wallet is seamless and every transaction is completed in seconds.",
  },
];

export default function Testimonials() {
  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-14 text-center">
          <p className="font-semibold uppercase tracking-wider text-indigo-600">
            Testimonials
          </p>

          <h2 className="mt-2 text-4xl font-bold">
            What Our Customers Say
          </h2>

          <p className="mt-4 text-gray-600">
            Thousands of customers trust our platform every day.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {testimonials.map((item) => (
            <div
              key={item.name}
              className="rounded-2xl border bg-white p-8 shadow-sm transition hover:-translate-y-2 hover:shadow-xl"
            >
              <div className="mb-5 flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className="mr-1 h-5 w-5 fill-yellow-400 text-yellow-400"
                  />
                ))}
              </div>

              <p className="mb-6 text-gray-600">
                "{item.review}"
              </p>

              <div>
                <h3 className="font-bold">{item.name}</h3>

                <p className="text-sm text-gray-500">
                  {item.role}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}