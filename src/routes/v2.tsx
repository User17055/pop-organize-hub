import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import orbitaScript from "../../orbita-board/build/app.js?raw";
import orbitaMarkup from "../../orbita-board/src/index.html?raw";
import orbitaStyles from "../../orbita-board/src/styles.css?raw";
import {
  createTask,
  deleteTask,
  logout,
  switchWorkspace,
  updateTaskDetails,
  updateTaskStatus,
} from "@/lib/api/pop-organize.functions";
import { useWorkspaceData, workspaceQueryKey } from "@/lib/api/use-workspace";
import type { Priority, Task, TaskStatus, TargetType } from "@/lib/domain";

export const Route = createFileRoute("/v2")({
  head: () => ({
    meta: [
      { title: "Pop Organize V2" },
      { name: "description", content: "Painel Pop Organize com a interface original do Orbita." },
    ],
  }),
  component: PopOrganizeV2,
});

type OrbitaStatus = "todo" | "doing" | "review" | "done";
type OrbitaPriority = "alta" | "media" | "baixa";

type OrbitaTaskPayload = {
  title: string;
  desc: string;
  tag: string;
  status: OrbitaStatus;
  priority: OrbitaPriority;
  due: string;
  links: number;
  who: string[];
};

type BridgeMessage = {
  source?: string;
  type?: string;
  id?: string;
  to?: string;
  projectId?: string;
  sectionId?: string;
  companyId?: string;
  status?: OrbitaStatus;
  priority?: OrbitaPriority;
  task?: OrbitaTaskPayload;
};

function todayIso() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

function toPopStatus(status: OrbitaStatus): TaskStatus {
  if (status === "doing") return "in_progress";
  if (status === "review") return "waiting_review";
  if (status === "done") return "completed";
  return "pending";
}

function toPopPriority(priority: OrbitaPriority): Priority {
  if (priority === "alta") return "high";
  if (priority === "baixa") return "low";
  return "medium";
}

