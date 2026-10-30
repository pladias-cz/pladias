import {cleanup, render, screen} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';
import RichTextMessage from './RichTextMessage';

/**
 * Passthrough props RichTextMessage: title se dostane na vykreslený element
 * (užívá se pro hover s ID taxonu u jeho jména), bez title se atribut nevykreslí.
 */

afterEach(() => cleanup());

describe('RichTextMessage', () => {
    it('vykreslí html obsah a předaný title nastaví jako atribut', () => {
        render(<RichTextMessage html="<i>Achillea millefolium</i>" title="ID: 123"/>);

        // getByText dohledá <i> (přímý textový uzel); obal je renderovaný span
        const el = screen.getByText('Achillea millefolium').closest('span') as HTMLElement;
        expect(el).toHaveAttribute('title', 'ID: 123');
        expect(el.innerHTML).toBe('<i>Achillea millefolium</i>');
    });

    it('bez title se atribut title nevykreslí', () => {
        render(<RichTextMessage html="<i>Achillea millefolium</i>"/>);

        const el = screen.getByText('Achillea millefolium').closest('span') as HTMLElement;
        expect(el).not.toHaveAttribute('title');
    });

    it('as a className obalují vykreslený html obsah', () => {
        render(<RichTextMessage as="p" className="desc" html="text"/>);

        const el = screen.getByText('text');
        expect(el.tagName).toBe('P');
        expect(el).toHaveClass('desc');
    });
});
