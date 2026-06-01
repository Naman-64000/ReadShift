/**
 * client/src/lib/calibrationPassages.ts
 * Curated pool of mature, neutral calibration passages.
 * Each passage is approximately 100 words and covers a unique academic/professional topic.
 */

export interface CalibrationPassage {
  id: string;
  topic: string;
  text: string;
}

export const CALIBRATION_PASSAGES: CalibrationPassage[] = [
  {
    id: "tech-business-1",
    topic: "Distributed Ledger Technology",
    text: "The rise of distributed ledger technology has forced financial institutions to re-evaluate their transactional infrastructure. Traditional banking relies heavily on centralized clearing houses to validate transfers and prevent double-spending. This architecture, while historically secure, introduces significant settlement delays and processing fees. In contrast, blockchain networks employ decentralized consensus protocols, allowing participants to verify transactions collectively. This shift not only accelerates settlement times but also lowers transactional costs by eliminating intermediaries. However, scaling these networks remains a challenge, as consensus mechanisms require substantial computational overhead and energy expenditure to secure the ledger."
  },
  {
    id: "cognitive-science-1",
    topic: "Neuroplasticity",
    text: "Neuroplasticity refers to the brain's ability to reorganize itself by forming new neural pathways throughout life. This dynamic process allows neurons to adjust their activities in response to learning, experience, or environmental changes. For decades, scientific consensus held that the adult brain was relatively fixed and incapable of significant structural alteration. However, modern neuroimaging has demonstrated that targeted training can induce measurable physical changes in brain regions associated with memory and executive function. This means that cognitive capacities are not entirely static or determined by genetics, but can be deliberately enhanced through sustained and focused practice."
  },
  {
    id: "behavioral-econ-1",
    topic: "Behavioral Economics",
    text: "Behavioral economics challenges the classical theory that human beings make decisions as purely rational agents. Traditional models assume that individuals possess perfect information and make choices that maximize their personal utility. In reality, cognitive biases and emotional heuristics consistently influence human judgment, leading to predictable deviations from rationality. For example, loss aversion describes our tendency to prefer avoiding losses over acquiring equivalent gains, causing us to make overly conservative financial decisions. By integrating psychological insights into economic models, researchers can better predict market anomalies and design more effective public policies to nudge consumer behavior."
  },
  {
    id: "environmental-science-1",
    topic: "Geothermal Energy",
    text: "Geothermal energy represents a highly reliable and underutilized source of renewable power derived from the Earth's internal heat. Unlike solar and wind energy, which are intermittent and depend on weather conditions, geothermal plants provide stable base-load electricity continuously. This reliability makes it an excellent candidate for stabilizing power grids as fossil fuel consumption declines. However, high initial exploration costs and geographical constraints limit widespread adoption. Currently, most active geothermal plants are located near tectonic boundaries where underground heat is highly accessible. Advancements in deep-drilling technology may soon unlock geothermal potential in regions previously deemed non-viable."
  },
  {
    id: "industrial-history-1",
    topic: "The Industrial Revolution",
    text: "The transition from agrarian economies to industrial societies in the late eighteenth century reshaped the global landscape. Prior to the Industrial Revolution, manufacturing was primarily a cottage industry, with goods produced manually in small workshops. The introduction of steam power and mechanized looms enabled factory-scale production, drastically increasing output while reducing costs. This shift stimulated rapid urbanization, as rural laborers migrated to cities in search of factory employment. While industrialization catalyzed unprecedented economic growth and technological innovation, it also created severe social challenges, including poor working conditions, urban overcrowding, and environmental degradation that prompted early labor movements."
  },
  {
    id: "space-science-1",
    topic: "Stellar Nucleosynthesis",
    text: "Stellar nucleosynthesis is the cosmic process by which stars forge heavy elements from lighter ones through nuclear fusion. In the early universe, only hydrogen and helium existed in significant quantities. As gravity collapsed massive gas clouds to form the first generation of stars, immense pressure and temperature initiated fusion in their cores. Over billions of years, stars converted hydrogen into carbon, oxygen, and iron. When massive stars exhaust their fuel, they explode as supernovas, dispersing these heavy elements across the cosmos. Consequently, every atom in our bodies was once cooked inside the core of a dying star."
  }
];
