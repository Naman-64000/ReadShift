/**
 * server/src/data/staticVault.ts
 *
 * Pre-constructed, high-quality fallback passages and assessment MCQs.
 * Used as a failover when active AI pools are exhausted or when the Gemini API is offline/throttled.
 * Contains exactly 20 passages covering all 5 domains and 4 difficulty levels.
 */

export interface VaultQuestion {
  type: "main_idea" | "inference" | "vocab";
  stem: string;
  options: [string, string, string, string];
  correct_index: number;
}

export interface VaultPassage {
  body: string;
  domain: "business" | "science" | "history" | "abstract" | "social";
  level: number;
  topic_key: string;
  questions: [VaultQuestion, VaultQuestion, VaultQuestion];
}

export const staticVault: VaultPassage[] = [
  // ── BUSINESS PASSAGES ──────────────────────────────────────────
  {
    domain: "business",
    level: 1,
    topic_key: "subscription pricing models",
    body: "Debates about pricing power in subscription markets are often framed as technical disagreements, yet the practical challenge is usually institutional. Firms moving from transactional models to recurring pricing structures must reorient their capital allocation. Under traditional transactional sales, revenue is recognized immediately on unit transfer, creating short-term metrics that are legible to oversight boards. In subscription structures, revenue is recognized over months or years, shifting corporate focus to customer lifetime value and churn rates. This dynamic requires executive teams to prioritize long-term customer satisfaction and brand loyalty over immediate, high-volume transactions. When managers fail to appreciate this long-term shift, they underinvest in support and over-rely on promotional discounts, eventually eroding unit profitability.",
    questions: [
      {
        type: "main_idea",
        stem: "What is the main claim of the passage regarding subscription pricing models?",
        options: [
          "Firms adopting recurring pricing must prioritize customer lifetime value over immediate transactional sales.",
          "Subscription markets are fundamentally superior to transactional sales in all business domains.",
          "Short-term metrics are the most reliable indicators of subscription pricing health.",
          "Venture capital firms prefer transactional structures due to immediate revenue recognition."
        ],
        correct_index: 0
      },
      {
        type: "inference",
        stem: "Based on the passage, why might transactional sales be more legible to oversight boards?",
        options: [
          "They result in immediate, full revenue recognition on unit transfer.",
          "They require a lower initial investment in customer support services.",
          "They guarantee a higher customer lifetime value over time.",
          "They eliminate the institutional need for executive team decision-making."
        ],
        correct_index: 0
      },
      {
        type: "vocab",
        stem: "In context, the word 'eroding' most nearly refers to:",
        options: [
          "gradually wearing away or reducing",
          "rapidly accelerating or building",
          "uniquely isolating or separating",
          "randomly fluctuating or changing"
        ],
        correct_index: 0
      }
    ]
  },
  {
    domain: "business",
    level: 2,
    topic_key: "supply chain concentration",
    body: "Modern lean manufacturing emphasizes inventory reduction, yet this practice introduces severe supply-chain concentration risks. By consolidating parts procurement with a single global supplier, firms achieve economies of scale and minimize storage overheads. However, this single-source structure leaves organizations highly vulnerable to localized disruptions, such as natural disasters or geopolitical friction. A delay at a single key node can halt global manufacturing lines, incurring severe financial penalties and brand damage. Proponents of lean strategy argue that specialized supply networks foster deeper collaboration and faster cycle times, which offsets disruption risks. Nevertheless, recent market shocks suggest that absolute efficiency is an fragile optimization goal, and resilient companies are actively introducing parallel, redundant supply lines even at the expense of higher short-run storage costs.",
    questions: [
      {
        type: "main_idea",
        stem: "Which of the following best states the primary focus of the passage?",
        options: [
          "The strategic trade-offs between supply-chain efficiency and vulnerability to disruptions.",
          "The total superiority of redundant supply lines over lean manufacturing.",
          "A historical analysis of natural disasters on global logistics networks.",
          "The mathematical formulas used to calculate optimal inventory levels."
        ],
        correct_index: 0
      },
      {
        type: "inference",
        stem: "The author implies that firms relying on specialized, single-source supply networks are:",
        options: [
          "Overly focused on short-run efficiency at the cost of long-run resilience.",
          "Largely immune to localized geopolitical disruptions.",
          "Unaware of the basic principles of economies of scale.",
          "Completely unable to collaborate effectively with global suppliers."
        ],
        correct_index: 0
      },
      {
        type: "vocab",
        stem: "In context, the word 'offsets' most nearly means:",
        options: [
          "counterbalances or compensates for",
          "actively increases or exacerbates",
          "completely denies or rejects",
          "randomly selects or determines"
        ],
        correct_index: 0
      }
    ]
  },
  {
    domain: "business",
    level: 3,
    topic_key: "capital allocation under uncertainty",
    body: "Corporate capital allocation under uncertain demand represents a complex coordination problem that cannot be solved by mechanical financial metrics alone. While standard tools like discounted cash flow analysis offer a facade of mathematical rigor, they heavily depend on assumptions about future cash flows that are inherently unpredictable. In highly volatile industries, such as biotechnology or renewable energy, rigid adherence to these static quantitative frameworks often leads to severe underinvestment in high-option, high-uncertainty initiatives. Managers seeking to minimize downside risk favor safe, incremental extensions of existing product lines. This risk aversion, while individually rational under standard corporate incentive structures, systematically exposes the firm to disruptive innovation from smaller competitors who operate outside traditional capital budgeting constraints.",
    questions: [
      {
        type: "main_idea",
        stem: "What is the primary thesis of the passage regarding capital allocation?",
        options: [
          "Static financial metrics often fail to guide capital allocation effectively in volatile industries.",
          "Discounted cash flow analysis is the only scientifically valid method for allocating corporate capital.",
          "Smaller competitors succeed because they rely entirely on mechanical financial calculations.",
          "Volatile industries should completely abandon quantitative budgeting in favor of pure intuition."
        ],
        correct_index: 0
      },
      {
        type: "inference",
        stem: "The passage suggests that traditional corporate incentive structures are most likely to:",
        options: [
          "Discourage managers from investing in high-risk, high-reward projects.",
          "Encourage radical technological innovation across all business units.",
          "Overvalue small, disruptive start-up competitors.",
          "Accurately model future cash flows under severe market volatility."
        ],
        correct_index: 0
      },
      {
        type: "vocab",
        stem: "In context, the word 'facade' most nearly means:",
        options: [
          "an outward appearance that misleads or conceals",
          "a solid, immutable physical barrier",
          "an objectively verifiable mathematical proof",
          "a temporary, easily dismissed minor delay"
        ],
        correct_index: 0
      }
    ]
  },
  {
    domain: "business",
    level: 4,
    topic_key: "corporate governance asymmetry",
    body: "Agency theory posits that corporate governance mechanisms must align managerial incentives with shareholder interests, yet the structural informational asymmetry between executives and independent board directors complicates this equilibrium. While boards are tasked with capital allocation oversight, their evaluation of complex operational strategies is fundamentally constrained by the highly filtered data provided by the executives themselves. Directors, possessing limited bandwidth and relying on short, quarterly briefings, naturally struggle to differentiate between genuine strategic innovation and managerial self-preservation masquerading as forward-looking investment. Consequently, the reliance on high-powered stock option packages often exacerbates rather than mitigates the problem. By focusing executive attention on short-term equity valuations, these incentive schemes encourage strategic behavior that maximizes visual performance metrics while shifting structural long-term risk completely onto diversified shareholders.",
    questions: [
      {
        type: "main_idea",
        stem: "What is the passage's primary claim about corporate governance and executive incentives?",
        options: [
          "Traditional stock option packages often encourage executive behavior that maximizes short-term gains at the expense of long-term stability.",
          "Informational asymmetry between executives and directors can be easily resolved by increasing the frequency of board meetings.",
          "Agency theory is fundamentally flawed because board directors always share identical incentives with executives.",
          "Independent board directors possess superior operational knowledge compared to the firm's day-to-day executives."
        ],
        correct_index: 0
      },
      {
        type: "inference",
        stem: "It can be inferred from the passage that board directors struggle with oversight primarily because:",
        options: [
          "They must evaluate executive strategies based on highly filtered and aggregated information.",
          "They are legally restricted from reviewing detailed corporate operational documents.",
          "They consistently prioritize executive welfare over overall shareholder returns.",
          "They are systematically excluded from participating in corporate capital allocation choices."
        ],
        correct_index: 0
      },
      {
        type: "vocab",
        stem: "In context, the word 'exacerbates' most nearly refers to:",
        options: [
          "makes a bad situation even worse",
          "completely resolves or neutralizes",
          "slowly ignores or downplays",
          "randomly changes or shifts"
        ],
        correct_index: 0
      }
    ]
  },

  // ── SCIENCE PASSAGES ───────────────────────────────────────────
  {
    domain: "science",
    level: 1,
    topic_key: "replication in behavioral studies",
    body: "The limits of replication in behavioral studies have sparked intense debate inside the scientific community. When researchers try to repeat classic social psychology experiments, they often obtain different results. This replication crisis occurs partly because human behavior is highly sensitive to subtle environmental context cues, which are difficult to standardize across labs. Additionally, the pressure to publish novel findings leads to selective reporting of positive outcomes, leaving negative results unpublished. To address this, scientific journals are encouraging researchers to pre-register their hypotheses and research protocols before starting data collection. This structural reform ensures that all findings are published, regardless of the outcome, restoring transparency and structural integrity to the behavioral sciences.",
    questions: [
      {
        type: "main_idea",
        stem: "What is the primary purpose of this passage regarding behavioral science?",
        options: [
          "To discuss the causes of the replication crisis and highlight potential structural reforms.",
          "To prove that behavioral studies are entirely unscientific and should be abandoned.",
          "To argue that selective reporting of positive outcomes is a minor, harmless practice.",
          "To demonstrate that human behavior is completely predictable under laboratory conditions."
        ],
        correct_index: 0
      },
      {
        type: "inference",
        stem: "The passage suggests that pre-registering research hypotheses and protocols:",
        options: [
          "Helps prevent researchers from selectively reporting only positive outcomes.",
          "Guarantees that every psychological study will achieve perfect replication.",
          "Increases the pressure on scientists to publish only novel findings.",
          "Eliminates the sensitivity of human behavior to environmental cues."
        ],
        correct_index: 0
      },
      {
        type: "vocab",
        stem: "In context, the word 'integrity' most nearly refers to:",
        options: [
          "adherence to moral and scientific soundness",
          "excessive complexity and intellectual density",
          "temporary popularity or public interest",
          "aggressive expansion and growth"
        ],
        correct_index: 0
      }
    ]
  },
  {
    domain: "science",
    level: 2,
    topic_key: "climate forecast model uncertainty",
    body: "Model uncertainty in climate forecasting represents a fundamental challenge for policy planning. Climate models are highly sophisticated mathematical representations of the Earth's systems, yet they must simplify incredibly complex feedback loops, such as cloud formation and ocean circulation. These simplifications lead to varying long-term temperature projections among different modeling groups. Skeptics of climate action seize upon this range of outcomes to argue that science is too uncertain to justify costly economic changes. However, atmospheric scientists point out that the core physics of greenhouse gas absorption is absolute, and the variance lies only in secondary feedback dynamics. Waiting for perfect model resolution before enacting policy increases the probability of passing irreversible environmental tipping points.",
    questions: [
      {
        type: "main_idea",
        stem: "Which of the following best summarizes the main argument of the passage?",
        options: [
          "Model variance in climate projections does not invalidate the core scientific justification for active policy.",
          "Climate models are too fundamentally flawed to be of any practical use to policy makers.",
          "Atmospheric science should prioritize cloud formation studies over greenhouse gas monitoring.",
          "Irreversible tipping points can be easily avoided by delaying policy until models are perfected."
        ],
        correct_index: 0
      },
      {
        type: "inference",
        stem: "It can be inferred from the passage that climate model projections vary primarily because:",
        options: [
          "They must simplify highly complex physical feedback loops like ocean circulation.",
          "Different modeling groups disagree on the basic chemical properties of greenhouse gases.",
          "Scientists intentionally alter projection ranges to influence public policy.",
          "The core mathematical equations used in climate modeling are fundamentally unscientific."
        ],
        correct_index: 0
      },
      {
        type: "vocab",
        stem: "In context, the word 'resolution' most nearly means:",
        options: [
          "level of detail and mathematical precision",
          "stubborn determination or willpower",
          "legal settlement of a corporate dispute",
          "random distribution of physical particles"
        ],
        correct_index: 0
      }
    ]
  },
  {
    domain: "science",
    level: 3,
    topic_key: "measurement bias in biomedical trials",
    body: "Measurement bias in biomedical trials remains an insidious obstacle to therapeutic discovery, often obscuring genuine safety signals or manufacturing false efficacy. In clinical trials evaluating chronic pain therapies, researchers heavily rely on patient-reported visual analog scales. While these metrics capture subjective patient experience, they are highly susceptible to psychological framing effects and the placebo response, which can confound statistical analysis. Proponents of digital health technologies suggest incorporating continuous physiological monitoring, such as heart rate variability or sleep quality metrics, to act as objective proxies for well-being. Nevertheless, integrating these biometric streams requires complex statistical validation, as raw digital endpoints can introduce their own systemic noise and measurement artifacts that mimic therapeutic effects.",
    questions: [
      {
        type: "main_idea",
        stem: "What is the main focus of the passage regarding clinical trials?",
        options: [
          "The challenges and limitations of subjective pain scales and the integration of digital proxies.",
          "The complete elimination of placebo responses through continuous biometric monitoring.",
          "A historical study of pain medication research in the early twentieth century.",
          "The chemical structures of chronic pain therapies currently undergoing clinical trials."
        ],
        correct_index: 0
      },
      {
        type: "inference",
        stem: "The author implies that continuous physiological monitoring in clinical trials:",
        options: [
          "Presents its own set of statistical and validation challenges despite offering objective data.",
          "Is entirely free from bias and should immediately replace patient-reported scales.",
          "Is scientifically invalid because it fails to capture subjective patient pain.",
          "Has been completely abandoned by researchers due to high equipment costs."
        ],
        correct_index: 0
      },
      {
        type: "vocab",
        stem: "In context, the word 'confound' most nearly refers to:",
        options: [
          "confuse, mix up, or invalidate statistical analysis",
          "clearly clarify or prove a scientific hypothesis",
          "physically restrict or limit",
          "strongly encourage or accelerate"
        ],
        correct_index: 0
      }
    ]
  },
  {
    domain: "science",
    level: 4,
    topic_key: "quantum coherence limits",
    body: "The quest for scalable quantum computing is fundamentally constrained by environmental decoherence, a process wherein a quantum system's delicate superposition states interact with ambient thermodynamic fields. This thermal coupling collapses the wave function, introducing computational errors that quickly overwhelm the quantum processor's logical capacity. To preserve quantum coherence, researchers employ topological qubits or cryogenic shielding to isolate the active processor, yet absolute physical isolation is theoretically impossible. Consequently, quantum error-correcting codes, which distribute logical information across multi-qubit entangled states, represent the only viable path to fault-tolerant computation. However, the physical overhead required is staggering: storing a single logical qubit with high integrity under realistic noise thresholds requires hundreds or even thousands of physical qubits, demanding hardware scales that far exceed current fabrication capabilities.",
    questions: [
      {
        type: "main_idea",
        stem: "What is the passage's primary claim about the development of scalable quantum computing?",
        options: [
          "Fault-tolerant quantum computing requires overcoming staggering hardware overheads due to environmental decoherence.",
          "Cryogenic shielding has completely resolved the problem of quantum superposition collapse.",
          "Quantum error-correcting codes are inefficient and should be replaced by physical isolation.",
          "Environmental decoherence is a minor, temporary issue that has been solved by topological qubits."
        ],
        correct_index: 0
      },
      {
        type: "inference",
        stem: "It can be inferred from the passage that physical isolation of a quantum system is:",
        options: [
          "A theoretical impossibility that necessitates the use of error-correcting codes.",
          "The only hardware strategy currently investigated by quantum computing researchers.",
          "Highly efficient because it requires absolutely no physical multi-qubit overhead.",
          "More than sufficient to prevent thermal coupling under realistic noise thresholds."
        ],
        correct_index: 0
      },
      {
        type: "vocab",
        stem: "In context, the word 'staggering' most nearly means:",
        options: [
          "overwhelmingly large or astonishing",
          "unsteadily walking or stumbling",
          "completely insignificant or minor",
          "highly organized or structured"
        ],
        correct_index: 0
      }
    ]
  },

  // ── HISTORY PASSAGES ───────────────────────────────────────────
  {
    domain: "history",
    level: 1,
    topic_key: "roman administrative reforms",
    body: "Debates about Roman administrative reforms are often framed as military shifts, yet the practical challenge was usually institutional. Emperor Diocletian recognized that the expanding empire was too large for a single ruler to govern. To prevent political rupture and administrative gridlock, he established the tetrarchy, dividing administrative power among four rulers. This reform stabilized the borders and improved tax collection efficiency, bringing structured order back to the provinces. However, the division of power also introduced local rivalries, as each tetrarch built specialized bureaucracies to compete for influence and resources. While Diocletian's administrative restructuring preserved the empire for another century, it laid the structural groundwork for the eventual division of the Roman world into Eastern and Western empires.",
    questions: [
      {
        type: "main_idea",
        stem: "What is the primary focus of the passage?",
        options: [
          "How Diocletian's administrative tetrarcy stabilized the Roman Empire while laying the seeds for its division.",
          "The military tactics Diocletian used to conquer expanding provincial territories.",
          "A comparison of Rome's economic structures with those of ancient Carthage.",
          "Why independent board directors in Rome opposed administrative division."
        ],
        correct_index: 0
      },
      {
        type: "inference",
        stem: "Based on the passage, the establishment of the tetrarchy was intended to:",
        options: [
          "Address the administrative challenges of governing an excessively large empire.",
          "Encourage local rivalries among competing provincial governors.",
          "Completely replace the military with a specialized tax bureaucracy.",
          "Prevent Roman citizens from demanding democratic voting reforms."
        ],
        correct_index: 0
      },
      {
        type: "vocab",
        stem: "In context, the word 'rupture' most nearly means:",
        options: [
          "a break, split, or political collapse",
          "a rapid, peaceful agreement",
          "a geographic expansion or exploration",
          "an increase in economic trade"
        ],
        correct_index: 0
      }
    ]
  },
  {
    domain: "history",
    level: 2,
    topic_key: "legal codes continuity",
    body: "Throughout history, legal codes have frequently outlasted the regimes that created them. When political ruptures occur, such as the fall of the Western Roman Empire or the collapse of the French monarchy, incoming rulers face the monumental task of maintaining administrative order. Rather than drafting entirely new legal frameworks, which would invite social resistance and administrative confusion, they typically co-opt existing legal systems. For instance, the Napoleonic Code preserved core elements of customary Roman law while introducing revolutionary property rights. This continuity offers a facade of legitimacy to new regimes, easing the administrative transition. Consequently, the evolution of law is characterized more by steady adaptation and institutional continuity than by sudden, revolutionary breaks with the past.",
    questions: [
      {
        type: "main_idea",
        stem: "Which of the following best summarizes the main argument of the passage?",
        options: [
          "Legal codes are typically co-opted and adapted by new regimes to maintain order and legitimacy.",
          "Sudden, revolutionary breaks are the primary drivers of legal code evolution.",
          "Incoming rulers always draft entirely new legal frameworks to signal complete reform.",
          "The Napoleonic Code was completely original and shared no elements with Roman law."
        ],
        correct_index: 0
      },
      {
        type: "inference",
        stem: "The passage suggests that co-opting existing legal systems is advantageous for new rulers because:",
        options: [
          "It reduces social resistance and provides a sense of legitimacy to the transition.",
          "It guarantees that administrative confusion will be completely eliminated immediately.",
          "It allows them to avoid any structural adjustments to property rights.",
          "It isolates the ruling class from customary provincial administrative duties."
        ],
        correct_index: 0
      },
      {
        type: "vocab",
        stem: "In context, the word 'co-opt' most nearly refers to:",
        options: [
          "adopt, take over, or use for one's own purposes",
          "completely destroy or eliminate",
          "aggressively oppose or battle against",
          "temporarily suspend or pause"
        ],
        correct_index: 0
      }
    ]
  },
  {
    domain: "history",
    level: 3,
    topic_key: "economic modernization and resistance",
    body: "Economic modernization in late Tokugawa Japan was not a seamless transition, but a highly contested process marked by intense social resistance and institutional friction. As the shogunate introduced early industrial reforms to counter Western imperial pressure, they destabilized the traditional neo-Confucian social hierarchy. Samurai, whose fixed stipends were eroded by rapid inflation, saw their status decline relative to wealthy merchant classes. Meanwhile, rural peasants faced heavy tax burdens, triggering widespread agricultural protests and urban riots. Traditional historians often attribute the Meiji Restoration to top-down elite decisions, yet the collapse of the old order was fundamentally driven by this decentralized structural friction, illustrating that modernization is inherently disruptive to established social compacts.",
    questions: [
      {
        type: "main_idea",
        stem: "What is the primary thesis of the passage regarding modernization in Japan?",
        options: [
          "Tokugawa Japan's economic modernization was highly contested, disruptive, and driven by decentralized social friction.",
          "The Meiji Restoration succeeded primarily due to the complete agreement of all social classes.",
          "Samurai stipends were increased to prevent inflation and preserve social stability.",
          "Modernization was an entirely peaceful, top-down process designed by the shogunate."
        ],
        correct_index: 0
      },
      {
        type: "inference",
        stem: "The author implies that traditional historical accounts of the Meiji Restoration may:",
        options: [
          "Overemphasize top-down elite planning while neglecting decentralized social protests.",
          "Underestimate the military superiority of the Tokugawa shogunate's forces.",
          "Exaggerate the samurai class's absolute commitment to industrialization.",
          "Incorrectly claim that inflation had absolutely no impact on feudal classes."
        ],
        correct_index: 0
      },
      {
        type: "vocab",
        stem: "In context, the word 'contested' most nearly means:",
        options: [
          "strongly disputed or fought over",
          "universally accepted or approved",
          "completely ignored or forgotten",
          "highly organized and structured"
        ],
        correct_index: 0
      }
    ]
  },
  {
    domain: "history",
    level: 4,
    topic_key: "reconstruction administrative limits",
    body: "The structural failure of the American Reconstruction era illustrates the severe administrative limitations of federal power in the face of deep-seated local institutional resistance. Following the Civil War, the federal government enacted ambitious civil rights legislation to transform the Southern social order, yet they failed to construct the specialized bureaucratic capacity required to enforce these laws. The Freedmen's Bureau, tasked with managing labor contracts and protecting formerly enslaved citizens, was systematically underfunded and staffed by only a few hundred agents across a massive geographic area. Consequently, local Southern elites, utilizing paramilitary organizations and co-opting local legal systems, easily subverted federal directives. This administrative void allowed the establishment of Jim Crow segregation, demonstrating that legislative reforms remain completely performative unless backed by durable enforcement mechanisms.",
    questions: [
      {
        type: "main_idea",
        stem: "What is the passage's primary claim about the Reconstruction era?",
        options: [
          "Ambitious civil rights reforms failed because the federal government lacked the bureaucratic capacity to enforce them.",
          "The Freedmen's Bureau successfully established civil rights because it possessed a massive staff.",
          "Southern elites welcomed federal directives to modernize their agricultural labor contracts.",
          "Legislative reforms are intrinsically sufficient to transform local social hierarchies."
        ],
        correct_index: 0
      },
      {
        type: "inference",
        stem: "It can be inferred from the passage that the Freedmen's Bureau was:",
        options: [
          "Highly ineffective due to severe underfunding and extreme geographic understaffing.",
          "A massive federal bureaucracy that successfully neutralized paramilitary organizations.",
          "Opposed by federal legislators who wanted to maintain segregation.",
          "Primarily focused on military conquests rather than civil rights administration."
        ],
        correct_index: 0
      },
      {
        type: "vocab",
        stem: "In context, the word 'subverted' most nearly refers to:",
        options: [
          "undermined, bypassed, or overturned",
          "strongly supported or approved",
          "fully documented or recorded",
          "accurately calculated or measured"
        ],
        correct_index: 0
      }
    ]
  },

  // ── ABSTRACT PASSAGES ──────────────────────────────────────────
  {
    domain: "abstract",
    level: 1,
    topic_key: "explanation versus justification",
    body: "The difference between explanation and justification represents a key concept in epistemology. When we explain a belief or action, we describe the psychological or physical causes that brought it about, such as a chemical reaction in the brain. When we justify a belief or action, we provide rational arguments to show that the belief is true or the action is morally correct. Confusing these two terms can lead to serious errors in moral philosophy. For example, explaining why a person committed a crime (such as environmental stress) does not justify their behavior. By separating causal explanation from rational justification, philosophers can analyze arguments clearly and maintain objective standards of moral and intellectual responsibility.",
    questions: [
      {
        type: "main_idea",
        stem: "What is the primary thesis of the passage regarding epistemology?",
        options: [
          "Epistemology requires separating the causal description of beliefs from their rational justification.",
          "Causal explanation and moral justification are identical concepts in philosophy.",
          "Explaining a person's behavior is sufficient to justify their moral choices.",
          "objective standards of responsibility are impossible to maintain in moral philosophy."
        ],
        correct_index: 0
      },
      {
        type: "inference",
        stem: "Based on the passage, explaining why a belief exists involves:",
        options: [
          "Describing the psychological or physical causes that brought it about.",
          "Providing rational arguments to prove the belief is objectively true.",
          "Demonstrating that the belief meets absolute moral standards.",
          "Dismissing the belief as an intellectual error."
        ],
        correct_index: 0
      },
      {
        type: "vocab",
        stem: "In context, the word 'objective' most nearly refers to:",
        options: [
          "based on unbiased facts rather than personal feelings",
          "highly emotional or personally biased",
          "completely unachievable or abstract",
          "focused on geographic expansion"
        ],
        correct_index: 0
      }
    ]
  },
  {
    domain: "abstract",
    level: 2,
    topic_key: "coordination problems without authority",
    body: "Coordination problems represent a classic puzzle in social philosophy. When individuals seek to achieve a common goal, such as establishing driving rules or trading standards, they must align their behaviors without relying on a central authority. In the absence of an enforcing state, groups solve these problems by developing informal social norms. These norms act as coordination points, allowing individuals to anticipate others' choices. Over time, these habits crystallize into stable conventions, providing a facade of institutional order. Proponents of self-organization suggest that these organic norms are highly resilient because they adapt naturally to local conditions. Nevertheless, when communities scale, informal conventions often break down, necessitating formal contracts and legal oversight.",
    questions: [
      {
        type: "main_idea",
        stem: "Which of the following best summarizes the primary argument of the passage?",
        options: [
          "Informal norms can solve coordination problems organically, but they face limitations as communities scale.",
          "Centralized states are always necessary to solve coordination problems in all social groups.",
          "Self-organization is completely flawed because conventions never adapt to local conditions.",
          "Driving rules and trading standards always require formal contracts to be established."
        ],
        correct_index: 0
      },
      {
        type: "inference",
        stem: "The passage suggests that informal social norms are useful because:",
        options: [
          "They act as coordination points that help individuals anticipate others' behaviors.",
          "They carry heavy legal penalties that deter cheating without central states.",
          "They completely eliminate the institutional need for formal contracts.",
          "They isolate the group from external market shocks."
        ],
        correct_index: 0
      },
      {
        type: "vocab",
        stem: "In context, the word 'conventions' most nearly refers to:",
        options: [
          "established, customary rules or social habits",
          "large, organized formal political gatherings",
          "temporary, highly volatile minor updates",
          "random distribution of physical points"
        ],
        correct_index: 0
      }
    ]
  },
  {
    domain: "abstract",
    level: 3,
    topic_key: "ambiguity in rational choice",
    body: "In rational choice theory, ambiguity is often treated as an annoying mathematical complication, yet it represents a fundamental feature of real-world decision environments. Traditional models assume decision-makers operate under risk, where outcomes are uncertain but the underlying probability distribution is fully known. Under true ambiguity, however, the decision-maker possesses insufficient information to assign even subjective probabilities to key events. This distinction, first formalized by Frank Knight, explains why individuals systematically exhibit ambiguity aversion: they prefer a known bet over an ambiguous bet even when the expected value of the latter is mathematically superior. Consequently, models that ignore ambiguity aversion fail to predict human behavior under uncertainty, particularly in financial markets and legal disputes where probability distributions are inherently unmeasurable.",
    questions: [
      {
        type: "main_idea",
        stem: "What is the primary thesis of the passage?",
        options: [
          "Decision-making under true ambiguity is qualitatively different from decision-making under known risk.",
          "Ambiguity aversion is irrational and has absolutely no impact on financial markets.",
          "Traditional rational choice models are superior because they assume probabilities are always known.",
          "Frank Knight proved that subjective probabilities are superior to objective calculations."
        ],
        correct_index: 0
      },
      {
        type: "inference",
        stem: "The passage suggests that ambiguity aversion leads decision-makers to:",
        options: [
          "Choose known outcomes over ambiguous ones even when the expected value is lower.",
          "Always select the option with the highest possible mathematical expected value.",
          "Completely ignore any quantitative risk assessments provided by analysts.",
          "Assign subjective probabilities to every unpredictable event."
        ],
        correct_index: 0
      },
      {
        type: "vocab",
        stem: "In context, the word 'inherently' most nearly means:",
        options: [
          "by nature, intrinsically, or fundamentally",
          "temporarily, casually, or minorly",
          "falsely, deceptively, or misleadingly",
          "highly structured or organized"
        ],
        correct_index: 0
      }
    ]
  },
  {
    domain: "abstract",
    level: 4,
    topic_key: "epistemology of testimony",
    body: "The reductionism debate in the epistemology of testimony illustrates a fundamental divide regarding the justification of transmitted knowledge. Reductionists argue that a hearer is justified in accepting a speaker's testimony if and only if the hearer possesses non-testimonial, empirical evidence that the speaker is reliable. This standard, while appealingly rigorous, imposes a staggering cognitive burden on individual agents. It systematically ignores the structural complexity of modern division of cognitive labor, where our most secure scientific beliefs rest on a massive, unverified web of collaborative testimony. Consequently, non-reductionists propose that testimonial justification is default-permissible: hearers are epistemically entitled to accept a speaker's word unless they possess active, observable defeaters. This structural shift shifts the burden of proof, recognizing that default trust is not an irrational blind leap but a necessary social convention that makes cooperative intellectual progress possible.",
    questions: [
      {
        type: "main_idea",
        stem: "What is the passage's primary claim about the epistemology of testimony?",
        options: [
          "Default testimonial trust is a necessary social convention that makes collaborative intellectual progress possible.",
          "Hearers should always possess empirical, non-testimonial proof before accepting a speaker's word.",
          "Reductionism is the only scientifically valid method for verifying transmitted knowledge.",
          "Cognitive labor is highly inefficient and should be replaced by individual empirical research."
        ],
        correct_index: 0
      },
      {
        type: "inference",
        stem: "It can be inferred from the passage that non-reductionists view testimonial trust as:",
        options: [
          "Default-permissible unless active, observable reasons exist to doubt the speaker.",
          "An irrational blind leap that threatens objective scientific standards.",
          "A temporary administrative convenience that should eventually be eliminated.",
          "Inherently restricted to personal relationships rather than scientific domains."
        ],
        correct_index: 0
      },
      {
        type: "vocab",
        stem: "In context, the word 'defeaters' most nearly means:",
        options: [
          "reasons, evidence, or indications that invalidate a claim",
          "athletes or competitors who suffer a loss",
          "empirically verified mathematical proofs",
          "unfiltered, raw data streams"
        ],
        correct_index: 0
      }
    ]
  },

  // ── SOCIAL PASSAGES ────────────────────────────────────────────
  {
    domain: "social",
    level: 1,
    topic_key: "attention scarcity digital",
    body: "Attention scarcity in digital environments has become a major focus of social research. In the modern information economy, content is infinitely abundant, yet human cognitive bandwidth remains strictly limited. Consequently, digital platforms compete aggressively for user attention, developing high-frequency notifications and personalized algorithms to maximize engagement. This constant stimulation changes how users process information: they skim headings and bullet points rather than engaging in slow, deep reading. Social scientists warn that this superficial processing erodes our capacity for critical thinking and complex argument analysis. To counter this, digital mindfulness advocates promote intentional off-screen intervals and simplified interfaces, helping users reclaim their cognitive focus and restore mental rhythm.",
    questions: [
      {
        type: "main_idea",
        stem: "What is the primary thesis of the passage regarding digital attention scarcity?",
        options: [
          "Abundant digital content has made human attention scarce, encouraging superficial information processing.",
          "High-frequency notifications are highly beneficial for expanding human cognitive bandwidth.",
          "Critical thinking has been completely eliminated by modern personalized algorithms.",
          "Digital mindfulness advocates recommend increasing screen time to build reading speed."
        ],
        correct_index: 0
      },
      {
        type: "inference",
        stem: "The passage suggests that personalized algorithms are designed primarily to:",
        options: [
          "Maximize user engagement by capturing limited human attention.",
          "Help users engage in slow, deep reading of complex arguments.",
          "Improve the overall quality and reliability of digital content.",
          "Educate the public on objective scientific standards."
        ],
        correct_index: 0
      },
      {
        type: "vocab",
        stem: "In context, the word 'scarcity' most nearly refers to:",
        options: [
          "insufficient supply or shortage",
          "infinite abundance or surplus",
          "temporary popular trend",
          "deliberate physical destruction"
        ],
        correct_index: 0
      }
    ]
  },
  {
    domain: "social",
    level: 2,
    topic_key: "status signaling conformity",
    body: "Status signaling represents a powerful driver of group conformity inside modern communities. According to sociological theory, individuals consume luxury goods or adopt specific moral behaviors not only for their direct utility, but to signal their social status and group membership to observers. These signals must be costly in terms of money, time, or cognitive effort to remain credible, as cheap signals can be easily duplicated by out-group members. Consequently, when status norms shift, individuals feel intense social pressure to conform to the new standards, creating high-conformity bubbles. Proponents of signaling theory suggest that these costly behaviors are highly stable because they protect the group's social boundaries. Nevertheless, they also introduce severe collective action traps, forcing individuals to waste resources on performative consumption simply to maintain their relative social standing.",
    questions: [
      {
        type: "main_idea",
        stem: "Which of the following best summarizes the primary argument of the passage?",
        options: [
          "Status signaling drives group conformity and boundary protection, but it can lead to collective resource waste.",
          "Luxury goods and moral behaviors possess no utility beyond immediate physical function.",
          "Group boundaries can be easily maintained by cheap, easily duplicated moral signals.",
          "Sociological theory recommends that communities completely eliminate status signals."
        ],
        correct_index: 0
      },
      {
        type: "inference",
        stem: "Based on the passage, a signal is considered credible by group members primarily when:",
        options: [
          "It is costly in terms of money, time, or cognitive effort to produce.",
          "It is easily duplicated by individuals outside the active community.",
          "It has absolutely no relationship to moral behaviors or luxury consumption.",
          "It is officially endorsed by a central state authority."
        ],
        correct_index: 0
      },
      {
        type: "vocab",
        stem: "In context, the word 'conformity' most nearly refers to:",
        options: [
          "compliance with group standards and rules",
          "aggressive independence and active rebellion",
          "complete loss of conscious brain function",
          "temporary economic trade negotiations"
        ],
        correct_index: 0
      }
    ]
  },
  {
    domain: "social",
    level: 3,
    topic_key: "trust in anonymous networks",
    body: "Trust formation in anonymous online communities represents a fundamental challenge for cooperative platform design. Unlike traditional face-to-face communities where social accountability is enforced by close geographical relationships, decentralized networks must establish trust between complete strangers who can easily exit or change identities. To overcome this systemic vulnerability, platforms introduce reputation systems, such as user reviews or upvote indicators, to act as legible proxies for reliability. While these systems successfully facilitate billions of transactions, they are highly susceptible to strategic manipulation, such as sybil attacks or coordinated review boosting, which can contaminate the reputation pool. Consequently, modern designers are exploring cryptographic proof-of-work protocols to anchor identity, though these formal structures can introduce substantial transaction friction that reduces overall user activity.",
    questions: [
      {
        type: "main_idea",
        stem: "What is the primary focus of the passage regarding online communities?",
        options: [
          "The mechanisms and challenges of establishing trust and reliability in anonymous decentralized networks.",
          "The complete elimination of transactional friction through continuous cryptographic checks.",
          "A historical analysis of face-to-face community legal codes in the nineteenth century.",
          "Why reputation systems are completely useless and should be immediately abandoned."
        ],
        correct_index: 0
      },
      {
        type: "inference",
        stem: "The passage suggests that reputation systems in anonymous online communities are:",
        options: [
          "highly valuable for establishing trust but vulnerable to strategic manipulation.",
          "completely immune to sybil attacks due to cryptographic proof-of-work.",
          "Inefficient compared to geographic face-to-face social accountability.",
          "Designed primarily to increase transactional friction for designers."
        ],
        correct_index: 0
      },
      {
        type: "vocab",
        stem: "In context, the word 'facilitate' most nearly means:",
        options: [
          "make easier, help forward, or assist",
          "actively block, complicate, or delay",
          "completely reject or invalidate",
          "randomly select or choose"
        ],
        correct_index: 0
      }
    ]
  },
  {
    domain: "social",
    level: 4,
    topic_key: "policy uptake cognitive load",
    body: "The study of behavioral friction in public policy uptake illustrates how minor administrative hurdles systematically disadvantage low-bandwidth citizens. In designing social benefit programs, states often introduce complex application procedures, documentary requirements, and strict verification timelines to prevent fraud. While these safeguards appear rational to bureaucratic administrators, they impose a severe cognitive load on applicants, who are frequently managing high-stress lives. Behavioral economists show that this administrative burden, or 'sludge,' acts as an incredibly regressive tax: it dramatically lowers program participation among those who need the benefits most. Consequently, modern policy design advocates for default-enrollment models, where citizens are automatically registered unless they actively opt out. This structural shift shifts the administrative burden entirely onto the state, demonstrating that equity is achieved less by providing abstract legal entitlements and more by reducing operational friction in daily delivery.",
    questions: [
      {
        type: "main_idea",
        stem: "What is the passage's primary claim about behavioral friction and public policy?",
        options: [
          "Administrative hurdles in policy delivery systematically exclude low-bandwidth citizens, making default-enrollment models essential.",
          "Strict verification timelines are highly efficient because they completely eliminate program fraud.",
          "social benefit programs should be completely managed by private bureaucratic entities.",
          "Abstract legal entitlements are far more important than daily operational delivery."
        ],
        correct_index: 0
      },
      {
        type: "inference",
        stem: "It can be inferred from the passage that 'sludge' in public policy design:",
        options: [
          "Acts as a regressive tax by disproportionately discouraging eligible low-bandwidth applicants.",
          "Is a highly effective method for ensuring absolute equality of program participation.",
          "Is primarily created by applicants who want to strategicially game the system.",
          "Has been completely eliminated in modern default-enrollment social programs."
        ],
        correct_index: 0
      },
      {
        type: "vocab",
        stem: "In context, the word 'sludge' most nearly refers to:",
        options: [
          "excessive administrative hurdles and procedural frictions",
          "thick, mud-like chemical waste products",
          "legally binding international trade contracts",
          "unfiltered continuous biometric data"
        ],
        correct_index: 0
      }
    ]
  }
];
