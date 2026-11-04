import { motion } from 'motion/react';
import { 
  Bot, 
  BookOpen, 
  Calendar, 
  Wand2, 
  HelpCircle, 
  Video, 
  Network, 
  BarChart3, 
  Target, 
  FolderOpen 
} from 'lucide-react';

export default function StudyTools() {
  const tools = [
    { 
      icon: Bot, 
      title: "AI Study Assistant", 
      desc: "Get instant, clear answers and friendly academic guidance whenever you hit a conceptual block.",
      color: "from-blue-500/10 to-indigo-500/5 text-blue-500 hover:border-blue-500/30",
      iconColor: "bg-blue-500/10 text-blue-500"
    },
    { 
      icon: BookOpen, 
      title: "AI Notebook", 
      desc: "A smart workspace that automatically formats, auto-tags, and cleanly organizes your digital study papers.",
      color: "from-emerald-500/10 to-teal-500/5 text-emerald-500 hover:border-emerald-500/30",
      iconColor: "bg-emerald-500/10 text-emerald-500"
    },
    { 
      icon: Calendar, 
      title: "Smart Study Planner", 
      desc: "Automatically schedule and balance your revision blocks around school hours, exams, and rest days.",
      color: "from-purple-500/10 to-fuchsia-500/5 text-purple-500 hover:border-purple-500/30",
      iconColor: "bg-purple-500/10 text-purple-500"
    },
    { 
      icon: Wand2, 
      title: "AI Notes Generator", 
      desc: "Transform long video lectures, dense PDF chapters, or slides into beautiful, structured, bulleted summaries.",
      color: "from-amber-500/10 to-orange-500/5 text-amber-500 hover:border-amber-500/30",
      iconColor: "bg-amber-500/10 text-amber-500"
    },
    { 
      icon: HelpCircle, 
      title: "AI Quiz & Flashcards", 
      desc: "Instantly create practice tests and custom active-recall cards using optimized spaced-repetition science.",
      color: "from-rose-500/10 to-pink-500/5 text-rose-500 hover:border-rose-500/30",
      iconColor: "bg-rose-500/10 text-rose-500"
    },
    { 
      icon: Video, 
      title: "Video Summarizer", 
      desc: "Paste educational video links to generate instant chapter breakdowns, summaries, and quick practice Q&As.",
      color: "from-red-500/10 to-rose-500/5 text-red-500 hover:border-red-500/30",
      iconColor: "bg-red-500/10 text-red-500"
    },
    { 
      icon: BarChart3, 
      title: "Progress Analytics", 
      desc: "Deeply analyze your course retention rates, daily streaks, and estimated conceptual readiness scores.",
      color: "from-violet-500/10 to-indigo-500/5 text-violet-500 hover:border-violet-500/30",
      iconColor: "bg-violet-500/10 text-violet-500"
    },
    { 
      icon: Target, 
      title: "Focus Mode", 
      desc: "Stay locked in with beautiful focus timers, ambient audio background landscapes, and goal-tracking widgets.",
      color: "from-orange-500/10 to-amber-500/5 text-orange-500 hover:border-orange-500/30",
      iconColor: "bg-orange-500/10 text-orange-500"
    },
    { 
      icon: FolderOpen, 
      title: "Unified Study Workspace", 
      desc: "A neat, secure vault to centralize and cross-reference school notes, documents, checklists, and goals.",
      color: "from-teal-500/10 to-emerald-500/5 text-teal-500 hover:border-teal-500/30",
      iconColor: "bg-teal-500/10 text-teal-500"
    }
  ];

  return (
    <section className="py-fluid-section bg-brand-bg-light dark:bg-brand-bg-dark relative overflow-hidden transition-colors duration-300" id="study-tools">
      {/* Decorative Light Gradients */}
      <div className="absolute top-1/4 left-1/4 w-[350px] h-[350px] bg-brand-primary/5 rounded-full blur-[100px] pointer-events-none -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-[450px] h-[450px] bg-brand-secondary/5 rounded-full blur-[120px] pointer-events-none -z-10" />

      <div className="responsive-container relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16 space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            <h2 className="text-fluid-h2 font-display font-extrabold text-brand-text tracking-tight mb-4 sm:mb-6" style={{ textWrap: 'balance' }}>
              Powerful Academic Features
            </h2>
            <p className="text-sm sm:text-base md:text-lg text-brand-text-light max-w-2xl mx-auto leading-relaxed">
              Unlock a comprehensive suite of AI-driven tools engineered to optimize your learning strategy, save hours, and boost grade consistency.
            </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {tools.map((tool, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              className={`bg-card-bg p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-card-border shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full bg-gradient-to-b ${tool.color}`}
            >
              <div className={`${tool.iconColor} w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center mb-4 sm:mb-5 flex-shrink-0`}>
                <tool.icon className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <h3 className="text-base sm:text-lg font-bold font-display text-brand-text mb-2">
                {tool.title}
              </h3>
              <p className="text-brand-text-light text-xs sm:text-sm leading-relaxed font-medium">
                {tool.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
