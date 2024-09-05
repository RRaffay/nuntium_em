import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import MessageLoading from "./message-loading"

// ChatBubble
const chatBubbleVariant = cva(
  "flex gap-2 max-w-[60%] items-end relative",
  {
    variants: {
      variant: {
        received: "self-start",
        sent: "self-end flex-row-reverse",
      },
      layout: {
        "default": "",
        "ai": "max-w-full w-full items-center"
      }
    },
    defaultVariants: {
      variant: "received",
      layout: "default"
    }
  }
)

interface ChatBubbleProps extends React.HTMLAttributes<HTMLDivElement>,
  VariantProps<typeof chatBubbleVariant> { }

const ChatBubble = React.forwardRef<HTMLDivElement, ChatBubbleProps>(
  ({ className, variant, layout, children, ...props }, ref) => (
    <div
      className={cn(chatBubbleVariant({ variant, layout, className }))}
      ref={ref}
      {...props}
    >
      {children}
    </div>
  )
)
ChatBubble.displayName = "ChatBubble"

// ChatBubbleAvatar
interface ChatBubbleAvatarProps {
  src?: string
  fallback?: string
  className?: string
  variant?: 'sent' | 'received'
}

const ChatBubbleAvatar: React.FC<ChatBubbleAvatarProps> = ({ src, fallback, className, variant }) => (
  <Avatar className={cn(className)}>
    <AvatarImage src={src} alt="Avatar" />
    <AvatarFallback className={cn(
      variant === 'sent' ? 'bg-gray-800 text-white' : 'bg-muted text-muted-foreground'
    )}>
      {fallback}
    </AvatarFallback>
  </Avatar>
)

// ChatBubbleMessage
const chatBubbleMessageVariants = cva(
  "p-4",
  {
    variants: {
      variant: {
        received: "bg-secondary text-secondary-foreground rounded-r-lg rounded-tl-lg",
        sent: "bg-gray-800 text-white rounded-l-lg rounded-tr-lg",
      },
      layout: {
        "default": "",
        "ai": "border-t w-full rounded-none bg-transparent"
      }
    },
    defaultVariants: {
      variant: "received",
      layout: "default"
    }
  }
)

interface ChatBubbleMessageProps extends React.HTMLAttributes<HTMLDivElement>,
  VariantProps<typeof chatBubbleMessageVariants> {
  isLoading?: boolean
}

const ChatBubbleMessage = React.forwardRef<HTMLDivElement, ChatBubbleMessageProps>(
  ({ className, variant, layout, isLoading = false, children, ...props }, ref) => (
    <div
      className={cn(chatBubbleMessageVariants({ variant, layout, className }), 'break-words max-w-full whitespace-pre-wrap')}
      ref={ref}
      {...props}
    >
      {isLoading ? (
        <div className="flex items-center space-x-2">
          <MessageLoading />
        </div>
      ) : (
        children
      )}
    </div>
  )
)
ChatBubbleMessage.displayName = "ChatBubbleMessage"

// ChatBubbleTimestamp
interface ChatBubbleTimestampProps extends React.HTMLAttributes<HTMLDivElement> {
  timestamp: string
}

const ChatBubbleTimestamp: React.FC<ChatBubbleTimestampProps> = ({ timestamp, className, ...props }) => (
  <div className={cn("text-xs mt-2 text-right", className)} {...props}>
    {timestamp}
  </div>
)

export {
  ChatBubble,
  ChatBubbleAvatar,
  ChatBubbleMessage,
  ChatBubbleTimestamp,
  chatBubbleVariant,
  chatBubbleMessageVariants
}