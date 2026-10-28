import "./index.css";
// Translations load before the first render, so the first screen is already in the right language.
import "./i18n";
import ReactDOM from "react-dom/client";
import { App } from "./App";

const rootEl = document.getElementById("root");
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(<App />);
}