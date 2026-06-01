/**
 * client/src/lib/drillTexts.ts
 *
 * Static bank of high-difficulty drill texts for Subvocalization Metronome Drills.
 * Paired with challenging active-recall checks.
 */

export interface DrillText {
  id: string;
  text: string;
  wordCount: number;
  question: {
    stem: string;
    options: [string, string];
    correctIndex: 0 | 1;
  };
}

export interface DrillTier {
  id: "tier1" | "tier2" | "tier3";
  label: string;
  targetWpm: number;
  chunkSize: number;
  description: string;
  hint: string;
  color: "indigo" | "violet" | "cyan";
  texts: DrillText[];
}

// ── Helper ──────────────────────────────────────────────────────────────────

function makeDrill(
  id: string,
  text: string,
  stem: string,
  options: [string, string],
  correctIndex: 0 | 1
): DrillText {
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  return {
    id,
    text: text.trim(),
    wordCount,
    question: { stem, options, correctIndex },
  };
}

// ── Tier 1: 300 WPM — Ignition (Base Pacing Stretch) ──────────────────────

const tier1Texts: DrillText[] = [
  makeDrill(
    "t1-01",
    "Classical foundationalism posits that knowledge is structured as a building, resting upon secure, indubitable foundational beliefs. Yet, this linear structure invites infinite regress skepticism. Coherentism challenges this architectural metaphor, suggesting instead that beliefs are justified mutually within a web-like system of reciprocal support. The primary conceptual difficulty lies in determining whether a coherent web of beliefs must connect to external reality, or if it can remain entirely self-referential.",
    "What conceptual metaphor does coherentism challenge?",
    ["Linear foundational architecture", "Reciprocal web-like systems"],
    0
  ),
  makeDrill(
    "t1-02",
    "The Copenhagen interpretation of quantum mechanics asserts that physical systems lack definite properties prior to measurement, existing instead in a state of probability wave superposition. Einstein famously objected to this probabilistic framework, arguing that the universe is governed by objective realism. Modern Bell inequality tests, however, consistently support the Copenhagen paradigm, demonstrating that local hidden variables cannot account for quantum entanglement, thereby forcing physicists to abandon localized deterministic realism.",
    "What do modern Bell inequality tests demonstrate?",
    ["Local hidden variables are insufficient", "Quantum particles exhibit deterministic trajectories"],
    0
  ),
  makeDrill(
    "t1-03",
    "Revisionist historians argue that the transition to industrial manufacturing did not immediately erode agrarian labor networks. Rather, early factory systems depended heavily on seasonal agricultural rhythms. Workers routinely migrated back to farms during harvest seasons, creating a symbiotic rather than antagonistic labor market. Traditional narratives of sudden urban displacement oversimplify this complex period of industrial integration.",
    "According to revisionist historians, what characterized early industrial integration?",
    ["Symbiotic agricultural-industrial labor migration", "Sudden and permanent urban worker displacement"],
    0
  ),
  makeDrill(
    "t1-04",
    "Hyperbolic discounting models demonstrate that humans exhibit dynamic inconsistency in intertemporal choices. When evaluating rewards, individuals display an extreme preference for immediate payoffs over delayed gratification, even if the future reward is exponentially larger. This bias systematically distorts long-term consumer debt planning, forcing economists to recommend automated institutional savings commitments to correct for inherent human cognitive bias.",
    "How does hyperbolic discounting affect long-term consumer choices?",
    ["It distorts planning via immediate payoff bias", "It stabilizes planning through patient optimization"],
    0
  ),
  makeDrill(
    "t1-05",
    "The panoptic surveillance state relies not on physical walls, but on internalizing constant observation. When citizens believe they are continuously monitored, they self-censor their behaviors, preemptively aligning with state-approved norms. This psychological enforcement mechanism operates with minimal administrative effort, shifting the burden of censorship directly onto the individual's subconscious mind, neutralizing dissent before it can materialize.",
    "How does the panoptic surveillance state primarily enforce compliance?",
    ["By internalizing observation to induce self-censorship", "Through active physical containment of dissenters"],
    0
  ),
];

// ── Tier 2: 400 WPM — Momentum (Advanced Stretch) ─────────────────────────

const tier2Texts: DrillText[] = [
  makeDrill(
    "t2-01",
    "Computational functionalism posits that human consciousness is fundamentally an algorithmic system, suggesting that mental states are defined solely by their functional roles. Critics counter with the 'qualia' objection, arguing that subjective, first-person experiences—such as the qualitative sensation of seeing red—cannot be reduced to computational inputs and outputs. This explanatory gap remains the central paradox in modern philosophy of mind.",
    "What is the primary basis of the 'qualia' objection against computational functionalism?",
    ["Algorithmic efficiency is limited", "Subjective experiences defy computational reduction"],
    1
  ),
  makeDrill(
    "t2-02",
    "Transgenerational epigenetic inheritance challenges classical neo-Darwinian paradigms by showing that environmental stressors can leave biological marks on DNA. These marks alter gene expression across multiple generations without changing the underlying genetic sequence itself. While traditional evolutionary theory asserts that genetic mutation is the sole driver of adaptation, epigenetics reveals a faster, direct physiological response to historical ancestral environments.",
    "How does transgenerational epigenetics differ from traditional neo-Darwinian mutation?",
    ["By introducing direct physiological adaptation without sequence changes", "By relying strictly on slow, random chromosomal sequence mutations"],
    0
  ),
  makeDrill(
    "t2-03",
    "The historiographical debate over Roman decline centers on whether the empire collapsed due to internal moral decay or external barbarian pressure. Modern economic historians offer a third perspective, emphasizing structural resource depletion. They argue that hyper-inflation, agrarian exhaustion, and severe debasement of the silver denarius eroded Roman military logistics, rendering the frontiers undefendable regardless of political leadership.",
    "What factor do modern economic historians emphasize in the Roman decline?",
    ["Political moral decay and external barbarian alliances", "Structural resource depletion and debasement"],
    1
  ),
  makeDrill(
    "t2-04",
    "In digital microtransaction markets, game-theoretic models explain how publishers exploit loss aversion. By creating artificial scarcity and temporal event windows, publishers induce high cognitive anxiety. Consumers feel compelled to purchase cosmetic digital assets not because they value them highly, but because they fear the regret of missing out. This asymmetry in player-firm information distorts rational equilibrium pricing.",
    "How do publishers leverage game theory in digital microtransactions?",
    ["By offering symmetric and transparent product utility", "By exploiting loss aversion and artificial scarcity"],
    1
  ),
  makeDrill(
    "t2-05",
    "Modern social algorithms maximize engagement by amplifying controversial narratives. When exposed to polarizing content, users experience heightened emotional arousal, which increases their likelihood of sharing. This feedback loop creates isolated echo chambers, driving social polarization. The primary driver is not ideological malice, but the algorithmic commodification of human attention.",
    "What is the primary systemic cause of echo chambers in modern networks?",
    ["Algorithmic commodification of emotional engagement", "Widespread ideological malice and coordinated state censorship"],
    0
  ),
];

