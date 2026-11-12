import React, { useEffect } from 'react';

interface SEOManagerProps {
  activeSection?: string;
  activeTask?: string;
  isLoggedIn?: boolean;
}

const SECTION_SEO_MAP: Record<string, {
  title: string;
  description: string;
  canonical: string;
  type?: string;
  schemaType?: string;
}> = {
  home: {
    title: 'StudyWeb – AI-Powered Learning Platform & Smart Study Assistant',
    description: 'StudyWeb is an AI study platform helping students study smarter with revision notes, flashcards, quizzes, PDF analysis, and parent tracking. Join free today!',
    canonical: 'https://studywebai.vercel.app/',
  },
  'for-students': {
    title: 'StudyWeb for Students – AI Revision Notes, Flashcards & Practice Quizzes',
    description: 'Master subjects faster with AI active recall, spaced repetition flashcards, automated quiz generation, and personalized study schedules on StudyWeb.',
    canonical: 'https://studywebai.vercel.app/#for-students',
  },
  'study-tools': {
    title: 'AI Study Tools & Features – Notes, Quizzes, Flashcards & PDF Workspace | StudyWeb',
    description: 'Explore StudyWeb’s suite of AI study tools: Socratic AI Tutor, automated flashcard creator, quiz generator, PDF note analyzer, and study planner.',
    canonical: 'https://studywebai.vercel.app/#study-tools',
  },
  'interactive-demo': {
    title: 'Interactive AI Study Demo – Experience StudyWeb Live',
    description: 'Try StudyWeb live! Upload study notes or ask questions to see how AI transforms complex textbook topics into simplified revision flashcards and quizzes.',
    canonical: 'https://studywebai.vercel.app/#interactive-demo',
  },
  pricing: {
    title: 'StudyWeb Pricing – Free & Family Plans for Students & Parents',
    description: 'Simple, affordable pricing for students and families. Start with our free forever plan or upgrade to Premium for unlimited AI revision and parent reporting.',
    canonical: 'https://studywebai.vercel.app/#pricing',
  },
  about: {
    title: 'About StudyWeb – Empowering Student Success & Parent Peace of Mind',
    description: 'Learn about StudyWeb’s mission to transform education through safe, COPPA-compliant AI tools, active recall techniques, and parent insight dashboards.',
    canonical: 'https://studywebai.vercel.app/#about',
  },
  faq: {
    title: 'Frequently Asked Questions – StudyWeb AI Learning Platform',
    description: 'Find answers to common questions about StudyWeb, AI safety, pricing, parent dashboard monitoring, mobile support, and student data security.',
    canonical: 'https://studywebai.vercel.app/#faq',
  },
  contact: {
    title: 'Contact StudyWeb – Customer Support & Educational Inquiries',
    description: 'Have questions or need assistance? Contact the StudyWeb team for support, feature feedback, parent account help, or school partnerships.',
    canonical: 'https://studywebai.vercel.app/#contact',
  },
  privacy: {
    title: 'Privacy Policy & Student Data Protection – StudyWeb',
    description: 'Read StudyWeb’s privacy policy. We prioritize COPPA and FERPA compliance, zero data selling, encrypted study notes, and full parent control.',
    canonical: 'https://studywebai.vercel.app/#privacy',
  },
  terms: {
    title: 'Terms of Service & Usage Agreement – StudyWeb',
    description: 'Review the Terms of Service for StudyWeb’s educational platform, user accounts, subscription tiers, and academic integrity guidelines.',
    canonical: 'https://studywebai.vercel.app/#terms',
  },
};

