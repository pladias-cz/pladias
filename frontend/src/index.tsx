import ReactDOM from "react-dom/client";
import {QueryClientProvider} from "@tanstack/react-query";
import "./i18n/i18n";
import "./styles/global.scss";
import App from "./App";
import {createQueryClient} from "./query/queryClient";

const root = document.getElementById("react-app");

if (root) {
    const queryClient = createQueryClient();

    ReactDOM.createRoot(root).render(
        <QueryClientProvider client={queryClient}>
            <App/>
        </QueryClientProvider>,
    );
}