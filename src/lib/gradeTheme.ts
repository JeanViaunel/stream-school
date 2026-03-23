export type GradeBand = "primary" | "middle" | "high";

export interface GradeTheme {
  fontSizeScale: number;
  iconSize: number;
  borderRadius: string;
  buttonHeight: string;
  spacingScale: number;
  chatInputHeight: string;
  participantTileSize: "small" | "medium" | "large";
  showTextLabels: boolean;
  simplifiedControls: boolean;
}

export const GRADE_BANDS: Record<GradeBand, GradeTheme> = {
  primary: {
    fontSizeScale: 1.25, // 25% larger text
    iconSize: 32, // Larger icons
    borderRadius: "1rem", // More rounded
    buttonHeight: "3.5rem", // Taller buttons
    spacingScale: 1.5, // More spacing
    chatInputHeight: "4rem",
    participantTileSize: "large",
    showTextLabels: false, // Icons only
    simplifiedControls: true, // Hide advanced controls
  },
  middle: {
    fontSizeScale: 1.1,
    iconSize: 24,
    borderRadius: "0.75rem",
    buttonHeight: "2.75rem",
    spacingScale: 1.2,
    chatInputHeight: "3rem",
    participantTileSize: "medium",
    showTextLabels: true,
    simplifiedControls: false,
  },
  high: {
    fontSizeScale: 1,
    iconSize: 20,
    borderRadius: "0.5rem",
    buttonHeight: "2.25rem",
    spacingScale: 1,
    chatInputHeight: "2.5rem",
    participantTileSize: "small",
    showTextLabels: true,
    simplifiedControls: false,
  },
};

export function getGradeBand(gradeLevel: number | undefined): GradeBand {
  if (gradeLevel === undefined) return "high";
  if (gradeLevel <= 3) return "primary";
  if (gradeLevel <= 8) return "middle";
  return "high";
}

export function getGradeTheme(gradeBand: GradeBand): GradeTheme {
  return GRADE_BANDS[gradeBand];
}

// CSS variable generator
export function generateGradeCSSVariables(theme: GradeTheme): Record<string, string> {
  return {
    "--grade-font-scale": `${theme.fontSizeScale}`,
    "--grade-icon-size": `${theme.iconSize}px`,
    "--grade-border-radius": theme.borderRadius,
    "--grade-button-height": theme.buttonHeight,
    "--grade-spacing-scale": `${theme.spacingScale}`,
    "--grade-chat-input-height": theme.chatInputHeight,
  };
}
