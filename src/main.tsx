import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { bootFontSize } from "./hooks/useFontSize";

bootFontSize();

createRoot(document.getElementById("root")!).render(<App />);
