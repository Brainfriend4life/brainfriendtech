import { Star } from "lucide-react";

const testimonials = [
  {
    name: "David Johnson",
    role: "Business Owner",
    review:
      "I've been using Brainfriend Global Tech for months. Airtime and data purchases are always fast and reliable.",
  },
  {
    name: "Grace Williams",
    role: "Student",
    review:
      "The platform is easy to use and the prices are affordable. I recommend Brainfriend Global Tech to everyone.",
  },
  {
    name: "Michael Daniel",
    role: "Software Developer",
    review:
      "Funding my wallet is seamless and every transaction is completed quickly. The platform makes VTU services convenient.",
  },
];

export default function Testimonials() {
  return (
    <section
      aria-labelledby="testimonials-heading"
      className="bg-white py-20 transition-colors dark:bg-gray-950"
    >
      <div className="mx-auto max-w-7xl px-6">
        {/* Heading */}
        <div className="mb-14 text-center">
          <p className="font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Customer Reviews
          </p>

          <h2
            id="testimonials-heading"
            className="mt-2 text-4xl font-bold text-gray-900 dark:text-white"
          >
            What Our Customers Say About Brainfriend Global Tech
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-gray-600 dark:text-gray-400">
            See what customers have to say about our fast, secure and
            reliable VTU and digital payment services.
          </p>
        </div>

        {/* Testimonials */}
        <div className="grid gap-8 md:grid-cols-3">
          {testimonials.map((item) => (
            <div
              key={item.name}
              className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-xl dark:border-gray-800 dark:bg-gray-900 dark:shadow-gray-950/30 dark:hover:border-gray-700 dark:hover:shadow-2xl"
            >
              {/* Stars */}
              <div
                className="mb-5 flex"
                aria-label="5 out of 5 stars"
              >
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    aria-hidden="true"
                    className="mr-1 h-5 w-5 fill-yellow-400 text-yellow-400"
                  />
                ))}
              </div>

              {/* Review */}
              <p className="mb-6 leading-relaxed text-gray-600 dark:text-gray-300">
                "{item.review}"
              </p>

              {/* Customer */}
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">
                  {item.name}
                </h3>

                <p className="text-sm text-gray-500 dark:text-gray-400">
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