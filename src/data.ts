import { STUDENT_PHOTO_DATA_URL, UNC_LOGO_DATA_URL } from "./assetsData";

export type DVDConfigItem = {
  id: string;
  short: string;
  title: string;
  youtubeUrl: string;
  youtubeVideoId: string;
  author: string;
  category: string;
  year: string;
  client: string;
  color: string;
  accent: string;
  description: string;
  embedUrl: string;
  video: string;
};

export type Project = DVDConfigItem;

/**
 * Extracts the 11-character YouTube video ID from any standard YouTube link
 * (`https://youtu.be/VIDEO_ID`, `https://www.youtube.com/watch?v=VIDEO_ID`,
 * `https://www.youtube.com/embed/VIDEO_ID`, or a raw 11-character video ID).
 */
export function extractYouTubeVideoId(urlOrId: string): string {
  const trimmed = urlOrId.trim().replace(/\\_/g, "_");
  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  const shortMatch = trimmed.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];
  const watchMatch = trimmed.match(/[?&]v=([A-Za-z0-9_-]{11})/);
  if (watchMatch) return watchMatch[1];
  const embedMatch = trimmed.match(/youtube\.com\/embed\/([A-Za-z0-9_-]{11})/);
  if (embedMatch) return embedMatch[1];
  return trimmed.slice(0, 11);
}

