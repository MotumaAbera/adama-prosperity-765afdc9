import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "pp-adama-chatbot-v1";

function loadMessages(): UIMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as UIMessage[]) : [];
  } catch {
    return [];
  }
}

const transport = new DefaultChatTransport({ api: "/api/chat" });

export function FloatingChatbot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [initial] = useState<UIMessage[]>(() => loadMessages());
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { messages, sendMessage, status, setMessages, error } = useChat({
    id: "pp-adama-chat",
    messages: initial,
    transport,
  });

  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // ignore quota errors
    }
  }, [messages]);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
        textareaRef.current?.focus();
      });
    }
  }, [open, messages, isLoading]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    await sendMessage({ text });
  };

  const clearChat = () => {
    setMessages([]);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open assistant"
          className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#3e7edd] text-white shadow-lg shadow-black/20 transition hover:scale-105 hover:bg-[#3469c2] focus:outline-none focus:ring-2 focus:ring-[#3e7edd] focus:ring-offset-2"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {open && (
        <div className="fixed bottom-5 right-5 z-50 flex h-[min(600px,85vh)] w-[min(380px,95vw)] flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-black/10 bg-[#3e7edd] px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
                <MessageCircle className="h-4 w-4" />
              </div>
              <div className="leading-tight">
                <div className="text-sm font-semibold">PP Adama Assistant</div>
                <div className="text-[11px] text-white/80">Prosperity Party — Adama Branch</div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={clearChat}
                  className="rounded-md p-1.5 text-white/80 hover:bg-white/15 hover:text-white"
                  aria-label="Clear conversation"
                  title="Clear conversation"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="rounded-md p-1.5 text-white/80 hover:bg-white/15 hover:text-white"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-white px-4 py-4">
            {messages.length === 0 && (
              <div className="mt-6 text-center text-sm text-black/60">
                <p className="font-medium text-black">Hello 👋</p>
                <p className="mt-1">
                  Ask me anything about the Prosperity Party — Adama City Branch, our programs, or how to use this
                  system.
                </p>
                <p className="mt-2 text-xs text-black/40">Afaan Oromoo · አማርኛ · English</p>
              </div>
            )}

            {messages.map((m) => {
              const text = m.parts
                .map((p) => (p.type === "text" ? p.text : ""))
                .join("");
              const isUser = m.role === "user";
              return (
                <div key={m.id} className={cn("flex", isUser ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm leading-relaxed",
                      isUser
                        ? "bg-[#3e7edd] text-white"
                        : "bg-black/5 text-black",
                    )}
                  >
                    {text || (
                      <span className="inline-flex items-center gap-1 text-black/50">
                        <Loader2 className="h-3 w-3 animate-spin" /> thinking…
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {status === "submitted" && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-black/5 px-3 py-2 text-sm text-black/60">
                  <Loader2 className="inline h-3 w-3 animate-spin" /> thinking…
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error.message || "Something went wrong. Please try again."}
              </div>
            )}
          </div>

          {/* Composer */}
          <form
            onSubmit={handleSubmit}
            className="border-t border-black/10 bg-white p-3"
          >
            <div className="flex items-end gap-2">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                rows={1}
                placeholder="Ask about PP Adama branch…"
                className="max-h-32 flex-1 resize-none rounded-xl border border-black/15 bg-white px-3 py-2 text-sm text-black outline-none placeholder:text-black/40 focus:border-[#3e7edd] focus:ring-1 focus:ring-[#3e7edd]"
                disabled={isLoading}
              />
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || isLoading}
                className="h-9 w-9 shrink-0 rounded-full bg-[#3e7edd] text-white hover:bg-[#3469c2]"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
