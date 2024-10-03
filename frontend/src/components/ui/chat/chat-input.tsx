import * as React from "react"
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  className?: string
  value?: string
  onKeyDown?: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void
  onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void
  placeholder?: string
  onSend: () => void
  disabled?: boolean
}

const ChatInput = React.forwardRef<HTMLTextAreaElement, ChatInputProps>(
  ({ className, value, onKeyDown, onChange, placeholder, onSend, disabled, ...props }, ref) => (
    <Textarea
      autoComplete="off"
      value={value}
      ref={ref}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey && !disabled) {
          e.preventDefault();
          onSend();
        }
        onKeyDown?.(e);
      }}
      onChange={onChange}
      name="message"
      placeholder={placeholder}
      className={cn(
        "max-h-12 px-4 py-3 bg-background text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 w-full rounded-md flex items-center h-16 resize-none",
        className
      )}
      disabled={disabled}
      {...props}
    />
  )
)

ChatInput.displayName = "ChatInput"

export { ChatInput }