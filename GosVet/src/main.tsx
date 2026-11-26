import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";
import "./styles/app.css";
import "./styles/workspace.css";
import "./styles/appointment-polish.css";
import "./styles/appointment-followup-ui.css";
import "./styles/attention-polish.css";
import "./styles/vaccination-polish.css";
import "./styles/vetis-status.css";
import "./styles/prime-overrides.css";
import "./styles/clinical-assistant.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
);
