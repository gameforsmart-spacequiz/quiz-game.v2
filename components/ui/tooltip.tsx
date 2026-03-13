'use client';

import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

import { cn } from '@/lib/utils';

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        // Base layout
        'z-[9999] max-w-xs overflow-hidden',
        // Glass morphism background with galaxy gradient
        'bg-gradient-to-br from-[#1a1a2e]/95 via-[#16213e]/95 to-[#0f0f23]/95',
        'backdrop-blur-xl',
        // Border with gradient effect
        'border border-purple-500/40',
        // Shadow and glow
        'shadow-2xl shadow-purple-900/30',
        // Rounded corners
        'rounded-xl',
        // Padding
        'px-4 py-3',
        // Typography
        'text-sm font-medium text-white/90',
        // Subtle inner glow
        'ring-1 ring-inset ring-white/10',
        // Animations
        'animate-in fade-in-0 zoom-in-95 duration-200',
        'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
        'data-[side=bottom]:slide-in-from-top-2',
        'data-[side=left]:slide-in-from-right-2',
        'data-[side=right]:slide-in-from-left-2',
        'data-[side=top]:slide-in-from-bottom-2',
        className
      )}
      {...props}
    >
      {/* Gradient top border line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
      {/* Gradient bottom border line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-400/30 to-transparent" />
      {/* Content */}
      <div className="relative z-10">
        {props.children}
      </div>
      {/* Subtle corner glow effects */}
      <div className="absolute -top-1 -left-1 w-8 h-8 bg-cyan-500/20 rounded-full blur-xl pointer-events-none" />
      <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-purple-500/20 rounded-full blur-xl pointer-events-none" />
    </TooltipPrimitive.Content>
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
