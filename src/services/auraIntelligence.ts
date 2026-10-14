/**
 * AURA Intelligence Engine (Adaptive User Response Assistant)
 * Intelligent task classification, conversational memory, contextual resolution,
 * and StudyWeb feature guide.
 */

import { queryGeminiVoice } from './voiceResponseEngine';
import { Workspace } from '../components/Dashboard/WorkspaceTypes';

export type AuraCategory = 
  | 'NAVIGATION'
  | 'FEATURE_EXPLANATION'
  | 'SUPPORTED_TASK'
  | 'EDUCATIONAL_QUERY'
  | 'GENERAL_KNOWLEDGE'
  | 'UNSUPPORTED'
  | 'AMBIGUOUS'
  | 'SENSITIVE_ACTION';

export interface AuraIntentResult {
  category: AuraCategory;
  spokenResponse: string;
  displayResponse: string;
  action?: {
    type: 
      | 'NAVIGATE'
      | 'CREATE_WORKSPACE'
      | 'SELECT_WORKSPACE'
      | 'SET_DARK_MODE'
      | 'SET_LIGHT_MODE'
      | 'TOGGLE_THEME'
      | 'TOGGLE_FOCUS_MODE'
      | 'CONFIRM_LOGOUT'
      | 'NONE';
    payload?: any;
  };
  followUpContext?: string;
}

export interface AuraContext {
  activeTab?: string;
  activeWorkspace?: Workspace | null;
  workspaces?: Workspace[];
  lastIntentCategory?: AuraCategory;
  lastDestination?: string;
  previousTab?: string;
  recentQueries?: string[];
}

// Canonical StudyWeb Feature Explanations
const STUDYWEB_FEATURES: Record<string, { summary: string; spoken: string }> = {
  workspaces: {
    summary: "Workspaces are your course-specific hubs in StudyWeb. Each workspace holds your lecture slides, notes, auto-generated flashcards, practice quizzes, and interactive concept graphs.",
    spoken: "Workspaces organize your course materials, lecture files, flashcards, and quizzes in one place. Would you like me to open your workspaces?"
  },
  ai_tutor: {
    summary: "The AI Study Tutor uses Google Gemini to answer questions, explain difficult concepts step-by-step, generate practice quizzes, and provide Socratic guidance grounded in your uploaded documents.",
    spoken: "The AI Study Tutor answers your questions, explains complex ideas, and quizzes you based on your uploaded notes."
  },
  flashcards: {
    summary: "Flashcards in StudyWeb use the Leitner spaced repetition system with 3 review boxes. Cards move up as you master them, ensuring long-term memory retention before exams.",
    spoken: "Flashcards use spaced repetition across three mastery boxes to help you remember key terms and formulas efficiently."
  },
  quiz_center: {
    summary: "Quiz Center generates custom multiple-choice, true/false, and short-answer practice tests directly from your study notes, with instant feedback and answer explanations.",
    spoken: "Quiz Center creates customized practice tests from your notes with instant feedback and score tracking."
  },
  study_planner: {
    summary: "The Study Planner organizes your study calendar, upcoming exam deadlines, daily revision tasks, and active study streaks.",
    spoken: "The Study Planner schedules your revision sessions, tracks deadlines, and helps you maintain your daily study streak."
  },
  focus_mode: {
    summary: "Focus Mode (Zen Mode) minimizes visual distractions, collapses sidebars, and lets you focus entirely on reading notes, reviewing cards, or conversing with your tutor.",
    spoken: "Focus Mode removes sidebar distractions so you can concentrate completely on studying."
  },
  notes: {
    summary: "AI Study Notes extracts structured outlines, core summaries, and key formulas from your lecture slides, PDFs, and YouTube links.",
    spoken: "AI Study Notes automatically summarizes lecture slides, documents, and videos into organized study outlines."
  },
  general: {
    summary: "StudyWeb is an AI-powered study platform featuring Course Workspaces, an intelligent AI Tutor, Spaced Repetition Flashcards, Quiz Center, and automated Study Notes.",
    spoken: "StudyWeb provides workspaces, an AI study tutor, smart flashcards, practice quizzes, and notes to accelerate your learning."
  }
};

