import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

import { cn } from "../../lib/utils"
import { toResponsiveWidth } from "../../hooks/useContainerSize"

const TooltipProvider = TooltipPrimitive.Provider

const Tooltip = TooltipPrimitive.Root

const TooltipTrigger = TooltipPrimitive.Trigger

const TooltipArrow = TooltipPrimitive.Arrow

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> & {
    borderRadius?: number
    containerWidth?: number
  }
>(({ className, sideOffset = 2, side = "bottom", borderRadius = 30, align = "center", containerWidth, ...props }, ref) => {
  const fontSize = containerWidth ? toResponsiveWidth(28, containerWidth) : 28
  // 弹窗宽度是 1069px，tooltip 最大宽度为弹窗宽度的一半
  const maxWidth = containerWidth ? toResponsiveWidth(1069 / 2, containerWidth) : 534.5
  
  return (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      side={side}
      sideOffset={sideOffset}
      align={align}
      collisionPadding={16}
      sticky="always"
      arrowPadding={8}
      className={cn(
        "overflow-visible px-3 py-1.5 shadow-lg",
        className
      )}
      style={{
        maxWidth: `${maxWidth}px`,
        borderRadius: `${borderRadius}px`,
        backgroundColor: '#F5F5F5',
        zIndex: 9999,
        ...props.style,
      }}
      {...props}
    >
    <div
      style={{
        fontFamily: 'OPPO Sans 4.0',
        fontWeight: 500,
        fontStyle: 'normal',
        fontSize: `${fontSize}px`,
        lineHeight: '100%',
        letterSpacing: '0%',
        wordWrap: 'break-word',
        overflowWrap: 'break-word',
        color: '#60585E',
      }}
    >
      {props.children}
    </div>
    <TooltipPrimitive.Arrow
      width={12}
      height={6}
      style={{
        fill: '#F5F5F5',
        filter: 'drop-shadow(0 1px 1px rgba(0, 0, 0, 0.1))',
        position: 'relative',
      }}
    />
    </TooltipPrimitive.Content>
  </TooltipPrimitive.Portal>
  )
})
TooltipContent.displayName = TooltipPrimitive.Content.displayName

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider, TooltipArrow }

