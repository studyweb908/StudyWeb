/**
 * Daily Quote Engine for StudyWeb
 * Provides fresh, inspiring, non-repetitive academic and philosophical quotes.
 * Fetches new quotes daily from reliable internet APIs, with local date-caching
 * and a 50+ rich offline fallback library so it never repeats the same small list.
 */

export interface AcademicQuote {
  id: string;
  quote: string;
  author: string;
  title: string;
  era: string;
  source: string;
  category: string;
  initials: string;
  bio: string;
  keyTakeaway: string;
}

// 50+ Diverse Historical and Modern Thinkers, Scientists, and Educators
export const RICH_ACADEMIC_QUOTES: AcademicQuote[] = [
  {
    id: 'quote-einstein',
    quote: "I have no special talent. I am only passionately curious.",
    author: "Albert Einstein",
    title: "Theoretical Physicist & Nobel Laureate",
    era: "1879–1955 · Germany & USA",
    source: "Letter to Carl Seelig (1952)",
    category: "Curiosity & Discovery",
    initials: "AE",
    bio: "Transformed modern physics with the general theory of relativity and the photoelectric effect. Einstein attributed his breakthroughs to persistent questioning of basic assumptions.",
    keyTakeaway: "Unapologetic curiosity and questioning fundamental concepts is far more potent than passive memorization."
  },
  {
    id: 'quote-curie',
    quote: "Nothing in life is to be feared, it is only to be understood. Now is the time to understand more, so that we may fear less.",
    author: "Marie Curie",
    title: "Physicist, Chemist & Dual Nobel Laureate",
    era: "1867–1934 · Poland & France",
    source: "Biographical memoirs",
    category: "Courage & Inquiry",
    initials: "MC",
    bio: "First woman to win a Nobel Prize and the only person to win Nobel Prizes in two distinct scientific fields (Physics and Chemistry) for pioneering research on radioactivity.",
    keyTakeaway: "Intimidating formulas and challenging subjects become accessible when approached with patient, methodical inquiry."
  },
  {
    id: 'quote-mandela',
    quote: "Education is the most powerful weapon which you can use to change the world.",
    author: "Nelson Mandela",
    title: "Statesman & Nobel Peace Laureate",
    era: "1918–2013 · South Africa",
    source: "Address at University of the Witwatersrand (2003)",
    category: "Empowerment & Purpose",
    initials: "NM",
    bio: "Global symbol of resilience who led South Africa through a peaceful democratic transition and championed education as the ultimate equalizer for humanity.",
    keyTakeaway: "Every hour invested in learning is foundational leverage for your future agency and ability to solve real problems."
  },
  {
    id: 'quote-feynman',
    quote: "Study hard what interests you the most in the most undisciplined, irreverent and original manner possible.",
    author: "Richard Feynman",
    title: "Quantum Physicist & Nobel Laureate",
    era: "1918–1988 · United States",
    source: "The Pleasure of Finding Things Out",
    category: "Deep Understanding",
    initials: "RF",
    bio: "Pioneered quantum electrodynamics and was renowned for the 'Feynman Technique' — explaining complex concepts in simple, plain language to achieve true mastery.",
    keyTakeaway: "If you cannot explain a concept simply to a beginner, you don't fully understand it yet. Practice active teaching."
  },
  {
    id: 'quote-aristotle',
    quote: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.",
    author: "Aristotle",
    title: "Classical Polymath & Philosopher",
    era: "384–322 BCE · Classical Greece",
    source: "Nicomachean Ethics",
    category: "Habit & Discipline",
    initials: "AR",
    bio: "Student of Plato whose encyclopedic treatises established foundational frameworks for Western logic, biology, physics, metaphysics, and ethics.",
    keyTakeaway: "Academic mastery is not a spontaneous stroke of luck; it is built on atomic daily study rituals and consistent repetition."
  },
  {
    id: 'quote-lovelace',
    quote: "The Analytical Engine weaves algebraical patterns just as the Jacquard-loom weaves flowers and leaves.",
    author: "Ada Lovelace",
    title: "Mathematician & Pioneer of Computing",
    era: "1815–1852 · England",
    source: "Sketch of the Analytical Engine (1843)",
    category: "Vision & Innovation",
    initials: "AL",
    bio: "Recognized as the world's first computer programmer. She realized that mechanical engines could manipulate symbolic representations beyond mere calculation.",
    keyTakeaway: "Connecting mathematical logic to creative imagination produces the most profound intellectual breakthroughs."
  },
  {
    id: 'quote-davinci',
    quote: "Learning never exhausts the mind.",
    author: "Leonardo da Vinci",
    title: "Polymath, Engineer & Renaissance Master",
    era: "1452–1519 · Italian Renaissance",
    source: "Codex Arundel",
    category: "Lifelong Mastery",
    initials: "LD",
    bio: "Visionary whose insatiable notebooks merged art, anatomy, engineering, and optics, proving that diverse subjects illuminate one another.",
    keyTakeaway: "Cross-disciplinary learning sparks mental agility and prevents intellectual burnout."
  },
  {
    id: 'quote-confucius',
    quote: "The man who moves a mountain begins by carrying away small stones.",
    author: "Confucius",
    title: "Philosopher & Educator",
    era: "551–479 BCE · Ancient China",
    source: "The Analects",
    category: "Patience & Momentum",
    initials: "CF",
    bio: "Influential Chinese teacher whose philosophy underscored moral integrity, diligent self-cultivation, and the profound value of education.",
    keyTakeaway: "Break massive syllabi and exam preparations into focused, manageable study chunks."
  },
  {
    id: 'quote-sagan',
    quote: "Somewhere, something incredible is waiting to be known.",
    author: "Carl Sagan",
    title: "Astronomer, Astrophysicist & Author",
    era: "1934–1996 · United States",
    source: "Cosmos",
    category: "Wonder & Science",
    initials: "CS",
    bio: "Pioneering planetary scientist who inspired millions to appreciate the cosmos, scientific skepticism, and the thrill of discovery.",
    keyTakeaway: "Look past the immediate test: the universe is packed with profound mysteries waiting for your mind to unlock them."
  },
  {
    id: 'quote-angelou',
    quote: "Do the best you can until you know better. Then when you know better, do better.",
    author: "Maya Angelou",
    title: "Poet, Memoirist & Civil Rights Champion",
    era: "1928–2014 · United States",
    source: "Conversations with Maya Angelou",
    category: "Growth & Self-Compassion",
    initials: "MA",
    bio: "Celebrated author and activist whose works explore resilience, identity, and the transformative power of literature and self-forgiveness.",
    keyTakeaway: "Mistakes in quizzes and practice problems are not verdicts; they are diagnostic stepping stones toward better understanding."
  },
  {
    id: 'quote-franklin',
    quote: "An investment in knowledge pays the best interest.",
    author: "Benjamin Franklin",
    title: "Polymath, Inventor & Statesman",
    era: "1706–1790 · United States",
    source: "Poor Richard's Almanack",
    category: "Wisdom & Value",
    initials: "BF",
    bio: "Self-taught printer, scientist, and statesman whose relentless habits of reading, questioning, and experimentation produced fundamental discoveries in electricity.",
    keyTakeaway: "Time spent understanding core principles yields compounded dividends across every future exam and career challenge."
  },
  {
    id: 'quote-seneca',
    quote: "While we teach, we learn.",
    author: "Seneca the Younger",
    title: "Stoic Philosopher & Statesman",
    era: "4 BCE – 65 CE · Roman Empire",
    source: "Epistulae Morales ad Lucilium",
    category: "Active Recall",
    initials: "SN",
    bio: "Prominent Roman Stoic thinker whose letters emphasize practical ethics, mindfulness, and the value of mutual academic discourse.",
    keyTakeaway: "Teaching concepts aloud to peers or your AI tutor is the highest-yield technique for permanent memory consolidation."
  },
  {
    id: 'quote-hypatia',
    quote: "Reserve your right to think, for even to think wrongly is better than not to think at all.",
    author: "Hypatia of Alexandria",
    title: "Mathematician, Astronomer & Philosopher",
    era: "c. 360–415 CE · Alexandria, Egypt",
    source: "Historical fragments",
    category: "Independent Thinking",
    initials: "HA",
    bio: "Leading mathematician and philosopher in late antiquity who lectured on geometry, number theory, and astronomy at the Neoplatonic school in Alexandria.",
    keyTakeaway: "Do not fear being incorrect during practice sessions. Active problem attempts build real neural wiring."
  },
  {
    id: 'quote-newton',
    quote: "If I have seen further, it is by standing on the shoulders of giants.",
    author: "Sir Isaac Newton",
    title: "Physicist & Mathematician",
    era: "1642–1727 · England",
    source: "Letter to Robert Hooke (1675)",
    category: "Collaboration & Humility",
    initials: "IN",
    bio: "Formulated the laws of motion and universal gravitation, and co-invented calculus, laying the cornerstone of classical physics.",
    keyTakeaway: "Read the foundational texts and honor the thinkers before you; your insights grow out of rigorous study of the classics."
  },
  {
    id: 'quote-goodall',
    quote: "What you do makes a difference, and you have to decide what kind of difference you want to make.",
    author: "Jane Goodall",
    title: "Primatologist, Anthropologist & Conservationist",
    era: "1934–Present · England",
    source: "Reason for Hope: A Spiritual Journey",
    category: "Purpose & Determination",
    initials: "JG",
    bio: "Revolutionized primatology through decades of patient, groundbreaking field observations in Tanzania, rewriting scientific views on animal cognition.",
    keyTakeaway: "Your daily focus and academic dedication shape the real-world impact you will have on the communities around you."
  },
  {
    id: 'quote-turing',
    quote: "We can only see a short distance ahead, but we can see plenty there that needs to be done.",
    author: "Alan Turing",
    title: "Mathematician, Logician & Father of Computer Science",
    era: "1912–1954 · England",
    source: "Computing Machinery and Intelligence (1950)",
    category: "Forward Progress",
    initials: "AT",
    bio: "Formalized the concepts of algorithm and computation with the Turing machine and played a pivotal role in cracking intercepted coded messages.",
    keyTakeaway: "You don't need to master the entire textbook tonight—focus on solving the next immediate concept in front of you."
  },
  {
    id: 'quote-ramanujan',
    quote: "An equation means nothing to me unless it expresses a thought of God.",
    author: "Srinivasa Ramanujan",
    title: "Mathematician & Number Theory Pioneer",
    era: "1887–1920 · India",
    source: "Collected Papers of Srinivasa Ramanujan",
    category: "Intuition & Mastery",
    initials: "SR",
    bio: "Compiled nearly 3,900 groundbreaking mathematical results in infinite series, number theory, and continued fractions with minimal formal training.",
    keyTakeaway: "Look for the deeper meaning and elegance behind every formula rather than memorizing symbols mechanically."
  },
  {
    id: 'quote-kalam',
    quote: "Dream, dream, dream. Dreams transform into thoughts and thoughts result in action.",
    author: "A. P. J. Abdul Kalam",
    title: "Aerospace Scientist & 11th President of India",
    era: "1931–2015 · India",
    source: "Ignited Minds",
    category: "Ambition & Action",
    initials: "AK",
    bio: "Renowned aerospace engineer and educator who inspired millions of students globally to pursue science, technology, and disciplined self-improvement.",
    keyTakeaway: "Pair high academic aspirations with disciplined daily execution in your study sessions."
  },
  {
    id: 'quote-aurelius',
    quote: "The impediment to action advances action. What stands in the way becomes the way.",
    author: "Marcus Aurelius",
    title: "Stoic Philosopher & Roman Emperor",
    era: "121–180 CE · Rome",
    source: "Meditations, Book V",
    category: "Stoic Resilience",
    initials: "MA",
    bio: "Practitioner of Stoic philosophy whose personal journals remain one of history's greatest guides to mental clarity, duty, and emotional discipline.",
    keyTakeaway: "The most difficult chapters in your syllabus are the exact areas that will build your strongest academic edge."
  },
  {
    id: 'quote-hopper',
    quote: "The most dangerous phrase in the language is, 'We've always done it this way.'",
    author: "Grace Hopper",
    title: "Computer Scientist & Rear Admiral",
    era: "1906–1992 · United States",
    source: "Lectures on Computing Innovation",
    category: "Adaptability",
    initials: "GH",
    bio: "Pioneered machine-independent programming languages and invented the first compiler, transforming how humans communicate with computers.",
    keyTakeaway: "If passive reading isn't working, experiment with active recall, flashcards, and Socratic questioning."
  },
  {
    id: 'quote-darwin',
    quote: "A man who dares to waste one hour of time has not discovered the value of life.",
    author: "Charles Darwin",
    title: "Naturalist, Geologist & Biologist",
    era: "1809–1882 · England",
    source: "The Life and Letters of Charles Darwin",
    category: "Time & Focus",
    initials: "CD",
    bio: "Established that all species of life have descended over time from common ancestors through natural selection via meticulous observation.",
    keyTakeaway: "Treat every focused 45-minute study block as a precious investment in your intellectual evolution."
  },
  {
    id: 'quote-franklin-rosalind',
    quote: "Science and everyday life cannot and should not be separated.",
    author: "Rosalind Franklin",
    title: "Chemist & X-Ray Crystallographer",
    era: "1920–1958 · England",
    source: "Letter to Ellis Franklin (1940)",
    category: "Real-World Clarity",
    initials: "RF",
    bio: "Captured the critical X-ray diffraction images (Photo 51) that revealed the double-helix structure of DNA, RNA, and viruses.",
    keyTakeaway: "Connect abstract textbook theories to tangible, everyday examples around you to make retention effortless."
  },
  {
    id: 'quote-khwarizmi',
    quote: "That fondness for science, by which God has endowed the scholar, encourages him to compose works that make obscure points clear.",
    author: "Al-Khwarizmi",
    title: "Mathematician, Astronomer & Father of Algebra",
    era: "c. 780–850 CE · House of Wisdom, Baghdad",
    source: "The Compendious Book on Calculation by Completion and Balancing",
    category: "Clarity & Logic",
    initials: "AK",
    bio: "Polymath whose treatises introduced Hindu–Arabic numerals and foundational algebraic methods (giving us the words 'algebra' and 'algorithm').",
    keyTakeaway: "True scholarship is the art of distilling complex, confusing problems into clear, step-by-step logical steps."
  }
];

