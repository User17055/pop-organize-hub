import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { Bot, ImagePlus, Loader2, Mic, Send, Sparkles, Square, Trash2, X } from "lucide-react";
import { askPop } from "@/lib/api/pop-organize.functions";
import { cn } from "@/lib/utils";

type PopAnswer = Awaited<ReturnType<typeof askPop>>;
export type PopTaskDraft = PopAnswer["draft"];

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const greeting: ChatMessage = {
  id: "greeting",
  role: "assistant",
  content:
    "Oi! Eu sou a Pop. Me conte o que precisa ser feito por texto, imagem ou áudio. Quando estiver tudo certo, eu crio a atividade para você.",
};

function fileToDataUrl(file: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
    reader.readAsDataURL(file);
  });
}

export function PopAssistant({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (draft: PopTaskDraft) => Promise<void>;
}) {
  const [mounted, setMounted] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([greeting]);
  const [input, setInput] = useState("");
  const [image, setImage] = useState<{ dataUrl: string; name: string } | null>(null);
  const [audio, setAudio] = useState<{ dataUrl: string; name: string } | null>(null);
  const [answer, setAnswer] = useState<PopAnswer | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const messageEndRef = useRef<HTMLDivElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending, open]);

  useEffect(() => {
    if (!open || !mounted) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mounted, open]);

  useEffect(
    () => () => {
      recorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  function resetConversation() {
    setMessages([greeting]);
    setInput("");
    setImage(null);
    setAudio(null);
    setAnswer(null);
    setError(null);
  }

  async function handleImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) {
      setError("Envie uma imagem JPG, PNG, WebP ou GIF.");
      return;
    }
    if (file.size > 6_000_000) {
      setError("A imagem deve ter no máximo 6 MB.");
      return;
    }
    setError(null);
    setImage({ dataUrl: await fileToDataUrl(file), name: file.name });
  }

  async function startRecording() {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("A gravação de voz não é compatível com este navegador.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const preferredType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
      const recorder = new MediaRecorder(stream, preferredType ? { mimeType: preferredType } : {});
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        if (blob.size > 10_000_000) {
          setError("O áudio deve ter no máximo 10 MB.");
        } else if (blob.size > 0) {
          setAudio({ dataUrl: await fileToDataUrl(blob), name: "Gravação de voz" });
        }
        setIsRecording(false);
      };
      recorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch {
      setError("Permita o acesso ao microfone para falar com a Pop.");
    }
  }

  function stopRecording() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }

  async function sendMessage() {
    const text = input.trim();
    if (isSending || (!text && !image && !audio)) return;

    const optimisticId = `user-${Date.now()}`;
    const attachmentLabel = [image ? `🖼️ ${image.name}` : "", audio ? "🎙️ Áudio enviado" : ""]
      .filter(Boolean)
      .join("\n");
    const optimisticContent = [text, attachmentLabel].filter(Boolean).join("\n");
    const history = messages
      .filter((message) => message.id !== "greeting")
      .slice(-10)
      .map(({ role, content }) => ({ role, content }));
    const pendingImage = image;
    const pendingAudio = audio;

    setMessages((current) => [
      ...current,
      { id: optimisticId, role: "user", content: optimisticContent },
    ]);
    setInput("");
    setImage(null);
    setAudio(null);
    setError(null);
    setIsSending(true);

    try {
      const result = await askPop({
        data: {
          messages: history,
          message: text,
          draftContext: answer ? JSON.stringify(answer.draft) : undefined,
          imageDataUrl: pendingImage?.dataUrl,
          audioDataUrl: pendingAudio?.dataUrl,
        },
      });
      const userContent = [
        text,
        result.transcription,
        pendingImage ? `🖼️ ${pendingImage.name}` : "",
      ]
        .filter(Boolean)
        .join("\n");
      setMessages((current) => [
        ...current.map((message) =>
          message.id === optimisticId ? { ...message, content: userContent } : message,
        ),
        { id: `assistant-${Date.now()}`, role: "assistant", content: result.reply },
      ]);
      setAnswer(result);
      if (result.status === "ready") {
        await onCreate(result.draft);
        setMessages((current) => [
          ...current,
          {
            id: `created-${Date.now()}`,
            role: "assistant",
            content: `Pronto! A atividade "${result.draft.title}" foi criada com sucesso.`,
          },
        ]);
        setAnswer(null);
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Não foi possível falar com a Pop.",
      );
    } finally {
      setIsSending(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  }

  if (!mounted) return null;

  return createPortal(
    <>
      <div
        className={cn(
          "fixed inset-0 z-[210] bg-slate-950/30 backdrop-blur-[3px] transition-opacity duration-300",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => onOpenChange(false)}
        aria-hidden={!open}
      />
      <aside
        inert={!open}
        className={cn(
          "fixed inset-y-0 right-0 z-[220] grid h-dvh w-full grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden border-l bg-background shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] sm:inset-y-3 sm:right-3 sm:h-[calc(100dvh-1.5rem)] sm:w-[440px] sm:rounded-[26px] sm:border md:w-[480px]",
          open ? "translate-x-0" : "translate-x-full",
        )}
        aria-label="Conversa com a Pop"
      >
        <header className="flex items-center justify-between gap-3 border-b border-border/60 bg-gradient-to-r from-primary/10 via-background to-violet-500/10 px-4 py-4 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <Sparkles className="h-5 w-5" />
              <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background bg-emerald-500" />
            </span>
            <div className="min-w-0">
              <h2 className="font-display text-lg font-bold">Pop</h2>
              <p className="truncate text-xs text-muted-foreground">Sua assistente de atividades</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={resetConversation}
              className="glass-icon-button flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground"
              aria-label="Nova conversa"
              title="Nova conversa"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="glass-icon-button flex h-9 w-9 items-center justify-center rounded-xl"
              aria-label="Fechar Pop"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="min-h-0 space-y-4 overflow-y-auto bg-muted/20 px-4 py-5 sm:px-5">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn("flex gap-2.5", message.role === "user" && "justify-end")}
            >
              {message.role === "assistant" && (
                <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                  <Bot className="h-4 w-4" />
                </span>
              )}
              <div
                className={cn(
                  "max-w-[82%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm",
                  message.role === "user"
                    ? "rounded-br-md bg-primary text-primary-foreground"
                    : "rounded-bl-md border border-border/60 bg-card text-foreground",
                )}
              >
                {message.content}
              </div>
            </div>
          ))}
          {isSending && (
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/12 text-primary">
                <Bot className="h-4 w-4" />
              </span>
              <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border bg-card px-4 py-3 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                Pop está organizando...
              </div>
            </div>
          )}

          <div ref={messageEndRef} />
        </div>

        <footer className="border-t border-border/60 bg-background px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 sm:px-4">
          {(image || audio) && (
            <div className="mb-2 flex flex-wrap gap-2">
              {image && (
                <span className="inline-flex max-w-full items-center gap-2 rounded-xl border bg-muted/45 px-2.5 py-1.5 text-xs">
                  <ImagePlus className="h-3.5 w-3.5 text-primary" />
                  <span className="max-w-48 truncate">{image.name}</span>
                  <button type="button" onClick={() => setImage(null)} aria-label="Remover imagem">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              )}
              {audio && (
                <span className="inline-flex items-center gap-2 rounded-xl border bg-muted/45 px-2.5 py-1.5 text-xs">
                  <Mic className="h-3.5 w-3.5 text-primary" />
                  {audio.name}
                  <button type="button" onClick={() => setAudio(null)} aria-label="Remover áudio">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              )}
            </div>
          )}
          {error && (
            <div className="mb-2 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}
          <div className="flex items-end gap-2 rounded-2xl border border-border/70 bg-muted/35 p-2 focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10">
            <input
              ref={imageInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleImage}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={isSending || isRecording}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-background hover:text-primary disabled:opacity-40"
              aria-label="Enviar imagem"
            >
              <ImagePlus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isSending}
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition disabled:opacity-40",
                isRecording
                  ? "animate-pulse bg-red-500 text-white"
                  : "text-muted-foreground hover:bg-background hover:text-primary",
              )}
              aria-label={isRecording ? "Parar gravação" : "Gravar áudio"}
            >
              {isRecording ? (
                <Square className="h-3.5 w-3.5 fill-current" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </button>
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isSending || isRecording}
              rows={1}
              maxLength={4_000}
              placeholder={isRecording ? "Gravando..." : "Peça uma atividade para a Pop..."}
              className="max-h-28 min-h-9 min-w-0 flex-1 resize-none bg-transparent px-1 py-2 text-sm outline-none placeholder:text-muted-foreground/70"
            />
            <button
              type="button"
              onClick={() => void sendMessage()}
              disabled={isSending || isRecording || (!input.trim() && !image && !audio)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition hover:bg-primary/90 disabled:opacity-40"
              aria-label="Enviar para a Pop"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
          <p className="mt-2 text-center text-[10px] text-muted-foreground">
            A Pop pode cometer erros. Confira o resumo antes de criar.
          </p>
        </footer>
      </aside>
    </>,
    document.body,
  );
}
