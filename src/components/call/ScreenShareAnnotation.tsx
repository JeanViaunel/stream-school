"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Pencil, Highlighter, Type, Trash2 } from "lucide-react";

interface Point {
  x: number;
  y: number;
}

type AnnotationType = "draw" | "text" | "highlight";

interface Annotation {
  id: string;
  userId: Id<"users">;
  type: AnnotationType;
  data: {
    x: number;
    y: number;
    width?: number;
    height?: number;
    color: string;
    strokeWidth?: number;
    text?: string;
    points?: Point[];
  };
  timestamp: number;
}

interface ScreenShareAnnotationProps {
  sessionId: Id<"sessions">;
  isTeacher: boolean;
  screenShareElement: HTMLElement | null;
}

export function ScreenShareAnnotation({
  sessionId,
  isTeacher,
  screenShareElement,
}: ScreenShareAnnotationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<Point[]>([]);
  const [tool, setTool] = useState<AnnotationType>("draw");
  const [color, setColor] = useState("#ff0000");
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [textInput, setTextInput] = useState("");
  const [textPosition, setTextPosition] = useState<Point | null>(null);

  const annotations = useQuery(api.annotations.getAnnotations, { sessionId });
  const addAnnotation = useMutation(api.annotations.addAnnotation);
  const clearAnnotations = useMutation(api.annotations.clearAnnotations);

  // Draw existing annotations on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !annotations) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    annotations.forEach((ann: Annotation) => {
      ctx.beginPath();
      ctx.strokeStyle = ann.data.color;
      ctx.lineWidth = ann.data.strokeWidth || 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (ann.type === "draw" && ann.data.points && ann.data.points.length > 0) {
        ctx.moveTo(ann.data.points[0].x, ann.data.points[0].y);
        ann.data.points.forEach((point: Point) => {
          ctx.lineTo(point.x, point.y);
        });
        ctx.stroke();
      } else if (ann.type === "highlight") {
        ctx.fillStyle = `${ann.data.color}40`; // 25% opacity
        ctx.fillRect(
          ann.data.x,
          ann.data.y,
          ann.data.width || 100,
          ann.data.height || 30
        );
      } else if (ann.type === "text" && ann.data.text) {
        ctx.font = "16px Arial";
        ctx.fillStyle = ann.data.color;
        ctx.fillText(ann.data.text, ann.data.x, ann.data.y);
      }
    });
  }, [annotations]);

  const startDrawing = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isTeacher) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (tool === "text") {
        setTextPosition({ x, y });
        return;
      }

      setIsDrawing(true);
      setCurrentPath([{ x, y }]);
    },
    [isTeacher, tool]
  );

  const draw = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing || !isTeacher || tool === "text") return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      setCurrentPath((prev) => [...prev, { x, y }]);

      // Draw on canvas immediately for smooth experience
      const ctx = canvas.getContext("2d");
      if (ctx && currentPath.length > 0) {
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = strokeWidth;
        ctx.lineCap = "round";
        ctx.moveTo(
          currentPath[currentPath.length - 1].x,
          currentPath[currentPath.length - 1].y
        );
        ctx.lineTo(x, y);
        ctx.stroke();
      }
    },
    [isDrawing, isTeacher, tool, color, strokeWidth, currentPath]
  );

  const stopDrawing = useCallback(async () => {
    if (!isDrawing || !isTeacher || currentPath.length < 2) {
      setIsDrawing(false);
      return;
    }

    setIsDrawing(false);

    const startPoint = currentPath[0];

    if (tool === "highlight") {
      // Calculate bounding box for highlight
      const xs = currentPath.map((p) => p.x);
      const ys = currentPath.map((p) => p.y);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      const maxX = Math.max(...xs);
      const maxY = Math.max(...ys);

      await addAnnotation({
        sessionId,
        annotation: {
          type: "highlight",
          data: {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
            color,
          },
        },
      });
    } else {
      await addAnnotation({
        sessionId,
        annotation: {
          type: "draw",
          data: {
            x: startPoint.x,
            y: startPoint.y,
            color,
            strokeWidth,
            points: currentPath,
          },
        },
      });
    }

    setCurrentPath([]);
  }, [isDrawing, isTeacher, currentPath, tool, sessionId, color, strokeWidth, addAnnotation]);

  const handleTextSubmit = useCallback(async () => {
    if (!textInput.trim() || !textPosition) return;

    await addAnnotation({
      sessionId,
      annotation: {
        type: "text",
        data: {
          x: textPosition.x,
          y: textPosition.y,
          color,
          text: textInput,
        },
      },
    });

    setTextInput("");
    setTextPosition(null);
  }, [textInput, textPosition, sessionId, color, addAnnotation]);

  const handleClearAll = useCallback(async () => {
    await clearAnnotations({ sessionId });
  }, [sessionId, clearAnnotations]);

  // Sync canvas size with screen share element
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !screenShareElement) return;

    const resizeCanvas = () => {
      const rect = screenShareElement.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    return () => window.removeEventListener("resize", resizeCanvas);
  }, [screenShareElement]);

  if (!isTeacher && (!annotations || annotations.length === 0)) {
    return null;
  }

  return (
    <div className="relative w-full h-full">
      {/* Toolbar for teachers */}
      {isTeacher && (
        <div className="absolute top-4 left-4 z-50 bg-background/95 backdrop-blur-sm rounded-lg shadow-lg p-3 flex flex-wrap items-center gap-2 border">
          <div className="flex items-center gap-1">
            <Button
              variant={tool === "draw" ? "default" : "outline"}
              size="sm"
              onClick={() => setTool("draw")}
              className="h-9 w-9 p-0"
              title="Draw"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant={tool === "highlight" ? "default" : "outline"}
              size="sm"
              onClick={() => setTool("highlight")}
              className="h-9 w-9 p-0"
              title="Highlight"
            >
              <Highlighter className="h-4 w-4" />
            </Button>
            <Button
              variant={tool === "text" ? "default" : "outline"}
              size="sm"
              onClick={() => setTool("text")}
              className="h-9 w-9 p-0"
              title="Text"
            >
              <Type className="h-4 w-4" />
            </Button>
          </div>

          <div className="w-px h-6 bg-border mx-1" />

          <div className="flex items-center gap-2">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border-0 p-0"
              title="Color"
            />

            {tool !== "text" && (
              <select
                value={strokeWidth}
                onChange={(e) => setStrokeWidth(Number(e.target.value))}
                className="h-9 px-2 rounded-md border bg-background text-sm"
                title="Stroke Width"
              >
                <option value={1}>Thin</option>
                <option value={3}>Normal</option>
                <option value={5}>Thick</option>
                <option value={8}>Extra Thick</option>
              </select>
            )}
          </div>

          <div className="w-px h-6 bg-border mx-1" />

          <Button
            variant="destructive"
            size="sm"
            onClick={handleClearAll}
            className="h-9 px-3"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Clear All
          </Button>
        </div>
      )}

      {/* Text input dialog */}
      {isTeacher && textPosition && (
        <div
          className="absolute z-50 bg-background border rounded-lg shadow-lg p-3"
          style={{
            left: Math.min(textPosition.x, (canvasRef.current?.width || 400) - 220),
            top: Math.min(textPosition.y, (canvasRef.current?.height || 300) - 100),
          }}
        >
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Enter text..."
            className="w-48 px-2 py-1 border rounded mb-2"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleTextSubmit();
              if (e.key === "Escape") {
                setTextInput("");
                setTextPosition(null);
              }
            }}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleTextSubmit} className="flex-1">
              Add
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setTextInput("");
                setTextPosition(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Annotation canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        className={`absolute top-0 left-0 w-full h-full ${
          isTeacher ? "cursor-crosshair" : "pointer-events-none"
        }`}
        style={{ touchAction: "none" }}
      />
    </div>
  );
}
