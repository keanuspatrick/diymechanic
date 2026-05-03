import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Loader2, Ear, Camera, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVehicle } from "@/store/vehicle";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vehicle-chat`;
const ANALYZE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vehicle-analyze`;
const AUTH_HEADER = `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`;

export default function ChatFab() {
  const vehicle = useVehicle((s) => s.vehicle);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [analyzing, setAnalyzing] = useState<null | "sound" | "photo">(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, analyzing]);

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
        headers: { "Content-Type": "application/json", Authorization: AUTH_HEADER },
        body: JSON.stringify({ messages: [...messages, userMsg], vehicle }),
      });

      if (!resp.ok || !resp.body) {
        if (resp.status === 429) toast.error("Rate limit reached. Try again shortly.");
        else if (resp.status === 402) toast.error("AI credits exhausted. Add funds in Lovable.");
        else toast.error("Chat failed. Try again.");
        setLoading(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistant = "";
      let done = false;

      const upsert = (chunk: string) => {
        assistant += chunk;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) =>
              i === prev.length - 1 ? { ...m, content: assistant } : m,
            );
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
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("Connection issue. Check your network.");
    } finally {
      setLoading(false);
    }
  };

  const blobToDataUrl = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });

  const analyze = async (
    kind: "sound" | "photo",
    dataUrl: string,
    mimeType: string,
    userLabel: string,
  ) => {
    setOpen(true);
    setAnalyzing(kind);
    setMessages((p) => [...p, { role: "user", content: userLabel }]);
    try {
      const resp = await fetch(ANALYZE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: AUTH_HEADER },
        body: JSON.stringify({ kind, dataUrl, mimeType, vehicle }),
      });
      if (!resp.ok) {
        if (resp.status === 429) toast.error("Rate limit reached. Try again shortly.");
        else if (resp.status === 402) toast.error("AI credits exhausted. Add funds in Lovable.");
        else toast.error(kind === "sound" ? "Sound analysis failed." : "Photo analysis failed.");
        return;
      }
      const { text, error } = await resp.json();
      if (error) {
        toast.error(error);
        return;
      }
      setMessages((p) => [...p, { role: "assistant", content: text }]);
    } catch (e) {
      console.error(e);
      toast.error("Connection issue. Check your network.");
    } finally {
      setAnalyzing(null);
    }
  };

  const startRecording = async () => {
    if (recording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "";
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        if (blob.size < 1000) {
          toast.error("Recording too short. Hold the button while the sound plays.");
          return;
        }
        const dataUrl = await blobToDataUrl(blob);
        await analyze("sound", dataUrl, blob.type, "🎧 Recorded a sound from my car — what is it?");
      };
      recorderRef.current = rec;
      rec.start();
      setRecording(true);
    } catch (e) {
      console.error(e);
      toast.error("Microphone access denied.");
    }
  };

  const stopRecording = () => {
    if (!recorderRef.current) return;
    recorderRef.current.stop();
    recorderRef.current = null;
    setRecording(false);
  };

  const onPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Photo too large. Try a smaller image.");
      return;
    }
    const dataUrl = await blobToDataUrl(file);
    await analyze("photo", dataUrl, file.type, "📷 Took a photo of a part — what is it?");
  };

  const fabBottom = "max(1.25rem, calc(env(safe-area-inset-bottom) + 0.75rem))";
  const fabRight = "max(1.25rem, calc(env(safe-area-inset-right) + 0.75rem))";

  return (
    <>
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onPhoto}
      />

      {!open && (
        <div
          style={{ bottom: fabBottom, right: fabRight }}
          className="fixed z-50 flex flex-col items-end gap-2.5"
        >
          {recording && (
            <div className="rounded-full bg-destructive px-3 py-1 text-xs font-bold text-destructive-foreground shadow-bold">
              Recording… release to analyze
            </div>
          )}
          <button
            onClick={() => cameraInputRef.current?.click()}
            aria-label="Identify a car part with the camera"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-card text-foreground shadow-bold ring-1 ring-border transition-transform hover:scale-105 active:scale-95"
          >
            <Camera className="h-5 w-5 text-primary" />
          </button>
          <button
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onMouseLeave={() => recording && stopRecording()}
            onTouchStart={(e) => { e.preventDefault(); startRecording(); }}
            onTouchEnd={(e) => { e.preventDefault(); stopRecording(); }}
            aria-label="Hold to record a sound your car is making"
            className={`flex h-12 w-12 items-center justify-center rounded-full shadow-bold ring-1 ring-border transition-all active:scale-95 ${
              recording ? "scale-110 bg-destructive text-destructive-foreground animate-pulse" : "bg-card text-foreground"
            }`}
          >
            {recording ? <Square className="h-4 w-4 fill-current" /> : <Ear className="h-5 w-5 text-primary" />}
          </button>
          <button
            onClick={() => setOpen(true)}
            aria-label="Open AI mechanic chat"
            className="flex h-14 w-14 items-center justify-center rounded-full gradient-primary text-primary-foreground shadow-bold transition-transform hover:scale-105 active:scale-95"
          >
            <MessageCircle className="h-6 w-6" />
          </button>
        </div>
      )}

      {open && (
        <div className="fixed inset-x-0 bottom-0 z-50 sm:inset-auto sm:bottom-5 sm:right-5 sm:w-[380px]">
          <div className="flex h-[78vh] max-h-[600px] flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-deep sm:rounded-2xl">
            <div className="flex items-center justify-between gradient-dark px-4 py-3 text-background">
              <div>
                <div className="font-display text-base uppercase tracking-wide text-primary">
                  AI Mechanic
                </div>
                <div className="text-xs text-background/70">
                  {vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : "Ask anything vehicle-related"}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-background hover:bg-background/10 hover:text-background"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.length === 0 && (
                <div className="space-y-2">
                  <div className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">
                    Hey! Ask me anything about your vehicle — diagnosis, install advice, torque specs, you name it.
                  </div>
                  <div className="rounded-xl border border-border bg-background p-3 text-xs text-muted-foreground">
                    <div className="mb-1 flex items-center gap-1.5 font-bold uppercase tracking-wide text-foreground">
                      <Ear className="h-3.5 w-3.5 text-primary" /> Press &amp; hold the ear
                    </div>
                    Record a strange noise and I'll diagnose it.
                    <div className="mt-2 mb-1 flex items-center gap-1.5 font-bold uppercase tracking-wide text-foreground">
                      <Camera className="h-3.5 w-3.5 text-primary" /> Tap the camera
                    </div>
                    Snap a photo of any part and I'll name it.
                  </div>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${
                      m.role === "user"
                        ? "gradient-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    {m.role === "assistant" ? (
                      <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-headings:my-1.5">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                    ) : (
                      m.content
                    )}
                  </div>
                </div>
              ))}
              {(loading || analyzing) && messages[messages.length - 1]?.role === "user" && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-2xl bg-muted px-3.5 py-2.5 text-xs text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {analyzing === "sound" && "Listening to your recording…"}
                    {analyzing === "photo" && "Identifying the part…"}
                    {!analyzing && loading && "Thinking…"}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-border bg-background pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <div className="flex gap-2 px-3 pt-3">
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  aria-label="Identify a part"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-border bg-card text-primary transition-colors hover:bg-accent"
                >
                  <Camera className="h-5 w-5" />
                </button>
                <button
                  onMouseDown={startRecording}
                  onMouseUp={stopRecording}
                  onMouseLeave={() => recording && stopRecording()}
                  onTouchStart={(e) => { e.preventDefault(); startRecording(); }}
                  onTouchEnd={(e) => { e.preventDefault(); stopRecording(); }}
                  aria-label="Hold to record a sound"
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-border transition-colors ${
                    recording ? "bg-destructive text-destructive-foreground animate-pulse" : "bg-card text-primary hover:bg-accent"
                  }`}
                >
                  {recording ? <Square className="h-4 w-4 fill-current" /> : <Ear className="h-5 w-5" />}
                </button>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  placeholder="Ask the mechanic…"
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <Button
                  onClick={send}
                  disabled={!input.trim() || loading}
                  className="h-11 gradient-primary px-4 text-primary-foreground"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
