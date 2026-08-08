import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300">
      <div className="container mx-auto px-6 py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">

          {/* Company */}
          <div>
            <h2 className="text-2xl font-bold text-white">
              Brainfriend Tech
            </h2>

            <p className="mt-4 leading-7">
              Fast, secure and reliable VTU services including Airtime,
              Data, Electricity, Cable TV and Exam PINs.
            </p>
          </div>

          {/* Services */}
          <div>
            <h3 className="mb-4 text-lg font-semibold text-white">
              Services
            </h3>

            <ul className="space-y-3">
              <li><Link href="/dashboard/airtime">Airtime</Link></li>
              <li><Link href="/dashboard/data">Data</Link></li>
              <li><Link href="/dashboard/electricity">Electricity</Link></li>
              <li><Link href="/dashboard/cable">Cable TV</Link></li>
              <li><Link href="/dashboard/exam-pins">WAEC & NECO</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="mb-4 text-lg font-semibold text-white">
              Company
            </h3>

            <ul className="space-y-3">
              <li><Link href="/about">About</Link></li>
              <li><Link href="/contact">Contact</Link></li>
              <li><Link href="/privacy">Privacy Policy</Link></li>
              <li><Link href="/terms">Terms & Conditions</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="mb-4 text-lg font-semibold text-white">
              Contact
            </h3>

            <p>brainfriend4life@gmail.com</p>
            <p className="mt-2">+234 8143542037</p>
          </div>

        </div>

        <div className="mt-12 border-t border-slate-700 pt-6 text-center text-sm">
          © {new Date().getFullYear()} Brainfriend Tech. All rights reserved.
        </div>
      </div>
    </footer>
  );
}