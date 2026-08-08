import Navbar from "@/components/layout/Navbar";
import Hero from "@/components/home/Hero";
import Services from "@/components/home/Services";
import Features from "@/components/home/Features";
import HowItWorks from "@/components/home/HowItWorks";
import Stats from "@/components/home/Stats";
import Testimonials from "@/components/home/Testimonials";
import FAQ from "@/components/home/FAQ";
import CTA from "@/components/home/CTA";
import Footer from "@/components/layout/Footer";


export default function Home() {
  return (
    <>
      <Navbar />
      <Hero />
      <Services />
      <Features/>
      <HowItWorks/>
      <Stats/>
      <Testimonials/>
      <FAQ/>
      <CTA/>
      <Footer/>
    </>
  );
}