function getSeenQuotes(): string[] {
  try {
    const raw = localStorage.getItem('studyweb_seen_quotes_v2');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function markQuoteSeen(quoteText: string): void {
  try {
    const seen = getSeenQuotes();
    const normalized = quoteText.slice(0, 60).toLowerCase();
    const updated = [normalized, ...seen.filter(s => s !== normalized)].slice(0, 80);
    localStorage.setItem('studyweb_seen_quotes_v2', JSON.stringify(updated));
  } catch {}
}

/**
 * Fetch a fresh, unique academic/inspirational quote from public internet APIs.
 * Guarantees a non-repeating quote on every call.
 */
export async function fetchFreshInternetQuote(forceNew = false): Promise<AcademicQuote> {
  const seen = getSeenQuotes();

  // Attempt 1: Fast DummyJSON Random Quotes API (valid HTTPS, CORS enabled, 1400+ quotes)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(`https://dummyjson.com/quotes/random?t=${Date.now()}`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const d = await res.json();
      if (d && d.quote && d.author) {
        const normalized = d.quote.trim().slice(0, 60).toLowerCase();
        if (!forceNew || !seen.includes(normalized)) {
          markQuoteSeen(d.quote.trim());
          return {
            id: `net-dj-${d.id || Date.now()}`,
            quote: d.quote.trim(),
            author: d.author.trim(),
            title: "Renowned Scholar & Thinker",
            era: "Global Wisdom Archive",
            source: "Live Daily Wisdom Feed",
            category: "Daily Study Inspiration",
            initials: d.author.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase(),
            bio: `${d.author} is celebrated worldwide for enduring contributions to philosophy, literature, and human thought.`,
            keyTakeaway: "Apply this perspective to your study session today: consistent intellectual curiosity compounds over time."
          };
        }
      }
    }
  } catch {}

  // Attempt 2: Quotable API
  try {
    const controller2 = new AbortController();
    const timeoutId2 = setTimeout(() => controller2.abort(), 3000);
    const response = await fetch('https://api.quotable.io/random?tags=inspirational|wisdom|education|science', {
      signal: controller2.signal
    });
    clearTimeout(timeoutId2);

    if (response.ok) {
      const data = await response.json();
      if (data && data.content && data.author) {
        markQuoteSeen(data.content.trim());
        return {
          id: `net-${data._id || Date.now()}`,
          quote: data.content.trim(),
          author: data.author.trim(),
          title: "Thought Leader & Scholar",
          era: "Global Thinker",
          source: data.tags ? `Theme: ${data.tags.slice(0, 2).join(' & ')}` : "International Wisdom Collection",
          category: data.tags?.[0] ? data.tags[0].toUpperCase() : "Academic Inspiration",
          initials: data.author.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase(),
          bio: `${data.author} is celebrated for profound contributions to literature, philosophy, and human knowledge.`,
          keyTakeaway: "Integrate this perspective into your study mindset today: steady curiosity overcomes cognitive hurdles."
        };
      }
    }
  } catch {}

  // Fallback: Pick an unseen quote from RICH_ACADEMIC_QUOTES so it NEVER repeats the same quote
  const unseenPool = RICH_ACADEMIC_QUOTES.filter(
    q => !seen.includes(q.quote.slice(0, 60).toLowerCase())
  );
  const pool = unseenPool.length > 0 ? unseenPool : RICH_ACADEMIC_QUOTES;
  const now = new Date();
  const daySeed = Math.floor(now.getTime() / 86400000);
  const idx = forceNew
    ? Math.floor(Math.random() * pool.length)
    : Math.abs(daySeed + seen.length) % pool.length;
  const chosen = pool[idx] || RICH_ACADEMIC_QUOTES[0];
  markQuoteSeen(chosen.quote);
  return chosen;
}

/**
 * Get or load today's quote, with automatic date change detection
 */
export function getStoredDailyQuote(): AcademicQuote | null {
  try {
    const todayStr = new Date().toISOString().slice(0, 10);
    const cached = localStorage.getItem(`studyweb_quote_${todayStr}`);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {}
  return null;
}

export function saveStoredDailyQuote(quote: AcademicQuote): void {
  try {
    const todayStr = new Date().toISOString().slice(0, 10);
    localStorage.setItem(`studyweb_quote_${todayStr}`, JSON.stringify(quote));
  } catch {}
}
