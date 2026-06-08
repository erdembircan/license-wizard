import Landing from "./components/Landing";

/**
 * The site's React app renders the marketing landing page. The documentation
 * lives in separate, prerendered static pages under `/docs/` (see
 * scripts/prerender-docs.mjs), so there is no client-side routing here.
 */
export default function App() {
  return <Landing />;
}
