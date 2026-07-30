import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { IdrielMarkdown } from '@/components/IdrielMarkdown';

const sample = `# O Reino de **EXCIDIA**

## Economia
Um recurso raro: **Orvalho de Âmbar**, controlado pela *Casa Vellum*.

- Item um
- Item **dois**

1. Primeiro
2. Segundo

> Citação da Guardiã`;

describe('IdrielMarkdown', () => {
  it('renderiza títulos, negrito, itálico e listas', () => {
    const { container } = render(<IdrielMarkdown>{sample}</IdrielMarkdown>);
    expect(container.querySelector('h1')).toBeTruthy();
    expect(container.querySelector('h2')?.textContent).toBe('Economia');
    expect(container.querySelectorAll('strong').length).toBe(3);
    expect(container.querySelector('em')?.textContent).toBe('Casa Vellum');
    expect(container.querySelectorAll('ul li').length).toBe(2);
    expect(container.querySelectorAll('ol li').length).toBe(2);
    expect(container.querySelector('blockquote')).toBeTruthy();
    expect(container.textContent).not.toContain('**');
  });

  it('funciona em modo compacto (histórico)', () => {
    const { container } = render(<IdrielMarkdown compact>{'**Negrito** e lista:\n\n- a\n- b'}</IdrielMarkdown>);
    expect(container.querySelector('strong')?.textContent).toBe('Negrito');
    expect(container.querySelectorAll('li').length).toBe(2);
    expect(container.textContent).not.toContain('**');
  });
});