// ── Tier 3: 500 WPM — Elite (Maximum Peak Stretch) ───────────────────────

const tier3Texts: DrillText[] = [
  makeDrill(
    "t3-01",
    "The ascension of generative AI models provokes a philosophical re-evaluation of creative authorship. Traditional aesthetics link artistic value to conscious intentionality, requiring the artist to possess a subjective experience. Generative algorithms, lacking consciousness, output complex works via probability distributions. Critics argue this separates output from authorship, reducing AI creations to high-fidelity statistical collages.",
    "What core requirement of traditional aesthetics does generative AI challenge?",
    ["High-fidelity digital image resolution", "Conscious intentionality and subjective experience"],
    1
  ),
  makeDrill(
    "t3-02",
    "Cephalopod intelligence challenges the vertebrate-centric paradigm of cognitive evolution. While human cognition is highly centralized within a single brain, an octopus possesses a decentralized nervous system. Two-thirds of its neurons reside in its arms, which can execute complex tactile tasks independently of the central brain. This decentralized architecture demonstrates that complex problem-solving can evolve outside a centralized cerebral cortex.",
    "What does the nervous system of the cephalopod demonstrate about cognitive evolution?",
    ["Intelligence requires centralized brain structures", "Complex cognition can evolve via decentralized architecture"],
    1
  ),
  makeDrill(
    "t3-03",
    "Post-colonial historians argue that mercantilist policies did not merely seek national trade surpluses. Instead, they served as institutional weapons of structural wealth extraction. By forcing colonies to export raw materials at artificially low prices and import finished manufactures at inflated rates, imperial powers suppressed local industrialization. This created a persistent dependency that hindered post-colonial economic development.",
    "How did mercantilist policies affect colonial economies according to historians?",
    ["By suppressing local industrialization via structural wealth extraction", "By fostering competitive, high-margin export-oriented colonial manufacturing"],
    0
  ),
  makeDrill(
    "t3-04",
    "Environmental, Social, and Governance (ESG) investing faces systemic greenwashing challenges. In the absence of standardized reporting regulations, companies exploit flexible ESG metrics to construct favorable public narratives. This lack of transparency allows high-emissions firms to attract low-cost capital, distorting market allocations. To restore market efficiency, economists demand standardized, third-party audited carbon disclosure indices.",
    "What is the primary barrier to market efficiency in ESG investing?",
    ["A lack of standardized, audited carbon disclosure metrics", "Excessive regulatory burdens and strict third-party audits"],
    0
  ),
  makeDrill(
    "t3-05",
    "Modern smart-city architecture increasingly incorporates panoptic surveillance and hostile design. By installing physical barriers in public benches and employing facial-recognition networks, municipalities exclude marginalized groups from civic spaces. This defensive spatial design shifts urban planning from social inclusion to security maximization, converting public squares into controlled consumption zones.",
    "What shift in urban planning does modern defensive spatial design represent?",
    ["From social inclusion to security maximization", "From controlled commercialization to universal public access"],
    0
  ),
];

// ── Exported Tiers ──────────────────────────────────────────────────────────

export const DRILL_TIERS: DrillTier[] = [
  {
    id: "tier1",
    label: "Ignition",
    targetWpm: 300,
    chunkSize: 2,
    description: "Reasoning-dense prose at 300 WPM",
    hint: "Focus on foveal vision. Banish the inner voice and absorb the analytical blocks.",
    color: "indigo",
    texts: tier1Texts,
  },
  {
    id: "tier2",
    label: "Momentum",
    targetWpm: 400,
    chunkSize: 2,
    description: "Reasoning-dense prose at 400 WPM",
    hint: "Increase your eye fixation width. Capture 2-word groups as single visual shapes.",
    color: "violet",
    texts: tier2Texts,
  },
  {
    id: "tier3",
    label: "Elite",
    targetWpm: 500,
    chunkSize: 2,
    description: "Reasoning-dense prose at 500 WPM",
    hint: "Maximum cognitive threshold. Let foveal scanning lock onto semantic patterns.",
    color: "cyan",
    texts: tier3Texts,
  },
];

export const DRILL_TIER_MAP: Record<DrillTier["id"], DrillTier> = Object.fromEntries(
  DRILL_TIERS.map((t) => [t.id, t])
) as Record<DrillTier["id"], DrillTier>;
