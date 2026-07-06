import { motion } from 'motion/react';
import { Star } from 'lucide-react';

export default function SocialProof() {
  const stats = [
    { value: "50,000+", label: "Learning Sessions" },
    { value: "98%", label: "Student Satisfaction" },
    { value: "4.9★", label: "User Rating" },
    { value: "100+", label: "Study Resources" },
  ];

  return (
    <section className="py-20 bg-card-bg relative z-20 border-b border-card-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-2xl md:text-3xl font-display font-bold text-brand-text mb-4"
          >
            Trusted by students preparing for success.
          </motion.h2>
          <div className="flex items-center justify-center gap-1">
            {[1,2,3,4,5].map((i) => (
              <Star key={i} className="w-5 h-5 text-brand-highlight fill-brand-highlight" />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="text-center p-6 rounded-2xl bg-brand-bg-light/50 border border-card-border hover:border-brand-primary/20 transition-colors"
            >
              <div className="text-4xl md:text-5xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-br from-brand-primary to-brand-secondary mb-2">
                {stat.value}
              </div>
              <div className="text-brand-text-light font-medium">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
