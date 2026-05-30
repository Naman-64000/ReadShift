/**
 * client/src/lib/drillTexts.ts
 *
 * Static bank of drill texts for Subvocalization Metronome Drills.
 *
 * Design principles:
 *  - Texts use only high-frequency, common English words (sight words, function words,
 *    simple nouns and verbs). The goal is ZERO cognitive load on meaning — the brain
 *    should process symbols visually without phonetic relay.
 *  - Texts are short (40–65 words) so a single drill takes 5–15 seconds at target speed.
 *  - Three tiers of target WPM: 500 / 650 / 800.
 *  - Multiple texts per tier allow rotation so the user never reads the same thing twice.
 */

export interface DrillText {
  id: string;
  text: string;
  wordCount: number;
}

export interface DrillTier {
  id: "tier1" | "tier2" | "tier3";
  label: string;
  targetWpm: number;
  chunkSize: 2;
  description: string;
  hint: string;
  color: "indigo" | "violet" | "cyan";
  texts: DrillText[];
}

// ── Helper ──────────────────────────────────────────────────────────────────

function makeDrill(id: string, text: string): DrillText {
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  return { id, text: text.trim(), wordCount };
}

// ── Tier 1: 500 WPM — Ultra-simple sight words & function phrases ──────────

const tier1Texts: DrillText[] = [
  makeDrill("t1-01",
    "He is here. She was there. They went up and down. We can see the big red ball. " +
    "It is my book. You have it. The dog runs. A cat sat. I run fast. We go now. " +
    "Look at me. Come and see. He had a hat. The sun is hot. It was a good day."
  ),
  makeDrill("t1-02",
    "The man and the woman walk to the park. A boy and a girl sit on a bench. " +
    "The sky is blue. The grass is green. The dog runs to the tree. A bird sings. " +
    "It is a warm day. They feel happy. She laughs. He smiles. They go home."
  ),
  makeDrill("t1-03",
    "I woke up and got out of bed. I washed my face and ate some food. " +
    "Then I put on my coat and went out the door. The sun was up and the air was cool. " +
    "I walked to the bus stop and got on the bus. It took me to work. I sat at my desk."
  ),
  makeDrill("t1-04",
    "We had fun at the park. We ran and we jumped. We sat in the grass and ate our lunch. " +
    "The sun was warm on our skin. A dog came to us and we played with it. " +
    "Then we went home and had a rest. It was a good day. We want to go back."
  ),
  makeDrill("t1-05",
    "She put the cup on the table. He took the book off the shelf. " +
    "They sat down and started to read. The room was quiet. The light was soft. " +
    "A clock on the wall made a tick tick tick sound. Time went by. The sun went down. " +
    "They put the books away and got ready for bed."
  ),
];

// ── Tier 2: 650 WPM — Common everyday vocabulary & flowing prose ───────────

const tier2Texts: DrillText[] = [
  makeDrill("t2-01",
    "Every morning the city comes alive with motion. Buses roll through wide streets, " +
    "people step out of doorways and head toward their destinations with purpose. " +
    "Coffee shops fill with the warm scent of roasting beans. A dog walker rounds the corner. " +
    "Children with backpacks march toward school. The rhythm of the day begins, steady and familiar."
  ),
  makeDrill("t2-02",
    "The kitchen smells like garlic and butter. A pan sizzles on the stove. " +
    "She chops the tomatoes with a sharp knife, her movements confident and quick. " +
    "He pours two glasses of water and sets the table. Music plays softly from a small speaker on the counter. " +
    "Outside, the sun goes down and the sky turns orange and pink. Dinner is almost ready."
  ),
  makeDrill("t2-03",
    "Reading every day builds a strong vocabulary and a sharper mind. " +
    "When you read fast, you train your eyes to move across lines without hesitation. " +
    "Your brain begins to recognize words as images rather than sounds. " +
    "This is the key insight behind visual word processing. Practice makes the patterns stick. " +
    "Speed comes naturally when anxiety disappears and trust in the eyes grows."
  ),
  makeDrill("t2-04",
    "The library was quiet on a Tuesday afternoon. Rows of shelves held thousands of stories. " +
    "A student opened a heavy book and ran her finger along the page. " +
    "An old man dozed in a corner chair, a paperback resting on his chest. " +
    "The librarian moved silently between the aisles, returning books to their places. " +
    "Outside, rain tapped lightly on the tall windows."
  ),
  makeDrill("t2-05",
    "Training your eyes is like training any other muscle. Repetition builds strength. " +
    "Each drill you complete teaches your visual system to move faster with less effort. " +
    "Your comprehension does not drop when you speed up correctly. " +
    "In fact, faster reading often means better focus because the mind stays engaged. " +
    "Slow reading lets the mind wander. Speed keeps it locked on the page."
  ),
];

