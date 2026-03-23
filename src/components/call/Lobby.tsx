"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useGradeSkin } from "@/contexts/GradeSkinContext";
import { Video, Mic, Clock, Loader2, User, CheckCircle2 } from "lucide-react";

export type LobbyPhase = "waiting" | "admitted";

interface LobbyProps {
  className: string;
  teacherName: string;
  /** After the teacher admits you in Convex, use the button to join the Stream call (user gesture for camera/mic). */
  lobbyPhase: LobbyPhase;
  onEnterClassroom: () => void | Promise<void>;
  isEnteringClassroom?: boolean;
}

export function Lobby({
  className,
  teacherName,
  lobbyPhase,
  onEnterClassroom,
  isEnteringClassroom = false,
}: LobbyProps) {
  const { gradeBand } = useGradeSkin();
  const isAdmitted = lobbyPhase === "admitted";

  // Primary band: Large, simple UI
  if (gradeBand === "primary") {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-8">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center"
        >
          {isAdmitted ? (
            <CheckCircle2 className="w-16 h-16 text-emerald-500" />
          ) : (
            <Loader2 className="w-16 h-16 text-primary animate-spin" />
          )}
        </motion.div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold">{className}</h1>
          <p className="text-xl text-muted-foreground">
            {isAdmitted
              ? `${teacherName} admitted you`
              : `Waiting for ${teacherName}...`}
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

        {isAdmitted ? (
          <div className="flex flex-col items-center gap-4 w-full max-w-sm">
            <p className="text-lg text-muted-foreground">
              Tap the button to enter the classroom and allow camera and
              microphone when asked.
            </p>
            <Button
              size="lg"
              className="w-full rounded-full text-lg py-6"
              onClick={() => void onEnterClassroom()}
              disabled={isEnteringClassroom}
            >
              {isEnteringClassroom ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Entering…
                </>
              ) : (
                "Enter classroom"
              )}
            </Button>
          </div>
        ) : (
          <p className="text-lg text-muted-foreground">
            You&apos;ll be able to enter when you&apos;re admitted
          </p>
        )}
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
              {isAdmitted ? (
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              ) : (
                <Clock className="w-10 h-10 text-primary" />
              )}
            </div>

            <div>
              <h1 className="text-2xl font-bold mb-2">{className}</h1>
              <p className="text-muted-foreground">
                {isAdmitted
                  ? `You were admitted by ${teacherName}`
                  : `Waiting to be admitted by ${teacherName}`}
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

            {isAdmitted ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Entering connects you to the call. Your browser may ask for
                  camera and microphone — choose Allow to participate.
                </p>
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => void onEnterClassroom()}
                  disabled={isEnteringClassroom}
                >
                  {isEnteringClassroom ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Entering classroom…
                    </>
                  ) : (
                    "Enter classroom"
                  )}
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Waiting in lobby...
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
