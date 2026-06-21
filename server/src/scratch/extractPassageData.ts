import "../lib/env.js";
import { prisma } from "../lib/prisma.js";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const batches = ["gemini 2", "gemini 3", "gemini 4"];
  let markdown = "# Extracted Passages (Gemini 2, 3, & 4)\n\n";

  for (const batch of batches) {
    markdown += `## ==========================================================================\n`;
    markdown += `## BATCH: ${batch.toUpperCase()}\n`;
    markdown += `## ==========================================================================\n\n`;

    const passages = await prisma.passage.findMany({
      where: {
        source: batch,
      },
      include: {
        questions: true,
      },
      take: 2,
    });

    for (let i = 0; i < passages.length; i++) {
      const p = passages[i];
      markdown += `### [Passage ${i + 1} of 2 in ${batch}] Title: "${p.title}"\n`;
      markdown += `**ID**: \`${p.id}\` | **Domain**: \`${p.domain}\` | **Word Count**: \`${p.word_count}\` | **Quality Score**: \`${p.quality_score}\` | **Status**: \`${p.status.toUpperCase()}\`\n\n`;

      markdown += `#### 1. PASSAGE BODY\n`;
      markdown += `\`\`\`text\n${p.body}\n\`\`\`\n\n`;


      markdown += `#### 3. MIND MAP (Paragraph Roadmaps)\n`;
      p.paragraph_roadmaps.forEach((r, idx) => {
        markdown += `- **Paragraph ${idx + 1}**: ${r}\n`;
      });
      markdown += `\n`;

      markdown += `#### 4. MULTIPLE CHOICE QUESTIONS (MCQs)\n`;
      p.questions.forEach((q, qIdx) => {
        markdown += `##### Q${qIdx + 1}: ${q.stem} (Type: \`${q.type}\`)\n`;
        q.options.forEach((opt, oIdx) => {
          const letter = ["A", "B", "C", "D"][oIdx];
          const isCorrect = oIdx === q.correct_index ? " [CORRECT]" : "";
          markdown += `  - **[${letter}]** ${opt}${isCorrect}\n`;
        });
        markdown += `\n`;
        markdown += `*Explanations*:\n`;
        q.options.forEach((_, oIdx) => {
          const letter = ["A", "B", "C", "D"][oIdx];
          markdown += `  - **[Explanation ${letter}]**: ${q.explanations[oIdx] || "No explanation available."}\n`;
        });
        markdown += `\n`;
      });
      markdown += `--------------------------------------------------------------------------\n\n`;
    }
  }

  const outputPath = path.join(__dirname, "extracted_passages.md");
  fs.writeFileSync(outputPath, markdown, "utf-8");
  console.log(`Successfully wrote extracted passages data to: ${outputPath}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
