// Regenerates the project tables in README.md between the projects markers
// from the live list of public repositories, with manual tweaks merged in
// from overrides.json (see its _help key). Zero dependencies, Node 18+.
import { readFileSync, writeFileSync } from "node:fs";

const USER = "beztebya666";

const overrides = JSON.parse(readFileSync("overrides.json", "utf8"));
const ov = (name) => overrides[name] ?? {};
const privateProjects = Array.isArray(overrides._private) ? overrides._private : [];

const headers = { accept: "application/vnd.github+json", "user-agent": USER };
if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

const res = await fetch(`https://api.github.com/users/${USER}/repos?per_page=100`, { headers });
if (!res.ok) throw new Error(`GitHub API responded ${res.status}`);

const repos = (await res.json())
  .filter((r) => !r.fork && !r.archived && r.name !== USER && !ov(r.name).hide)
  .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  .sort((a, b) => (ov(a.name).order ?? Infinity) - (ov(b.name).order ?? Infinity));

// API description fallback: leading emoji/symbols stripped, first sentence only.
const firstSentence = (s) => {
  const cleaned = (s ?? "").replace(/^[^\p{L}\p{N}]+/u, "");
  const m = cleaned.match(/^[\s\S]*?\.(?=\s)/);
  return (m ? m[0] : cleaned).trim();
};

const cell = (s) => String(s ?? "").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
const langCell = (lang) => (lang ? `\`${cell(lang)}\`` : "\u2014");

const publicRows = repos.map((r) => {
  const o = ov(r.name);
  const about = o.about ?? firstSentence(r.description);
  const lang = o.lang ?? r.language;
  const demo = o.demo ?? r.homepage; // "" keeps the plain-text label without a link
  return [
    `**[${r.name}](${r.html_url})**`,
    cell(about),
    langCell(lang),
    demo ? `[demo](${demo})` : "demo",
  ].join(" | ");
});

const publicTable = [
  "| Project | About | Lang | Demo |",
  "|:--|:--|:--|:--|",
  ...publicRows.map((r) => `| ${r} |`),
].join("\n");

const privateRows = privateProjects
  .filter((p) => p && p.name && !p.hide)
  .map((p) => {
    const name = p.url ? `**[${cell(p.name)}](${p.url})**` : `**${cell(p.name)}**`;
    return `| ${name} | ${cell(p.about)} | ${langCell(p.lang)} |`;
  });

const privateTable = privateRows.length
  ? [
      "",
      "#### Private projects",
      "",
      "| Project | About | Lang |",
      "|:--|:--|:--|",
      ...privateRows,
    ].join("\n")
  : "";

const table = [publicTable, privateTable].filter(Boolean).join("\n");

const readme = readFileSync("README.md", "utf8");
const updated = readme.replace(
  /(<!-- projects:start -->)[\s\S]*?(<!-- projects:end -->)/,
  `$1\n${table}\n$2`,
);
writeFileSync("README.md", updated);
console.log(`README.md: ${repos.length} public projects, ${privateRows.length} private projects`);
