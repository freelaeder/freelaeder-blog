from __future__ import annotations

import argparse
import html
import random
import re
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path

import fitz


UTC8 = timezone(timedelta(hours=8))
HEADING_RE = re.compile(r"^§(\d{2})(?!\.)\s+(.*)$")
SUBSECTION_RE = re.compile(r"^§\d{2}\.\d+")


@dataclass(frozen=True)
class Section:
    num: str
    title: str
    part: str
    slug: str
    summary: str


SECTIONS = [
    Section("01", "认识 Claude Code", "认识 Claude Code", "claude-code-best-practices-01-understanding-claude-code", "理解 Claude Code 的定位、与 Claude.ai 的区别，以及 agentic loop 的基本运行方式。"),
    Section("02", "核心能力全景", "认识 Claude Code", "claude-code-best-practices-02-core-capabilities", "从安装、模型、上下文窗口到 MCP 与 Git 集成，建立对整个能力面的宏观认知。"),
    Section("03", "三种权限模式", "认识 Claude Code", "claude-code-best-practices-03-permission-modes", "讲清 Normal、Auto-Accept、Plan 三种模式各自适用的风险边界和使用场景。"),
    Section("04", "六大工具精通", "六大工具精通", "claude-code-best-practices-04-six-core-tools", "把 Read、Write、Edit、Bash、Glob、Grep 六个核心工具放进正确的决策框架里。"),
    Section("05", "工具组合工作流", "六大工具精通", "claude-code-best-practices-05-tool-combination-workflows", "用“导航-搜索-阅读-编辑-验证”的经典链路组织 Bug 修复、重构和新功能开发。"),
    Section("06", "上下文管理实战", "六大工具精通", "claude-code-best-practices-06-context-management", "学会识别 token 消耗来源，并用 compact、clear、rewind 与子代理隔离上下文污染。"),
    Section("07", "四阶段工作法", "工作流方法论", "claude-code-best-practices-07-four-phase-workflow", "把探索、规划、实现、提交拆开，形成适合 Claude Code 的高成功率执行节奏。"),
    Section("08", "Prompt 工程精要", "工作流方法论", "claude-code-best-practices-08-prompt-engineering", "把 prompt 写成任务规格说明书，减少歧义、降低上下文浪费、提升一次成功率。"),
    Section("09", "代码库导航策略", "工作流方法论", "claude-code-best-practices-09-codebase-navigation", "通过更节制的搜索与阅读策略，在大型仓库里快速建立问题空间。"),
    Section("10", "Git 工作流集成", "工作流方法论", "claude-code-best-practices-10-git-workflow-integration", "让 Claude Code 深度参与提交、PR、review 与分支协作，而不是只生成命令建议。"),
    Section("11", "CLAUDE.md 项目规范", "项目配置体系", "claude-code-best-practices-11-claude-md-project-guide", "用项目宪法的方式沉淀长期约束，让新会话快速进入团队协作状态。"),
    Section("12", "记忆系统深度指南", "项目配置体系", "claude-code-best-practices-12-memory-system-guide", "理解 CLAUDE.md、Auto Memory 与项目记忆的分工，避免会话一换就失忆。"),
    Section("13", "settings.json 完全配置", "项目配置体系", "claude-code-best-practices-13-settings-json", "系统掌握模型、权限、Hooks、MCP 与沙盒等运行时配置的组织方式。"),
    Section("14", "Hooks 自动化系统", "Hooks 自动化", "claude-code-best-practices-14-hooks-automation", "把 Claude Code 生命周期变成可编排的自动化节点，接入审计、校验、通知与守护逻辑。"),
    Section("15", "实用 Hook 案例集", "Hooks 自动化", "claude-code-best-practices-15-hook-examples", "用可直接套用的 Hook 场景，把质量门禁、日志、通知和规范检查自动化。"),
    Section("16", "MCP Server 集成", "Hooks 自动化", "claude-code-best-practices-16-mcp-server-integration", "让 Claude Code 安全地连接外部系统，在本地代码之外获得结构化能力扩展。"),
    Section("17", "斜杠命令速查手册", "命令与 Skills 系统", "claude-code-best-practices-17-slash-commands", "快速建立命令心智图，知道哪些命令负责会话、上下文、模型、工具和系统状态。"),
    Section("18", "自定义命令实战", "命令与 Skills 系统", "claude-code-best-practices-18-custom-commands", "把常做的操作封装成斜杠命令或 Skill，让高频动作从“会做”变成“一键复用”。"),
    Section("19", "Skills 系统全解", "命令与 Skills 系统", "claude-code-best-practices-19-skills-system", "理解 Skill 的 frontmatter、触发机制、资源组织和调用方式，掌握可扩展性的核心。"),
    Section("20", "打造个人技能库", "命令与 Skills 系统", "claude-code-best-practices-20-personal-skill-library", "建立自己的 Skill 资产库，把重复劳动逐步沉淀成长期复用的工作流组件。"),
    Section("21", "Sub-agents 架构", "多 Agent 协作", "claude-code-best-practices-21-sub-agents", "认识子代理的独立上下文、独立权限与摘要返回机制，避免主会话被噪音淹没。"),
    Section("22", "并行任务设计模式", "多 Agent 协作", "claude-code-best-practices-22-parallel-task-design", "学会什么时候并行、怎么拆分任务、如何聚合结果，避免并发带来新的混乱。"),
    Section("23", "Agent Teams 协作", "多 Agent 协作", "claude-code-best-practices-23-agent-teams", "通过多 Agent 流水线和网状协作，把复杂任务拆成可验证、可传递的中间产物。"),
    Section("24", "Worktree 隔离实战", "多 Agent 协作", "claude-code-best-practices-24-worktree-isolation", "用 Git worktree 为并行写入提供物理隔离，减少冲突并提升多方案试验能力。"),
    Section("25", "调试与问题排查", "高级实战", "claude-code-best-practices-25-debugging", "按“稳定复现-隔离根因-针对修复-回归验证”的闭环做系统性调试。"),
    Section("26", "内容创作最佳实践", "高级实战", "claude-code-best-practices-26-content-creation", "把写作、翻译、批量文档生成也纳入 Claude Code 的 Skill 化与流水线能力。"),
    Section("27", "成本控制手册", "高级实战", "claude-code-best-practices-27-cost-control", "在模型、上下文、并行策略和输出规模之间做取舍，把 token 花在最值钱的地方。"),
    Section("28", "安全边界与防护", "高级实战", "claude-code-best-practices-28-security-boundaries", "用权限、沙盒、规则和危险操作拦截，为效率型工具建立安全护栏。"),
    Section("29", "速查卡与模板库", "附录", "claude-code-best-practices-29-reference-and-templates", "整理常用命令、模板与决策卡，作为日常协作时可以直接翻用的工具箱。"),
]

