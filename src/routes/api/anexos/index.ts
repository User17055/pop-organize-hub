import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/anexos/")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { attachmentErrorResponse, uploadTaskAttachment } =
          await import("@/lib/task-attachments.server");
        try {
          return Response.json(await uploadTaskAttachment(request), {
            headers: { "cache-control": "no-store" },
          });
        } catch (error) {
          return attachmentErrorResponse(error);
        }
      },
    },
  },
});
