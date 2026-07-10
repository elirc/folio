# Curriculum Note — Sprint 5: Naive Real-Time (Deliberately Broken) → v0.5.0

## Learning objectives
- **Feel** last-write-wins eat your work, so CRDTs are motivated by experience, not authority.
- Recognize that a test can legitimately **document a known failure**, not just assert correctness.
- See that presence/cursors break for the *same* reason (absolute positions) — foreshadowing S09.
- Practice shipping an **honest MVP** with a documented, deliberate limitation.

## ⚗️ The lab: break your own document (do this before S06)
This is the most important exercise in the course. **Open the same doc in two browser windows** side by side.
1. In window A, type a paragraph. Watch it appear in window B. Feels magical. This is the demo that fools you.
2. Now type in **both** windows at once — different paragraphs, quickly.
3. Watch one window's paragraph **vanish**. No error. No warning. Just gone.
4. Do it again and log *every* way it corrupts: lost paragraphs, cursor jumps, text reverting mid-keystroke.
5. **Write the requirements for a fix in your own words.** ("Concurrent edits must both survive." "A cursor
   must stay on the character it pointed at, even as text changes around it.") **Those requirements are
   S06's spec.**

You cannot appreciate a CRDT until LWW has eaten your paragraph. Go do it.

## Key concepts
- **LWW has no notion of concurrency (ADR-0006).** It only knows "latest." Two concurrent edits don't
  merge — the later overwrites the earlier, silently. This isn't a bug to fix in this PR; it's the
  *motivation* for the next two. There is no merge machinery at all — only overwrite.
- **A test can document a failure.** `naiveSync.test.ts` asserts the data *loss*. That turns "trust me, it's
  broken" into a reproducible fact, and it's the exact regression S07 flips to green (naive → Yjs). A red
  truth written as a green "it reproduces" test is a legitimate, valuable artifact.
- **Absolute positions are doomed under editing.** A cursor at offset 42 is meaningless once the document
  changes length. We clamp so it can't crash, but it *can't* be correct without relative positions — a CRDT
  capability we don't have yet. 🔗 Same disease as the S09 comment-anchor flaw.
- **The server has no model of concurrency — it can't.** It sees opaque whole-doc blobs, so fan-out + LWW is
  all it can do. S07's Yjs updates are *mergeable*, turning the relay into a convergence point. Note what
  *survives*: rooms, presence fan-out, the WS transport — only the payload semantics change.
- **Refusing the lock.** A one-editor-at-a-time lock would ship today and hide the problem. We refuse it on
  purpose: the lesson is experiential. *Don't paper over the hard problem — feel it, then solve it.*

## The debate, cashed
**Operational lock vs. real concurrent editing?** Resolved: **neither yet** — ship the broken LWW *as a felt
problem*, then build the real thing (S06–S07). A lock would let us skip the lesson. *Feel it fully, solve it
properly.*

## Milestone: v0.5.0 (the MVP — half the product)
This is the MVP boundary. Multiplayer *looks* done and is *fundamentally* broken — which is the honest state
of a naive real-time editor. The hard half (making concurrent edits actually converge) is S06–S07. Framing
the retro: "we built half the product; the half that's actually hard is next."

## Exercise questions
1. Do the lab. Paste your list of every corruption you observed. Which surprised you?
2. Why is `naiveSync.test.ts` a *good* test even though it asserts data loss? What will S07 do to it?
3. A cursor arrives at `head: 42`. Give a concrete two-user sequence where 42 points at the wrong character.
4. The server only sees whole-doc blobs. Explain in one sentence why that forces LWW and nothing better.
5. Write, in your own words, the spec for "concurrent edits must both survive." That's S06's brief.

## Further reading
- "CRDTs: The Hard Parts" (Martin Kleppmann) · "I was wrong about CRDTs" / OT vs CRDT debates ·
  Yjs (coming S07) · Figma's multiplayer tech blog · ADR-0006 (this sprint's honest post-mortem)