SECTION_BY_NUM = {section.num: section for section in SECTIONS}


def normalize_inline(text: str) -> str:
    text = text.replace("\xa0", " ")
    text = text.replace(" ", " ")
    text = re.sub(r"[ \t]+", " ", text)
    return text.strip()


def looks_like_english_subtitle(line: str) -> bool:
    if not line or len(line) > 80:
        return False
    ascii_chars = sum(1 for char in line if ord(char) < 128)
    return ascii_chars / max(len(line), 1) > 0.85 and any(char.isalpha() for char in line)


def is_heading_candidate(line: str) -> bool:
    if not line:
        return False
    if line.startswith("#") or line.startswith("- "):
        return False
    if line.startswith(("推荐", "不推荐", "├", "└", "│", "/")):
        return False
    if len(line) < 4 or len(line) > 24:
        return False
    if line.endswith(("：", ":", "，", "。", "？", "！", "；")):
        return False
    if any(punct in line for punct in "。！？；"):
        return False
    if " | " in line:
        return False
    return not looks_like_english_subtitle(line)


def looks_like_code_block(lines: list[str]) -> bool:
    joined = "\n".join(lines)
    if "```" in joined:
        return True
    markers = (
        "#!/bin/",
        "npm ",
        "pnpm ",
        "yarn ",
        "git ",
        "gh ",
        "{",
        "}",
        "[",
        "]",
        "->",
        "=>",
        "echo ",
        "cat ",
        "jq ",
        "claude",
        "/tmp/",
        "~/.claude",
        ".json",
        ".md",
        "## ",
        "# ",
        "---",
        "description:",
        "allowed-tools:",
        "model:",
    )
    score = sum(1 for marker in markers if marker in joined)
    markdown_heading_hits = len(re.findall(r"(^|\s)#{1,6}\s", joined))
    return (
        score >= 3
        or markdown_heading_hits >= 2
        or any("│" in line or "├" in line or "└" in line for line in lines)
    )


