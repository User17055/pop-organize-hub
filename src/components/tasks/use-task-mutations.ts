import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  addTaskAttachment,
  addTaskComment,
  addTaskSubtask,
  createTask,
  deleteTask,
  deleteTaskSubtask,
  reorderTask,
  toggleTaskSubtask,
  updateTaskDetails,
  updateTaskStatus,
} from "@/lib/api/pop-organize.functions";
import { workspaceQueryKey, type WorkspaceResult } from "@/lib/api/use-workspace";
import type { Priority, TargetType, Task, TaskStatus } from "@/lib/domain";
import type { RecurrenceInput } from "./task-form-types";

export function useTaskMutations(options?: {
  onCompleted?: (taskId: string) => void;
  onCreated?: () => void;
  onDeleted?: () => void;
  onCommented?: () => void;
}) {
  const queryClient = useQueryClient();

  function updateTaskInWorkspace(updatedTask: Task) {
    queryClient.setQueryData<WorkspaceResult>(workspaceQueryKey, (current) =>
      current
        ? {
            ...current,
            tasks: current.tasks.map((task) =>
              task.id === updatedTask.id ? { ...task, ...updatedTask } : task,
            ),
          }
        : current,
    );
  }

  const createTaskMutation = useMutation({
    mutationFn: (payload: {
      title: string;
      description: string;
      priority: Priority;
      dueDate: string;
      target: { type: TargetType; id: string };
      responsibleId: string;
      reviewerId?: string;
      requiresReview: boolean;
      tags: string[];
      checklist: string[];
      recurrence?: RecurrenceInput;
    }) => createTask({ data: payload }),
    onSuccess: (createdTask) => {
      queryClient.setQueryData<WorkspaceResult>(workspaceQueryKey, (current) =>
        current
          ? {
              ...current,
              tasks: [createdTask, ...current.tasks.filter((task) => task.id !== createdTask.id)],
            }
          : current,
      );
      options?.onCreated?.();
      void queryClient.invalidateQueries({ queryKey: workspaceQueryKey });
    },
  });

  const statusMutation = useMutation({
    mutationFn: (payload: { id: string; status: TaskStatus }) =>
      updateTaskStatus({ data: payload }),
    onSuccess: (updatedTask) => {
      if (updatedTask.status === "completed") {
        options?.onCompleted?.(updatedTask.id);
      }
      updateTaskInWorkspace(updatedTask);
      void queryClient.invalidateQueries({ queryKey: workspaceQueryKey });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: (payload: {
      id: string;
      title: string;
      description: string;
      priority: Priority;
      dueDate: string;
      target: { type: TargetType; id: string };
      responsibleId: string;
      tags: string[];
      recurrence?: RecurrenceInput;
    }) => updateTaskDetails({ data: payload }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workspaceQueryKey });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (payload: {
      id: string;
      scope?: "occurrence" | "series";
      occurrenceDate?: string;
    }) => deleteTask({ data: payload }),
    onSuccess: (result, variables) => {
      options?.onDeleted?.();
      const removedIds: string[] = "removedIds" in result ? result.removedIds : [variables.id];
      const updatedTask = "updatedTask" in result ? result.updatedTask : undefined;
      queryClient.setQueryData<WorkspaceResult>(workspaceQueryKey, (current) =>
        current
          ? {
              ...current,
              tasks: current.tasks
                .filter((task) => !removedIds.includes(task.id))
                .map((task) =>
                  updatedTask && task.id === updatedTask.id ? { ...task, ...updatedTask } : task,
                ),
            }
          : current,
      );
      void queryClient.invalidateQueries({ queryKey: workspaceQueryKey });
    },
  });

  const reorderTaskMutation = useMutation({
    mutationFn: (payload: { taskId: string; beforeTaskId: string | null }) =>
      reorderTask({ data: payload }),
    onMutate: async ({ taskId, beforeTaskId }) => {
      await queryClient.cancelQueries({ queryKey: workspaceQueryKey });
      queryClient.setQueryData<WorkspaceResult>(workspaceQueryKey, (current) => {
        if (!current) return current;
        const nextTasks = [...current.tasks];
        const sourceIndex = nextTasks.findIndex((task) => task.id === taskId);
        if (sourceIndex < 0) return current;
        const [source] = nextTasks.splice(sourceIndex, 1);
        const targetIndex =
          beforeTaskId === null
            ? nextTasks.length
            : nextTasks.findIndex((task) => task.id === beforeTaskId);
        nextTasks.splice(targetIndex < 0 ? nextTasks.length : targetIndex, 0, source);
        return { ...current, tasks: nextTasks };
      });
    },
    onError: () => {
      void queryClient.invalidateQueries({ queryKey: workspaceQueryKey });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: workspaceQueryKey });
    },
  });

  const commentMutation = useMutation({
    mutationFn: (payload: { taskId: string; body: string }) => addTaskComment({ data: payload }),
    onSuccess: (updatedTask) => {
      options?.onCommented?.();
      updateTaskInWorkspace(updatedTask);
      void queryClient.invalidateQueries({ queryKey: workspaceQueryKey });
    },
  });

  const attachmentMutation = useMutation({
    mutationFn: (payload: { taskId: string; name: string; sizeLabel?: string }) =>
      addTaskAttachment({ data: payload }),
    onSuccess: (updatedTask) => {
      updateTaskInWorkspace(updatedTask);
      void queryClient.invalidateQueries({ queryKey: workspaceQueryKey });
    },
  });

  const addSubtaskMutation = useMutation({
    mutationFn: (payload: { taskId: string; title: string }) => addTaskSubtask({ data: payload }),
    onSuccess: (updatedTask) => {
      updateTaskInWorkspace(updatedTask);
      void queryClient.invalidateQueries({ queryKey: workspaceQueryKey });
    },
  });

  const toggleSubtaskMutation = useMutation({
    mutationFn: (payload: { taskId: string; subtaskId: string; done: boolean }) =>
      toggleTaskSubtask({ data: payload }),
    onSuccess: (updatedTask) => {
      updateTaskInWorkspace(updatedTask);
      void queryClient.invalidateQueries({ queryKey: workspaceQueryKey });
    },
  });

  const deleteSubtaskMutation = useMutation({
    mutationFn: (payload: { taskId: string; subtaskId: string }) =>
      deleteTaskSubtask({ data: payload }),
    onSuccess: (updatedTask) => {
      updateTaskInWorkspace(updatedTask);
      void queryClient.invalidateQueries({ queryKey: workspaceQueryKey });
    },
  });

  return {
    createTaskMutation,
    statusMutation,
    updateTaskMutation,
    deleteTaskMutation,
    reorderTaskMutation,
    commentMutation,
    attachmentMutation,
    addSubtaskMutation,
    toggleSubtaskMutation,
    deleteSubtaskMutation,
  };
}
