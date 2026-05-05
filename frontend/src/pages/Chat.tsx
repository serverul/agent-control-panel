import { useState, useEffect, useRef } from "react";
import { api } from "../lib/api";
import { MessageSquare, Send, Hash, ChevronLeft } from "lucide-react";

export default function Chat() {
  const [channels, setChannels] = useState<string[]>([]);
  const [activeChannel, setActiveChannel] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.getChannels()
      .then(setChannels)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!activeChannel) return;
    api.getMessages(activeChannel)
      .then(setMessages)
      .catch(console.error);
  }, [activeChannel]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!newMsg.trim() || !activeChannel) return;
    setSending(true);
    try {
      await api.sendMessage(activeChannel, newMsg.trim());
      setNewMsg("");
      const updated = await api.getMessages(activeChannel);
      setMessages(updated);
    } catch (e) { console.error(e); }
    setSending(false);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-text-muted">Loading...</div>;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-6rem)]">
      <div className="flex items-center gap-2 mb-4">
        {activeChannel && (
          <button onClick={() => setActiveChannel(null)} className="md:hidden text-text-muted hover:text-text-primary">
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        <h1 className="text-xl md:text-2xl font-bold">Chat</h1>
        {activeChannel && <span className="text-sm text-text-muted"># {activeChannel}</span>}
      </div>

      <div className="flex flex-1 gap-4 min-h-0">
        {/* Channel list */}
        <div className={`${activeChannel ? "hidden md:block" : ""} w-full md:w-56 shrink-0`}>
          <div className="glass p-3 h-full overflow-auto">
            <h3 className="text-xs text-text-muted uppercase tracking-wider mb-2 px-2">Channels</h3>
            {channels.length === 0 ? (
              <p className="text-sm text-text-muted px-2">No channels yet</p>
            ) : (
              <div className="space-y-0.5">
                {channels.map((ch) => (
                  <button key={ch} onClick={() => setActiveChannel(ch)}
                    className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors ${
                      activeChannel === ch ? "bg-accent-glow text-accent-secondary" : "text-text-secondary hover:text-text-primary hover:bg-bg-tertiary"
                    }`}>
                    <Hash className="w-3.5 h-3.5" /> {ch}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className={`${!activeChannel ? "hidden md:flex" : "flex"} flex-1 flex-col min-h-0`}>
          {!activeChannel ? (
            <div className="glass flex-1 flex items-center justify-center text-text-muted">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Select a channel</p>
              </div>
            </div>
          ) : (
            <>
              <div className="glass flex-1 overflow-auto p-4 space-y-3 min-h-0">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-text-muted text-sm">No messages yet</div>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] rounded-xl px-4 py-2.5 ${
                        msg.sender === "user" ? "bg-accent-primary/20 border border-accent-primary/30" : "glass"
                      }`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-accent-secondary">{msg.sender}</span>
                          <span className="text-xs text-text-muted">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-sm text-text-primary whitespace-pre-wrap break-words">{msg.content}</p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="glass p-3 mt-2">
                <div className="flex gap-2">
                  <input value={newMsg} onChange={e => setNewMsg(e.target.value)} onKeyDown={handleKey}
                    className="flex-1 bg-bg-tertiary border border-border-default rounded-lg px-4 py-2.5 text-text-primary focus:outline-none focus:border-accent-primary text-sm"
                    placeholder="Type a message..." />
                  <button onClick={send} disabled={!newMsg.trim() || sending}
                    className="px-4 py-2.5 rounded-lg bg-accent-primary hover:bg-accent-secondary text-white transition-colors disabled:opacity-50">
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
