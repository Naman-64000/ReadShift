/**
 * client/src/lib/drillTexts.ts
 *
 * Static bank of high-difficulty drill texts for Subvocalization Metronome Drills.
 * Paired with challenging active-recall checks.
 *
 * Tier structure:
 *  L1 – 180 WPM, 2-word chunks, 180s  — Rhythm & regression reduction
 *  L2 – 220 WPM, 2-word chunks, 180s  — Processing speed boost
 *  L3 – 260 WPM, 3-word chunks, 150s  — Phrase-level reading
 *  L4 – 320 WPM, 3-word chunks, 120s  — CAT-target speed
 *  L5 – 400 WPM, 4-word chunks,  60s  — Overload / sprint training
 *  L6 – Exam Simulation (unmodified CAT layout, no metronome)
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
  id: "stage1" | "stage2" | "stage3" | "stage4" | "stage5" | "stage6";
  label: string;
  targetWpm: number;
  chunkSize: number;
  /** Recommended practice duration in seconds */
  durationSec: number;
  description: string;
  hint: string;
  color: "rose" | "cyan" | "emerald" | "amber" | "violet" | "indigo";
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

// ── L1 Texts: 180 WPM — Rhythm & Regression Reduction ──────────────────────

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
    "The Copenhagen interpretation of quantum mechanics asserts that physical systems lack definite properties prior to measurement, existing instead in a state of probability wave superposition. Einstein famously objected to this probabilistic framework, arguing that the universe is governed by objective realism. Modern Bell inequality tests, however, consistently support the Copenhagen paradigm, demonstrating that local hidden variables cannot account for quantum entanglement.",
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

// ── L2 Texts: 220 WPM — Processing Speed Boost ─────────────────────────────

