import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface DrillSeedData {
  level: number;
  body: string;
  wordCount: number;
  stem: string;
  options: [string, string];
  correctIndex: number;
}

const drillData: DrillSeedData[] = [
  // ── L1 Texts ──
  {
    level: 1,
    body: "Classical foundationalism posits that knowledge is structured as a building, resting upon secure, indubitable foundational beliefs. Yet, this linear structure invites infinite regress skepticism. Coherentism challenges this architectural metaphor, suggesting instead that beliefs are justified mutually within a web-like system of reciprocal support. The primary conceptual difficulty lies in determining whether a coherent web of beliefs must connect to external reality, or if it can remain entirely self-referential.",
    wordCount: 73,
    stem: "What conceptual metaphor does coherentism challenge?",
    options: ["Linear foundational architecture", "Reciprocal web-like systems"],
    correctIndex: 0
  },
  {
    level: 1,
    body: "The Copenhagen interpretation of quantum mechanics asserts that physical systems lack definite properties prior to measurement, existing instead in a state of probability wave superposition. Einstein famously objected to this probabilistic framework, arguing that the universe is governed by objective realism. Modern Bell inequality tests, however, consistently support the Copenhagen paradigm, demonstrating that local hidden variables cannot account for quantum entanglement.",
    wordCount: 66,
    stem: "What do modern Bell inequality tests demonstrate?",
    options: ["Local hidden variables are insufficient", "Quantum particles exhibit deterministic trajectories"],
    correctIndex: 0
  },
  {
    level: 1,
    body: "Revisionist historians argue that the transition to industrial manufacturing did not immediately erode agrarian labor networks. Rather, early factory systems depended heavily on seasonal agricultural rhythms. Workers routinely migrated back to farms during harvest seasons, creating a symbiotic rather than antagonistic labor market. Traditional narratives of sudden urban displacement oversimplify this complex period of industrial integration.",
    wordCount: 61,
    stem: "According to revisionist historians, what characterized early industrial integration?",
    options: ["Symbiotic agricultural-industrial labor migration", "Sudden and permanent urban worker displacement"],
    correctIndex: 0
  },
  {
    level: 1,
    body: "Hyperbolic discounting models demonstrate that humans exhibit dynamic inconsistency in intertemporal choices. When evaluating rewards, individuals display an extreme preference for immediate payoffs over delayed gratification, even if the future reward is exponentially larger. This bias systematically distorts long-term consumer debt planning, forcing economists to recommend automated institutional savings commitments to correct for inherent human cognitive bias.",
    wordCount: 62,
    stem: "How does hyperbolic discounting affect long-term consumer choices?",
    options: ["It distorts planning via immediate payoff bias", "It stabilizes planning through patient optimization"],
    correctIndex: 0
  },
  {
    level: 1,
    body: "The panoptic surveillance state relies not on physical walls, but on internalizing constant observation. When citizens believe they are continuously monitored, they self-censor their behaviors, preemptively aligning with state-approved norms. This psychological enforcement mechanism operates with minimal administrative effort, shifting the burden of censorship directly onto the individual's subconscious mind, neutralizing dissent before it can materialize.",
    wordCount: 61,
    stem: "How does the panoptic surveillance state primarily enforce compliance?",
    options: ["By internalizing observation to induce self-censorship", "Through active physical containment of dissenters"],
    correctIndex: 0
  },

  // ── L2 Texts ──
  {
    level: 2,
    body: "Computational functionalism posits that human consciousness is fundamentally an algorithmic system, suggesting that mental states are defined solely by their functional roles. Critics counter with the 'qualia' objection, arguing that subjective, first-person experiences — such as the qualitative sensation of seeing red — cannot be reduced to computational inputs and outputs. This explanatory gap remains the central paradox in modern philosophy of mind.",
    wordCount: 67,
    stem: "What is the primary basis of the 'qualia' objection against computational functionalism?",
    options: ["Algorithmic efficiency is limited", "Subjective experiences defy computational reduction"],
    correctIndex: 1
  },
  {
    level: 2,
    body: "Transgenerational epigenetic inheritance challenges classical neo-Darwinian paradigms by showing that environmental stressors can leave biological marks on DNA. These marks alter gene expression across multiple generations without changing the underlying genetic sequence itself. While traditional evolutionary theory asserts that genetic mutation is the sole driver of adaptation, epigenetics reveals a faster, direct physiological response to historical ancestral environments.",
    wordCount: 63,
    stem: "How does transgenerational epigenetics differ from traditional neo-Darwinian mutation?",
    options: ["By introducing direct physiological adaptation without sequence changes", "By relying strictly on slow, random chromosomal sequence mutations"],
    correctIndex: 0
  },
  {
    level: 2,
    body: "The historiographical debate over Roman decline centers on whether the empire collapsed due to internal moral decay or external barbarian pressure. Modern economic historians offer a third perspective, emphasizing structural resource depletion. They argue that hyper-inflation, agrarian exhaustion, and severe debasement of the silver denarius eroded Roman military logistics, rendering the frontiers undefendable regardless of political leadership.",
    wordCount: 61,
    stem: "What factor do modern economic historians emphasize in the Roman decline?",
    options: ["Political moral decay and external barbarian alliances", "Structural resource depletion and debasement"],
    correctIndex: 1
  },
  {
    level: 2,
    body: "In digital microtransaction markets, game-theoretic models explain how publishers exploit loss aversion. By creating artificial scarcity and temporal event windows, publishers induce high cognitive anxiety. Consumers feel compelled to purchase cosmetic digital assets not because they value them highly, but because they fear the regret of missing out. This asymmetry in player-firm information distorts rational equilibrium pricing.",
    wordCount: 61,
    stem: "How do publishers leverage game theory in digital microtransactions?",
    options: ["By offering symmetric and transparent product utility", "By exploiting loss aversion and artificial scarcity"],
    correctIndex: 1
  },
  {
    level: 2,
    body: "Modern social algorithms maximize engagement by amplifying controversial narratives. When exposed to polarizing content, users experience heightened emotional arousal, which increases their likelihood of sharing. This feedback loop creates isolated echo chambers, driving social polarization. The primary driver is not ideological malice, but the algorithmic commodification of human attention.",
    wordCount: 52,
    stem: "What is the primary systemic cause of echo chambers in modern networks?",
    options: ["Algorithmic commodification of emotional engagement", "Widespread ideological malice and coordinated state censorship"],
    correctIndex: 0
  },

  // ── L3 Texts ──
  {
    level: 3,
    body: "Behavioral economics identifies a systematic conflict between the planning self and the impulsive self in financial decisions. Short-term emotional states predictably override long-term rational preferences, leading individuals into suboptimal debt cycles. Architects of retirement savings systems exploit commitment devices — automatic enrollment and escalation clauses — to counteract this temporal inconsistency and promote sustained wealth accumulation.",
    wordCount: 57,
    stem: "What mechanism do savings architects use to counter temporal inconsistency?",
    options: ["High-interest penalty structures for early withdrawal", "Commitment devices like auto-enrollment and escalation"],
    correctIndex: 1
  },
  {
    level: 3,
    body: "The emergence of platform capitalism has fundamentally disrupted traditional value chains by interposing digital intermediaries between producers and consumers. These platforms extract rents not through production but through the control of proprietary data ecosystems. Antitrust frameworks developed for industrial markets struggle to address network-effect monopolies where market dominance is self-reinforcing through user accumulation rather than through capital accumulation.",
    wordCount: 61,
    stem: "Why do traditional antitrust frameworks struggle with platform capitalism?",
    options: ["Platforms use capital accumulation to suppress competitors", "Platform monopolies are driven by self-reinforcing network effects"],
    correctIndex: 1
  },
  {
    level: 3,
    body: "Immunological research now recognizes the microbiome as a co-evolutionary partner rather than a passive passenger in human biology. Gut bacteria actively modulate immune responses, synthesize neuroactive compounds, and regulate metabolic pathways in ways previously attributed exclusively to host genetics. This bidirectional communication axis — the gut-brain axis — challenges the boundary between self and non-self in organismal biology.",
    wordCount: 57,
    stem: "What does the gut-brain axis challenge in conventional biology?",
    options: ["Refining neuroactive compound synthesis in the central cortex", "The strict boundary between self and non-self in organisms"],
    correctIndex: 1
  },
  {
    level: 3,
    body: "Post-colonial historians argue that mercantilist policies did not merely seek national trade surpluses. Instead, they served as institutional weapons of structural wealth extraction. By forcing colonies to export raw materials at artificially low prices and import finished manufactures at inflated rates, imperial powers suppressed local industrialization. This created a persistent dependency that hindered post-colonial economic development for generations.",
    wordCount: 63,
    stem: "How did mercantilist policies affect colonial economies according to historians?",
    options: ["By suppressing local industrialization via structural wealth extraction", "By fostering competitive, high-margin export-oriented colonial manufacturing"],
    correctIndex: 0
  },
  {
    level: 3,
    body: "Game theory models of nuclear deterrence rest on the assumption that actors are rational utility-maximizers. However, organizational behavior research reveals that bureaucratic inertia, command-control failures, and misperception systematically undermine this rationality assumption. This creates a dangerous gap between deterrence theory, which assumes rational actors, and deterrence practice, which must account for systemic institutional failures.",
    wordCount: 57,
    stem: "What gap does organizational behavior research reveal in deterrence theory?",
    options: ["Rational actor assumptions vs. institutional failure in practice", "Military spending levels vs. deterrence effectiveness"],
    correctIndex: 0
  },

  // ── L4 Texts ──
  {
    level: 4,
    body: "The ascension of generative AI models provokes a philosophical re-evaluation of creative authorship. Traditional aesthetics link artistic value to conscious intentionality, requiring the artist to possess a subjective experience. Generative algorithms, lacking consciousness, output complex works via probability distributions. Critics argue this separates output from authorship, reducing AI creations to high-fidelity statistical collages devoid of genuine artistic intent.",
    wordCount: 63,
    stem: "What core requirement of traditional aesthetics does generative AI challenge?",
    options: ["High-fidelity digital image resolution", "Conscious intentionality and subjective experience"],
    correctIndex: 1
  },
  {
    level: 4,
    body: "Cephalopod intelligence challenges the vertebrate-centric paradigm of cognitive evolution. While human cognition is highly centralized within a single brain, an octopus possesses a decentralized nervous system. Two-thirds of its neurons reside in its arms, which can execute complex tactile tasks independently of the central brain. This decentralized architecture demonstrates that sophisticated problem-solving can evolve through radically different structural configurations.",
    wordCount: 60,
    stem: "What does the cephalopod nervous system demonstrate about cognitive evolution?",
    options: ["Intelligence requires centralized brain structures", "Complex cognition can evolve via decentralized architecture"],
    correctIndex: 1
  },
  {
    level: 4,
    body: "Environmental, Social, and Governance (ESG) investing faces systemic greenwashing challenges. In the absence of standardized reporting regulations, companies exploit flexible ESG metrics to construct favorable public narratives. This lack of transparency allows high-emissions firms to attract low-cost capital, distorting market allocations. Economists demand standardized, third-party audited carbon disclosure indices to restore genuine market efficiency.",
    wordCount: 57,
    stem: "What is the primary barrier to market efficiency in ESG investing?",
    options: ["A lack of standardized, audited carbon disclosure metrics", "Excessive regulatory burdens and strict third-party audits"],
    correctIndex: 0
  },
  {
    level: 4,
    body: "Structural linguistics distinguishes between langue — the abstract system of grammatical rules shared by a speech community — and parole, the concrete act of speaking by individuals. Saussure argued that meaning is relational, not referential: words derive significance not from objects they label but from their position within a network of oppositions. This paradigm shift moved linguistics away from historical etymology toward synchronic structural analysis.",
    wordCount: 66,
    stem: "According to Saussure, how do words derive meaning?",
    options: ["From historical etymological roots and object labeling", "From relational positions within a system of oppositions"],
    correctIndex: 1
  },
  {
    level: 4,
    body: "The efficient market hypothesis holds that asset prices instantaneously incorporate all available information, making sustained outperformance through active management statistically impossible. Critics point to documented momentum anomalies, where past-winner stocks continue outperforming past-losers for six to twelve months — a pattern inconsistent with strong-form efficiency. Behavioral finance attributes these anomalies to systematic investor cognitive biases rather than to information inefficiencies.",
    wordCount: 65,
    stem: "How does behavioral finance explain market momentum anomalies?",
    options: ["Through institutional information asymmetries and insider trading", "Through systematic investor cognitive biases"],
    correctIndex: 1
  },

  // ── L5 Texts ──
  {
    level: 5,
    body: "Modern smart-city architecture increasingly incorporates panoptic surveillance and hostile design. By installing physical barriers in public benches and employing facial-recognition networks, municipalities exclude marginalized groups from civic spaces. This defensive spatial design shifts urban planning from social inclusion to security maximization, converting public squares into controlled consumption zones that serve commercial rather than civic interests.",
    wordCount: 59,
    stem: "What shift in urban planning does modern defensive spatial design represent?",
    options: ["From social inclusion to security maximization", "From controlled commercialization to universal public access"],
    correctIndex: 0
  },
  {
    level: 5,
    body: "The Malthusian catastrophe hypothesis predicted that exponential population growth would inevitably outpace arithmetic food supply growth, condemning humanity to perpetual subsistence-level poverty. The Green Revolution empirically refuted this prediction by engineering high-yield crop varieties that dramatically expanded agricultural carrying capacity. However, critics warn that soil degradation, aquifer depletion, and climate variability may yet vindicate Malthus on a generational timescale.",
    wordCount: 62,
    stem: "What do critics argue about the long-term validity of Malthusian predictions?",
    options: ["Environmental degradation may eventually validate Malthus's model", "Green Revolution gains have permanently disproved the Malthusian thesis"],
    correctIndex: 0
  },
  {
    level: 5,
    body: "Sovereign debt restructuring operates in a legal vacuum largely absent from domestic bankruptcy frameworks. Unlike corporate debtors, sovereign states cannot be liquidated, and creditor enforcement mechanisms are severely constrained. Collective action clauses in bond agreements attempt to prevent holdout creditors from blocking restructuring deals, but inconsistent adoption across bond vintages creates fragmented creditor landscapes that undermine orderly debt resolution.",
    wordCount: 61,
    stem: "What problem do collective action clauses attempt to solve in sovereign debt?",
    options: ["Preventing holdout creditors from blocking restructuring deals", "Establishing liquidation protocols for insolvent sovereign governments"],
    correctIndex: 0
  },
  {
    level: 5,
    body: "Cognitive load theory distinguishes between intrinsic load — inherent complexity of the material — and extraneous load, which arises from poorly designed instructional interfaces. Effective pedagogy minimizes extraneous cognitive load by aligning instructional format to the learner's existing schema. The split-attention effect, whereby learners must mentally integrate spatially separated yet conceptually unified information, dramatically inflates extraneous load and suppresses deep learning outcomes.",
    wordCount: 62,
    stem: "What does the split-attention effect primarily inflate according to cognitive load theory?",
    options: ["Intrinsic complexity of the underlying subject matter", "Extraneous cognitive load through spatial information fragmentation"],
    correctIndex: 1
  },
  {
    level: 5,
    body: "The concept of moral luck challenges the Kantian principle that moral judgment should be based solely on intentions and rational will, independent of outcomes. Thomas Nagel identified four types of moral luck — resultant, circumstantial, constitutive, and causal — each showing that factors beyond an agent's control systematically influence moral assessments. This creates a deep tension in the legal and philosophical treatment of responsibility and culpability.",
    wordCount: 66,
    stem: "What tension does moral luck create in philosophy and law?",
    options: ["Between universal moral principles and culturally relative ethics", "Between intention-based responsibility and outcome-influenced moral assessment"],
    correctIndex: 1
  },

  // ── L6 Texts ──
  {
    level: 6,
    body: "The ascension of generative AI models provokes a philosophical re-evaluation of creative authorship. Traditional aesthetics link artistic value to conscious intentionality, requiring the artist to possess a subjective experience. Generative algorithms, lacking consciousness, output complex works via probability distributions. Critics argue this separates output from authorship, reducing AI creations to high-fidelity statistical collages.",
    wordCount: 56,
    stem: "What core requirement of traditional aesthetics does generative AI challenge?",
    options: ["High-fidelity digital image resolution", "Conscious intentionality and subjective experience"],
    correctIndex: 1
  },
  {
    level: 6,
    body: "Cephalopod intelligence challenges the vertebrate-centric paradigm of cognitive evolution. While human cognition is highly centralized within a single brain, an octopus possesses a decentralized nervous system. Two-thirds of its neurons reside in its arms, which can execute complex tactile tasks independently of the central brain. This decentralized architecture demonstrates that complex problem-solving can evolve outside a centralized cerebral cortex.",
    wordCount: 59,
    stem: "What does the nervous system of the cephalopod demonstrate about cognitive evolution?",
    options: ["Intelligence requires centralized brain structures", "Complex cognition can evolve via decentralized architecture"],
    correctIndex: 1
  },
  {
    level: 6,
    body: "Post-colonial historians argue that mercantilist policies did not merely seek national trade surpluses. Instead, they served as institutional weapons of structural wealth extraction. By forcing colonies to export raw materials at artificially low prices and import finished manufactures at inflated rates, imperial powers suppressed local industrialization. This created a persistent dependency that hindered post-colonial economic development.",
    wordCount: 56,
    stem: "How did mercantilist policies affect colonial economies according to historians?",
    options: ["By suppressing local industrialization via structural wealth extraction", "By fostering competitive, high-margin export-oriented colonial manufacturing"],
    correctIndex: 0
  },
  {
    level: 6,
    body: "Environmental, Social, and Governance (ESG) investing faces systemic greenwashing challenges. In the absence of standardized reporting regulations, companies exploit flexible ESG metrics to construct favorable public narratives. This lack of transparency allows high-emissions firms to attract low-cost capital, distorting market allocations. To restore market efficiency, economists demand standardized, third-party audited carbon disclosure indices.",
    wordCount: 55,
    stem: "What is the primary barrier to market efficiency in ESG investing?",
    options: ["A lack of standardized, audited carbon disclosure metrics", "Excessive regulatory burdens and strict third-party audits"],
    correctIndex: 0
  },
  {
    level: 6,
    body: "Modern smart-city architecture increasingly incorporates panoptic surveillance and hostile design. By installing physical barriers in public benches and employing facial-recognition networks, municipalities exclude marginalized groups from civic spaces. This defensive spatial design shifts urban planning from social inclusion to security maximization, converting public squares into controlled consumption zones.",
    wordCount: 52,
    stem: "What shift in urban planning does modern defensive spatial design represent?",
    options: ["From social inclusion to security maximization", "From controlled commercialization to universal public access"],
    correctIndex: 0
  }
];

async function main() {
  console.log("🚀 Seeding drill passages...");
  let count = 0;
  for (const item of drillData) {
    // Check if a drill passage with the exact body already exists
    const existing = await prisma.drillPassage.findFirst({
      where: {
        level: item.level,
        body: item.body
      }
    });

    if (!existing) {
      await prisma.drillPassage.create({
        data: {
          level: item.level,
          body: item.body,
          word_count: item.wordCount,
          question_stem: item.stem,
          options: item.options,
          correct_index: item.correctIndex,
          source: "seed"
        }
      });
      count++;
    }
  }

  console.log(`🎉 Seeded ${count} new drill passages successfully!`);
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
