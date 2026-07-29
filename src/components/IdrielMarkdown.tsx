import React from 'react';
import ReactMarkdown from 'react-markdown';

/**
 * Renderiza as respostas de Idriel em Markdown (negrito, títulos, listas),
 * evitando que asteriscos crus apareçam na tela.
 */
export const IdrielMarkdown: React.FC<{ children: string; className?: string; compact?: boolean }> = ({
  children,
  className = '',
  compact = false,
}) => (
  <div className={`font-merriweather text-foreground/95 leading-relaxed ${compact ? 'text-xs' : 'text-sm'} ${className}`}>
    <ReactMarkdown
      components={{
        h1: ({ children }) => <h1 className="font-cinzel font-bold text-base text-gold-light mt-4 mb-2 first:mt-0">{children}</h1>,
        h2: ({ children }) => <h2 className="font-cinzel font-bold text-sm text-gold-light mt-3 mb-1.5 first:mt-0">{children}</h2>,
        h3: ({ children }) => <h3 className="font-cinzel font-bold text-[13px] text-gold-champagne mt-3 mb-1.5 first:mt-0">{children}</h3>,
        h4: ({ children }) => <h4 className="font-cinzel font-bold text-xs text-gold-champagne mt-2 mb-1">{children}</h4>,
        p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
        strong: ({ children }) => <strong className="font-bold text-foreground">{children}</strong>,
        em: ({ children }) => <em className="italic text-gold-champagne/90">{children}</em>,
        ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>,
        li: ({ children }) => <li className="marker:text-gold/60">{children}</li>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-gold/30 pl-3 italic text-foreground/80 my-3">{children}</blockquote>
        ),
        hr: () => <hr className="border-gold/15 my-4" />,
        a: ({ children, href }) => (
          <a href={href} target="_blank" rel="noreferrer" className="text-gold-light underline underline-offset-2">{children}</a>
        ),
        code: ({ children, className: cls }) =>
          cls?.includes('language-') ? (
            <pre className="bg-secondary/50 rounded-md p-3 overflow-x-auto my-3"><code className="text-xs font-mono">{children}</code></pre>
          ) : (
            <code className="bg-secondary/40 rounded px-1 py-0.5 text-xs font-mono text-gold-light">{children}</code>
          ),
      }}
    >
      {children}
    </ReactMarkdown>
  </div>
);

export default IdrielMarkdown;
