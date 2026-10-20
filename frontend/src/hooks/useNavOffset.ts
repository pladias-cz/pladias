import {useLayoutEffect, useState, type RefObject} from 'react';

/**
 * set top padding for content bellow the main, top-fixed navbar
 */
export function useNavOffset(navRef: RefObject<HTMLElement | null>) {
    const [offset, setOffset] = useState(0);

    useLayoutEffect(() => {
        const el = navRef.current;
        if (!el) {
            setOffset(0);
            return;
        }

        const update = () => {
            const h = el.getBoundingClientRect().height || el.offsetHeight || 0;
            setOffset(h);
        };

        update(); // initial measure


        let ro: ResizeObserver | undefined;
        if (typeof ResizeObserver !== 'undefined') {
            ro = new ResizeObserver(update);
            ro.observe(el);
        } else {
            window.addEventListener('resize', update);
        }

        return () => {
            if (ro) ro.disconnect();
            else window.removeEventListener('resize', update);
        };
    }, [navRef]);

    return offset;
}
