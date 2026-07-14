import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./lib/auth";
import WorkspacePreview from "./dev/WorkspacePreview";
import "./index.css";

const isWorkspacePreview = import.meta.env.DEV && new URLSearchParams(window.location.search).has("workspace-preview");

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {isWorkspacePreview ? (
      <WorkspacePreview />
    ) : (
      <AuthProvider>
        <App />
      </AuthProvider>
    )}
  </React.StrictMode>
);
