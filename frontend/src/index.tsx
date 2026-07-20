import ReactDOM from "react-dom/client";
import "./i18n/i18n";
import "./styles/global.scss";
import App from "./App.jsx";

const root = document.getElementById("react-app");

if (root) {
    ReactDOM.createRoot(root).render(<App/>);
}