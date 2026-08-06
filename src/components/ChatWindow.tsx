import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { Message, Profile } from "@/lib/types";
import { formatChatTime, validateFile, getFileType } from "@/lib/utils";
import { Send, Paperclip, FileText, ImageIcon, Loader2, ArrowLeft, MessageSquare } from "lucide-react";

interface ChatWindowProps {
  chatId: string;
  myId: string;
  otherPerson: Profile;
  onBack?: () => void;
}

export default function ChatWindow({ chatId, myId, otherPerson, onBack }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploadName, setUploadName] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadMessages = useCallback(async () => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true });
    if (data) setMessages(data as Message[]);
  }, [chatId]);

  useEffect(() => {
    loadMessages();

    const channel = supabase
      .channel(`messages:${chatId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `chat_id=eq.${chatId}` },
        (payload) => {
          setMessages((prev) => {
            const msg = payload.new as Message;
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, loadMessages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    if (!text.trim() && !uploadName) return;
    setBusy(true);

    let fileUrl = "";
    let fileType: "pdf" | "image" | "none" = "none";
    let fileName = "";

    if (uploadName && fileRef.current?.files?.[0]) {
      const file = fileRef.current.files[0];
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      const path = `${chatId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("chat-files").upload(path, file);
      if (upErr) {
        setBusy(false);
        alert("Upload failed: " + upErr.message);
        return;
      }
      const { data: pub } = supabase.storage.from("chat-files").getPublicUrl(path);
      fileUrl = pub.publicUrl;
      fileType = getFileType(file);
      fileName = file.name;
    }

    const { error } = await supabase.from("messages").insert({
      chat_id: chatId,
      sender_id: myId,
      content: text.trim(),
      file_url: fileUrl,
      file_type: fileType,
      file_name: fileName,
    });

    if (error) {
      alert("Failed to send: " + error.message);
    } else {
      setText("");
      setUploadName(null);
      if (fileRef.current) fileRef.current.value = "";
    }
    setBusy(false);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateFile(file);
    if (err) {
      alert(err);
      e.target.value = "";
      return;
    }
    setUploadName(file.name);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="bg-white border-b border-surface-200 px-4 sm:px-6 py-4 flex items-center gap-3">
        {onBack && (
          <button onClick={onBack} className="md:hidden p-1.5 rounded-lg hover:bg-surface-100">
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-semibold">
          {otherPerson.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h2 className="font-semibold text-surface-900">{otherPerson.name}</h2>
          <p className="text-xs text-surface-500">{otherPerson.email}</p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-3 bg-surface-50">
        {messages.length === 0 && (
          <div className="text-center text-surface-400 mt-12">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>No messages yet. Start the conversation!</p>
          </div>
        )}
        {messages.map((msg) => {
          const mine = msg.sender_id === myId;
          return (
            <div key={msg.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] sm:max-w-md rounded-2xl px-4 py-2.5 ${
                  mine
                    ? "bg-primary-600 text-white rounded-br-sm"
                    : "bg-white text-surface-900 border border-surface-200 rounded-bl-sm"
                }`}
              >
                {msg.content && <p className="whitespace-pre-wrap break-words">{msg.content}</p>}

                {msg.file_type === "image" && msg.file_url && (
                  <a href={msg.file_url} target="_blank" rel="noopener noreferrer" className="block mt-2">
                    <img
                      src={msg.file_url}
                      alt={msg.file_name}
                      className="rounded-lg max-w-full max-h-60 object-cover"
                    />
                  </a>
                )}

                {msg.file_type === "pdf" && msg.file_url && (
                  <a
                    href={msg.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-2 mt-2 px-3 py-2 rounded-lg text-sm ${
                      mine ? "bg-primary-700/50" : "bg-surface-100"
                    }`}
                  >
                    <FileText className="w-5 h-5 flex-shrink-0" />
                    <span className="truncate">{msg.file_name || "Document.pdf"}</span>
                  </a>
                )}

                <p className={`text-xs mt-1 ${mine ? "text-primary-200" : "text-surface-400"}`}>
                  {formatChatTime(msg.created_at)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div className="bg-white border-t border-surface-200 px-4 sm:px-6 py-3">
        {uploadName && (
          <div className="flex items-center gap-2 mb-2 text-sm text-surface-600 bg-surface-50 rounded-lg px-3 py-2">
            {uploadName.toLowerCase().endsWith(".pdf") ? (
              <FileText className="w-4 h-4" />
            ) : (
              <ImageIcon className="w-4 h-4" />
            )}
            <span className="truncate flex-1">{uploadName}</span>
            <button
              onClick={() => {
                setUploadName(null);
                if (fileRef.current) fileRef.current.value = "";
              }}
              className="text-surface-400 hover:text-error-500"
            >
              ✕
            </button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="p-2.5 rounded-lg text-surface-500 hover:bg-surface-100 transition"
            title="Attach file"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2.5 rounded-lg border border-surface-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition"
          />
          <button
            onClick={handleSend}
            disabled={busy || (!text.trim() && !uploadName)}
            className="p-2.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
