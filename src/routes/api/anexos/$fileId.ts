import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/anexos/$fileId")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const { attachmentErrorResponse, downloadTaskAttachment } =
          await import("@/lib/task-attachments.server");
        try {
          return await downloadTaskAttachment(request, params.fileId);
        } catch (error) {
          return attachmentErrorResponse(error);
        }
      },
    },
  },
});
