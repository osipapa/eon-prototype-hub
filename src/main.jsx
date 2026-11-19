import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./lib/auth";
import EonAccentDefs from "./components/EonAccentDefs";
import "./index.css";

// Dev-only preview routes. The DEV check sits on each import so the production
// build drops them, and nothing they pull in lands in the entry bundle.
const DEV = import.meta.env.DEV;
const WorkspacePreview = DEV ? React.lazy(() => import("./dev/WorkspacePreview")) : null;
const PromptLibraryPreview = DEV ? React.lazy(() => import("./dev/PromptLibraryPreview")) : null;
const DesignGuidePreview = DEV ? React.lazy(() => import("./dev/DesignGuidePreview")) : null;
const MirrorPreview = DEV ? React.lazy(() => import("./dev/MirrorPreview")) : null;
const FullPreview = DEV ? React.lazy(() => import("./dev/FullPreview")) : null;
const ConsentPreview = DEV ? React.lazy(() => import("./dev/ConsentPreview")) : null;
const AdminPreview = DEV ? React.lazy(() => import("./dev/AdminPreview")) : null;
const AnimationsPreview = DEV ? React.lazy(() => import("./dev/AnimationsPreview")) : null;

const previewParams = new URLSearchParams(window.location.search);
const isWorkspacePreview = import.meta.env.DEV && previewParams.has("workspace-preview");
const isPromptPreview = import.meta.env.DEV && previewParams.has("prompts-preview");
const isDesignPreview = import.meta.env.DEV && previewParams.has("design-preview");
const isMirrorPreview = import.meta.env.DEV && previewParams.has("mirror-preview");
const isFullPreview = import.meta.env.DEV && previewParams.has("full-preview");
const isConsentPreview = import.meta.env.DEV && previewParams.has("consent-preview");
const isAdminPreview = import.meta.env.DEV && previewParams.has("admin-preview");
const isAnimationsPreview = import.meta.env.DEV && previewParams.has("animations-preview");

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <EonAccentDefs />
    {isAnimationsPreview ? (
      <React.Suspense fallback={null}><AnimationsPreview /></React.Suspense>
    ) : isAdminPreview ? (
      <React.Suspense fallback={null}><AdminPreview /></React.Suspense>
    ) : isConsentPreview ? (
      <React.Suspense fallback={null}><ConsentPreview /></React.Suspense>
    ) : isFullPreview ? (
      <React.Suspense fallback={null}><FullPreview /></React.Suspense>
    ) : isMirrorPreview ? (
      <React.Suspense fallback={null}><MirrorPreview /></React.Suspense>
    ) : isDesignPreview ? (
      <React.Suspense fallback={null}><DesignGuidePreview /></React.Suspense>
    ) : isPromptPreview ? (
      <React.Suspense fallback={null}><PromptLibraryPreview /></React.Suspense>
    ) : isWorkspacePreview ? (
      <React.Suspense fallback={null}><WorkspacePreview /></React.Suspense>
    ) : (
      <AuthProvider>
        <App />
      </AuthProvider>
    )}
  </React.StrictMode>
);
