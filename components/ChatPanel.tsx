"use client";

import { useState, useRef, useEffect, useCallback } from "react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

export default function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [open, setOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || loading) return;

      const userMessage: Message = {
        id: `msg-${Date.now()}-${Math.random()}`,
        role: "user",
        content: text,
        timestamp: Date.now()
      };
      setMessages((prev) => [...prev, userMessage]);
      setInput("");

      setLoading(true);
      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text })
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(error || `HTTP ${response.status}`);
        }

        const data = await response.json();
        const assistantMessage: Message = {
          id: `msg-${Date.now()}-${Math.random()}`,
          role: "assistant",
          content: data.reply,
          timestamp: Date.now()
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } catch (error) {
        const errorMessage: Message = {
          id: `msg-${Date.now()}-${Math.random()}`,
          role: "assistant",
          content: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
          timestamp: Date.now()
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setLoading(false);
      }
    },
    [loading]
  );

  const initVoice = useCallback(() => {
    if (recognitionRef.current) return;
    const speechWindow = window as SpeechRecognitionWindow;
    const recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!recognition) {
      alert("Speech recognition not supported in this browser.");
      return;
    }
    const rec = new recognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = "en-US";
    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onerror = (event) => {
      console.error("Speech error:", event.error);
      setListening(false);
    };
    rec.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join("");
      if (transcript.trim()) {
        handleSendMessage(transcript);
      }
    };
    recognitionRef.current = rec;
  }, [handleSendMessage]);

  const toggleVoice = useCallback(() => {
    initVoice();
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
    } else {
      recognitionRef.current?.start();
    }
  }, [listening, initVoice]);

  return (
    <div className="fixed bottom-0 right-0 flex items-end z-20 pointer-events-auto">
      {open ? (
        <div className="hud-panel w-96 max-h-96 m-6 flex flex-col gap-3 overflow-hidden">
          <div className="flex items-center justify-between">
            <h2 className="eyebrow">ULTRON / COMMS</h2>
            <button
              onClick={() => setOpen(false)}
              className="text-muted hover:text-orange-300 text-sm font-bold"
              aria-label="Close chat panel"
            >
              ✕
            </button>
          </div>

          <div className="scrollbar-thin flex-1 overflow-y-auto space-y-2">
            {messages.length === 0 && (
              <div className="text-xs text-muted italic">
                Awaiting input...
              </div>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`text-xs leading-relaxed ${
                  msg.role === "user"
                    ? "text-orange-300 font-mono"
                    : "text-green-400 font-mono"
                }`}
              >
                <div className="font-bold">
                  {msg.role === "user" ? "USER >" : "ULTRON >"}
                </div>
                <div className="ml-2">{msg.content}</div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSendMessage(input);
                }
              }}
              placeholder="Type message..."
              disabled={loading}
              className="flex-1 px-2 py-2 text-xs bg-black/50 border border-orange-600/30 text-orange-100 rounded placeholder-gray-600"
            />
            <button
              onClick={() => handleSendMessage(input)}
              disabled={loading || !input.trim()}
              className="hud-button px-3"
              aria-label="Send message"
            >
              SEND
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={toggleVoice}
              disabled={loading}
              className={`hud-button flex-1 ${listening ? "border-orange-400" : ""}`}
              aria-label="Toggle voice input"
            >
              {listening ? "🎙️ LISTENING..." : "🎙️ VOICE"}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="hud-button hud-panel m-6"
          aria-label="Open chat panel"
        >
          💬 COMMS
        </button>
      )}
    </div>
  );
}
