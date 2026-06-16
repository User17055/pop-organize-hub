import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pop Organize" },
      { name: "description", content: "Pop Organize - Organize suas ideias e tarefas de forma simples e eficiente." },
      { property: "og:title", content: "Pop Organize" },
      { property: "og:description", content: "Pop Organize - Organize suas ideias e tarefas de forma simples e eficiente." },
    ],
  }),
  component: Index,
});

// IMPORTANT: Replace this placeholder. See ./README.md for routing conventions.
function Index() {
  return (
    <div
      className="flex min-h-screen items-center justify-center"
      style={{ backgroundColor: "#fcfbf8" }}
    >
      <img
        data-lovable-blank-page-placeholder="REMOVE_THIS"
        src="https://cdn.gpteng.co/blank-app-v1.svg"
        alt="Your app will live here!"
      />
    </div>
  );
}
