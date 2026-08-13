import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./lib/auth";
import WorkspacePreview from "./dev/WorkspacePreview";
import PromptLibraryPreview from "./dev/PromptLibraryPreview";
import TrackingPreview from "./dev/TrackingPreview";
import { startAnimatedFavicon } from "./lib/animatedFavicon";
import "./index.css";

startAnimatedFavicon();

const previewParams = new URLSearchParams(window.location.search);
const isWorkspacePreview = import.meta.env.DEV && previewParams.has("workspace-preview");
const isPromptPreview = import.meta.env.DEV && previewParams.has("prompts-preview");
const isTrackingPreview = import.meta.env.DEV && previewParams.has("tracking-preview");

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {isTrackingPreview ? (
      <TrackingPreview />
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