export function getYouTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${extractYouTubeVideoId(videoId)}`;
}

/**
 * Centralized, reusable DVD configuration for all 7 Great Books volumes.
 * You can provide either a full YouTube URL (`youtu.be/...` or `youtube.com/watch?v=...`)
 * or a 11-character YouTube Video ID.
 */
const DVD_SOURCE_CONFIG: Array<{
  id: string;
  title: string;
  youtubeUrl: string;
  author: string;
  color: string;
  accent: string;
  description: string;
}> = [
  {
    id: "DVD 01",
    title: "The Tale of Genji",
    youtubeUrl: "https://youtu.be/Zo1ZtRb9_rc?si=Gjo9N3fB7VxiXLiP",
    author: "Murasaki Shikibu",
    color: "#d7d8d0",
    accent: "#ff593d",
    description:
      "Heian-period courtly literature exploring impermanence, memory, and aesthetic sensibility.",
  },
  {
    id: "DVD 02",
    title: "Pride and Prejudice",
    youtubeUrl: "https://www.youtube.com/watch?v=KJ-OYgKF4WQ",
    author: "Jane Austen",
    color: "#e06d50",
    accent: "#ffd46a",
    description:
      "A study of manners, first impressions, moral self-knowledge, and social mobility.",
  },
  {
    id: "DVD 03",
    title: "Les Misérables",
    youtubeUrl: "https://www.youtube.com/watch?v=_tktHnta2eU",
    author: "Victor Hugo",
    color: "#775186",
    accent: "#e8a5ff",
    description:
      "Mercy, justice, redemption, and human dignity amid nineteenth-century French upheaval.",
  },
  {
    id: "DVD 04",
    title: "To Kill a Mockingbird",
    youtubeUrl: "https://www.youtube.com/watch?v=uqkohqLvClI",
    author: "Harper Lee",
    color: "#d8c89d",
    accent: "#e85037",
    description:
      "Moral courage, empathy, conscience, and confronting prejudice in the American South.",
  },
  {
    id: "DVD 05",
    title: "Voice Out of the Whirlwind",
    youtubeUrl: "https://www.youtube.com/watch?v=xQwnH8th_fs",
    author: "To be confirmed",
    color: "#ece7dc",
    accent: "#5a8f76",
    description:
      "Reflections on suffering, human limitation, and the search for meaning before the unknown.",
  },
  {
    id: "DVD 06",
    title: "The Iliad",
    youtubeUrl: "https://youtu.be/cx0tQojZNIU",
    author: "Homer",
    color: "#435f69",
    accent: "#ff7847",
    description:
      "Epic poetry of wrath, honor, mortality, fate, and the tragic cost of war at Troy.",
  },
  {
    id: "DVD 07",
    title: "The Odyssey",
    youtubeUrl: "https://youtu.be/8Z9FQxcCAZ0?si=SI69hwttNBORO0f3",
    author: "Homer",
    color: "#253d51",
    accent: "#63c7bc",
    description:
      "The long nostos homeward: perseverance, hospitality, identity, and wisdom after war.",
  },
];

export const projects: Project[] = DVD_SOURCE_CONFIG.map((item, index) => {
  const youtubeVideoId = extractYouTubeVideoId(item.youtubeUrl);
  const embedUrl = getYouTubeEmbedUrl(youtubeVideoId);
  return {
    ...item,
    youtubeVideoId,
    short: String(index + 1).padStart(2, "0"),
    category: item.author,
    year: "GREAT BOOKS",
    client: item.author.toUpperCase(),
    embedUrl,
    video: embedUrl,
  };
});

export const studentIdentity = {
  university: "UNIVERSITY OF NUEVA CACERES",
  tagline: "NURTURING BETTER TOMORROWS FOR ALL",
  address: "J. HERNANDEZ AVENUE, NAGA CITY, PHILIPPINES",
  studentNumber: "23-***6",
  maskedStudentNumber: "23-***6",
  lastName: "HAROCHOC",
  firstName: "ANGELAICA MAE P.",
  program: "4th Year BSIT",
  departmentLine1: "SCHOOL OF COMPUTER AND",
  departmentLine2: "INFORMATION SCIENCES",
  latinMotto: "NON SCHOLAE SED VITAE",
  englishMotto: "NOT OF SCHOOL BUT OF LIFE",
  registrarName: "REDACTED REGISTRAR",
  registrarTitle: "UNIVERSITY REGISTRAR",
  lanyardOrg: "SCHOOL OF COMPUTER AND INFORMATION SCIENCES",
  lanyardShort: "UNC // SCIS",
  photoUrl: STUDENT_PHOTO_DATA_URL,
  logoUrl: UNC_LOGO_DATA_URL,
};

export type NotebookCategoryTab = {
  id: string;
  label: string;
  fullTitle: string;
  color: string;
  targetPage: number; // Left page number (odd: 1, 3, 5, ..., 19) of the two-page spread
};

export type StickyNoteItem = {
  id: string;
  title: string;
  body: string;
  color: string;
  tapeColor: string;
  rotationDeg: number;
  doodleType: "star" | "heart-book" | "sparkle" | "computer";
};

export const introStickyNotes: StickyNoteItem[] = [
  {
    id: "about-me",
    title: "A Little About Me",
    body: "Hi! I'm Angelaica Mae P. Harochoc, a 4th Year BSIT student who enjoys exploring creativity, technology, and design. I love turning ideas into something visual and interactive.",
    color: "#fbf0c4", // Warm cream / pale yellow
    tapeColor: "rgba(232, 168, 124, 0.72)",
    rotationDeg: -2.4,
    doodleType: "star",
  },
  {
    id: "love-reading",
    title: "My Love for Reading & Creativity",
    body: "I'm interested in discovering stories, learning different perspectives, and understanding the lessons behind literature. I also enjoy digital art, graphic design, and creating interactive experiences.",
    color: "#f9dce2", // Soft pastel pink
    tapeColor: "rgba(224, 196, 118, 0.72)",
    rotationDeg: 1.9,
    doodleType: "heart-book",
  },
  {
    id: "great-books-journey",
    title: "My Great Books Journey",
    body: "I hope this subject helps me appreciate classic literature, understand different cultures, and discover meaningful lessons that I can carry beyond the classroom.",
    color: "#d9ecf7", // Light sky blue
    tapeColor: "rgba(146, 198, 162, 0.74)",
    rotationDeg: 1.6,
    doodleType: "sparkle",
  },
  {
    id: "experimental-project",
    title: "My Experimental Project",
    body: "For this project, I'm exploring my interest in creating a 3D interactive website. I'm turning my literary journey into a virtual desk where creativity and learning come together.",
    color: "#fcf5db", // Warm cream
    tapeColor: "rgba(148, 182, 224, 0.74)",
    rotationDeg: -1.8,
    doodleType: "computer",
  },
];

export const introClosingNote = "I hope you enjoy exploring my virtual desk!";

export const notebookCategories: NotebookCategoryTab[] = [
  {
    id: "profile",
    label: "PROFILE",
    fullTitle: "1. Introduction & Table of Contents",
    color: "#f2cf5b", // Yellow
    targetPage: 1,
  },
  {
    id: "analyses-1",
    label: "BOOKS I",
    fullTitle: "2. Analyses I–II: Genji & Pride and Prejudice",
    color: "#f0934b", // Orange
    targetPage: 3,
  },
  {
    id: "analyses-2",
    label: "BOOKS II",
    fullTitle: "2. Analyses III–IV: Les Misérables & Mockingbird",
    color: "#6baed6", // Blue
    targetPage: 5,
  },
  {
    id: "analyses-3",
    label: "BOOKS III",
    fullTitle: "2. Analyses V–VII: Job 38, Iliad & Odyssey",
    color: "#e58ca8", // Pink
    targetPage: 7,
  },
  {
    id: "favorite",
    label: "FAVORITE",
    fullTitle: "3. Favorite Masterpiece: Job 38",
    color: "#7ec488", // Green
    targetPage: 11,
  },
  {
    id: "summary",
    label: "SUMMARY",
    fullTitle: "4. Summary of Learning",
    color: "#f2cf5b", // Yellow
    targetPage: 13,
  },
  {
    id: "reflection",
    label: "REFLECT",
    fullTitle: "5. Personal Reflection & Closing",
    color: "#f0934b", // Orange
    targetPage: 15,
  },
  {
    id: "sources",
    label: "SOURCES",
    fullTitle: "6. References & Portfolio Checklist",
    color: "#6baed6", // Blue
    targetPage: 19,
  },
];

export type NotebookPage = {
  pageNumber: number;
  categoryId: string;
  title: string;
  subtitle?: string;
  eyebrow: string;
  dateTag?: string;
  paragraphs: string[];
  bulletsTitle?: string;
  bullets: string[];
  highlights: string[];
  crossedOut?: string;
  annotation: string;
  doodle: string;
};

export const notebookPages: NotebookPage[] = [
  {
    pageNumber: 1,
    categoryId: "profile",
    eyebrow: "INSIDE FRONT COVER // INTRODUCTION",
    title: "WELCOME TO MY JOURNAL",
    subtitle: "Introduction Sticky Notes • Angelaica Mae P. Harochoc",
    dateTag: "INSIDE COVER",
    paragraphs: [
      "Hi! I'm Angelaica Mae P. Harochoc, a 4th Year BSIT student who enjoys exploring creativity, technology, and design. I love turning ideas into something visual and interactive.",
      "For this project, I'm turning my literary journey into a virtual desk where creativity and learning come together. I hope you enjoy exploring my virtual desk!",
    ],
    bulletsTitle: "STICKY NOTES ON THIS INSIDE COVER:",
    bullets: [
      "A Little About Me — Creativity, technology & visual design",
      "My Love for Reading & Creativity — Stories, perspectives & digital art",
      "My Great Books Journey — Classic literature & cultural lessons",
      "My Experimental Project — 3D interactive virtual desk portfolio",
    ],
    highlights: ["GEC-GB-NRt", "4th Year BSIT", "UNC SCIS"],
    annotation: "I hope you enjoy exploring my virtual desk!",
    doodle: "★ Great Books Digital Portfolio — Semestral Archive",
  },
  {
    pageNumber: 2,
    categoryId: "profile",
    eyebrow: "GREAT BOOKS — GEC-GB-NRt",
    title: "Table of Contents",
    subtitle: "A Guide to My Literary Journey Notebook",
    dateTag: "TTH 08:30–10:00",
    paragraphs: [
      "A guide to the chapters, literary analyses, and reflections inside this journal:",
    ],
    bulletsTitle: "NOTEBOOK SECTIONS & PAGE INDEX:",
    bullets: [
      "01  Introduction Sticky Notes (Inside Front Cover) ................ p. 01",
      "02  Table of Contents & Study Guide ............................... p. 02",
      "03  Literary Analyses I–II: The Tale of Genji & Pride and Prejudice .. pp. 03–04",
      "04  Literary Analyses III–IV: Les Misérables & To Kill a Mockingbird . pp. 05–06",
      "05  Literary Analyses V–VII: Job 38, The Iliad & The Odyssey ........ pp. 07–10",
      "06  My Favorite Masterpiece: Voice Out of the Whirlwind (Job 38) .... pp. 11–12",
      "07  Summary of Learning: Cultures, Literary Lenses & Skills ......... pp. 13–14",
      "08  Reflect: Personal Notes & Reflections ........................... pp. 15–18",
      "09  References, Historical Context & Portfolio Checklist ............ pp. 19–20",
    ],
    highlights: ["7 Literary Analyses", "8 Color Tabs", "20 Pages / 10 Spreads"],
    annotation: "Click any colored tab on the right edge or scroll down to turn the page!",
    doodle: "↳ Next spread: Compilation of Seven Literary Analyses (Pages 03–10)",
  },
  {
    pageNumber: 3,
    categoryId: "analyses-1",
    eyebrow: "ANALYSIS 01 // HISTORICAL & CONTEXTUAL LENS",
    title: "THE TALE OF GENJI",
    subtitle: "Author: Murasaki Shikibu • Early 1000s Heian Japan",
    dateTag: "DVD 01",
    paragraphs: [
      "The Tale of Genji was written in the early 1000s in Japan, during the Heian period, and is often called the first novel in the world. Life in the Heian court was full of rank, manners, and beauty. Powerful families like the Fujiwara controlled the government by marrying their daughters to the emperor, so marriage and love in the story are never only about feelings—they are also about power and position.",
      "Hikaru Genji, the handsome son of an emperor, cannot become emperor because of court politics, so he spends his life in love affairs and court life. While men could have many partners, women such as Lady Murasaki, Lady Rokujo, and Lady Aoi waited behind screens and suffered silently because they had little control over their lives.",
      "Murasaki Shikibu, a lady-in-waiting at court, wrote in the Japanese kana script used by women, giving us an insider female viewpoint shaped by Buddhist 'mono no aware'—a gentle sadness about things that do not last.",
    ],
    bulletsTitle: "HISTORICAL & CONTEXTUAL KEY POINTS:",
    bullets: [
      "Fujiwara court politics tied marriage directly to imperial rank and power",
      "Written in women's kana script from a woman's perspective inside the palace",
      "Mono no aware: Buddhist awareness that beauty fades, love ends, and people die",
    ],
    highlights: ["Heian Court", "Kana Script", "Mono no Aware"],
    annotation:
      "Not only a love story, but a picture of Heian court rules, beauty, and quiet sadness.",
    doodle: "✦ Load DVD 01 on the desk to watch The Tale of Genji video study",
  },
  {
    pageNumber: 4,
    categoryId: "analyses-1",
    eyebrow: "ANALYSIS 02 // FEMINIST LENS",
    title: "PRIDE AND PREJUDICE",
    subtitle: "Author: Jane Austen • Published 1813, England",
    dateTag: "DVD 02",
    paragraphs: [
      "A feminist lens looks at how a story shows the lives, limits, and strength of women. Published in 1813, Pride and Prejudice shows how little choice middle- and upper-class women had in England, where they could not easily work or own property. Because the Bennet family house is entailed to a male relative, the five daughters risk losing their home and security after their father dies.",
      "The story shows different choices women make under this pressure: Charlotte Lucas marries Mr. Collins without love for a safe future, Lydia runs away with Wickham, and Jane hides her feelings. Elizabeth Bennet stands out—smart, funny, and brave enough to refuse both Mr. Collins and Mr. Darcy's first proud proposal despite the risk.",
      "She finally marries Darcy only after Darcy learns humility and she sees her own mistakes, proving women deserve respect, a voice, and the right to choose.",
    ],
    bulletsTitle: "FEMINIST LENS KEY POINTS:",
    bullets: [
      "Entailment law left the five Bennet daughters financially vulnerable",
      "Contrasting female choices under pressure: Charlotte, Lydia, Jane & Elizabeth",
      "Marriage built on mutual growth, respect, and personal standards",
    ],
    highlights: ["Entailed Estate", "Female Agency", "Right to Choose"],
    annotation: "Saying no to a rich man in 1813 showed a woman could hold her own standards.",
    doodle: "✦ Load DVD 02 on the desk to watch the Pride and Prejudice study",
  },
  {
    pageNumber: 5,
    categoryId: "analyses-2",
    eyebrow: "ANALYSIS 03 // MARXIST (SOCIOECONOMIC) LENS",
    title: "LES MISÉRABLES",
    subtitle: "Author: Victor Hugo • Published 1862, France",
    dateTag: "DVD 03",
    paragraphs: [
      "A Marxist lens looks at how money, class, and power shape people's lives. Set in early-1800s France, Les Misérables shows how society can crush poor people and then blame them for their suffering. Jean Valjean steals a loaf of bread to feed his sister's hungry children, serves nineteen years in prison, and is marked forever by a yellow convict passport so no one will hire or shelter him.",
      "Fantine, a single mother fired from a factory, sells her hair, her teeth, and finally her body to pay for her daughter Cosette's care while those with money and power face no consequences. While the Thénardiers exploit the poor for profit, street children like Gavroche still help others—showing that poverty, not bad character, pushes people into crime.",
      "Javert represents strict law protecting the system, yet breaks when Valjean shows him mercy. Alongside the student barricades, the novel calls for a fairer society where no one is thrown away because of poverty.",
    ],
    bulletsTitle: "MARXIST LENS KEY POINTS:",
    bullets: [
      "Valjean's yellow passport exposes a system that never lets the poor start again",
      "Fantine pays the full price of poverty while the privileged suffer nothing",
      "Strict law without kindness (Javert) is not real justice beside Valjean's mercy",
    ],
    highlights: ["Money & Class", "Yellow Passport", "Mercy vs. Law"],
    annotation: "Hugo shows that poverty—not bad character—pushes people into desperation.",
    doodle: "✦ Load DVD 03 on the desk to watch the Les Misérables case study",
  },
  {
    pageNumber: 6,
    categoryId: "analyses-2",
    eyebrow: "ANALYSIS 04 // HISTORICAL & CONTEXTUAL LENS",
    title: "TO KILL A MOCKINGBIRD",
    subtitle: "Author: Harper Lee • Set 1930s / Published 1960",
    dateTag: "DVD 04",
    paragraphs: [
      "Published in 1960 as the Civil Rights Movement grew, To Kill a Mockingbird is set in 1930s Maycomb, Alabama during the Great Depression and under Jim Crow laws that separated Black and white people. Many neighbors pay Atticus Finch with food instead of money; the Cunninghams are proud but poor, while the Ewells look for someone to blame.",
      "The trial of Tom Robinson is the heart of the book. Accused of hurting Mayella Ewell, Tom is proven innocent by Atticus, yet the all-white jury still finds him guilty—reflecting real history such as the 1930s Scottsboro case in Alabama, where race mattered more than truth.",
      "Through Scout and Jem, we see children confront an unfair society as Atticus teaches them empathy by 'walking in their shoes,' while Boo Radley shows how fear and gossip hurt innocent people too.",
    ],
    bulletsTitle: "HISTORICAL & CONTEXTUAL KEY POINTS:",
    bullets: [
      "Dual historical context: 1930s Great Depression/Jim Crow & 1960 Civil Rights",
      "Tom Robinson's trial mirrors the real 1930s Scottsboro case in Alabama",
      "Walking in another's shoes: Atticus's lesson to Scout and Jem on empathy",
    ],
    highlights: ["Jim Crow Laws", "Scottsboro Case", "Walk in Their Shoes"],
    annotation: "A mirror of real American history challenging readers to examine prejudice.",
    doodle: "✦ Load DVD 04 on the desk to watch To Kill a Mockingbird",
  },
  {
    pageNumber: 7,
    categoryId: "analyses-3",
    eyebrow: "ANALYSIS 05 // FORMALIST LENS",
    title: "VOICE OUT OF THE WHIRLWIND",
    subtitle: "Book of Job (Job 38) • Hebrew Bible Wisdom Poetry",
    dateTag: "DVD 05",
    paragraphs: [
      "A formalist lens focuses on the form of a text—its structure, language, images, and style. The Book of Job begins and ends in simple prose, while the middle unfolds in long poetic arguments between Job and his three friends. When God speaks 'out of the whirlwind' in Job 38, the change of speaker becomes a dramatic turning point.",
      "The main device in this chapter is the rhetorical question: Where was Job when the earth was made? Who set the limits of the sea, sends the rain, or knows the way to the stars? Because Job cannot answer, the form itself is the message—answering Job's plea with questions that show the limits of human knowledge.",
      "Strong nature images—the sea wrapped like a baby in clouds, morning stars singing, snow, lightning, lions, ravens, and mountain goats—paired with parallel poetic lines shift the mood from complaining to humble wonder.",
    ],
    bulletsTitle: "FORMALIST LENS KEY POINTS:",
    bullets: [
      "Structure: Prose frame vs. central poetry and the whirlwind turning point",
      "Rhetorical questions serve as the main device revealing human limits",
      "Parallel lines and cosmic nature imagery lead the reader to humble silence",
    ],
    highlights: ["Rhetorical Questions", "Parallel Rhythm", "Nature Imagery"],
    annotation: "By using questions, images, and rhythm, the form teaches as much as the words.",
    doodle: "✦ Load DVD 05 on the desk to watch Voice Out of the Whirlwind",
  },
  {
    pageNumber: 8,
    categoryId: "analyses-3",
    eyebrow: "ANALYSIS 06 // ARCHETYPAL & MYTHOLOGICAL LENS",
    title: "THE ILIAD",
    subtitle: "Author: Homer • Ancient Greek Epic of the Trojan War",
    dateTag: "DVD 06",
    paragraphs: [
      "An archetypal lens looks for patterns, symbols, and character types across the world and across time. In Homer's Iliad, Achilles embodies the Tragic Hero: half-god son of the sea goddess Thetis, greatest of warriors yet flawed by rage after Agamemnon takes Briseis, forced to choose between a short life with glory or a long life without it.",
      "Hector is the opposite kind of hero—a family man fighting to protect Troy, his wife Andromache, and his baby son, contrasting glory with duty. When Patroclus dies, Achilles is broken by grief and kills Hector in wild revenge, until King Priam, the Wise Old Man, comes alone to Achilles' tent to ask for his son's body.",
      "Achilles sees his own father in Priam and they cry together in a symbolic Death and Rebirth that restores his humanity amid Olympian archetypes (Zeus, Athena, Aphrodite, Ares) and inescapable Fate.",
    ],
    bulletsTitle: "ARCHETYPAL LENS KEY POINTS:",
    bullets: [
      "Two sides of heroism: Achilles (glory & tragic rage) vs. Hector (family & duty)",
      "Death and Rebirth: Weeping with King Priam returns Achilles to his humanity",
      "Mythic patterns: Olympian god archetypes and inescapable destiny",
    ],
    highlights: ["Tragic Hero", "Glory vs. Duty", "Death & Rebirth"],
    annotation: "More than a war story: an epic about anger, grief, and what it means to be human.",
    doodle: "✦ Load DVD 06 on the desk to watch Homer's The Iliad",
  },
  {
    pageNumber: 9,
    categoryId: "analyses-3",
    eyebrow: "ANALYSIS 07 // ARCHETYPAL & MYTHOLOGICAL LENS",
    title: "THE ODYSSEY",
    subtitle: "Author: Homer • The Archetypal Hero's Journey Home",
    dateTag: "DVD 07",
    paragraphs: [
      "The Odyssey tells how Odysseus travels home to Ithaca for ten years after the Trojan War—one of the best examples of the 'Hero's Journey' of leaving home, facing trials, and coming back changed. Along the way, Monsters and Temptations test him: he defeats the giant Cyclops Polyphemus with cleverness rather than strength, faces Circe the Enchantress, resists the Sirens' deadly song, and leaves Calypso's offer of comfort and immortality.",
      "His Descent to the Underworld to speak with the spirits of his mother and Achilles acts as a symbolic death where the hero gains wisdom from the past before returning to life.",
      "With Athena as the Mentor, Telemachus growing into manhood, and Penelope as the Faithful, Wise Wife testing the suitors, Odysseus returns disguised as a beggar—the Hidden King—to restore order to his house.",
    ],
    bulletsTitle: "HERO'S JOURNEY ARCHETYPES:",
    bullets: [
      "Monsters & Temptations: Cyclops, Circe, Sirens, and Calypso's comfort",
      "Descent to the Underworld: Symbolic death that yields wisdom for return",
      "Mentor, Faithful Wife & Hidden King: Athena, Penelope, and Odysseus",
    ],
    highlights: ["Hero's Journey", "Cleverness & Loyalty", "Hidden King"],
    annotation:
      "The true enemy of a hero is not only a monster, but also forgetfulness and comfort.",
    doodle: "✦ Load DVD 07 on the desk to watch Homer's The Odyssey",
  },
  {
    pageNumber: 10,
    categoryId: "analyses-3",
    eyebrow: "SECTION 02 // SEVEN ANALYSES OVERVIEW",
    title: "SEVEN MASTERPIECES MATRIX",
    subtitle: "Connecting Critical Lenses Across the 7-Disc Archive",
    dateTag: "SYNTHESIS",
    paragraphs: [
      "Studying all seven works together demonstrates how each literary lens opens a unique window into human life. Historical context illuminates court rank in Heian Japan and racial injustice in 1930s Alabama; Feminist and Marxist lenses expose how gender and socioeconomic class shape survival in 19th-century England and France.",
      "Meanwhile, Formalist and Archetypal readings show how ancient wisdom poetry and Greek epics use structure, cosmic imagery, and timeless mythic patterns to explore suffering, honor, grief, and the wish to go home.",
    ],
    bulletsTitle: "SEVEN LITERARY ANALYSES & LENSES:",
    bullets: [
      "01 The Tale of Genji (Historical) • 02 Pride and Prejudice (Feminist)",
      "03 Les Misérables (Marxist) • 04 To Kill a Mockingbird (Historical)",
      "05 Job 38 (Formalist) • 06 The Iliad & 07 The Odyssey (Archetypal)",
    ],
    highlights: ["7 Literary Analyses", "5 Critical Lenses", "World Literature"],
    annotation: "All 7 analyses correspond directly to the 7 DVD cases on the right desk.",
    doodle: "↳ Next section: My Favorite Literary Masterpiece (Pages 11–12)",
  },
  {
    pageNumber: 11,
    categoryId: "favorite",
    eyebrow: "SECTION 03 // MY FAVORITE LITERARY MASTERPIECE",
    title: "FAVORITE WORK: JOB 38",
    subtitle: "Voice Out of the Whirlwind • Book of Job (Author Unknown)",
    dateTag: "FAVORITE I",
    paragraphs: [
      "Brief Overview: The Book of Job is about a good man named Job who loses almost everything—his wealth, his children, and his health. His friends say he must have done something wrong to deserve this, but Job disagrees and questions why bad things are happening to him. In Job 38, God answers Job 'out of the whirlwind'—not by explaining why Job suffered, but by asking many questions about who made the earth, controls the sea, and feeds the animals.",
      "Why I Chose It as My Favorite: I chose this work because it talks about real problems that people still face today and may face in the future. Everyone goes through hard times and asks, 'Why is this happening to me?' I also like that the story does not give an easy, neat answer—its honesty makes the reader think and makes it feel real.",
    ],
    bulletsTitle: "WHY VOICE OUT OF THE WHIRLWIND IS MY FAVORITE:",
    bullets: [
      "Confronts real human suffering that people still experience today",
      "Refuses to offer a simplistic or artificial explanation for pain",
      "Uses cosmic questions to remind us how small human knowledge is",
    ],
    highlights: ["Out of the Whirlwind", "Honest Questions", "No Easy Answers"],
    annotation: "It does not say everything has a neat reason—that honesty makes it feel real.",
    doodle: "✦ Companion Video: DVD 05 — Voice Out of the Whirlwind",
  },
  {
    pageNumber: 12,
    categoryId: "favorite",
    eyebrow: "SECTION 03 // THEMES & PERSONAL REALIZATIONS",
    title: "HUMILITY, WONDER & ACCEPTANCE",
    subtitle: "Important Themes, Characters & Personal Connections",
    dateTag: "FAVORITE II",
    paragraphs: [
      "Personal Connections and Realizations: This story made me realize that it is okay to not have all the answers. In life, there will be times when things go wrong even when we try our best.",
      "Instead of blaming ourselves or others too quickly, we can accept that some things are beyond our control. It teaches me to be humble, to keep going, and to keep asking questions with an open heart.",
    ],
    bulletsTitle: "IMPORTANT THEMES, CHARACTERS & LESSONS:",
    bullets: [
      "Suffering & Questions: Job is not punished for asking honest questions",
      "Human Limits & Humility: Not knowing everything is part of being human",
      "Wonder: Stars, the sea, and animals show life is bigger than our problems",
      "Job's Friends: Simple answers to painful problems do not always help",
    ],
    highlights: ["Human Limits", "Humility & Wonder", "Open Heart"],
    annotation: "Accepting what is beyond our control teaches patience, humility, and resilience.",
    doodle: "↳ Next section: Summary of Learning (Pages 13–14)",
  },
  {
    pageNumber: 13,
    categoryId: "summary",
    eyebrow: "SECTION 04 // SUMMARY OF LEARNING — PART I",
    title: "A WINDOW INTO HUMAN LIFE",
    subtitle: "Understanding Masterpieces from Different Periods & Cultures",
    dateTag: "SUMMARY I",
    paragraphs: [
      "In Great Books, I learned that literature is a window into the human experience. Through seven works from different times and places, I met people from ancient Greece, ancient Israel, Heian Japan, 19th-century England and France, and 20th-century America. Even though these stories come from different cultures, they talk about love, power, suffering, justice, pride, and the search for meaning.",
      "Literature as a Reflection of Human Life: Stories are mirrors of people, beliefs, and societies. They show what people feared, valued, and hoped for in their time, and remind us that unfair treatment, hardship, and the wish to belong are still around today.",
    ],
    bulletsTitle: "MASTERPIECES ACROSS PERIODS & CULTURES:",
    bullets: [
      "Iliad & Odyssey (Ancient Greece): Heroes, fate, honor & the journey home",
      "Job 38 (Ancient Israel): Suffering, faith & limits of human understanding",
      "The Tale of Genji (Heian Japan): Court life, beauty & impermanence",
      "Pride & Prejudice (1813), Les Misérables (1862) & Mockingbird (1960)",
    ],
    highlights: ["Human Experience", "Mirrors of Society", "Cross-Cultural"],
    annotation: "Stories preserve what people across every era feared, valued, and hoped for.",
    doodle: "✦ Greece • Israel • Heian Japan • England • France • America",
  },
  {
    pageNumber: 14,
    categoryId: "summary",
    eyebrow: "SECTION 04 // SUMMARY OF LEARNING — PART II",
    title: "LITERARY LENSES & SKILLS DEVELOPED",
    subtitle: "Reading One Story in Many Ways",
    dateTag: "SUMMARY II",
    paragraphs: [
      "Knowledge and Use of Literary Lenses: I learned that one story can be read in many ways depending on the lens we use. The Historical/Contextual Lens showed how time and place shape Genji and Mockingbird; the Feminist Lens revealed the roles and strength of women in Pride and Prejudice; the Marxist Lens exposed how money and class affect people in Les Misérables; the Formalist Lens showed how structure and style carry meaning in Job 38; and the Archetypal Lens uncovered shared patterns in The Iliad and The Odyssey.",
    ],
    bulletsTitle: "SKILLS I DEVELOPED IN GREAT BOOKS:",
    bullets: [
      "Critical Thinking: Asking 'why' and not just 'what' happened",
      "Interpretation & Analysis: Decoding symbols and citing textual examples",
      "Writing: Explaining thoughts clearly and organizing ideas well",
      "Empathy: Understanding people whose lives and times differ from mine",
    ],
    highlights: ["5 Literary Lenses", "Critical Thinking", "Empathy & Writing"],
    annotation: "Each critical lens reveals a new dimension of meaning inside the text.",
    doodle: "↳ Next section: Personal Reflection (Pages 15–18)",
  },
  {
    pageNumber: 15,
    categoryId: "reflection",
    eyebrow: "SECTION 05 // PERSONAL JOURNAL",
    title: "REFLECT",
    subtitle: "PERSONAL NOTES & REFLECTIONS",
    dateTag: "JOURNAL I",
    paragraphs: [
      "Before taking this course, I thought literature was mostly about reading a story and knowing what happens next. Now I realize it is also about asking what a story is truly trying to say beneath the surface. I used to avoid older works because I assumed they would feel hard and boring, but now I genuinely enjoy them—especially the ones that carry deep lessons. I have learned to slow down and look for the quiet meaning behind the words.",
      "Reading these classics was not always easy at first because of the old, unfamiliar language and the long, heavy narratives. Many names, places, customs, and historical eras were completely new to me. I overcame those challenges by reading slowly, taking notes, looking up background context, and discussing ideas with my classmates and teacher. Whenever a passage felt complex, I pictured the scene like a drawing in my mind, which helped me hold onto its details and emotions.",
    ],
    bulletsTitle: "MARGIN NOTES — HOW MY READING HABITS GREW:",
    bullets: [
      "Slowing down to uncover deeper meaning behind unfamiliar words",
      "Taking notes, researching historical context & talking with classmates",
      "Sketching scenes in my mind like paintings to remember key moments",
    ],
    highlights: ["meaning behind the words", "pictured the scene like a drawing", "reading slowly"],
    annotation: "Picturing scenes like drawings in my mind helped bring ancient texts to life.",
    doodle: "✦ Personal Notes & Reflections — Entry I",
  },
  {
    pageNumber: 16,
    categoryId: "reflection",
    eyebrow: "SECTION 05 // PERSONAL JOURNAL",
    title: "REFLECT",
    subtitle: "PERSONAL NOTES & REFLECTIONS",
    dateTag: "JOURNAL II",
    paragraphs: [
      "Out of all the approaches we explored, the Historical and Contextual Lens influenced my way of reading the most. It showed me that a story can never be fully understood without knowing the world around it. It made me think about the real people who lived through those times and how their daily lives, laws, and struggles shaped what they wrote.",
      "Reading Voice Out of the Whirlwind from the Book of Job also gave me an important realization about life and human nature. It taught me that people have limits and that we cannot always understand everything that happens to us. When Job suffers, he asks why bad things happen to him, just like many of us do, and God's response reminds me to stay humble rather than expect easy explanations.",
    ],
    bulletsTitle: "MARGIN NOTES — CONTEXT & HUMILITY:",
    bullets: [
      "Every story is shaped by the historical world and people around it",
      "Job 38 reminds us that human understanding has limits and calls for humility",
      "Honest questions are a natural part of enduring difficult seasons",
    ],
    highlights: ["Historical and Contextual Lens", "knowing the world around it", "stay humble"],
    annotation: "Knowing the world around a story transforms how we understand its characters.",
    doodle: "✦ Personal Notes & Reflections — Entry II",
  },
  {
    pageNumber: 17,
    categoryId: "reflection",
    eyebrow: "SECTION 05 // PERSONAL JOURNAL",
    title: "REFLECT",
    subtitle: "PERSONAL NOTES & REFLECTIONS",
    dateTag: "JOURNAL III",
    paragraphs: [
      "Looking across all seven works, I realized that human nature does not change much over the centuries. Whether in ancient Greece, Heian Japan, nineteenth-century Europe, or twentieth-century America, people in every age have wrestled with pride, power, fear, love, and loss. Reading their stories helps us see that we are not alone in what we feel.",
      "I want to carry these lessons into my personal life, my studies, and my future career. Personally, I will strive to be more humble and patient when things are hard, and to understand people before judging them. Academically, I will continue reading carefully, thinking deeply, and explaining my ideas clearly.",
    ],
    bulletsTitle: "MARGIN NOTES — SHARED HUMANITY:",
    bullets: [
      "Pride, power, fear, love, and loss appear in every culture and century",
      "Stories bridge the distance between eras so we know we are not alone",
      "Patience, humility, and empathy begin with listening before judging",
    ],
    highlights: [
      "human nature does not change",
      "we are not alone",
      "understand people before judging",
    ],
    annotation: "Stories across every culture remind us that we are never alone in our struggles.",
    doodle: "✦ Personal Notes & Reflections — Entry III",
  },
  {
    pageNumber: 18,
    categoryId: "reflection",
    eyebrow: "SECTION 05 // PERSONAL JOURNAL",
    title: "REFLECT",
    subtitle: "PERSONAL NOTES & REFLECTIONS",
    dateTag: "JOURNAL IV",
    paragraphs: [
      "As a future Information Technology professional, I know I will work with many different kinds of people. The empathy, critical thinking, and communication I practiced in this course will help me understand users, collaborate closely with a team, and make fair, thoughtful decisions when building technology for real people.",
      "Great Books taught me that old stories are not really old. They still speak to us today, and this journey helped me grow as a reader, a thinker, and a person.",
    ],
    bulletsTitle: "CARRYING GREAT BOOKS FORWARD:",
    bullets: [
      "Personal Life: Practicing humility, patience, and kindness in hard moments",
      "Academic Life: Reading closely, questioning deeply, and writing clearly",
      "IT Profession: Designing with empathy for users and collaborating fairly",
    ],
    highlights: [
      "empathy, critical thinking",
      "old stories are not really old",
      "grow as a reader",
    ],
    annotation: "Old stories are not really old—they still speak to us today.",
    doodle: "↳ Next section: References & Portfolio Checklist (Pages 19–20)",
  },
  {
    pageNumber: 19,
    categoryId: "sources",
    eyebrow: "SECTION 06 // REFERENCES & PRIMARY TEXTS",
    title: "WORKS CITED & TEXT SOURCES",
    subtitle: "Primary Editions, Translations & Summary Pages",
    dateTag: "SOURCES I",
    paragraphs: [
      "Book texts, translations, publisher pages, and summary resources consulted for the seven literary analyses:",
    ],
    bulletsTitle: "BIBLIOGRAPHY OF THE SEVEN WORKS:",
    bullets: [
      "1. The Tale of Genji (Murasaki Shikibu): Translations by Waley, Seidensticker, Tyler & Washburn; Britannica & World History Encyclopedia",
      "2. Pride and Prejudice (Jane Austen): Project Gutenberg free full text; Britannica",
      "3. Les Misérables (Victor Hugo): Project Gutenberg free full text; Britannica",
      "4. To Kill a Mockingbird (Harper Lee): Penguin publisher page; Britannica",
      "5. Voice Out of the Whirlwind (Job 38): Bible Hub NIV & KJV side by side; Britannica & Theology of Work",
      "6–7. The Iliad & The Odyssey (Homer): Project Gutenberg (Samuel Butler translation); Britannica",
    ],
    highlights: ["Project Gutenberg", "Britannica", "Bible Hub NIV/KJV"],
    annotation: "Primary editions and reference summaries across all seven studied works.",
    doodle: "✦ Primary & Secondary Literary Sources",
  },
  {
    pageNumber: 20,
    categoryId: "sources",
    eyebrow: "SECTION 06 // HISTORICAL SOURCES & SIGN-OFF",
    title: "HISTORICAL SOURCES & CHECKLIST",
    subtitle: "Background References & Final Submission Verification",
    dateTag: "PAGE 20 / 20",
    paragraphs: [
      "Background historical sources used to contextualize Heian court life, the 1930s Scottsboro trials linked to To Kill a Mockingbird, and the Homeric Greek epic tradition.",
      "Digital Portfolio completed by Angelaica Mae P. Harochoc — 4th Year Bachelor of Science in Information Technology, Section Great Books-GEC-GB-NRt, School of Computer and Information Sciences, University of Nueva Caceres.",
    ],
    bulletsTitle: "HISTORICAL DETAILS & FINAL SUBMISSION CHECKLIST:",
    bullets: [
      "Murasaki Shikibu & Heian court life: Britannica — Murasaki Shikibu",
      "Scottsboro case linked to To Kill a Mockingbird: Britannica — Scottsboro case",
      "Homer & the Greek epics: Britannica — The Greek epic",
      "Verified: All 5 portfolio sections, 7 analyses, student ID photo & unified design",
    ],
    highlights: ["Angelaica Mae P. Harochoc", "University of Nueva Caceres"],
    annotation: "Angelaica Mae P. Harochoc — 4th Year BSIT • GEC-GB-NRt",
    doodle: "✦ END OF NOTEBOOK — MY LITERARY JOURNEY ✦",
  },
];