def looks_like_table_block(lines: list[str]) -> bool:
    if len(lines) < 2:
        return False
    if any(looks_like_english_subtitle(line) for line in lines):
        return False
    if any("。" in line for line in lines):
        return False
    return all(len(line) <= 40 for line in lines)


def format_block(text: str) -> tuple[str, str]:
    lines = [normalize_inline(line) for line in text.splitlines()]
    lines = [line for line in lines if line]
    if not lines:
        return ("skip", "")
    first = lines[0]
    if SUBSECTION_RE.match(first):
        return ("heading", first)
    if looks_like_code_block(lines):
        return ("code", "\n".join(lines))
    if looks_like_table_block(lines):
        return ("list", " | ".join(lines))
    paragraph = " ".join(lines)
    paragraph = re.sub(r"(?<=[\u4e00-\u9fff])\s+(?=[\u4e00-\u9fff])", "", paragraph)
    paragraph = re.sub(r"\s+([，。！？；：])", r"\1", paragraph)
    return ("paragraph", paragraph)


def extract_sections(pdf_path: Path) -> dict[str, list[str]]:
    doc = fitz.open(pdf_path)
    extracted = {section.num: [] for section in SECTIONS}
    current_num: str | None = None

    for page_index in range(3, len(doc)):
        blocks = doc[page_index].get_text("blocks")
        blocks = sorted(blocks, key=lambda item: (item[1], item[0]))
        for _, _, _, _, block_text, *_ in blocks:
            raw = block_text.strip()
            if not raw:
                continue

            lines = [normalize_inline(line) for line in raw.splitlines()]
            lines = [line for line in lines if line]
            if not lines:
                continue

            heading_match = HEADING_RE.match(lines[0])
            if heading_match and heading_match.group(1) in SECTION_BY_NUM:
                current_num = heading_match.group(1)
                remainder = lines[1:]
                if remainder and looks_like_english_subtitle(remainder[0]):
                    remainder = remainder[1:]
                if remainder:
                    extracted[current_num].append("\n".join(remainder))
                continue

            if current_num:
                if len(lines) == 1 and looks_like_english_subtitle(lines[0]):
                    continue
                extracted[current_num].append("\n".join(lines))

    return extracted


def collect_focus_points(blocks: list[str]) -> list[str]:
    points: list[str] = []
    for block in blocks[:18]:
        lines = [normalize_inline(line) for line in block.splitlines()]
        lines = [line for line in lines if line]
        if not lines:
            continue
        first = lines[0]
        if len(lines) == 1 and looks_like_english_subtitle(first):
            continue
        if SUBSECTION_RE.match(first):
            points.append(first)
            continue
        if len(points) >= 4:
            break
    deduped: list[str] = []
    for point in points:
        if point not in deduped:
            deduped.append(point)
    return deduped[:4]


