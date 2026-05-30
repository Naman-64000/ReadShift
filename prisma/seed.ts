/**
 * prisma/seed.ts
 *
 * Populates the database with development passages and MCQs.
 */

import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import { evaluatePassageQuality } from "../server/src/services/passageQualityService.js";

const prisma = new PrismaClient();

const DOMAINS = ["business", "science", "history", "abstract", "social"] as const;
const LEVELS = [1, 2, 3, 4] as const;

const DOMAIN_TOPICS: Record<(typeof DOMAINS)[number], string[]> = {
  business: [
    "pricing power in subscription markets",
    "supply-chain concentration risk",
    "capital allocation under uncertain demand",
    "trade-offs between growth and margin discipline",
    "incentive design in complex organizations",
  ],
  science: [
    "limits of replication in behavioral studies",
    "model uncertainty in climate forecasting",
    "measurement bias in biomedical trials",
    "causal inference from noisy observational data",
    "scientific progress through imperfect proxies",
  ],
  history: [
    "administrative reforms after imperial expansion",
    "institutional continuity after political rupture",
    "how legal codes outlast rulers",
    "economic modernization and social resistance",
    "historical memory and policy decisions",
  ],
  abstract: [
    "the difference between explanation and justification",
    "coordination problems without central authority",
    "ambiguity as a feature of rational choice",
    "norms versus rules in collective behavior",
    "when simplicity obscures causal structure",
  ],
  social: [
    "attention scarcity in digital environments",
    "status signaling and group conformity",
    "trust formation in anonymous communities",
    "policy uptake and behavioral friction",
    "identity cues and decision quality",
  ],
};

const LEVEL_TONE: Record<(typeof LEVELS)[number], string> = {
  1: "with clear transitions and moderate sentence complexity",
  2: "with denser argumentation and occasional counterpoints",
  3: "with layered claims, tighter logic, and abstract vocabulary",
  4: "with compressed reasoning, subtle qualifications, and high conceptual density",
};

function buildPassage(domain: (typeof DOMAINS)[number], level: (typeof LEVELS)[number], variant: number): string {
  const topics = DOMAIN_TOPICS[domain];
  const topic = topics[variant % topics.length];
  const tone = LEVEL_TONE[level];
  const paragraphCount = 4 + (variant % 2); // 4–5 paragraphs

  const paragraphs = [
    `Debates about ${topic} are often framed as technical disagreements, yet the practical challenge is usually institutional. Leaders must decide under partial evidence, and that pressure changes how evidence is interpreted. Teams often act as though uncertainty is merely a timing problem, so deadlines quietly become the architecture of judgment. Once a timetable is fixed, analysts prioritize signals that fit the decision window and postpone questions that would require slower measurement. The outcome can look disciplined from the outside, but much of the discipline is procedural rather than epistemic: it reflects the rhythm of governance more than the structure of reality.`,
    `This pattern persists because delay has visible costs while error has distributed costs. If decision-makers wait, they can be blamed for inaction in real time. If they act and later adjust, responsibility is diluted across teams, assumptions, and external shocks. Under those incentives, organizations favor arguments that are legible to oversight systems: clear metrics, short memos, and confident projections. The hidden trade-off is that what can be measured quickly is treated as what matters most, even when those proxies are weak stand-ins for long-run objectives. Over time, this creates a feedback loop in which reporting convenience gradually outranks causal relevance.`,
    `A stronger design principle is to treat policy as a sequence of explicit, revisable commitments ${tone}. Instead of promising certainty, teams can define which assumptions are provisional, which thresholds trigger revision, and which harms receive priority under ambiguity. This approach makes disagreement productive because competing interpretations are tied to observable checks rather than rhetorical certainty. It also changes organizational behavior: when revision is planned rather than perceived as failure, teams invest earlier in diagnostics that detect second-order effects, including strategic gaming, delayed compliance, and distributional spillovers that aggregate metrics tend to hide.`,
    `Even with that structure, adaptation is not automatic. Institutions must protect room for negative findings, preserve memory of past reversals, and prevent short-cycle victories from crowding out longer-cycle learning. Where those guardrails are missing, reforms become performative: dashboards multiply, but inference quality stagnates. Where guardrails exist, analytical culture improves because people are rewarded for updating models when facts shift rather than defending initial assumptions at all costs. In that environment, rigor is not a static property of a single report; it is a repeated behavior embedded in routines, incentives, and review cadence.`,
    `The broader lesson is that uncertainty cannot be eliminated, but it can be organized. Systems become more reliable when they separate confidence from commitment and treat both as revisable. By making assumptions explicit, testing them against precommitted triggers, and revising in public, organizations reduce the political cost of course correction. That discipline does not guarantee perfect outcomes, yet it reliably lowers the risk of persistent error. In complex domains, durable performance comes less from claiming definitive knowledge and more from designing institutions that learn before mistakes harden into doctrine.`,
    `For practitioners, the practical implication is methodological humility paired with procedural precision. Teams should define what success means at multiple horizons, attach each horizon to suitable indicators, and document why each indicator is only a proxy. They should also pre-commit to what evidence would falsify a favored strategy. These habits convert abstract caution into operational behavior. Over many cycles, the cumulative advantage is substantial: fewer abrupt reversals, faster correction when assumptions fail, and greater trust that decisions are responsive to evidence rather than to status preservation.`,
  ];

  return paragraphs.slice(0, paragraphCount).join("\n\n");
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}


