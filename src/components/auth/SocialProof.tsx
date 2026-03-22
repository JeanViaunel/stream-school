"use client";

import { Users } from "lucide-react";
import { motion } from "framer-motion";

const avatars = [
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Zack",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Molly",
];

export function SocialProof() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.4 }}
      className="flex items-center gap-4"
    >
      {/* Avatar stack */}
      <div className="flex -space-x-2">
        {avatars.map((avatar, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.8, x: -10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ delay: 0.7 + i * 0.1, duration: 0.3 }}
            className="relative w-8 h-8 rounded-full border-2 border-background overflow-hidden bg-card"
          >
            <img 
              src={avatar} 
              alt="User avatar" 
              className="w-full h-full object-cover"
            />
          </motion.div>
        ))}
      </div>
      
      {/* Text */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Users className="w-4 h-4" />
        <span>Trusted by <strong className="text-foreground">2,000+</strong> students worldwide</span>
      </div>
    </motion.div>
  );
}