def render_post(section: Section, blocks: list[str], published_at: datetime) -> str:
    focus_points = collect_focus_points(blocks)
    if not focus_points:
        focus_points = [
            "这一节围绕主题建立完整认知框架。",
            "优先保留能直接迁移到日常工作中的方法。",
            "把概念、流程和实践建议整理成可复用笔记。",
        ]

    formatted_chunks: list[tuple[str, str]] = []
    for block in blocks:
        kind, rendered = format_block(block)
        if kind != "skip" and rendered:
            if (
                formatted_chunks
                and kind == "paragraph"
                and formatted_chunks[-1][0] == "paragraph"
                and not formatted_chunks[-1][1].endswith(("。", "！", "？", "；", "：", ":", "”"))
            ):
                formatted_chunks[-1] = (
                    "paragraph",
                    f"{formatted_chunks[-1][1]} {rendered}",
                )
            else:
                formatted_chunks.append((kind, rendered))

    focus_md = "\n".join(f"- {point}" for point in focus_points)
    html_chunks: list[str] = []
    for kind, chunk in formatted_chunks:
        if kind == "heading":
            html_chunks.append(f"<h2>{html.escape(chunk)}</h2>")
        elif kind == "code":
            html_chunks.append(f"<pre><code>{html.escape(chunk)}</code></pre>")
        else:
            html_chunks.append(f"<p>{html.escape(chunk)}</p>")
    body_md = "\n\n".join(html_chunks).strip()

    return f"""---
title: "Claude Code 手册拆读 {section.num}：{section.title}"
date: "{published_at.isoformat()}"
slug: "{section.slug}"
tags:
  - "Claude Code"
  - "最佳实践"
  - "{section.part}"
summary: "{section.summary}"
---

这篇笔记基于《Claude Code 最佳实践手册 v1.0.0》对应章节整理，保留原章节的核心结构，方便按主题快速复习与发布。

## 本节重点

{focus_md}

## 笔记整理

{body_md}
"""


def render_index(base_time: datetime) -> str:
    groups: dict[str, list[Section]] = {}
    for section in SECTIONS:
        groups.setdefault(section.part, []).append(section)

    lines = [
        "---",
        'title: "Claude Code 手册拆读目录"',
        f'date: "{(base_time + timedelta(minutes=len(SECTIONS) + 1)).isoformat()}"',
        'slug: "claude-code-best-practices-series-index"',
        "tags:",
        '  - "Claude Code"',
        '  - "最佳实践"',
        '  - "系列目录"',
        'summary: "按章节拆读《Claude Code 最佳实践手册》，附完整目录与阅读顺序。"',
        "---",
        "",
        "这是一组基于《Claude Code 最佳实践手册 v1.0.0》拆分整理出来的系列笔记。我按照原书章节结构发布，适合按需跳读，也适合从前到后系统复盘。",
        "",
        "## 阅读顺序建议",
        "",
        "1. 先读 01-03，建立 Claude Code 的基本心智模型。",
        "2. 再读 04-10，把工具、工作流和 Git 协作串起来。",
        "3. 最后按自己的需求深入 Hooks、Skills、多 Agent、成本和安全章节。",
        "",
        "## 系列目录",
        "",
    ]

    for part, sections in groups.items():
        lines.append(f"### {part}")
        lines.append("")
        for section in sections:
            lines.append(f"- [{section.num}｜{section.title}](/posts/{section.slug})")
        lines.append("")

    return "\n".join(lines).rstrip() + "\n"


def main() -> None:
    parser = argparse.ArgumentParser(description="Import Claude Code best practices PDF into blog posts.")
    parser.add_argument("--pdf", required=True, help="Absolute path to the source PDF.")
    parser.add_argument("--posts-dir", default="posts", help="Directory where MDX posts should be written.")
    args = parser.parse_args()

    pdf_path = Path(args.pdf)
    posts_dir = Path(args.posts_dir)
    posts_dir.mkdir(parents=True, exist_ok=True)

    extracted = extract_sections(pdf_path)
    base_time = datetime(2025, 12, 18, 9, 20, tzinfo=UTC8)
    rng = random.Random(20260402)
    publish_times: list[datetime] = []
    current_time = base_time
    for _ in SECTIONS:
        current_time += timedelta(
            days=rng.randint(1, 4),
            hours=rng.randint(2, 11),
            minutes=rng.randint(7, 53),
        )
        publish_times.append(current_time)

    for index, section in enumerate(SECTIONS):
        blocks = extracted.get(section.num, [])
        if not blocks:
            raise RuntimeError(f"Section {section.num} ({section.title}) was not extracted from the PDF.")
        content = render_post(section, blocks, publish_times[index])
        (posts_dir / f"{section.slug}.mdx").write_text(content, encoding="utf-8")

    index_content = render_index(publish_times[-1] + timedelta(days=2, hours=5, minutes=17))
    (posts_dir / "claude-code-best-practices-series-index.mdx").write_text(index_content, encoding="utf-8")


if __name__ == "__main__":
    main()
