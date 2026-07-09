'use client';

import { ReactNode } from 'react';

interface TooltipProps {
  content: string;
  children: ReactNode;
}

export default function Tooltip({ content, children }: TooltipProps) {
  return (
    <span className="tooltip-trigger inline-flex">
      {children}
      <span className="tooltip-content">{content}</span>
    </span>
  );
}
