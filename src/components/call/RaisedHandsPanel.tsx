"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGradeSkin } from "@/contexts/GradeSkinContext";
import { 
  Hand, 
  User,
  Check,
  X
} from "lucide-react";

interface RaisedHand {
  userId: string;
  userName: string;
  raisedAt: number;
}

interface RaisedHandsPanelProps {
  raisedHands: RaisedHand[];
  isTeacher?: boolean;
  onLowerHand?: (userId: string) => void;
  onRaiseHand?: () => void;
  hasRaisedHand?: boolean;
}

export function RaisedHandsPanel({
  raisedHands,
  isTeacher = false,
  onLowerHand,
  onRaiseHand,
  hasRaisedHand = false,
}: RaisedHandsPanelProps) {
  const { gradeBand } = useGradeSkin();

  // Student view - Primary band: single large button
  if (!isTeacher && gradeBand === "primary") {
    return (
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Button
          size="lg"
          className={`w-full h-20 text-xl font-bold rounded-2xl ${
            hasRaisedHand 
              ? "bg-green-500 hover:bg-green-600" 
              : "bg-amber-400 hover:bg-amber-500 text-black"
          }`}
          onClick={onRaiseHand}
        >
          <Hand className="w-8 h-8 mr-3" />
          {hasRaisedHand ? "Hand Raised!" : "Raise Hand"}
        </Button>
      </motion.div>
    );
  }

  // Student view - Other bands: compact button
  if (!isTeacher) {
    return (
      <Button
        variant={hasRaisedHand ? "default" : "outline"}
        size="sm"
        onClick={onRaiseHand}
        className="flex items-center gap-2"
      >
        <Hand className="w-4 h-4" />
        {hasRaisedHand ? "Lower Hand" : "Raise Hand"}
      </Button>
    );
  }

  // Teacher view
  return (
    <Card className="w-64">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Hand className="w-4 h-4" />
            Raised Hands
          </CardTitle>
          <Badge variant="secondary">{raisedHands.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="h-[200px] pr-4">
          <AnimatePresence>
            {raisedHands.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8 text-muted-foreground text-sm"
              >
                No raised hands
              </motion.div>
            ) : (
              <div className="space-y-2">
                {raisedHands.map((hand, index) => (
                  <motion.div
                    key={hand.userId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-muted-foreground w-5">
                        {index + 1}
                      </span>
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="text-xs">
                          <User className="w-4 h-4" />
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium truncate max-w-[80px]">
                        {hand.userName}
                      </span>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => onLowerHand?.(hand.userId)}
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
