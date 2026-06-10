// Regenerates the project table in README.md between the projects markers
// from the live list of public repositories. Zero dependencies, Node 18+.
import { readFileSync, writeFileSync } from "node:fs";

const USER = "beztebya666";

const headers = { accept: "application/vnd.github+json", "user-agent": USER };
if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

const res = await fetch(`https://api.github.com/users/${USER}/repos?per_page=100`, { headers });
if (!res.ok) throw new Error(`GitHub API responded ${res.status}`);

const repos = (await res.json())
  .filter((r) => !r.fork && !r.archived && r.name !== USER)
  .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

// First sentence only — repo descriptions can be long, the table should stay scannable.
const firstSentence = (s) => {
  const m = (s ?? "").match(/^[\s\S]*?\.(?=\s)/);
  return (m ? m[0] : (s ?? "")).trim();
};

const linkLabel = (url) => {
  try {
    const host = new URL(url).hostname;
    if (host.endsWith("github.io")) return "demo";
    if (host === "hub.docker.com") return "docker";
    return "site";
  } catch {
    return "link";
  }
};

const cell = (s) => s.replace(/\|/g, "\\|");

const rows = repos.map((r) => {
  const meta = [
    r.language && `\`${r.language}\``,
    r.homepage && `[${linkLabel(r.homepage)}](${r.homepage})`,
  ]
    .filter(Boolean)
    .join(" · ");
  return `| **[${r.name}](${r.html_url})** | ${cell(firstSentence(r.description))} | ${meta} |`;
});

const table = ["| Project | About | |", "|:--|:--|:--|", ...rows].join("\n");

const readme = readFileSync("README.md", "utf8");
const updated = readme.replace(
  /(<!-- projects:start -->)[\s\S]*?(<!-- projects:end -->)/,
  `$1\n${table}\n$2`,
);
writeFileSync("README.md", updated);
console.log(`README.md: ${repos.length} projects`);