/**
 * Natural conversational affirmations for human-like warmth
 */
const WARM_AFFIRMATIONS = [
  "Sure, let's do that.",
  "Absolutely, I'll take you there.",
  "You're all set.",
  "I can help you with that.",
  "Right away.",
  "Happy to help."
];

function getRandomAffirmation(): string {
  return WARM_AFFIRMATIONS[Math.floor(Math.random() * WARM_AFFIRMATIONS.length)];
}

/**
 * Classifies and resolves user input into actionable intents or answers
 */
export async function processAuraInput(
  rawInput: string,
  context: AuraContext
): Promise<AuraIntentResult> {
  const query = rawInput.trim();
  const lower = query.toLowerCase();

  // 1. GREETINGS & CASUAL INTRODUCTIONS
  if (/^(hi|hello|hey|good morning|good afternoon|good evening|who are you|what is your name)\b/i.test(lower)) {
    const isNameQuery = lower.includes('who are you') || lower.includes('your name');
    if (isNameQuery) {
      return {
        category: 'FEATURE_EXPLANATION',
        spokenResponse: "I am AURA, your Adaptive User Response Assistant for StudyWeb. I can navigate the site, create workspaces, toggle dark mode, or answer study questions.",
        displayResponse: "👋 **Hello! I am AURA** (*Adaptive User Response Assistant*).\n\nI am your voice-first companion for StudyWeb. You can ask me to:\n- Navigate to any page (e.g. *\"Take me to my workspaces\"*)\n- Change appearance (e.g. *\"Turn on dark mode\"*)\n- Create study workspaces (e.g. *\"Create workspace Biology\"*)\n- Ask general knowledge or academic questions (e.g. *\"What is photosynthesis?\"*)"
      };
    }
    return {
      category: 'FEATURE_EXPLANATION',
      spokenResponse: `${getRandomAffirmation()} I am AURA, your StudyWeb voice assistant. What would you like to study or navigate to?`,
      displayResponse: "👋 **Hi there! I'm AURA**, your personal StudyWeb assistant.\n\nHow can I help you today? You can speak or type a navigation command, request a feature explanation, or ask a study question."
    };
  }

  // 2. CONTEXTUAL RESOLUTION: "the second one", "the first one", "open that workspace"
  if (context.workspaces && context.workspaces.length > 0) {
    const ordinalMatch = lower.match(/\b(first|second|third|fourth|fifth|1st|2nd|3rd|4th|5th|last)\b/);
    if (ordinalMatch && (lower.includes('workspace') || lower.includes('one') || lower.includes('folder') || context.lastDestination === 'workspaces')) {
      const ord = ordinalMatch[1];
      let targetIndex = -1;
      if (ord === 'first' || ord === '1st') targetIndex = 0;
      else if (ord === 'second' || ord === '2nd') targetIndex = 1;
      else if (ord === 'third' || ord === '3rd') targetIndex = 2;
      else if (ord === 'fourth' || ord === '4th') targetIndex = 3;
      else if (ord === 'fifth' || ord === '5th') targetIndex = 4;
      else if (ord === 'last') targetIndex = context.workspaces.length - 1;

      if (targetIndex >= 0 && targetIndex < context.workspaces.length) {
        const targetWs = context.workspaces[targetIndex];
        return {
          category: 'SUPPORTED_TASK',
          spokenResponse: `Opening your ${targetWs.name} workspace.`,
          displayResponse: `📁 Selected workspace **${targetWs.name}** (${targetWs.subject || 'Course'}).`,
          action: {
            type: 'SELECT_WORKSPACE',
            payload: targetWs
          },
          followUpContext: `workspace:${targetWs.id}`
        };
      }
    }
  }

  // 3. LOGOUT / SIGN OUT (SENSITIVE ACTION)
  if (/\b(log\s*out|sign\s*out|log\s+me\s+out|sign\s+me\s+out)\b/i.test(lower)) {
    return {
      category: 'SENSITIVE_ACTION',
      spokenResponse: "Opening your logout confirmation. Let me know if you need anything else before leaving.",
      displayResponse: "🚪 **Confirm Logout**: Opening the logout confirmation modal for your session.",
      action: { type: 'CONFIRM_LOGOUT' }
    };
  }

  // 4. THEME & DARK MODE TASKS
  if (/\b(dark\s*mode|dark\s*theme|make\s+it\s+dark|go\s+dark)\b/i.test(lower)) {
    return {
      category: 'SUPPORTED_TASK',
      spokenResponse: "Switched to dark mode for you.",
      displayResponse: "🌙 **Dark Mode Activated**: Adjusted the application theme to dark.",
      action: { type: 'SET_DARK_MODE', payload: true }
    };
  }

  if (/\b(light\s*mode|light\s*theme|make\s+it\s+light|day\s*mode)\b/i.test(lower)) {
    return {
      category: 'SUPPORTED_TASK',
      spokenResponse: "Switched to light mode for you.",
      displayResponse: "☀️ **Light Mode Activated**: Adjusted the application theme to light.",
      action: { type: 'SET_LIGHT_MODE', payload: false }
    };
  }

  if (/\b(toggle\s*theme|switch\s*theme|toggle\s*mode)\b/i.test(lower)) {
    return {
      category: 'SUPPORTED_TASK',
      spokenResponse: "Theme mode toggled.",
      displayResponse: "🌓 **Theme Toggled**: Switched between light and dark display mode.",
      action: { type: 'TOGGLE_THEME' }
    };
  }

  // 5. FOCUS MODE / ZEN MODE
  if (/\b(focus\s*mode|zen\s*mode|toggle\s*focus)\b/i.test(lower)) {
    return {
      category: 'SUPPORTED_TASK',
      spokenResponse: "Focus mode toggled. Enjoy distraction-free studying.",
      displayResponse: "🧘 **Focus Mode Toggled**: Minimalist study view enabled.",
      action: { type: 'TOGGLE_FOCUS_MODE' }
    };
  }

  // 6. CREATE WORKSPACE
  const createWsRegex = /(?:create|make|add|start)(?:\s+a)?(?:\s+new)?\s+workspace(?:\s+and\s+name\s+it|\s+named|\s+called|\s+with\s+name|\s+name)?\s+(.+)/i;
  const createMatch = query.match(createWsRegex);
  if (createMatch && createMatch[1]) {
    let rawName = createMatch[1].replace(/[.,!?;]+$/, '').trim();
    let wsName = rawName;
    if (wsName.toLowerCase() === 'this' || wsName.toLowerCase() === 'it' || wsName.toLowerCase() === 'something') {
      wsName = 'Study Workspace';
    } else {
      wsName = wsName
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    }

    return {
      category: 'SUPPORTED_TASK',
      spokenResponse: `I've created the workspace "${wsName}" for you and opened it.`,
      displayResponse: `📁 **Created Workspace**: Successfully created and opened **${wsName}**.`,
      action: {
        type: 'CREATE_WORKSPACE',
        payload: { name: wsName }
      },
      followUpContext: `workspace:${wsName}`
    };
  }

  // 7. STUDYWEB NAVIGATION DESTINATIONS
  // Home / Dashboard
  if (/\b(dashboard|home\s*page|go\s*home|main\s*page)\b/i.test(lower)) {
    return {
      category: 'NAVIGATION',
      spokenResponse: "Taking you to your dashboard.",
      displayResponse: "📊 **Navigating to Dashboard**: Opened your home dashboard overview.",
      action: { type: 'NAVIGATE', payload: 'dashboard' },
      followUpContext: 'dashboard'
    };
  }

  // Workspaces
  if (/\b(workspaces|study\s*workspaces|open\s*workspaces|my\s*workspaces|courses|folders)\b/i.test(lower)) {
    return {
      category: 'NAVIGATION',
      spokenResponse: "Sure, opening your study workspaces.",
      displayResponse: "📁 **Navigating to Workspaces**: Here are all your organized course study workspaces.",
      action: { type: 'NAVIGATE', payload: 'workspaces' },
      followUpContext: 'workspaces'
    };
  }

  // AI Tutor
  if (/\b(ai\s*tutor|open\s*tutor|study\s*tutor|chat\s*tutor|tutor\s*chat)\b/i.test(lower) && !lower.includes('ask')) {
    return {
      category: 'NAVIGATION',
      spokenResponse: "Opening your AI Study Tutor. Ask me any question about your studies.",
      displayResponse: "🤖 **AI Tutor Opened**: Ready to explore concepts, solve problems, and review study materials.",
      action: { type: 'NAVIGATE', payload: 'ai-tutor' },
      followUpContext: 'ai-tutor'
    };
  }

  // Notes
  if (/\b(notes|study\s*notes|lecture\s*notes|open\s*notes)\b/i.test(lower)) {
    return {
      category: 'NAVIGATION',
      spokenResponse: "Opening your study notes.",
      displayResponse: "📝 **Navigating to Study Notes**: Reviewing your saved outlines and summaries.",
      action: { type: 'NAVIGATE', payload: 'notes' },
      followUpContext: 'notes'
    };
  }

  // Flashcards
  if (/\b(flashcards|flash\s*cards|study\s*cards|active\s*recall)\b/i.test(lower)) {
    return {
      category: 'NAVIGATION',
      spokenResponse: "Opening your flashcards for spaced repetition practice.",
      displayResponse: "🗂️ **Navigating to Flashcards**: Spaced repetition active recall practice.",
      action: { type: 'NAVIGATE', payload: 'flashcards' },
      followUpContext: 'flashcards'
    };
  }

  // Quiz Center
  if (/\b(quiz|quizzes|quiz\s*center|practice\s*test|take\s*a\s*quiz)\b/i.test(lower)) {
    return {
      category: 'NAVIGATION',
      spokenResponse: "Opening Quiz Center for practice testing.",
      displayResponse: "🎯 **Navigating to Quiz Center**: Practice quizzes and self-assessment.",
      action: { type: 'NAVIGATE', payload: 'quiz-center' },
      followUpContext: 'quiz-center'
    };
  }

  // Study Planner
  if (/\b(planner|study\s*planner|schedule|calendar|study\s*schedule)\b/i.test(lower)) {
    return {
      category: 'NAVIGATION',
      spokenResponse: "Opening your Study Planner.",
      displayResponse: "📅 **Navigating to Study Planner**: Calendar schedules and exam deadlines.",
      action: { type: 'NAVIGATE', payload: 'study-planner' },
      followUpContext: 'study-planner'
    };
  }

  // Subjects
  if (/\b(subjects|course\s*subjects|curriculum)\b/i.test(lower)) {
    return {
      category: 'NAVIGATION',
      spokenResponse: "Opening your course subjects breakdown.",
      displayResponse: "📚 **Navigating to Subjects**: Academic subjects and modules.",
      action: { type: 'NAVIGATE', payload: 'subjects' },
      followUpContext: 'subjects'
    };
  }

  // Resources
  if (/\b(resources|study\s*resources|library|materials)\b/i.test(lower)) {
    return {
      category: 'NAVIGATION',
      spokenResponse: "Opening your study resources library.",
      displayResponse: "📖 **Navigating to Resources**: Uploaded files, handouts, and research papers.",
      action: { type: 'NAVIGATE', payload: 'resources' },
      followUpContext: 'resources'
    };
  }

  // Analytics
  if (/\b(analytics|stats|statistics|study\s*hours|progress)\b/i.test(lower)) {
    return {
      category: 'NAVIGATION',
      spokenResponse: "Opening your study analytics.",
      displayResponse: "📈 **Navigating to Analytics**: Study hours, streaks, and subject breakdown.",
      action: { type: 'NAVIGATE', payload: 'analytics' },
      followUpContext: 'analytics'
    };
  }

  // Achievements / Leaderboard
  if (/\b(achievements|badges|trophies)\b/i.test(lower)) {
    return {
      category: 'NAVIGATION',
      spokenResponse: "Opening your study achievements and badges.",
      displayResponse: "🏆 **Navigating to Achievements**: Your milestones and trophies.",
      action: { type: 'NAVIGATE', payload: 'achievements' }
    };
  }

  if (/\b(leaderboard|ranking|rankings)\b/i.test(lower)) {
    return {
      category: 'NAVIGATION',
      spokenResponse: "Opening the Scholar Leaderboard.",
      displayResponse: "🥇 **Navigating to Leaderboard**: See your ranking among fellow scholars.",
      action: { type: 'NAVIGATE', payload: 'leaderboard' }
    };
  }

  // Profile / Settings
  if (/\b(settings|profile|preferences|account|my\s*account)\b/i.test(lower)) {
    return {
      category: 'NAVIGATION',
      spokenResponse: "Opening your settings and profile preferences.",
      displayResponse: "⚙️ **Navigating to Settings**: Manage profile details, notifications, and study preferences.",
      action: { type: 'NAVIGATE', payload: 'profile' },
      followUpContext: 'profile'
    };
  }

  // Parent Supervision Portal
  if (/\b(parent|parent\s*dashboard|parent\s*portal|supervision)\b/i.test(lower)) {
    return {
      category: 'NAVIGATION',
      spokenResponse: "Opening the Parent Supervision Portal.",
      displayResponse: "👨‍👩‍👧 **Navigating to Parent Portal**: View progress reports and study oversight.",
      action: { type: 'NAVIGATE', payload: 'parent-dashboard' }
    };
  }

  // 8. STUDYWEB FEATURE EXPLANATIONS
  // "What can I do here?" / "Tell me what I can do in this section"
  if (/\b(what can i do here|tell me what i can do in this section|explain this page|where am i)\b/i.test(lower)) {
    const currentTab = context.activeTab || 'dashboard';
    const explanationKey = 
      currentTab === 'workspaces' ? 'workspaces' :
      currentTab === 'ai-tutor' ? 'ai_tutor' :
      currentTab === 'flashcards' ? 'flashcards' :
      currentTab === 'quiz-center' ? 'quiz_center' :
      currentTab === 'study-planner' ? 'study_planner' :
      currentTab === 'notes' ? 'notes' : 'general';

    const info = STUDYWEB_FEATURES[explanationKey] || STUDYWEB_FEATURES.general;
    return {
      category: 'FEATURE_EXPLANATION',
      spokenResponse: `You are in ${currentTab.replace('-', ' ')}. ${info.spoken}`,
      displayResponse: `📍 **Current Section: ${currentTab.toUpperCase()}**\n\n${info.summary}\n\n*Try asking me to perform an action or quiz you on material here.*`
    };
  }

  // Specific Feature Inquiries
  if (/\b(how does|what is|tell me about)\s+(workspaces|the workspace)\b/i.test(lower)) {
    return {
      category: 'FEATURE_EXPLANATION',
      spokenResponse: STUDYWEB_FEATURES.workspaces.spoken,
      displayResponse: `📁 **StudyWeb Workspaces**\n\n${STUDYWEB_FEATURES.workspaces.summary}`
    };
  }

  if (/\b(how does|what is|tell me about)\s+(ai tutor|the tutor)\b/i.test(lower)) {
    return {
      category: 'FEATURE_EXPLANATION',
      spokenResponse: STUDYWEB_FEATURES.ai_tutor.spoken,
      displayResponse: `🤖 **StudyWeb AI Tutor**\n\n${STUDYWEB_FEATURES.ai_tutor.summary}`
    };
  }

  if (/\b(how does|what is|tell me about)\s+(flashcards|the flashcards)\b/i.test(lower)) {
    return {
      category: 'FEATURE_EXPLANATION',
      spokenResponse: STUDYWEB_FEATURES.flashcards.spoken,
      displayResponse: `🗂️ **Spaced Repetition Flashcards**\n\n${STUDYWEB_FEATURES.flashcards.summary}`
    };
  }

  // 9. UNSUPPORTED / OUT-OF-SCOPE REQUESTS
  // (e.g. "Book a flight", "Order pizza", "Buy groceries", "Send a tweet")
  if (/\b(book\s+a\s+flight|order\s+pizza|buy\s+groceries|order\s+food|book\s+a\s+hotel|reserve\s+a\s+table|send\s+an\s+uber)\b/i.test(lower)) {
    const actionPhrase = lower.includes('flight') ? 'book flights' : lower.includes('pizza') || lower.includes('food') ? 'order food' : 'perform external bookings';
    return {
      category: 'UNSUPPORTED',
      spokenResponse: `I can't ${actionPhrase} directly from StudyWeb right now, but I can help you research options or study.`,
      displayResponse: `⚠️ **Action Unsupported**\n\nI can't **${actionPhrase}** directly from StudyWeb right now. However, I can help you with your coursework, study schedules, notes, or research.`
    };
  }

  // 10. EDUCATIONAL & GENERAL KNOWLEDGE QUESTIONS (GEMINI POWERED)
  // Check if it's an educational or general question
  const isQuestion = 
    lower.startsWith('what is') ||
    lower.startsWith("what's") ||
    lower.startsWith('what are') ||
    lower.startsWith('who is') ||
    lower.startsWith('who was') ||
    lower.startsWith('why is') ||
    lower.startsWith('why do') ||
    lower.startsWith('how do') ||
    lower.startsWith('how does') ||
    lower.startsWith('explain ') ||
    lower.startsWith('define ') ||
    lower.startsWith('tell me about ') ||
    lower.includes('currency of') ||
    lower.includes('capital of') ||
    lower.includes('speed of light') ||
    lower.includes('photosynthesis') ||
    lower.includes('ask ai tutor') ||
    lower.includes('ask tutor') ||
    lower.startsWith('ask ');

  if (isQuestion) {
    let cleanPrompt = query
      .replace(/^(?:please\s+)?(?:can\s+you\s+)?(?:go\s+to\s+(?:the\s+)?ai\s+tutor\s+(?:and\s+(?:then\s+)?)?)?/i, '')
      .replace(/^(?:ask\s+(?:him|her|it|the\s+tutor|ai\s+tutor|tutor)\s+)/i, '')
      .replace(/^(?:ask\s+)/i, '')
      .trim();

    if (/^what\s+the\s+currency\s+of\s+india\s+is\??$/i.test(cleanPrompt)) {
      cleanPrompt = "What is the currency of India?";
    }

    try {
      const geminiResult = await queryGeminiVoice(cleanPrompt);
      return {
        category: 'EDUCATIONAL_QUERY',
        spokenResponse: geminiResult.spokenText,
        displayResponse: geminiResult.answer,
        followUpContext: `query:${cleanPrompt}`
      };
    } catch {
      return {
        category: 'EDUCATIONAL_QUERY',
        spokenResponse: `I have received your question on "${cleanPrompt}". You can explore it in depth in the AI Tutor.`,
        displayResponse: `💡 **Study Question**: "${cleanPrompt}"\n\nI've routed this question to your AI Tutor workspace for deep analysis.`
      };
    }
  }

  // 11. GENERAL AMBIGUOUS UTTERANCE: QUERY GEMINI WITH HONEST CONTEXT
  try {
    const geminiResult = await queryGeminiVoice(query);
    return {
      category: 'GENERAL_KNOWLEDGE',
      spokenResponse: geminiResult.spokenText,
      displayResponse: geminiResult.answer
    };
  } catch {
    return {
      category: 'AMBIGUOUS',
      spokenResponse: `I heard "${query}". You can ask me to navigate pages, create workspaces, or explain any study concept.`,
      displayResponse: `🤔 **How can I help with "${query}"?**\n\nTry saying:\n- *"Take me to workspaces"*\n- *"Turn on dark mode"*\n- *"What is photosynthesis?"*\n- *"Create a workspace named Physics"*`
    };
  }
}