function createOrbitaDocument() {
  const safeScript = orbitaScript.replace(/<\/script/gi, "<\\/script");
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Pop Organize V2</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600;700&display=swap">
<style>html,body{margin:0;height:100%}img{max-width:100%}[hidden]{display:none!important}</style>
<style>${orbitaStyles}</style>
</head>
<body>
${orbitaMarkup}
<script>${safeScript}<${"/script"}>
</body>
</html>`;
}

function PopOrganizeV2() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, error } = useWorkspaceData();
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [frameReady, setFrameReady] = useState(false);
  const documentHtml = useMemo(createOrbitaDocument, []);

  const sendWorkspace = useCallback(() => {
    if (!data || !frameRef.current?.contentWindow) return;
    frameRef.current.contentWindow.postMessage(
      {
        source: "pop-organize",
        type: "workspace",
        workspace: { ...data, today: todayIso() },
      },
      "*",
    );
  }, [data]);

  useEffect(() => {
    sendWorkspace();
  }, [sendWorkspace]);

  useEffect(() => {
    if (!error) return;
    const typed = error as Error & { status?: number; statusCode?: number };
    if (typed.status === 401 || typed.statusCode === 401) navigate({ to: "/login" });
  }, [error, navigate]);

  useEffect(() => {
    async function refreshWorkspace() {
      await queryClient.invalidateQueries({ queryKey: workspaceQueryKey });
    }

    function findTask(id?: string): Task | undefined {
      return id ? data?.tasks.find((task) => task.id === id) : undefined;
    }

    async function updateFromOrbita(task: Task, patch: OrbitaTaskPayload) {
      await updateTaskDetails({
        data: {
          id: task.id,
          title: patch.title,
          description: patch.desc || "Sem descrição.",
          priority: toPopPriority(patch.priority),
          dueDate: patch.due,
          target: { type: task.target.type, id: task.target.id },
          responsibleId: patch.who[0] ?? task.responsibleId,
          tags: patch.tag ? [patch.tag] : [],
          recurrence: task.recurrence,
        },
      });
      const nextStatus = toPopStatus(patch.status);
      if (task.status !== nextStatus) {
        await updateTaskStatus({ data: { id: task.id, status: nextStatus } });
      }
    }

    async function handleAction(message: BridgeMessage) {
      if (message.type === "navigate" && message.to) {
        window.location.assign(message.to);
        return;
      }
      if (message.type === "logout") {
        await logout();
        queryClient.removeQueries({ queryKey: workspaceQueryKey });
        navigate({ to: "/login" });
        return;
      }
      if (message.type === "workspace:switch" && message.companyId) {
        setFrameReady(false);
        await switchWorkspace({ data: { companyId: message.companyId } });
        await refreshWorkspace();
        return;
      }

      const task = findTask(message.id);
      if (message.type === "task:delete" && message.id) {
        await deleteTask({ data: { id: message.id } });
      } else if (message.type === "task:status" && task && message.status) {
        await updateTaskStatus({ data: { id: task.id, status: toPopStatus(message.status) } });
      } else if (message.type === "task:priority" && task && message.priority) {
        await updateTaskDetails({
          data: {
            id: task.id,
            title: task.title,
            description: task.description,
            priority: toPopPriority(message.priority),
            dueDate: task.dueDate,
            target: { type: task.target.type, id: task.target.id },
            responsibleId: task.responsibleId,
            tags: task.tags,
            recurrence: task.recurrence,
          },
        });
      } else if (message.type === "task:update" && task && message.task) {
        await updateFromOrbita(task, message.task);
      } else if (message.type === "task:create" && message.task && message.projectId) {
        const targetId = message.sectionId ?? message.projectId;
        const isCompany = targetId.startsWith("_company:");
        const target: { type: TargetType; id: string } = isCompany
          ? { type: "company", id: data?.company.id ?? targetId.slice(9) }
          : { type: "department", id: targetId };
        const created = await createTask({
          data: {
            title: message.task.title,
            description: message.task.desc || "Sem descrição.",
            priority: toPopPriority(message.task.priority),
            dueDate: message.task.due,
            target,
            responsibleId: message.task.who[0] ?? "",
            requiresReview: false,
            tags: message.task.tag ? [message.task.tag] : [],
            checklist: [],
          },
        });
        const nextStatus = toPopStatus(message.task.status);
        if (nextStatus !== "pending") {
          await updateTaskStatus({ data: { id: created.id, status: nextStatus } });
        }
      } else {
        return;
      }
      await refreshWorkspace();
    }

    function receiveMessage(event: MessageEvent<BridgeMessage>) {
      if (event.source !== frameRef.current?.contentWindow || event.data?.source !== "pop-orbita") {
        return;
      }
      if (event.data.type === "frame:ready") {
        sendWorkspace();
        return;
      }
      if (event.data.type === "workspace:ready") {
        setFrameReady(true);
        return;
      }
      void handleAction(event.data).catch((actionError: unknown) => {
        frameRef.current?.contentWindow?.postMessage(
          {
            source: "pop-organize",
            type: "action:error",
            message:
              actionError instanceof Error
                ? actionError.message
                : "Não foi possível concluir a ação.",
          },
          "*",
        );
        sendWorkspace();
      });
    }

    window.addEventListener("message", receiveMessage);
    return () => window.removeEventListener("message", receiveMessage);
  }, [data, navigate, queryClient, sendWorkspace]);

  return (
    <main
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 120,
        overflow: "hidden",
        background: "#09090a",
      }}
    >
      <iframe
        ref={frameRef}
        srcDoc={documentHtml}
        title="Pop Organize V2"
        onLoad={sendWorkspace}
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          border: 0,
          opacity: frameReady ? 1 : 0,
          transition: "opacity 160ms ease",
        }}
      />
      {!frameReady && (
        <div
          role="status"
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            color: "#8e9196",
            background: "#09090a",
            fontFamily: "Onest, system-ui, sans-serif",
            fontSize: 13,
          }}
        >
          Carregando Pop Organize…
        </div>
      )}
    </main>
  );
}