// ── Tier 3: 800 WPM — Flowing literary prose, still accessible ─────────────

const tier3Texts: DrillText[] = [
  makeDrill("t3-01",
    "The human brain is remarkably adaptive. When trained systematically, it can rewire the pathways " +
    "that govern language processing, shifting from the slower auditory-phonetic route — where words " +
    "are silently sounded out — to the faster visual-semantic route, where meaning arrives directly " +
    "from the shape of words on the page. This shift is the foundation of elite reading performance. " +
    "It does not require extraordinary intelligence. It requires focused, deliberate practice."
  ),
  makeDrill("t3-02",
    "On a clear autumn morning, light arrived through the narrow windows of the study " +
    "and fell in long golden bands across the wooden floor. She sat at the desk where " +
    "her grandfather had once written letters, her fingers resting on the keys of a laptop. " +
    "The contrast of old and new seemed fitting. Ideas from another century meeting the speed " +
    "of a connected world. She began to write. The words came quickly, like water from a spring."
  ),
  makeDrill("t3-03",
    "Competitive examinations reward the reader who can extract precise meaning from dense text " +
    "under strict time pressure. The difference between a good score and an exceptional score " +
    "is often measured in seconds per paragraph. Readers who have developed a visual processing habit " +
    "navigate complex passages with calm efficiency. They absorb the main structure in a first pass " +
    "and return only for specific detail when the question demands it. Speed and strategy combine."
  ),
  makeDrill("t3-04",
    "The ocean at night is a different world entirely. Darkness erases the horizon and " +
    "the water becomes infinite. Stars reflect on the surface in broken, shifting patterns. " +
    "A ship moves slowly through this vastness, its lights tiny against the dark. " +
    "Inside, the crew goes about their routines with practiced ease, the roll of the ship " +
    "a constant companion. Out here, time has a different texture. Days blend into one another."
  ),
  makeDrill("t3-05",
    "Neuroplasticity — the brain's ability to form new connections — is not limited to childhood. " +
    "Adults who pursue consistent cognitive training show measurable changes in the structure " +
    "of their reading networks. The visual word form area, sometimes called the brain's letterbox, " +
    "becomes more efficient with repeated high-speed exposure to text. In practical terms: " +
    "the more you drill at speed, the more automatic and effortless rapid reading becomes. " +
    "The ceiling is higher than most people believe."
  ),
];

// ── Exported Tiers ──────────────────────────────────────────────────────────

export const DRILL_TIERS: DrillTier[] = [
  {
    id: "tier1",
    label: "Ignition",
    targetWpm: 500,
    chunkSize: 2,
    description: "Simple sight words at 500 WPM",
    hint: "Focus on the flash, not the words. Let your eyes absorb patterns.",
    color: "indigo",
    texts: tier1Texts,
  },
  {
    id: "tier2",
    label: "Momentum",
    targetWpm: 650,
    chunkSize: 2,
    description: "Everyday prose at 650 WPM",
    hint: "Stop any inner voice. Follow the beat. Trust your visual cortex.",
    color: "violet",
    texts: tier2Texts,
  },
  {
    id: "tier3",
    label: "Elite",
    targetWpm: 800,
    chunkSize: 2,
    description: "Flowing text at 800 WPM",
    hint: "No phonetic relay. Pure visual acquisition. Be the metronome.",
    color: "cyan",
    texts: tier3Texts,
  },
];

export const DRILL_TIER_MAP: Record<DrillTier["id"], DrillTier> = Object.fromEntries(
  DRILL_TIERS.map((t) => [t.id, t])
) as Record<DrillTier["id"], DrillTier>;
