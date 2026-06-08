import Nav from "./Nav";
import Sparkles from "./Sparkles";
import Hero from "./Hero";
import Features from "./Features";
import Usage from "./Usage";
import Headers from "./Headers";
import Agents from "./Agents";
import CI from "./CI";
import Flags from "./Flags";
import FinalCta from "./FinalCta";
import Footer from "./Footer";
import { useReveal } from "../hooks/useReveal";
import { useNavScroll } from "../hooks/useNavScroll";

/**
 * The marketing landing page: the fixed nav, the main content sections in
 * order, and the footer. Runs the reveal-on-scroll and nav-scroll behaviors for
 * the lifetime of the page.
 */
export default function Landing() {
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
