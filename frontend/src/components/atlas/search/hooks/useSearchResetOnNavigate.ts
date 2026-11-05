/**
 * Reset vyhledávání při navigaci na už otevřenou stránku vyhledávání.
 *
 * Odkaz „Vyhledávání“ v hlavním menu vede na /atlas/search. Klik na něj na už
 * otevřené stránce pushne novou location se stejnou cestou (nový location.key),
 * komponenta se ale nepřemountuje – výsledky a filtry by zůstaly viset. Hook
 * proto na každou změnu location.key zavolá reset; na prvním mountu je to
 * neškodný no-op (stav je čerstvý). Callback musí být stabilní (useCallback),
 * jinak by efekt běžel při každém renderu.
 */

import {useEffect} from 'react';
import {useLocation} from 'react-router-dom';

export function useSearchResetOnNavigate(reset: () => void) {
    const location = useLocation();

    useEffect(() => {
        reset();
    }, [location.key, reset]);
}
