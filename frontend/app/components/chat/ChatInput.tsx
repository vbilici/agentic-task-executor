import type { KeyboardEvent } from "react";
import { useState, forwardRef } from "react";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export const ChatInput = forwardRef<HTMLInputElement, ChatInputProps>(
  function ChatInput(
    {
      onSend,
      disabled = false,
      placeholder = "Describe your goal...",
      className,
    },
    ref
  ) {
    const [message, setMessage] = useState("");

    const handleSend = () => {
      const trimmed = message.trim();
      if (trimmed && !disabled) {
        onSend(trimmed);
        setMessage("");
      }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    };

    return (
      <div className={cn("flex gap-2 p-4 border-t border-border bg-background", className)}>
        <Input
          ref={ref}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1"
        />
        <Button
          onClick={handleSend}
          disabled={disabled || !message.trim()}
          size="icon"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    );
  }
);
