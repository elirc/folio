import { prisma } from "../src/index";
import { keyAfter } from "@folio/shared";

/**
 * Dev seed (S02): one workspace, one member, and a small tree —
 *   Getting Started/ (folder)
 *     └─ Welcome to Folio (doc, with plaintext)
 *   Scratch (doc)
 * so tree ops, breadcrumbs, and ACL resolution are testable end to end.
 */
async function main() {
  const ws = await prisma.workspace.upsert({
    where: { id: "demo-ws" },
    update: {},
    create: { id: "demo-ws", name: "Demo Workspace" },
  });

  await prisma.member.upsert({
    where: { workspaceId_email: { workspaceId: ws.id, email: "demo@folio.dev" } },
    update: {},
    create: { workspaceId: ws.id, email: "demo@folio.dev", role: "owner" },
  });

  const folder = await prisma.node.upsert({
    where: { id: "demo-folder" },
    update: {},
    create: {
      id: "demo-folder",
      workspaceId: ws.id,
      type: "folder",
      title: "Getting Started",
      sortOrder: keyAfter(null),
    },
  });

  await prisma.node.upsert({
    where: { id: "demo-doc" },
    update: {},
    create: {
      id: "demo-doc",
      workspaceId: ws.id,
      parentId: folder.id,
      type: "doc",
      title: "Welcome to Folio",
      sortOrder: keyAfter(null),
      docState: { create: { text: "Start typing…\n\n(This is a textarea today — ProseMirror arrives in S3.)" } },
    },
  });

  await prisma.node.upsert({
    where: { id: "demo-scratch" },
    update: {},
    create: {
      id: "demo-scratch",
      workspaceId: ws.id,
      type: "doc",
      title: "Scratch",
      sortOrder: keyAfter(folder.sortOrder),
      docState: { create: { text: "" } },
    },
  });

  console.log(`seeded workspace ${ws.name} with a 3-node tree`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
