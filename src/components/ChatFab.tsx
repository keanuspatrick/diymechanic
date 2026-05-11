import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Loader2, Mic, Camera, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVehicle } from "@/store/vehicle";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { funnel } from "@/lib/analytics";
import { requestMic, stopStream, blobToBase64, captureNativePhoto, isNative } from "@/lib/permissions";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vehicle-chat`;

export default function ChatFab() {
  const vehicle = useVehicle((s) => s.vehicle);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [analyzing, setAnalyzing] = useState<null | "sound" | "photo">(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recRef = useRef<{ rec: MediaRecorder; chunks: Blob[]; stream: MediaStream } | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const openChat = () => { setOpen(true); funnel.chatOpened(); };

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const userMsg: Msg = { role: "user", content: text };
    setMessages((p) => [...p, userMsg]);
    setLoading(true);
    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: [...messages, userMsg], vehicle }),
      });
      if (!resp.ok || !resp.body) {
        if (resp.status === 429) toast.error("Rate limit reached.");
        else if (resp.status === 402) toast.error("AI credits exhausted.");
        else toast.error("Chat failed.");
        setLoading(false);
        return;
      }
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "", assistant = "", done = false;
      const upsert = (chunk: string) => {
        assistant += chunk;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistant } : m));
          }
          return [...prev, { role: "assistant", content: assistant }];
        });
      };
      while (!done) {
        const { done: d, value } = await reader.read();
        if (d) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") { done = true; break; }
          try {
            const parsed = JSON.parse(json);
            const c = parsed.choices?.[0]?.delta?.content;
            if (c) upsert(c);
          } catch { buffer = line + "\n" + buffer; break; }
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("Connection issue.");
    } finally {
      setLoading(false);
    }
  };

  const ensureVehicle = () => {
    if (!vehicle) {
      toast.error("Pick your vehicle first so I can be specific.");
      return false;
    }
    return true;
  };

  // Sound diagnosis (microphone) — standalone FAB
  const startRecording = async () => {
    if (!ensureVehicle()) return;
    if (analyzing || recording) return;
    const stream = await requestMic();
    if (!stream) {
      toast.error("Microphone access denied. Enable it in Settings.");
      return;
    }
    try {
      const rec = new MediaRecorder(stream, { mimeType: "audio/webm" });
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      rec.start();
      recRef.current = { rec, chunks, stream };
      setRecording(true);
      toast("Listening… tap the ear again to stop", { duration: 4000 });
    } catch (e) {
      console.error(e);
      stopStream(stream);
      toast.error("Could not start recording on this device.");
    }
  };

  const stopRecording = async () => {
    const ref = recRef.current;
    if (!ref) return;
    setRecording(false);
    setAnalyzing("sound");
    setOpen(true);
    funnel.chatOpened();
    await new Promise<void>((resolve) => {
      ref.rec.onstop = () => resolve();
      ref.rec.stop();
    });
    stopStream(ref.stream);
    const blob = new Blob(ref.chunks, { type: "audio/webm" });
    recRef.current = null;
    try {
      const base64 = await blobToBase64(blob);
      const dataUrl = `data:audio/webm;base64,${base64}`;
      setMessages((p) => [...p, { role: "user", content: "🎙️ *Recorded engine sound for diagnosis*" }]);
      const { data, error } = await supabase.functions.invoke("vehicle-analyze", {
        body: { mode: "sound", dataUrl, vehicle },
      });
      if (error || data?.error) {
        toast.error(data?.error || error?.message || "Sound analysis failed");
        funnel.soundAnalyzed(false);
      } else {
        setMessages((p) => [...p, { role: "assistant", content: data.text }]);
        funnel.soundAnalyzed(true);
      }
    } catch (e) {
      console.error(e);
      toast.error("Sound analysis failed");
      funnel.soundAnalyzed(false);
    } finally {
      setAnalyzing(null);
    }
  };

  // Camera / photo (standalone FAB) — must run synchronously on tap for iOS
  const triggerCamera = () => {
    if (!ensureVehicle()) return;
    if (analyzing || recording) return;
    if (isNative()) {
      // Native iOS/Android — use Capacitor Camera plugin (prompts for permission)
      void runNativeCapture();
      return;
    }
    // Web — open the file picker with capture hint, synchronously
    fileRef.current?.click();
  };

  const runNativeCapture = async () => {
    setAnalyzing("photo");
    setOpen(true);
    funnel.chatOpened();
    try {
      const dataUrl = await captureNativePhoto();
      if (!dataUrl) {
        toast.error("Camera access denied. Enable it in Settings.");
        funnel.photoAnalyzed(false);
        return;
      }
      setMessages((p) => [...p, { role: "user", content: "📷 *Photo of vehicle part*" }]);
      const { data, error } = await supabase.functions.invoke("vehicle-analyze", {
        body: { mode: "photo", dataUrl, vehicle },
      });
      if (error || data?.error) {
        toast.error(data?.error || error?.message || "Photo analysis failed");
        funnel.photoAnalyzed(false);
      } else {
        setMessages((p) => [...p, { role: "assistant", content: data.text }]);
        funnel.photoAnalyzed(true);
      }
    } catch (e) {
      console.error(e);
      toast.error("Photo analysis failed");
      funnel.photoAnalyzed(false);
    } finally {
      setAnalyzing(null);
    }
  };

  const onPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setAnalyzing("photo");
    setOpen(true);
    funnel.chatOpened();
    try {
      const base64 = await blobToBase64(file);
      const dataUrl = `data:${file.type || "image/jpeg"};base64,${base64}`;
      setMessages((p) => [...p, { role: "user", content: "📷 *Photo of vehicle part*" }]);
      const { data, error } = await supabase.functions.invoke("vehicle-analyze", {
        body: { mode: "photo", dataUrl, vehicle },
      });
      if (error || data?.error) {
        toast.error(data?.error || error?.message || "Photo analysis failed");
        funnel.photoAnalyzed(false);
      } else {
        setMessages((p) => [...p, { role: "assistant", content: data.text }]);
        funnel.photoAnalyzed(true);
      }
    } catch (err) {
      console.error(err);
      toast.error("Photo analysis failed");
      funnel.photoAnalyzed(false);
    } finally {
      setAnalyzing(null);
    }
  };

  const stackRight = "calc(1.25rem + env(safe-area-inset-right))";
  const baseBottom = "calc(1.25rem + env(safe-area-inset-bottom))";

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onPhoto}
      />

      {!open && (
        <div
          className="fixed z-50 flex flex-col items-end gap-3"
          style={{ bottom: baseBottom, right: stackRight }}
        >
          {/* Ear / sound diagnosis */}
          <button
            onClick={recording ? stopRecording : startRecording}
            disabled={!!analyzing}
            aria-label={recording ? "Stop recording engine sound" : "Diagnose engine sound"}
            title="Diagnose by sound"
            className={`flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-soft transition-transform hover:scale-105 active:scale-95 disabled:opacity-60 ${recording ? "ring-2 ring-destructive animate-pulse" : ""}`}
          >
            {recording ? <Square className="h-5 w-5 text-destructive" /> : <Mic className="h-5 w-5" />}
          </button>

          {/* Camera / part identification */}
          <button
            onClick={triggerCamera}
            disabled={!!analyzing || recording}
            aria-label="Identify a part by photo"
            title="Identify a part"
            className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-soft transition-transform hover:scale-105 active:scale-95 disabled:opacity-60"
          >
            <Camera className="h-5 w-5" />
          </button>

          {/* Chat */}
          <button
            onClick={openChat}
            aria-label="Open AI mechanic chat"
            className="flex h-14 w-14 items-center justify-center rounded-full gradient-primary text-primary-foreground shadow-bold transition-transform hover:scale-105 active:scale-95"
          >
            <MessageCircle className="h-6 w-6" />
          </button>
        </div>
      )}

      {open && (
        <div className="fixed inset-x-0 bottom-0 z-50 pb-safe sm:inset-auto sm:bottom-5 sm:right-5 sm:w-[380px] sm:pb-0">
          <div className="flex h-[78dvh] max-h-[640px] flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-deep sm:rounded-2xl">
            <div className="flex items-center justify-between gradient-dark px-4 py-3 text-background">
              <div>
                <div className="font-display text-base uppercase tracking-wide text-primary">AI Mechanic</div>
                <div className="text-xs text-background/70">
                  {vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : "Pick your vehicle for specific help"}
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-background hover:bg-background/10 hover:text-background" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.length === 0 && (
                <div className="space-y-3">
                  <div className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">
                    Ask anything about your vehicle. Close this chat to use the ear or camera buttons for sound and photo diagnosis.
                  </div>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${m.role === "user" ? "gradient-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                    {m.role === "assistant" ? (
                      <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-headings:my-1.5">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                    ) : m.content}
                  </div>
                </div>
              ))}
              {(loading || analyzing) && (
                <div className="flex justify-start">
                  <div className="rounded-2xl bg-muted px-3.5 py-2.5">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {analyzing === "sound" ? "Listening to your engine…" : analyzing === "photo" ? "Identifying the part…" : null}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 border-t border-border bg-background p-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Ask the mechanic…"
                disabled={!!analyzing}
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
              />
              <Button onClick={send} disabled={!input.trim() || loading || !!analyzing} className="h-11 gradient-primary px-4 text-primary-foreground">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
