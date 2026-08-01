import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface RevealProps {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: 'div' | 'section' | 'figure' | 'header' | 'aside' | 'li';
}

/**
 * Aparição lenta e discreta ao entrar na viewport.
 * Sem bounce, sem direções múltiplas — apenas opacidade e um deslocamento mínimo.
 */
export const Reveal: React.FC<RevealProps> = ({
  children, delay = 0, y = 18, className = '', as = 'div',
}) => {
  const reduced = useReducedMotion();
  const Comp = motion[as] as typeof motion.div;

  if (reduced) {
    const Tag = as as React.ElementType;
    return <Tag className={className}>{children}</Tag>;
  }

  return (
    <Comp
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-12% 0px -8% 0px' }}
      transition={{ duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </Comp>
  );
};

export default Reveal;
