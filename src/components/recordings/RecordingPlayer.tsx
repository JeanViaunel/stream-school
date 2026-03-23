"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download } from "lucide-react";

interface RecordingPlayerProps {
  recordingUrl: string;
  title: string;
  onBack: () => void;
}

export function RecordingPlayer({ recordingUrl, title, onBack }: RecordingPlayerProps) {
  const handleDownload = () => {
    // Create a temporary anchor element to trigger download
    const link = document.createElement("a");
    link.href = recordingUrl;
    link.download = `${title.replace(/\s+/g, "_")}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Recordings
          </Button>
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        </div>
        <Button variant="outline" size="sm" onClick={handleDownload}>
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
      </CardHeader>
      <CardContent>
        <div className="aspect-video bg-black rounded-lg overflow-hidden">
          <video
            src={recordingUrl}
            controls
            className="w-full h-full"
            preload="metadata"
          >
            Your browser does not support the video tag.
          </video>
        </div>
        <p className="text-sm text-muted-foreground mt-4">
          This recording is stored securely and is only accessible to authorized members of this class.
        </p>
      </CardContent>
    </Card>
  );
}
