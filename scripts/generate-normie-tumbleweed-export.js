const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const imagePath = path.join(root, "images", "normie_psycho_happy.png");
const outputPath = path.join(root, "exports", "normie-tumbleweed-standalone.html");
const image = fs.readFileSync(imagePath).toString("base64");

const html = [
  "<!doctype html>",
  '<html lang="en">',
  "  <head>",
  '    <meta charset="utf-8" />',
  '    <meta name="viewport" content="width=800, initial-scale=1" />',
  "    <title>Normie Tumbleweed Animation</title>",
  "    <style>",
  "      html,",
  "      body {",
  "        margin: 0;",
  "        width: 800px;",
  "        height: 420px;",
  "        overflow: hidden;",
  "        background: transparent;",
  "      }",
  "",
  "      .stage {",
  "        position: relative;",
  "        width: 800px;",
  "        height: 420px;",
  "        overflow: hidden;",
  "        background: transparent;",
  "      }",
  "",
  "      .normie {",
  "        position: absolute;",
  "        left: 0;",
  "        top: 170px;",
  "        width: 150px;",
  "        height: auto;",
  "        transform-origin: center center;",
  "        animation: normie-tumbleweed 8s linear infinite;",
  "        will-change: transform;",
  "      }",
  "",
  "      @keyframes normie-tumbleweed {",
  "        0% { transform: translateX(-190px) translateY(0) rotate(0deg); }",
  "        12.5% { transform: translateX(-61px) translateY(-80px) rotate(180deg); }",
  "        25% { transform: translateX(68px) translateY(0) rotate(360deg); }",
  "        37.5% { transform: translateX(197px) translateY(-80px) rotate(540deg); }",
  "        50% { transform: translateX(326px) translateY(0) rotate(720deg); }",
  "        62.5% { transform: translateX(455px) translateY(-80px) rotate(900deg); }",
  "        75% { transform: translateX(584px) translateY(0) rotate(1080deg); }",
  "        87.5% { transform: translateX(713px) translateY(-80px) rotate(1260deg); }",
  "        100% { transform: translateX(840px) translateY(0) rotate(1440deg); }",
  "      }",
  "    </style>",
  "  </head>",
  "  <body>",
  '    <div class="stage" aria-label="Normie cartwheel animation">',
  `      <img class="normie" src="data:image/png;base64,${image}" alt="Normie" />`,
  "    </div>",
  "  </body>",
  "</html>",
  ""
].join("\n");

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, html);
console.log(outputPath);
