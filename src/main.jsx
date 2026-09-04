import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./lib/auth";
import WorkspacePreview from "./dev/WorkspacePreview";
import PromptLibraryPreview from "./dev/PromptLibraryPreview";
import EonAccentDefs from "./components/EonAccentDefs";
import { startAnimatedFavicon } from "./lib/animatedFavicon";
import "./index.css";

const DesignGuidePreview = React.lazy(() => import("./dev/DesignGuidePreview"));

startAnimatedFavicon();

const previewParams = new URLSearchParams(window.location.search);
const isWorkspacePreview = import.meta.env.DEV && previewParams.has("workspace-preview");
const isPromptPreview = import.meta.env.DEV && previewParams.has("prompts-preview");
const isDesignPreview = import.meta.env.DEV && previewParams.has("design-preview");

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <EonAccentDefs />
    {isDesignPreview ? (
      <React.Suspense fallback={null}><DesignGuidePreview /></React.Suspense>
    ) : isPromptPreview ? (
      <PromptLibraryPreview />
    ) : isWorkspacePreview ? (
      <WorkspacePreview />
    ) : (
      <AuthProvider>
        <App />
      </AuthProvider>
    )}
  </React.StrictMode>
);
