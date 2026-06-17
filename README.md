<img width="1592" height="816" alt="lumen-preview" src="https://github.com/user-attachments/assets/f718a66f-36ea-49b9-9dea-afdebbd4064a" />
# Lumen

> I got tired of bad reading environments. So I built my own.

&nbsp;

## The Problem

I use markdown for everything.

Notes, handbooks, references, study guides. Markdown is efficient, 
portable, and more capable of structured visualisation than most people 
give it credit for. Once you start writing in it, you stop wanting to 
write anywhere else.

But the reading side was always broken.

Every app I tried was either too noisy, too buggy, too aggressive with 
its UI, or designed for someone else's workflow. I spent more time 
fighting the tool than reading the content. For something as simple as 
rendering a `.md` file beautifully, nothing felt right.

So I stopped looking and built Lumen.

&nbsp;

## What it is

A personal markdown reading environment. Built for my own study workflow, 
open sourced in case it's useful to anyone else.

No accounts. No cloud. No noise. Paste your markdown and read.

&nbsp;

## Live

**[ombharati.github.io/Lumen](https://ombharati.github.io/Lumen)**

&nbsp;

## Features

**Reading**
- Paste raw markdown or upload a `.md` file directly
- Renders with warm, readable typography
- Reading time and word count on every document
- Scroll position remembered per tab
- Font size controls

**Workspace**
- Named tabs — multiple documents open at once
- Focus mode — hides everything except the content
- Reading width control — Narrow, Medium, Wide

**Utilities**
- Dark and light mode
- Download as PDF
- IST clock in the sidebar
- Stopwatch, timer, and alarm for study sessions
- All state persists locally, nothing leaves your browser

&nbsp;

## Design

The UI and UX is directly inspired by Anthropic's design language.

Anthropic spent serious money designing a reading surface that makes 
dense text comfortable for long sessions. The warm cream canvas, the 
restrained typography, the quiet chrome — all of it was a deliberate 
set of decisions that I studied and applied here.

The philosophy is Apple's law of less. One aesthetic, fully committed 
to, never broken. The consistency is the product.

Most markdown viewers use browser defaults and call it done. Lumen 
doesn't. Every spacing, color, and type decision was intentional.

**Design tokens used:**

| Token | Light | Dark |
|---|---|---|
| Background | `#faf9f5` | `#181715` |
| Sidebar | `#f0ebe3` | `#1e1c19` |
| Text | `#141413` | `#faf9f5` |
| Muted | `#6c6a64` | `#8e8b82` |
| Accent | `#cc785c` | `#cc785c` |

Fonts: Inter for body, JetBrains Mono for code.

&nbsp;

## Stack

- Vanilla HTML, CSS, JavaScript — no framework, no build step
- `markdown-it` for rendering
- `highlight.js` for syntax highlighting
- Deployed on GitHub Pages

Single file. Nothing to install. Nothing to configure.

&nbsp;

## Roadmap

- [ ] Tauri desktop app for Linux
- [ ] Local filesystem access and file tree
- [ ] Linux `.deb` package

&nbsp;

## Why vibe coded?

I'm a systems engineering student. My path is backend and infrastructure, 
not frontend. I knew exactly what I wanted to build and what it should 
feel like but I used AI tooling to move fast on the parts outside my 
current depth. The design decisions, the feature scope, the philosophy 
— those were mine. The implementation was a collaboration.

That's a valid way to build things.

&nbsp;

---

*Built by [Om Bharati](https://ombharati.github.io) — because markdown 
deserves a better home.*

![Lumen Preview](<img width="1592" height="816" alt="lumen-preview" src="https://github.com/user-attachments/assets/f718a66f-36ea-49b9-9dea-afdebbd4064a" />)
