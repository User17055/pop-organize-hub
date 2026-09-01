// Junta CSS + markup + JS compilado em um único HTML.
// Gera dois arquivos: dist/Orbita-Board.html (documento completo, abre no navegador)
// e dist/artifact.html (só o conteúdo, para publicar como Artifact).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const css  = readFileSync("src/styles.css", "utf8");
const html = readFileSync("src/index.html", "utf8");
const js   = readFileSync("build/app.js", "utf8");

const head = `<title>Órbita Board</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600;700&display=swap">
<style>
${css}</style>`;

const body = `${html}
<script>
${js}</script>`;

mkdirSync("dist", { recursive: true });
writeFileSync("dist/artifact.html", `${head}\n${body}\n`);
writeFileSync(
  "dist/Orbita-Board.html",
  `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>html,body{margin:0;height:100%}img{max-width:100%}[hidden]{display:none!important}</style>
${head}
</head>
<body>
${body}
</body>
</html>
`
);
console.log("dist/artifact.html e dist/Orbita-Board.html gerados");
