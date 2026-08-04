import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import {
  AudioLines,
  Bot,
  Check,
  ChevronLeft,
  History,
  ImagePlus,
  Loader2,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Send,
  Sparkles,
  Square,
  MessageSquarePlus,
  Trash2,
  X,
} from "lucide-react";
import { askPop, createPopRealtimeSession } from "@/lib/api/pop-organize.functions";
import { cn } from "@/lib/utils";

type PopAnswer = Awaited<ReturnType<typeof askPop>>;
export type PopTaskDraft = PopAnswer["draft"];

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type StoredConversation = {
  id: string;
  title: string;
  updatedAt: string;
  messages: ChatMessage[];
  answer: PopAnswer | null;
};

type RecordedAudio = { dataUrl: string; name: string };
type CallState = "idle" | "connecting" | "listening" | "speaking";

const greeting: ChatMessage = {
  id: "greeting",
  role: "assistant",
  content:
    "Oi! Eu sou a Pop 😊 Bora deixar o dia mais organizado? Me conte o que precisa ser feito por texto, imagem, áudio ou ligação. Eu preparo o resumo e você confirma antes de criar.",
};

function createConversationId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `conversation-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function conversationTitle(messages: ChatMessage[]) {
  const firstRequest =
    messages.find((message) => message.role === "user")?.content || "Nova tarefa";
  return firstRequest
    .replace(/[\n\r]+/g, " ")
    .replace(/^[^\p{L}\p{N}]+/u, "")
    .slice(0, 58);
}

function formatConversationDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function fileToDataUrl(file: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
    reader.readAsDataURL(file);
  });
}

function formatCallDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function getCallErrorMessage(error: unknown) {
  if (
    error instanceof DOMException &&
    (error.name === "NotAllowedError" || error.name === "SecurityError")
  ) {
    return "O microfone está bloqueado. Permita o acesso ao microfone nas configurações do navegador ou aplicativo e tente novamente.";
  }
  if (error instanceof DOMException && error.name === "NotFoundError") {
    return "Nenhum microfone foi encontrado neste aparelho.";
  }
  if (error instanceof Error && /permission denied|not allowed/i.test(error.message)) {
    return "O microfone está bloqueado. Permita o acesso ao microfone nas configurações do navegador ou aplicativo e tente novamente.";
  }
  return error instanceof Error ? error.message : "Não foi possível iniciar a ligação com a Pop.";
}

export function PopAssistant({
  open,
  onOpenChange,
  onCreate,
  historyKey,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (draft: PopTaskDraft) => Promise<void>;
  historyKey: string;
}) {
  const [mounted, setMounted] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([greeting]);
  const [input, setInput] = useState("");
  const [image, setImage] = useState<{ dataUrl: string; name: string } | null>(null);
  const [audio, setAudio] = useState<{ dataUrl: string; name: string } | null>(null);
  const [answer, setAnswer] = useState<PopAnswer | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [callState, setCallState] = useState<CallState>("idle");
  const [callSeconds, setCallSeconds] = useState(0);
  const [isCallMuted, setIsCallMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState(createConversationId);
  const [conversations, setConversations] = useState<StoredConversation[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const messageEndRef = useRef<HTMLDivElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const callPeerRef = useRef<RTCPeerConnection | null>(null);
  const callChannelRef = useRef<RTCDataChannel | null>(null);
  const callStreamRef = useRef<MediaStream | null>(null);
  const callAudioRef = useRef<HTMLAudioElement | null>(null);
  const handledCallItemsRef = useRef(new Set<string>());
  const handledCallAssistantItemsRef = useRef(new Set<string>());
  const lastSpokenDraftRef = useRef("");
  const pendingCallSummaryRef = useRef<string | null>(null);
  const callResponseActiveRef = useRef(false);
  const callTaskQueueRef = useRef(Promise.resolve());
  const messagesRef = useRef(messages);
  const answerRef = useRef(answer);
  const submitRecordedAudioRef = useRef<(recording: RecordedAudio) => void>(() => undefined);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    setHistoryLoaded(false);
    try {
      const parsed = JSON.parse(
        localStorage.getItem(`pop-organize:pop-history:${historyKey}`) || "[]",
      ) as unknown;
      const valid = Array.isArray(parsed)
        ? parsed
            .filter((item): item is StoredConversation =>
              Boolean(
                item &&
                typeof item === "object" &&
                "id" in item &&
                typeof item.id === "string" &&
                "title" in item &&
                typeof item.title === "string" &&
                "updatedAt" in item &&
                typeof item.updatedAt === "string" &&
                "messages" in item &&
                Array.isArray(item.messages),
              ),
            )
            .slice(0, 20)
        : [];
      setConversations(valid);
    } catch {
      setConversations([]);
    }
    setHistoryLoaded(true);
  }, [historyKey, mounted]);

  useEffect(() => {
    if (!historyLoaded) return;
    try {
      localStorage.setItem(
        `pop-organize:pop-history:${historyKey}`,
        JSON.stringify(conversations.slice(0, 20)),
      );
    } catch {
      // A conversa continua funcionando mesmo se o aparelho estiver sem espaço local.
    }
  }, [conversations, historyKey, historyLoaded]);

  useEffect(() => {
    if (!historyLoaded || !messages.some((message) => message.role === "user")) return;
    const record: StoredConversation = {
      id: conversationId,
      title: conversationTitle(messages),
      updatedAt: new Date().toISOString(),
      messages: messages.slice(-80),
      answer,
    };
    setConversations((current) =>
      [record, ...current.filter((conversation) => conversation.id !== conversationId)].slice(
        0,
        20,
      ),
    );
  }, [answer, conversationId, historyLoaded, messages]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    answerRef.current = answer;
  }, [answer]);

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

  const stopCallResources = useCallback(() => {
    callChannelRef.current?.close();
    callChannelRef.current = null;
    callPeerRef.current?.close();
    callPeerRef.current = null;
    callStreamRef.current?.getTracks().forEach((track) => track.stop());
    callStreamRef.current = null;
    if (callAudioRef.current) {
      callAudioRef.current.pause();
      callAudioRef.current.srcObject = null;
      callAudioRef.current = null;
    }
  }, []);

  const endCall = useCallback(() => {
    stopCallResources();
    setCallState("idle");
    setCallSeconds(0);
    setIsCallMuted(false);
  }, [stopCallResources]);

  useEffect(
    () => () => {
      const recorder = recorderRef.current;
      if (recorder?.state === "recording") {
        recorder.onstop = null;
        recorder.stop();
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
      stopCallResources();
    },
    [stopCallResources],
  );

  useEffect(() => {
    if (open) return;
    endCall();
  }, [endCall, open]);

  useEffect(() => {
    if (callState === "idle" || callState === "connecting") return;
    const timer = window.setInterval(() => setCallSeconds((current) => current + 1), 1_000);
    return () => window.clearInterval(timer);
  }, [callState]);

  function resetConversation() {
    setConversationId(createConversationId());
    messagesRef.current = [greeting];
    answerRef.current = null;
    setMessages([greeting]);
    setInput("");
    setImage(null);
    setAudio(null);
    setAnswer(null);
    setIsCreating(false);
    setError(null);
    setHistoryOpen(false);
    endCall();
  }

  function resumeConversation(conversation: StoredConversation) {
    endCall();
    setConversationId(conversation.id);
    messagesRef.current = conversation.messages;
    answerRef.current = conversation.answer;
    setMessages(conversation.messages);
    setAnswer(conversation.answer);
    setInput("");
    setImage(null);
    setAudio(null);
    setError(null);
    setHistoryOpen(false);
  }

  function deleteConversation(id: string) {
    setConversations((current) => current.filter((conversation) => conversation.id !== id));
    if (id === conversationId) resetConversation();
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
          const recording = {
            dataUrl: await fileToDataUrl(blob),
            name: "Gravação de voz",
          };
          submitRecordedAudioRef.current(recording);
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

  async function sendMessage(options?: { audioOverride?: RecordedAudio }) {
    const text = options?.audioOverride ? "" : input.trim();
    const pendingImage = options?.audioOverride ? null : image;
    const pendingAudio = options?.audioOverride ?? audio;
    if (isSending || (!text && !pendingImage && !pendingAudio)) return;

    const optimisticId = `user-${Date.now()}`;
    const attachmentLabel = [
      pendingImage ? `🖼️ ${pendingImage.name}` : "",
      pendingAudio ? "🎙️ Áudio enviado" : "",
    ]
      .filter(Boolean)
      .join("\n");
    const optimisticContent = [text, attachmentLabel].filter(Boolean).join("\n");
    const history = messages
      .filter((message) => message.id !== "greeting")
      .slice(-24)
      .map(({ role, content }) => ({ role, content }));
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
      const assistantId = `assistant-${Date.now()}`;
      setMessages((current) => [
        ...current.map((message) =>
          message.id === optimisticId ? { ...message, content: userContent } : message,
        ),
        { id: assistantId, role: "assistant", content: result.reply },
      ]);
      const nextAnswer =
        result.intent !== "create_task" && answer?.status === "ready" ? answer : result;
      answerRef.current = nextAnswer;
      setAnswer(nextAnswer);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Não foi possível falar com a Pop.",
      );
    } finally {
      setIsSending(false);
    }
  }

  submitRecordedAudioRef.current = (recording) => {
    void sendMessage({ audioOverride: recording });
  };

  async function processCallTranscript(itemId: string, transcript: string) {
    const cleanTranscript = transcript.trim();
    if (!cleanTranscript || handledCallItemsRef.current.has(itemId)) return;
    handledCallItemsRef.current.add(itemId);

    const userMessage: ChatMessage = {
      id: `call-user-${itemId}`,
      role: "user",
      content: cleanTranscript,
    };
    const history = messagesRef.current
      .filter((message) => message.id !== "greeting")
      .slice(-24)
      .map(({ role, content }) => ({ role, content }));
    messagesRef.current = [...messagesRef.current, userMessage];
    setMessages(messagesRef.current);

    try {
      const result = await askPop({
        data: {
          messages: history,
          message: cleanTranscript,
          draftContext: answerRef.current ? JSON.stringify(answerRef.current.draft) : undefined,
        },
      });
      if (result.status === "ready") {
        answerRef.current = result;
        setAnswer(result);
        const summary: ChatMessage = {
          id: `call-summary-${itemId}`,
          role: "assistant",
          content: result.reply,
        };
        messagesRef.current = [...messagesRef.current, summary];
        setMessages(messagesRef.current);
        const draftSignature = JSON.stringify(result.draft);
        if (draftSignature !== lastSpokenDraftRef.current) {
          lastSpokenDraftRef.current = draftSignature;
          pendingCallSummaryRef.current = result.reply;
          flushPendingCallSummary();
        }
      } else if (answerRef.current?.status !== "ready") {
        answerRef.current = result;
        setAnswer(result);
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Não foi possível preparar a atividade falada.",
      );
    }
  }

  function appendCallAssistantTranscript(itemId: string, transcript: string) {
    const cleanTranscript = transcript.trim();
    if (!cleanTranscript || handledCallAssistantItemsRef.current.has(itemId)) return;
    handledCallAssistantItemsRef.current.add(itemId);
    const assistantMessage: ChatMessage = {
      id: `call-assistant-${itemId}`,
      role: "assistant",
      content: cleanTranscript,
    };
    messagesRef.current = [...messagesRef.current, assistantMessage];
    setMessages(messagesRef.current);
  }

  function flushPendingCallSummary() {
    const summary = pendingCallSummaryRef.current;
    const channel = callChannelRef.current;
    if (!summary || callResponseActiveRef.current || channel?.readyState !== "open") return;
    pendingCallSummaryRef.current = null;
    channel.send(
      JSON.stringify({
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [
            {
              type: "input_text",
              text: `[Resumo estruturado pelo aplicativo — esta é a versão correta da tarefa. Fale como ela ficou sem inventar ou alterar dados:]\n${summary}`,
            },
          ],
        },
      }),
    );
    channel.send(JSON.stringify({ type: "response.create" }));
  }

  function handleCallEvent(rawEvent: string) {
    try {
      const event = JSON.parse(rawEvent) as {
        type?: string;
        item_id?: string;
        transcript?: string;
      };
      if (event.type === "input_audio_buffer.speech_started") setCallState("listening");
      if (event.type === "response.created") callResponseActiveRef.current = true;
      if (event.type === "response.created" || event.type === "response.output_audio.delta") {
        setCallState("speaking");
      }
      if (event.type === "response.done") {
        callResponseActiveRef.current = false;
        setCallState("listening");
        flushPendingCallSummary();
      }
      if (
        event.type === "conversation.item.input_audio_transcription.completed" &&
        event.item_id &&
        event.transcript
      ) {
        callTaskQueueRef.current = callTaskQueueRef.current.then(() =>
          processCallTranscript(event.item_id!, event.transcript!),
        );
      }
      if (
        event.type === "response.output_audio_transcript.done" &&
        event.item_id &&
        event.transcript
      ) {
        appendCallAssistantTranscript(event.item_id, event.transcript);
      }
    } catch {
      // Ignore malformed transport events and keep the call alive.
    }
  }

  async function startCall() {
    if (callState !== "idle") return;
    setError(null);
    setCallSeconds(0);
    setIsCallMuted(false);
    setCallState("connecting");
    handledCallItemsRef.current.clear();
    handledCallAssistantItemsRef.current.clear();
    lastSpokenDraftRef.current = "";
    pendingCallSummaryRef.current = null;
    callResponseActiveRef.current = false;

    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof RTCPeerConnection === "undefined") {
        throw new Error("A ligação não é compatível com este aparelho ou navegador.");
      }

      const microphone = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      callStreamRef.current = microphone;
      const session = await createPopRealtimeSession();

      const peer = new RTCPeerConnection();
      callPeerRef.current = peer;
      microphone.getAudioTracks().forEach((track) => peer.addTrack(track, microphone));

      const remoteAudio = new Audio();
      remoteAudio.autoplay = true;
      remoteAudio.setAttribute("playsinline", "true");
      callAudioRef.current = remoteAudio;
      peer.ontrack = (event) => {
        remoteAudio.srcObject = event.streams[0];
        void remoteAudio.play().catch(() => undefined);
      };

      const channel = peer.createDataChannel("oai-events");
      callChannelRef.current = channel;
      channel.addEventListener("open", () => {
        setCallState("listening");
        channel.send(
          JSON.stringify({
            type: "response.create",
            response: {
              input: [],
              output_modalities: ["audio"],
              instructions: `Fale com sotaque brasileiro neutro. Diga exatamente esta saudação, sem acrescentar outra frase: ${JSON.stringify(session.greeting)}`,
            },
          }),
        );
      });
      channel.addEventListener("message", (event) => handleCallEvent(String(event.data)));
      channel.addEventListener("close", () => {
        if (callPeerRef.current === peer) endCall();
      });
      peer.addEventListener("connectionstatechange", () => {
        if (!["failed", "disconnected", "closed"].includes(peer.connectionState)) return;
        if (callPeerRef.current !== peer) return;
        const failed = peer.connectionState === "failed";
        endCall();
        if (failed) setError("A ligação com a Pop foi interrompida.");
      });

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      const response = await fetch("https://api.openai.com/v1/realtime/calls", {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${session.value}`,
          "Content-Type": "application/sdp",
        },
      });
      if (!response.ok) throw new Error("A Pop não conseguiu atender a ligação agora.");
      await peer.setRemoteDescription({ type: "answer", sdp: await response.text() });
    } catch (callError) {
      stopCallResources();
      setCallState("idle");
      setError(getCallErrorMessage(callError));
    }
  }

  function toggleCallMute() {
    const nextMuted = !isCallMuted;
    callStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });
    setIsCallMuted(nextMuted);
  }

  async function confirmTask() {
    if (answer?.status !== "ready" || isCreating) return;
    setError(null);
    setIsCreating(true);
    try {
      await onCreate(answer.draft);
      const messageId = `created-${Date.now()}`;
      const finalSummary = answer.reply.split("\n\nEla ainda não foi criada.")[0];
      const content = `Pronto! A atividade foi criada com sucesso.\n\n${finalSummary}`;
      const createdMessage: ChatMessage = { id: messageId, role: "assistant", content };
      messagesRef.current = [...messagesRef.current, createdMessage];
      setMessages(messagesRef.current);
      answerRef.current = null;
      setAnswer(null);
      if (callState !== "idle" && callChannelRef.current?.readyState === "open") {
        callChannelRef.current.send(
          JSON.stringify({
            type: "conversation.item.create",
            item: {
              type: "message",
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: `[Evento do aplicativo: a atividade foi criada com sucesso após a confirmação na tela. Informe claramente que ela foi criada e fale o resumo final abaixo sem alterar nenhum dado.]\n${finalSummary}`,
                },
              ],
            },
          }),
        );
        callChannelRef.current.send(JSON.stringify({ type: "response.create" }));
      }
    } catch (createError) {
      setError(
        createError instanceof Error ? createError.message : "Não foi possível criar a atividade.",
      );
    } finally {
      setIsCreating(false);
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
              onClick={() => void startCall()}
              disabled={callState !== "idle"}
              className="glass-icon-button flex h-9 w-9 items-center justify-center rounded-xl text-emerald-600 disabled:opacity-50"
              aria-label="Ligar para a Pop"
              title="Ligar para a Pop"
            >
              <Phone className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setHistoryOpen((current) => !current)}
              className={cn(
                "glass-icon-button flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground",
                historyOpen && "text-primary",
              )}
              aria-label="Histórico de conversas"
              title="Histórico"
            >
              <History className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={resetConversation}
              className="glass-icon-button flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground"
              aria-label="Nova conversa"
              title="Nova conversa"
            >
              <MessageSquarePlus className="h-4 w-4" />
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

        {historyOpen && (
          <section className="absolute inset-x-0 bottom-0 top-[77px] z-10 flex min-h-0 flex-col bg-background">
            <div className="flex items-center gap-3 border-b border-border/60 px-4 py-3 sm:px-5">
              <button
                type="button"
                onClick={() => setHistoryOpen(false)}
                className="glass-icon-button flex h-9 w-9 items-center justify-center rounded-xl"
                aria-label="Voltar para a conversa"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div>
                <h3 className="text-sm font-bold">Histórico da Pop</h3>
                <p className="text-xs text-muted-foreground">
                  Retome uma tarefa sem perder o contexto.
                </p>
              </div>
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-muted/20 p-4 sm:p-5">
              {conversations.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-card px-5 py-10 text-center">
                  <History className="mx-auto h-6 w-6 text-muted-foreground" />
                  <p className="mt-3 text-sm font-semibold">Nenhuma conversa salva</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    As conversas aparecem aqui depois do primeiro pedido.
                  </p>
                </div>
              ) : (
                conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className="flex items-center gap-2 rounded-2xl border border-border/70 bg-card p-2 shadow-sm"
                  >
                    <button
                      type="button"
                      onClick={() => resumeConversation(conversation)}
                      className="min-w-0 flex-1 rounded-xl px-2 py-2 text-left transition hover:bg-muted/60"
                    >
                      <span className="block truncate text-sm font-semibold">
                        {conversation.title || "Nova tarefa"}
                      </span>
                      <span className="mt-1 block text-[11px] text-muted-foreground">
                        {formatConversationDate(conversation.updatedAt)}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteConversation(conversation.id)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`Excluir conversa ${conversation.title}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

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

          {answer?.status === "ready" && (
            <div className="ml-10 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.07] p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-emerald-700 dark:text-emerald-300">
                <Check className="h-4 w-4" />
                Atividade pronta
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Confira o resumo acima e confirme para salvar.
              </p>
              <button
                type="button"
                onClick={() => void confirmTask()}
                disabled={isCreating || isSending}
                className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
              >
                {isCreating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Confirmar e criar
              </button>
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
              disabled={isSending || isRecording || isCreating}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-background hover:text-primary disabled:opacity-40"
              aria-label="Enviar imagem"
            >
              <ImagePlus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isSending || isCreating}
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
              disabled={isSending || isRecording || isCreating}
              rows={1}
              maxLength={4_000}
              placeholder={isRecording ? "Gravando..." : "Peça uma atividade para a Pop..."}
              className="max-h-28 min-h-9 min-w-0 flex-1 resize-none bg-transparent px-1 py-2 text-sm outline-none placeholder:text-muted-foreground/70"
            />
            <button
              type="button"
              onClick={() => void sendMessage()}
              disabled={
                isSending || isRecording || isCreating || (!input.trim() && !image && !audio)
              }
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
            Confira o resumo e confirme antes de criar.
          </p>
        </footer>

        {callState !== "idle" && (
          <section className="absolute inset-0 z-20 flex min-h-0 flex-col bg-background bg-[radial-gradient(circle_at_top,color-mix(in_oklab,var(--primary)_22%,var(--background)),var(--background)_52%)] px-6 pb-[max(28px,env(safe-area-inset-bottom))] pt-[max(28px,env(safe-area-inset-top))]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Ligação com IA
                </p>
                <h3 className="mt-1 font-display text-xl font-bold">Pop</h3>
              </div>
              <span className="rounded-full border border-border/70 bg-background/70 px-3 py-1 text-xs font-semibold tabular-nums backdrop-blur">
                {callState === "connecting" ? "Conectando" : formatCallDuration(callSeconds)}
              </span>
            </div>

            <div className="flex min-h-0 flex-1 flex-col items-center justify-center text-center">
              <div className="relative mb-8 flex h-44 w-44 items-center justify-center">
                <span
                  className={cn(
                    "absolute inset-0 rounded-full bg-primary/15 blur-md transition-transform duration-700",
                    callState === "speaking" ? "scale-110 animate-pulse" : "scale-95",
                  )}
                />
                <span
                  className={cn(
                    "absolute inset-5 rounded-full border border-primary/25 bg-primary/10",
                    callState !== "connecting" && "animate-pulse",
                  )}
                />
                <span className="relative flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-primary to-violet-500 text-primary-foreground shadow-2xl shadow-primary/30">
                  {callState === "connecting" ? (
                    <Loader2 className="h-10 w-10 animate-spin" />
                  ) : (
                    <AudioLines
                      className={cn("h-11 w-11", callState === "speaking" && "animate-pulse")}
                    />
                  )}
                </span>
              </div>

              <p className="text-lg font-bold">
                {callState === "connecting"
                  ? "Chamando a Pop..."
                  : isCallMuted
                    ? "Microfone desligado"
                    : callState === "speaking"
                      ? "Pop está falando"
                      : "Pode falar"}
              </p>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
                Converse naturalmente. A Pop entende o pedido, prepara a atividade e mostra a
                confirmação nesta tela.
              </p>

              {answer?.status === "ready" && (
                <div className="mt-6 w-full max-w-sm rounded-2xl border border-emerald-500/25 bg-card p-4 text-left shadow-lg">
                  <div className="flex items-center gap-2 text-sm font-bold text-emerald-700 dark:text-emerald-300">
                    <Check className="h-4 w-4" />
                    Atividade pronta
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm font-semibold text-foreground">
                    {answer.draft.title}
                  </p>
                  <button
                    type="button"
                    onClick={() => void confirmTask()}
                    disabled={isCreating}
                    className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {isCreating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    Confirmar e criar
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-5">
              <button
                type="button"
                onClick={toggleCallMute}
                disabled={callState === "connecting"}
                className={cn(
                  "flex h-14 w-14 items-center justify-center rounded-full border shadow-lg transition disabled:opacity-40",
                  isCallMuted
                    ? "border-amber-500/30 bg-amber-500 text-white"
                    : "border-border/70 bg-background/90 text-foreground",
                )}
                aria-label={isCallMuted ? "Ligar microfone" : "Desligar microfone"}
              >
                {isCallMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>
              <button
                type="button"
                onClick={endCall}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500 text-white shadow-xl shadow-red-500/25 transition hover:bg-red-600"
                aria-label="Encerrar ligação"
              >
                <PhoneOff className="h-6 w-6" />
              </button>
            </div>
            <p className="mt-5 text-center text-[10px] text-muted-foreground">
              A voz da Pop é gerada por inteligência artificial.
            </p>
          </section>
        )}
      </aside>
    </>,
    document.body,
  );
}
