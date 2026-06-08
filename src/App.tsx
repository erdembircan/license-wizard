import Landing from "./components/Landing";
import DocsPage from "./components/docs/DocsPage";
import { useHashRoute } from "./hooks/useHashRoute";

/**
 * Top-level hash router: renders the documentation page for `#/docs` routes and
 * the marketing landing page for everything else.
 */
export default function App() {
  const route = useHashRoute();

  if (route.name === "docs") return <DocsPage section={route.section} />;
  return <Landing />;
}
