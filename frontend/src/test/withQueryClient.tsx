/**
 * Obal pro testy komponent používajících TanStack Query (sekce J): každý
 * render dostane vlastního klienta s produkční no-cache konfigurací
 * (včetně `retry: false`, aby odmítnuté dotazy v testech nečekaly na
 * opakování).
 */

import type {ReactElement} from "react";
import {QueryClientProvider} from "@tanstack/react-query";
import {createQueryClient} from "@/query/queryClient";

export function withQueryClient(ui: ReactElement): ReactElement {
    return <QueryClientProvider client={createQueryClient()}>{ui}</QueryClientProvider>;
}
