import Nav from "./components/Nav";
import Sparkles from "./components/Sparkles";
import Hero from "./components/Hero";
import Features from "./components/Features";
import Usage from "./components/Usage";
import Headers from "./components/Headers";
import Agents from "./components/Agents";
import CI from "./components/CI";
import Flags from "./components/Flags";
import FinalCta from "./components/FinalCta";
import Footer from "./components/Footer";
import { useReveal } from "./hooks/useReveal";
import { useNavScroll } from "./hooks/useNavScroll";

/**
 * Composes the full landing page: the fixed nav, the main content sections in
 * order, and the footer. Runs the reveal-on-scroll and nav-scroll behaviors for
 * the lifetime of the page.
 */
export default function App() {
  useReveal();
  useNavScroll();

  return (
    <>
      <Sparkles />
      <Nav />
      <main id="top">
        <Hero />
        <Features />
        <Usage />
        <Headers />
        <Agents />
        <CI />
        <Flags />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