const tier2Texts: DrillText[] = [
  makeDrill(
    "t2-01",
    "Computational functionalism posits that human consciousness is fundamentally an algorithmic system, suggesting that mental states are defined solely by their functional roles. Critics counter with the 'qualia' objection, arguing that subjective, first-person experiences — such as the qualitative sensation of seeing red — cannot be reduced to computational inputs and outputs. This explanatory gap remains the central paradox in modern philosophy of mind.",
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

// ── L3 Texts: 260 WPM — Phrase-Level Reading ────────────────────────────────

const tier3Texts: DrillText[] = [
  makeDrill(
    "t3-01",
    "Behavioral economics identifies a systematic conflict between the planning self and the impulsive self in financial decisions. Short-term emotional states predictably override long-term rational preferences, leading individuals into suboptimal debt cycles. Architects of retirement savings systems exploit commitment devices — automatic enrollment and escalation clauses — to counteract this temporal inconsistency and promote sustained wealth accumulation.",
    "What mechanism do savings architects use to counter temporal inconsistency?",
    ["High-interest penalty structures for early withdrawal", "Commitment devices like auto-enrollment and escalation"],
    1
  ),
  makeDrill(
    "t3-02",
    "The emergence of platform capitalism has fundamentally disrupted traditional value chains by interposing digital intermediaries between producers and consumers. These platforms extract rents not through production but through the control of proprietary data ecosystems. Antitrust frameworks developed for industrial markets struggle to address network-effect monopolies where market dominance is self-reinforcing through user accumulation rather than through capital accumulation.",
    "Why do traditional antitrust frameworks struggle with platform capitalism?",
    ["Platforms use capital accumulation to suppress competitors", "Platform monopolies are driven by self-reinforcing network effects"],
    1
  ),
  makeDrill(
    "t3-03",
    "Immunological research now recognizes the microbiome as a co-evolutionary partner rather than a passive passenger in human biology. Gut bacteria actively modulate immune responses, synthesize neuroactive compounds, and regulate metabolic pathways in ways previously attributed exclusively to host genetics. This bidirectional communication axis — the gut-brain axis — challenges the boundary between self and non-self in organismal biology.",
    "What does the gut-brain axis challenge in conventional biology?",
    ["The origin of neuroactive compounds in the central cortex", "The strict boundary between self and non-self in organisms"],
    1
  ),
  makeDrill(
    "t3-04",
    "Post-colonial historians argue that mercantilist policies did not merely seek national trade surpluses. Instead, they served as institutional weapons of structural wealth extraction. By forcing colonies to export raw materials at artificially low prices and import finished manufactures at inflated rates, imperial powers suppressed local industrialization. This created a persistent dependency that hindered post-colonial economic development for generations.",
    "How did mercantilist policies affect colonial economies according to historians?",
    ["By suppressing local industrialization via structural wealth extraction", "By fostering competitive, high-margin export-oriented colonial manufacturing"],
    0
  ),
  makeDrill(
    "t3-05",
    "Game theory models of nuclear deterrence rest on the assumption that actors are rational utility-maximizers. However, organizational behavior research reveals that bureaucratic inertia, command-control failures, and misperception systematically undermine this rationality assumption. This creates a dangerous gap between deterrence theory, which assumes rational actors, and deterrence practice, which must account for systemic institutional failures.",
    "What gap does organizational behavior research reveal in deterrence theory?",
    ["Rational actor assumptions vs. institutional failure in practice", "Military spending levels vs. deterrence effectiveness"],
    0
  ),
];

// ── L4 Texts: 320 WPM — CAT-Target Speed Development ───────────────────────

const tier4Texts: DrillText[] = [
  makeDrill(
    "t4-01",
    "The ascension of generative AI models provokes a philosophical re-evaluation of creative authorship. Traditional aesthetics link artistic value to conscious intentionality, requiring the artist to possess a subjective experience. Generative algorithms, lacking consciousness, output complex works via probability distributions. Critics argue this separates output from authorship, reducing AI creations to high-fidelity statistical collages devoid of genuine artistic intent.",
    "What core requirement of traditional aesthetics does generative AI challenge?",
    ["High-fidelity digital image resolution", "Conscious intentionality and subjective experience"],
    1
  ),
  makeDrill(
    "t4-02",
    "Cephalopod intelligence challenges the vertebrate-centric paradigm of cognitive evolution. While human cognition is highly centralized within a single brain, an octopus possesses a decentralized nervous system. Two-thirds of its neurons reside in its arms, which can execute complex tactile tasks independently of the central brain. This decentralized architecture demonstrates that sophisticated problem-solving can evolve through radically different structural configurations.",
    "What does the cephalopod nervous system demonstrate about cognitive evolution?",
    ["Intelligence requires centralized brain structures", "Complex cognition can evolve via decentralized architecture"],
    1
  ),
  makeDrill(
    "t4-03",
    "Environmental, Social, and Governance (ESG) investing faces systemic greenwashing challenges. In the absence of standardized reporting regulations, companies exploit flexible ESG metrics to construct favorable public narratives. This lack of transparency allows high-emissions firms to attract low-cost capital, distorting market allocations. Economists demand standardized, third-party audited carbon disclosure indices to restore genuine market efficiency.",
    "What is the primary barrier to market efficiency in ESG investing?",
    ["A lack of standardized, audited carbon disclosure metrics", "Excessive regulatory burdens and strict third-party audits"],
    0
  ),
  makeDrill(
    "t4-04",
    "Structural linguistics distinguishes between langue — the abstract system of grammatical rules shared by a speech community — and parole, the concrete act of speaking by individuals. Saussure argued that meaning is relational, not referential: words derive significance not from objects they label but from their position within a network of oppositions. This paradigm shift moved linguistics away from historical etymology toward synchronic structural analysis.",
    "According to Saussure, how do words derive meaning?",
    ["From historical etymological roots and object labeling", "From relational positions within a system of oppositions"],
    1
  ),
  makeDrill(
    "t4-05",
    "The efficient market hypothesis holds that asset prices instantaneously incorporate all available information, making sustained outperformance through active management statistically impossible. Critics point to documented momentum anomalies, where past-winner stocks continue outperforming past-losers for six to twelve months — a pattern inconsistent with strong-form efficiency. Behavioral finance attributes these anomalies to systematic investor cognitive biases rather than to information inefficiencies.",
    "How does behavioral finance explain market momentum anomalies?",
    ["Through institutional information asymmetries and insider trading", "Through systematic investor cognitive biases"],
    1
  ),
];

// ── L5 Texts: 400 WPM — Overload / Sprint Training ──────────────────────────

const tier5Texts: DrillText[] = [
  makeDrill(
    "t5-01",
    "Modern smart-city architecture increasingly incorporates panoptic surveillance and hostile design. By installing physical barriers in public benches and employing facial-recognition networks, municipalities exclude marginalized groups from civic spaces. This defensive spatial design shifts urban planning from social inclusion to security maximization, converting public squares into controlled consumption zones that serve commercial rather than civic interests.",
    "What shift in urban planning does modern defensive spatial design represent?",
    ["From social inclusion to security maximization", "From controlled commercialization to universal public access"],
    0
  ),
  makeDrill(
    "t5-02",
    "The Malthusian catastrophe hypothesis predicted that exponential population growth would inevitably outpace arithmetic food supply growth, condemning humanity to perpetual subsistence-level poverty. The Green Revolution empirically refuted this prediction by engineering high-yield crop varieties that dramatically expanded agricultural carrying capacity. However, critics warn that soil degradation, aquifer depletion, and climate variability may yet vindicate Malthus on a generational timescale.",
    "What do critics argue about the long-term validity of Malthusian predictions?",
    ["Environmental degradation may eventually validate Malthus's model", "Green Revolution gains have permanently disproved the Malthusian thesis"],
    0
  ),
  makeDrill(
    "t5-03",
    "Sovereign debt restructuring operates in a legal vacuum largely absent from domestic bankruptcy frameworks. Unlike corporate debtors, sovereign states cannot be liquidated, and creditor enforcement mechanisms are severely constrained. Collective action clauses in bond agreements attempt to prevent holdout creditors from blocking restructuring deals, but inconsistent adoption across bond vintages creates fragmented creditor landscapes that undermine orderly debt resolution.",
    "What problem do collective action clauses attempt to solve in sovereign debt?",
    ["Preventing holdout creditors from blocking restructuring deals", "Establishing liquidation protocols for insolvent sovereign governments"],
    0
  ),
  makeDrill(
    "t5-04",
    "Cognitive load theory distinguishes between intrinsic load — inherent complexity of the material — and extraneous load, which arises from poorly designed instructional interfaces. Effective pedagogy minimizes extraneous cognitive load by aligning instructional format to the learner's existing schema. The split-attention effect, whereby learners must mentally integrate spatially separated yet conceptually unified information, dramatically inflates extraneous load and suppresses deep learning outcomes.",
    "What does the split-attention effect primarily inflate according to cognitive load theory?",
    ["Intrinsic complexity of the underlying subject matter", "Extraneous cognitive load through spatial information fragmentation"],
    1
  ),
  makeDrill(
    "t5-05",
    "The concept of moral luck challenges the Kantian principle that moral judgment should be based solely on intentions and rational will, independent of outcomes. Thomas Nagel identified four types of moral luck — resultant, circumstantial, constitutive, and causal — each showing that factors beyond an agent's control systematically influence moral assessments. This creates a deep tension in the legal and philosophical treatment of responsibility and culpability.",
    "What tension does moral luck create in philosophy and law?",
    ["Between universal moral principles and culturally relative ethics", "Between intention-based responsibility and outcome-influenced moral assessment"],
    1
  ),
];

// ── L6 Texts: Exam Simulation (Original Stage 3) ────────────────────────────

const tier6Texts: DrillText[] = [
  makeDrill(
    "t6-01",
    "The ascension of generative AI models provokes a philosophical re-evaluation of creative authorship. Traditional aesthetics link artistic value to conscious intentionality, requiring the artist to possess a subjective experience. Generative algorithms, lacking consciousness, output complex works via probability distributions. Critics argue this separates output from authorship, reducing AI creations to high-fidelity statistical collages.",
    "What core requirement of traditional aesthetics does generative AI challenge?",
    ["High-fidelity digital image resolution", "Conscious intentionality and subjective experience"],
    1
  ),
  makeDrill(
    "t6-02",
    "Cephalopod intelligence challenges the vertebrate-centric paradigm of cognitive evolution. While human cognition is highly centralized within a single brain, an octopus possesses a decentralized nervous system. Two-thirds of its neurons reside in its arms, which can execute complex tactile tasks independently of the central brain. This decentralized architecture demonstrates that complex problem-solving can evolve outside a centralized cerebral cortex.",
    "What does the nervous system of the cephalopod demonstrate about cognitive evolution?",
    ["Intelligence requires centralized brain structures", "Complex cognition can evolve via decentralized architecture"],
    1
  ),
  makeDrill(
    "t6-03",
    "Post-colonial historians argue that mercantilist policies did not merely seek national trade surpluses. Instead, they served as institutional weapons of structural wealth extraction. By forcing colonies to export raw materials at artificially low prices and import finished manufactures at inflated rates, imperial powers suppressed local industrialization. This created a persistent dependency that hindered post-colonial economic development.",
    "How did mercantilist policies affect colonial economies according to historians?",
    ["By suppressing local industrialization via structural wealth extraction", "By fostering competitive, high-margin export-oriented colonial manufacturing"],
    0
  ),
  makeDrill(
    "t6-04",
    "Environmental, Social, and Governance (ESG) investing faces systemic greenwashing challenges. In the absence of standardized reporting regulations, companies exploit flexible ESG metrics to construct favorable public narratives. This lack of transparency allows high-emissions firms to attract low-cost capital, distorting market allocations. To restore market efficiency, economists demand standardized, third-party audited carbon disclosure indices.",
    "What is the primary barrier to market efficiency in ESG investing?",
    ["A lack of standardized, audited carbon disclosure metrics", "Excessive regulatory burdens and strict third-party audits"],
    0
  ),
  makeDrill(
    "t6-05",
    "Modern smart-city architecture increasingly incorporates panoptic surveillance and hostile design. By installing physical barriers in public benches and employing facial-recognition networks, municipalities exclude marginalized groups from civic spaces. This defensive spatial design shifts urban planning from social inclusion to security maximization, converting public squares into controlled consumption zones.",
    "What shift in urban planning does modern defensive spatial design represent?",
    ["From social inclusion to security maximization", "From controlled commercialization to universal public access"],
    0
  ),
];

// ── Exported Tiers ────────────────────────────────────────────────────────────

export const DRILL_TIERS: DrillTier[] = [
  {
    id: "stage1",
    label: "L1 — Rhythm Foundation",
    targetWpm: 180,
    chunkSize: 2,
    durationSec: 180,
    description: "2-word RSVP chunks at 180 WPM. Build a steady reading rhythm and eliminate regressions.",
    hint: "Lock eyes on the center and let each pair of words land. Don't re-read — trust the rhythm.",
    color: "rose",
    texts: tier1Texts,
  },
  {
    id: "stage2",
    label: "L2 — Speed Activation",
    targetWpm: 220,
    chunkSize: 2,
    durationSec: 180,
    description: "2-word chunks at 220 WPM. Accelerate raw processing speed while preserving semantic intake.",
    hint: "Same chunk size, higher velocity. Feel the pace climb — no regressions allowed.",
    color: "cyan",
    texts: tier2Texts,
  },
  {
    id: "stage3",
    label: "L3 — Phrase Reading",
    targetWpm: 260,
    chunkSize: 3,
    durationSec: 150,
    description: "3-word RSVP chunks at 260 WPM. Begin reading in meaningful phrase units for deeper retention.",
    hint: "Three words = a thought fragment. Let meaning arrive in phrases, not individual words.",
    color: "indigo",
    texts: tier3Texts,
  },
  {
    id: "stage4",
    label: "L4 — CAT Speed",
    targetWpm: 320,
    chunkSize: 3,
    durationSec: 120,
    description: "3-word chunks at 320 WPM. Simulate the reading pace required to complete the CAT RC section.",
    hint: "This is your target exam speed. Hold comprehension — if it breaks, drop to L3 and rebuild.",
    color: "amber",
    texts: tier4Texts,
  },
  {
    id: "stage5",
    label: "L5 — Overload Sprint",
    targetWpm: 400,
    chunkSize: 4,
    durationSec: 60,
    description: "4-word chunks at 400 WPM. Deliberate overload training that makes 320 WPM feel comfortable.",
    hint: "You will miss meaning at this speed — that's the point. Overload your system so exam pace feels slow.",
    color: "violet",
    texts: tier5Texts,
  },
  {
    id: "stage6",
    label: "L6 — Exam Simulation",
    targetWpm: 300,
    chunkSize: 0,
    durationSec: 120,
    description: "Identical to CAT: clean white background, no metronome, no highlights, immediate quiz.",
    hint: "Pure exam layout. No visual aids — just you, the text, and the clock. Hold comprehension.",
    color: "emerald",
    texts: tier6Texts,
  },
];

export const DRILL_TIER_MAP: Record<DrillTier["id"], DrillTier> = Object.fromEntries(
  DRILL_TIERS.map((t) => [t.id, t])
) as Record<DrillTier["id"], DrillTier>;