const DASHBOARD_SEO_MAP: Record<string, {
  title: string;
  description: string;
}> = {
  dashboard: {
    title: 'Dashboard Workspace – StudyWeb',
    description: 'View your active study workspaces, quick notes, revision metrics, and daily learning goals on StudyWeb.',
  },
  tutor: {
    title: 'Socratic AI Tutor Workspace – StudyWeb',
    description: 'Chat with your AI Tutor for step-by-step explanations, study note analysis, and problem-solving guidance.',
  },
  'pdf-workspace': {
    title: 'PDF & Document Study Workspace – StudyWeb',
    description: 'Upload textbooks and lecture PDFs to instantly extract key concepts, summaries, and revision questions.',
  },
  'quiz-center': {
    title: 'AI Practice Quiz Center – StudyWeb',
    description: 'Test your knowledge with AI-generated practice quizzes, instant feedback, and detailed answer explanations.',
  },
  flashcards: {
    title: 'Spaced Repetition Flashcards Workspace – StudyWeb',
    description: 'Master difficult terminology and formulas with automated smart flashcard decks and spaced repetition tracking.',
  },
  planner: {
    title: 'Study Schedule & Exam Planner – StudyWeb',
    description: 'Organize your homework, revision sessions, and exam deadlines with an intelligent study planner.',
  },
};

export default function SEOManager({ activeSection = 'home', activeTask, isLoggedIn }: SEOManagerProps) {
  useEffect(() => {
    let seo = SECTION_SEO_MAP[activeSection] || SECTION_SEO_MAP.home;

    if (isLoggedIn && activeTask && DASHBOARD_SEO_MAP[activeTask]) {
      seo = {
        ...seo,
        title: DASHBOARD_SEO_MAP[activeTask].title,
        description: DASHBOARD_SEO_MAP[activeTask].description,
      };
    }

    // Update document title
    document.title = seo.title;

    // Helper to update or create meta tags
    const setMetaTag = (selector: string, attributeName: string, attributeValue: string, content: string) => {
      let element = document.querySelector(selector);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attributeName, attributeValue);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // Description & Domain Verification
    setMetaTag('meta[name="description"]', 'name', 'description', seo.description);
    setMetaTag(
      'meta[name="openai-business-profile"]',
      'name',
      'openai-business-profile',
      'openai-business-profile=-bKgHQNTViWjD2SDVhNzq7EnfTZ4pif4-GSLhjU7eok'
    );
    setMetaTag(
      'meta[name="openai-domain-verification"]',
      'name',
      'openai-domain-verification',
      '-bKgHQNTViWjD2SDVhNzq7EnfTZ4pif4-GSLhjU7eok'
    );
    setMetaTag('meta[property="og:title"]', 'property', 'og:title', seo.title);
    setMetaTag('meta[property="og:description"]', 'property', 'og:description', seo.description);
    setMetaTag('meta[property="og:url"]', 'property', 'og:url', seo.canonical);
    setMetaTag('meta[name="twitter:title"]', 'name', 'twitter:title', seo.title);
    setMetaTag('meta[name="twitter:description"]', 'name', 'twitter:description', seo.description);

    // Canonical link
    let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', seo.canonical);

    // Dynamic JSON-LD structured data snippet for breadcrumbs / current view
    let breadcrumbScript = document.getElementById('dynamic-breadcrumb-schema') as HTMLScriptElement;
    if (!breadcrumbScript) {
      breadcrumbScript = document.createElement('script');
      breadcrumbScript.id = 'dynamic-breadcrumb-schema';
      breadcrumbScript.type = 'application/ld+json';
      document.head.appendChild(breadcrumbScript);
    }

    const breadcrumbSchema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': [
        {
          '@type': 'ListItem',
          'position': 1,
          'name': 'Home',
          'item': 'https://studywebai.vercel.app/'
        },
        activeSection !== 'home' ? {
          '@type': 'ListItem',
          'position': 2,
          'name': activeSection.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
          'item': seo.canonical
        } : null
      ].filter(Boolean)
    };

    breadcrumbScript.textContent = JSON.stringify(breadcrumbSchema);

  }, [activeSection, activeTask, isLoggedIn]);

  return null;
}
