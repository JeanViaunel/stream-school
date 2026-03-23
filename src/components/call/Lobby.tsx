"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useGradeSkin } from "@/contexts/GradeSkinContext";
import { 
  Video, 
  Mic, 
  Clock,
  Loader2,
  User
} from "lucide-react";

interface LobbyProps {
  className: string;
  teacherName: string;
  onJoin: () => void;
  isConnecting?: boolean;
}

export function Lobby({ 
  className, 
  teacherName, 
  onJoin,
  isConnecting = false 
}: LobbyProps) {
  const { gradeBand } = useGradeSkin();

  // Primary band: Large, simple UI
  if (gradeBand === "primary") {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-8">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center"
        >
          <Loader2 className="w-16 h-16 text-primary animate-spin" />
        </motion.div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold">{className}</h1>
          <p className="text-xl text-muted-foreground">
            Waiting for {teacherName}...
          </p>
        </div>

        <div className="flex items-center gap-4 text-muted-foreground">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <Mic className="w-6 h-6" />
          </div>
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <Video className="w-6 h-6" />
          </div>
        </div>

        <p className="text-lg text-muted-foreground">
          You&apos;ll join automatically when admitted
        </p>
      </div>
    );
  }

  // Middle and High bands: Full lobby UI
  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-md space-y-6"
      >
        <Card>
          <CardContent className="p-8 text-center space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Clock className="w-10 h-10 text-primary" />
            </div>

            <div>
              <h1 className="text-2xl font-bold mb-2">{className}</h1>
              <p className="text-muted-foreground">
                Waiting to be admitted by {teacherName}
              </p>
            </div>

            <div className="flex items-center justify-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted">
                <Mic className="w-4 h-4" />
                <span className="text-sm">Ready</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted">
                <Video className="w-4 h-4" />
                <span className="text-sm">Ready</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Waiting in lobby...
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
