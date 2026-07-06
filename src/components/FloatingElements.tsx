import { motion } from 'motion/react';
import { BookOpen, Trophy, Lightbulb, BellRing } from 'lucide-react';

export default function FloatingElements() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <motion.div
        animate={{ y: [-20, 20], x: [-10, 10], rotate: [0, 15] }}
        transition={{ duration: 8, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
        className="absolute top-[15%] left-[5%] text-brand-primary/20"
      >
        <BookOpen className="w-16 h-16" />
      </motion.div>

      <motion.div
        animate={{ y: [20, -20], x: [10, -10], rotate: [0, -15] }}
        transition={{ duration: 7, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", delay: 1 }}
        className="absolute top-[25%] right-[10%] text-brand-secondary/20"
      >
        <Lightbulb className="w-20 h-20" />
      </motion.div>

      <motion.div
        animate={{ y: [-15, 15], x: [15, -15], rotate: [-10, 10] }}
        transition={{ duration: 9, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", delay: 2 }}
        className="absolute bottom-[20%] left-[15%] text-brand-accent/20"
      >
        <Trophy className="w-14 h-14" />
      </motion.div>

      <motion.div
        animate={{ y: [15, -15], x: [-15, 15], rotate: [10, -10] }}
        transition={{ duration: 6, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", delay: 0.5 }}
        className="absolute bottom-[30%] right-[15%] text-brand-highlight/20"
      >
        <BellRing className="w-12 h-12" />
      </motion.div>
      
      {/* Abstract Shapes */}
      <motion.div
        animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/3 left-1/4 w-32 h-32 bg-gradient-to-br from-brand-primary/10 to-transparent rounded-full blur-2xl"
      />
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute bottom-1/3 right-1/4 w-48 h-48 bg-gradient-to-tl from-brand-secondary/10 to-transparent rounded-full blur-2xl"
      />
    </div>
  );
}
