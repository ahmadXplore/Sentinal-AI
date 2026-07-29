"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import api from "../lib/api";

const SUGGESTED_PROMPTS = [
  { icon: "🔍", text: "What happened in this incident?" },
  { icon: "🌐", text: "Which IP address is most suspicious?" },
  { icon: "⚔️", text: "Explain the MITRE ATT&CK technique" },
  { icon: "🛡️", text: "What remediation actions should I take?" },
  { icon: "📅", text: "Show me the attack timeline" },
  { icon: "🎯", text: "What was the attacker's objective?" },
];

function TypingIndicator() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        padding: "12px 16px",
      }}
    >
      <div
        style={{
          width: "32px",
          height: "32px",
          borderRadius: "50%",
          background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "0.9rem",
          flexShrink: 0,
        }}
      >
        🤖
      </div>
      <div
        style={{
          background: "rgba(99,102,241,0.1)",
          border: "1px solid rgba(99,102,241,0.2)",
          borderRadius: "18px 18px 18px 4px",
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          gap: "4px",
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: "#6366f1",
              opacity: 0.7,
              animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function MessageBubble({ message, onCopy }) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    if (onCopy) onCopy();
  };

  const time = message.timestamp
    ? new Date(message.timestamp).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  if (isUser) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: "16px",
          gap: "10px",
        }}
      >
        <div style={{ maxWidth: "75%" }}>
          <div
            style={{
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              borderRadius: "18px 18px 4px 18px",
              padding: "12px 16px",
              fontSize: "0.875rem",
              lineHeight: "1.6",
              color: "#fff",
            }}
          >
            {message.content}
          </div>
          <div
            style={{
              textAlign: "right",
              fontSize: "0.7rem",
              color: "var(--text-muted)",
              marginTop: "4px",
            }}
          >
            {time}
          </div>
        </div>
        <div
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            background: "rgba(99,102,241,0.2)",
            border: "1px solid rgba(99,102,241,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.85rem",
            flexShrink: 0,
            alignSelf: "flex-end",
          }}
        >
          👤
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
      <div
        style={{
          width: "32px",
          height: "32px",
          borderRadius: "50%",
          background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "0.9rem",
          flexShrink: 0,
          alignSelf: "flex-end",
          boxShadow: "0 0 12px rgba(99,102,241,0.4)",
        }}
      >
        🤖
      </div>
      <div style={{ maxWidth: "80%" }}>
        <div
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "18px 18px 18px 4px",
            padding: "12px 16px",
            fontSize: "0.875rem",
            lineHeight: "1.7",
            color: "var(--text-primary)",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          <ReactMarkdown
            components={{
              p: ({ node, ...props }) => (
                <p
                  style={{ margin: "0 0 12px 0", lineHeight: "1.7" }}
                  {...props}
                />
              ),
              ul: ({ node, ...props }) => (
                <ul
                  style={{
                    margin: "0 0 12px 0",
                    paddingLeft: "24px",
                    listStyleType: "disc",
                  }}
                  {...props}
                />
              ),
              ol: ({ node, ...props }) => (
                <ol
                  style={{
                    margin: "0 0 12px 0",
                    paddingLeft: "24px",
                    listStyleType: "decimal",
                  }}
                  {...props}
                />
              ),
              li: ({ node, ...props }) => (
                <li
                  style={{ marginBottom: "6px", lineHeight: "1.6" }}
                  {...props}
                />
              ),
              h1: ({ node, ...props }) => (
                <h1
                  style={{
                    fontSize: "1.3rem",
                    margin: "16px 0 10px",
                    fontWeight: "bold",
                    color: "#fff",
                  }}
                  {...props}
                />
              ),
              h2: ({ node, ...props }) => (
                <h2
                  style={{
                    fontSize: "1.15rem",
                    margin: "16px 0 10px",
                    fontWeight: "bold",
                    color: "#fff",
                  }}
                  {...props}
                />
              ),
              h3: ({ node, ...props }) => (
                <h3
                  style={{
                    fontSize: "1.05rem",
                    margin: "16px 0 8px",
                    fontWeight: "bold",
                    color: "#e2e8f0",
                  }}
                  {...props}
                />
              ),
              strong: ({ node, ...props }) => (
                <strong style={{ fontWeight: 600, color: "#fff" }} {...props} />
              ),
              a: ({ node, ...props }) => (
                <a
                  style={{ color: "#a78bfa", textDecoration: "underline" }}
                  {...props}
                />
              ),
              pre: ({ node, ...props }) => (
                <pre
                  style={{
                    background: "rgba(0,0,0,0.5)",
                    padding: "14px",
                    borderRadius: "8px",
                    overflowX: "auto",
                    fontSize: "0.85em",
                    border: "1px solid rgba(255,255,255,0.1)",
                    margin: "12px 0",
                  }}
                  {...props}
                />
              ),
              code: ({ node, className, ...props }) => {
                const match = /language-(\w+)/.exec(className || "");
                return match ? (
                  <code
                    className={className}
                    style={{ color: "#e2e8f0", fontFamily: "monospace" }}
                    {...props}
                  />
                ) : (
                  <code
                    style={{
                      background: "rgba(0,0,0,0.3)",
                      padding: "3px 6px",
                      borderRadius: "4px",
                      fontSize: "0.85em",
                      color: "#c4b5fd",
                      fontFamily: "monospace",
                    }}
                    {...props}
                  />
                );
              },
              blockquote: ({ node, ...props }) => (
                <blockquote
                  style={{
                    borderLeft: "3px solid #8b5cf6",
                    margin: "12px 0",
                    paddingLeft: "14px",
                    color: "var(--text-muted)",
                    fontStyle: "italic",
                  }}
                  {...props}
                />
              ),
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginTop: "4px",
          }}
        >
          <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
            {time}
          </span>
          <button
            onClick={handleCopy}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "0.65rem",
              color: copied ? "#22c55e" : "var(--text-muted)",
              padding: "2px 6px",
              borderRadius: "4px",
              transition: "all 0.2s",
            }}
          >
            {copied ? "✓ Copied" : "⧉ Copy"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AIChat({
  contextType = "alert",
  contextId,
  alertName = "",
}) {
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const timerRef = useRef(null);

  // Initialize session
  useEffect(() => {
    if (!contextId) return;
    setInitializing(true);
    api
      .startChatSession(contextType, contextId)
      .then((res) => {
        const session = res.data?.session;
        setSessionId(session._id);
        setMessages(session.messages || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setInitializing(false));
  }, [contextType, contextId]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: loading ? "auto" : "smooth",
      block: "end",
    });
  }, [messages, loading]);

  const sendMessage = useCallback(
    async (text) => {
      const msgText = (text || input).trim();
      if (!msgText || !sessionId || loading) return;

      setInput("");
      setError("");
      setElapsed(0);

      // Optimistically add user message
      const userMsg = { role: "user", content: msgText, timestamp: new Date() };
      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);

      // Start timer
      const start = Date.now();
      timerRef.current = setInterval(
        () => setElapsed(Math.floor((Date.now() - start) / 1000)),
        1000,
      );

      let hasCreatedBubble = false;
      let accumulatedText = "";

      try {
        const stream = await api.sendChatMessageStream(sessionId, msgText);
        const reader = stream.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop(); // Keep the partial line in the buffer

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;

            if (trimmedLine === "data: [DONE]") {
              continue;
            }

            if (trimmedLine.startsWith("data: ")) {
              const jsonStr = trimmedLine.slice(6).trim();
              try {
                const parsed = JSON.parse(jsonStr);
                if (parsed.error) {
                  setError(parsed.error);
                  break;
                }
                const token = parsed.token;
                if (token) {
                  accumulatedText += token;

                  // Clean up echoed prefix if any
                  const cleanedText = accumulatedText.replace(
                    /^SentinelAI:\s*/i,
                    "",
                  );

                  if (!hasCreatedBubble) {
                    hasCreatedBubble = true;
                    setMessages((prev) => [
                      ...prev,
                      {
                        role: "assistant",
                        content: cleanedText,
                        timestamp: new Date(),
                      },
                    ]);
                  } else {
                    setMessages((prev) => {
                      const updated = [...prev];
                      if (updated.length > 0) {
                        updated[updated.length - 1] = {
                          ...updated[updated.length - 1],
                          content: cleanedText,
                        };
                      }
                      return updated;
                    });
                  }
                }
              } catch (e) {
                console.error("Error parsing streaming line:", e, trimmedLine);
              }
            }
          }
        }
      } catch (err) {
        setError(err.message || "AI response failed. Check AI connection.");
      } finally {
        clearInterval(timerRef.current);
        setLoading(false);
        setTimeout(() => {
          inputRef.current?.focus();
        }, 50);
      }
    },
    [input, sessionId, loading],
  );

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (initializing) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "400px",
          gap: "16px",
        }}
      >
        <div
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.5rem",
            animation: "shimmer-pulse 2s ease-in-out infinite",
            boxShadow: "0 0 20px rgba(99,102,241,0.4)",
          }}
        >
          🤖
        </div>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
          Initializing AI investigation session...
        </p>
      </div>
    );
  }

  const isEmpty = messages.length === 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "600px" }}>
      {/* Header */}
      <div
        style={{
          padding: "14px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          background: "rgba(99,102,241,0.05)",
        }}
      >
        <div
          style={{
            width: "38px",
            height: "38px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.1rem",
            boxShadow: "0 0 12px rgba(99,102,241,0.4)",
          }}
        >
          🤖
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>
            SentinelAI Analyst
          </div>
          <div
            style={{
              fontSize: "0.72rem",
              color: "#22c55e",
              display: "flex",
              alignItems: "center",
              gap: "5px",
            }}
          >
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "#22c55e",
                display: "inline-block",
                animation: "pulse-dot 2s infinite",
              }}
            />
            Sentinel AI ·{" "}
            {alertName ? `Investigating: ${alertName.slice(0, 30)}` : "Ready"}
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
        {isEmpty && !loading ? (
          <div style={{ textAlign: "center", paddingTop: "30px" }}>
            <div style={{ fontSize: "3rem", marginBottom: "16px" }}>🛡️</div>
            <h4 style={{ marginBottom: "8px", fontWeight: 600 }}>
              AI Investigation Ready
            </h4>
            <p
              style={{
                fontSize: "0.82rem",
                color: "var(--text-muted)",
                marginBottom: "28px",
                maxWidth: "380px",
                margin: "0 auto 28px",
              }}
            >
              Ask anything about this {contextType}. The AI has full context
              about the alert details, matched log entries, and threat
              indicators.
            </p>
            {/* Suggested prompts */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "8px",
                justifyContent: "center",
                maxWidth: "500px",
                margin: "0 auto",
              }}
            >
              {SUGGESTED_PROMPTS.map((p, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(p.text)}
                  style={{
                    padding: "8px 14px",
                    background: "rgba(99,102,241,0.08)",
                    border: "1px solid rgba(99,102,241,0.2)",
                    borderRadius: "20px",
                    color: "var(--text-primary)",
                    fontSize: "0.78rem",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(99,102,241,0.18)";
                    e.currentTarget.style.borderColor = "rgba(99,102,241,0.4)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(99,102,241,0.08)";
                    e.currentTarget.style.borderColor = "rgba(99,102,241,0.2)";
                  }}
                >
                  <span>{p.icon}</span> {p.text}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <MessageBubble key={i} message={msg} />
            ))}
            {loading && <TypingIndicator />}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Error bar */}
      {error && (
        <div
          style={{
            margin: "0 20px",
            padding: "10px 14px",
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.25)",
            borderRadius: "8px",
            fontSize: "0.8rem",
            color: "#ef4444",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span>⚠️</span> {error}
          <button
            onClick={() => setError("")}
            style={{
              marginLeft: "auto",
              background: "none",
              border: "none",
              color: "#ef4444",
              cursor: "pointer",
              fontSize: "1rem",
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Suggested prompts bar (when chat has messages) */}
      {!isEmpty && !loading && (
        <div
          style={{
            padding: "8px 20px",
            display: "flex",
            gap: "6px",
            overflowX: "auto",
            borderTop: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          {SUGGESTED_PROMPTS.slice(0, 4).map((p, i) => (
            <button
              key={i}
              onClick={() => sendMessage(p.text)}
              style={{
                padding: "5px 12px",
                whiteSpace: "nowrap",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "16px",
                color: "var(--text-muted)",
                fontSize: "0.72rem",
                cursor: "pointer",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                gap: "5px",
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(99,102,241,0.4)";
                e.currentTarget.style.color = "var(--text-primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                e.currentTarget.style.color = "var(--text-muted)";
              }}
            >
              {p.icon} {p.text}
            </button>
          ))}
        </div>
      )}

      {/* Input area */}
      <div
        style={{
          padding: "16px 20px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          gap: "10px",
          alignItems: "flex-end",
          background: "rgba(0,0,0,0.2)",
        }}
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about this incident... (Enter to send, Shift+Enter for new line)"
          disabled={loading}
          rows={1}
          style={{
            flex: 1,
            resize: "none",
            minHeight: "44px",
            maxHeight: "120px",
            padding: "11px 16px",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "22px",
            color: "var(--text-primary)",
            fontSize: "0.875rem",
            outline: "none",
            fontFamily: "inherit",
            lineHeight: "1.5",
            transition: "border-color 0.2s",
          }}
          onFocus={(e) => (e.target.style.borderColor = "rgba(99,102,241,0.5)")}
          onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
        />
        <button
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "50%",
            flexShrink: 0,
            background:
              loading || !input.trim()
                ? "rgba(99,102,241,0.2)"
                : "linear-gradient(135deg, #6366f1, #8b5cf6)",
            border: "none",
            cursor: loading || !input.trim() ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.1rem",
            transition: "all 0.2s",
            boxShadow:
              loading || !input.trim()
                ? "none"
                : "0 4px 12px rgba(99,102,241,0.4)",
          }}
        >
          {loading ? (
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              {elapsed}s
            </span>
          ) : (
            "↑"
          )}
        </button>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}
