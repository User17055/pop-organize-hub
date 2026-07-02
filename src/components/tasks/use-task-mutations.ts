import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  addTaskAttachment,
  addTaskComment,
  addTaskSubtask,
  createTask,
  deleteTask,
  deleteTaskSubtask,
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
      recurrence?: RecurrenceInput;
    }) => createTask({ data: payload }),
    onSuccess: () => {
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
      tags: string[];
      recurrence?: RecurrenceInput;
    }) => updateTaskDetails({ data: payload }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workspaceQueryKey });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (payload: { id: string }) => deleteTask({ data: payload }),
    onSuccess: (_result, variables) => {
      options?.onDeleted?.();
      queryClient.setQueryData<WorkspaceResult>(workspaceQueryKey, (current) =>
        current
          ? {
              ...current,
              tasks: current.tasks.filter((task) => task.id !== variables.id),
            }
          : current,
      );
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
    commentMutation,
    attachmentMutation,
    addSubtaskMutation,
    toggleSubtaskMutation,
    deleteSubtaskMutation,
  };
}
