import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/mobile/anexos/$fileId")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const { attachmentErrorResponse } = await import("@/lib/task-attachments.server");
        try {
          const { createMobileAttachmentDownloadLink } = await import("@/lib/mobile-api.server");
          return Response.json(await createMobileAttachmentDownloadLink(request, params.fileId), {
            headers: { "cache-control": "no-store" },
          });
        } catch (error) {
          return attachmentErrorResponse(error);
        }
      },
    },
  },
});
