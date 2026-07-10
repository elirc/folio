import { prisma } from "../src/index";

/** Dev seed: one demo document with some plaintext, so load/save/ws are testable end to end. */
async function main() {
  const node = await prisma.node.upsert({
    where: { id: "demo-doc" },
    update: {},
    create: {
      id: "demo-doc",
      type: "doc",
      title: "Welcome to Folio",
      docState: { create: { text: "Start typing…\n\n(This is a textarea today — ProseMirror arrives in S3.)" } },
    },
  });
  console.log(`seeded doc: ${node.title} (${node.id})`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