function buildQuestions(domain: string, level: number, topic: string) {
  return [
    {
      type: "main_idea" as const,
      stem: `What is the passage's main claim about decision-making in ${domain} contexts?`,
      options: [
        "Reliable policy requires routines that allow transparent revision under uncertainty.",
        "Institutions should delay decisions until uncertainty is eliminated.",
        "Short-term metrics are always superior to long-term indicators.",
        "Disagreement mostly reflects poor technical skill among analysts.",
      ],
      correct_index: 0,
    },
    {
      type: "inference" as const,
      stem: `Based on the discussion of ${topic}, which inference is most supported?`,
      options: [
        "If revision triggers are explicit, course corrections become more feasible.",
        "Complex systems can be controlled only through centralized authority.",
        "Quantitative indicators necessarily capture institutional goals fully.",
        "Uncertainty disappears when teams increase reporting frequency.",
      ],
      correct_index: 0,
    },
    {
      type: "vocab" as const,
      stem: "In context, the word 'epistemic' most nearly refers to:",
      options: [
        "related to how knowledge is formed and justified",
        "driven by emotional preference",
        "organized by administrative hierarchy",
        "focused on geographic expansion",
      ],
      correct_index: 0,
    },
  ];
}

async function main() {
  console.log("🌱 Seeding database...");

  // Replace previous template seed content so dev users immediately see realistic passages.
  await prisma.response.deleteMany({ where: { session: { passage: { generated_by: "seed" } } } });
  await prisma.session.deleteMany({ where: { passage: { generated_by: "seed" } } });
  await prisma.userPassageSeen.deleteMany({ where: { passage: { generated_by: "seed" } } });
  await prisma.question.deleteMany({ where: { passage: { generated_by: "seed" } } });
  await prisma.passage.deleteMany({ where: { generated_by: "seed" } });

  const passagesPerDomainLevel = 10;

  for (const domain of DOMAINS) {
    for (const level of LEVELS) {
      console.log(`  - Seeding ${passagesPerDomainLevel} passages for ${domain} L${level}`);

      for (let i = 0; i < passagesPerDomainLevel; i++) {
        const topic = DOMAIN_TOPICS[domain][i % DOMAIN_TOPICS[domain].length];
        const body = buildPassage(domain, level, i);
        const word_count = countWords(body);
        const quality = evaluatePassageQuality({
          body,
          word_count,
          questionCount: 3,
          source: "seed",
        });

        await prisma.passage.create({
          data: {
            body,
            word_count,
            domain: domain as any,
            level,
            generated_by: "seed",
            source: "seed",
            status: quality.status,
            quality_score: quality.quality_score,
            topic_key: quality.topic_key,
            hash: crypto.createHash("sha256").update(`${domain}-${level}-${i}-${body}`).digest("hex"),
            questions: {
              create: buildQuestions(domain, level, topic),
            },
          },
        });
      }
    }
  }

  console.log("✅ Seeding complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
