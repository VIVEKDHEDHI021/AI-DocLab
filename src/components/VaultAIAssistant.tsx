import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, User, Send, Bot } from "lucide-react";
import { askVault } from "@/lib/documents.functions";

type Message = {
  role: "user" | "assistant";
  content: string;
};

interface VaultAIAssistantProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export function VaultAIAssistant({ isOpen, setIsOpen }: VaultAIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi! I am Vault AI. Ask me anything about your saved documents, like 'What is my Aadhar number?', 'Show my PAN card number', or 'Do you have my bank account details?'",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = async (text: string) => {
    if (!text.trim() || isTyping) return;

    const userMsg = text.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setIsTyping(true);

    try {
      const res = await askVault({ data: { question: userMsg } });
      setMessages((prev) => [...prev, { role: "assistant", content: res.answer }]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            err?.message || "Sorry, I ran into an error trying to process your request.",
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const suggestions = [
    "What is my Aadhar number?",
    "What is my PAN number?",
    "Find my bank details",
  ];

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-md bg-background border-l border-border/60">
        <SheetHeader className="border-b border-border/60 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
              <Sparkles className="h-4 w-4 text-primary-foreground animate-pulse" />
            </div>
            <div>
              <SheetTitle className="font-display text-base font-bold leading-none">
                Vault AI Assistant
              </SheetTitle>
              <p className="text-[10px] text-muted-foreground mt-1">
                Secure conversation with your documents
              </p>
            </div>
          </div>
        </SheetHeader>

        {/* Message Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-3 ${
                msg.role === "user" ? "flex-row-reverse" : ""
              }`}
            >
              <div
                className={`flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-lg border text-sm font-semibold shadow-soft ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-surface text-foreground border-border"
                }`}
              >
                {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>
              <div
                className={`rounded-xl px-3.5 py-2.5 text-sm max-w-[80%] whitespace-pre-line leading-relaxed ${
                  msg.role === "user"
                    ? "bg-primary/10 text-foreground"
                    : "bg-surface border border-border/60 text-foreground"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-foreground shadow-soft">
                <Bot className="h-4 w-4" />
              </div>
              <div className="rounded-xl px-3.5 py-2.5 bg-surface border border-border/60 max-w-[80%] flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce"
                  style={{ animationDelay: "0ms" }}
                />
                <span
                  className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce"
                  style={{ animationDelay: "150ms" }}
                />
                <span
                  className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce"
                  style={{ animationDelay: "300ms" }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Quick Suggestions */}
        {messages.length === 1 && (
          <div className="px-4 py-3 border-t border-border/60 bg-surface/50">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Suggestions
            </p>
            <div className="flex flex-col gap-1.5">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="text-left text-xs bg-card border border-border/60 hover:border-primary/40 hover:bg-accent px-3 py-2 rounded-lg transition truncate font-medium text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Bar */}
        <div className="border-t border-border/60 p-4 bg-background pb-safe">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(input);
            }}
            className="flex gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your documents…"
              className="flex-1 bg-surface/50 h-10 border-border/60 focus-visible:ring-primary/20"
              disabled={isTyping}
            />
            <Button
              type="submit"
              size="icon"
              className="bg-gradient-primary text-primary-foreground shadow-glow h-10 w-10 shrink-0 hover:opacity-90 transition"
              disabled={isTyping || !input.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
