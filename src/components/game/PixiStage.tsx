import React, { useRef, useEffect, useState } from "react";
import * as PIXI from "pixi.js";

interface PixiStageProps {
  width: number;
  height: number;
  backgroundColor?: number;
  children: (app: PIXI.Application) => React.ReactNode;
}

export function PixiStage({
  width,
  height,
  backgroundColor = 0x87ceeb,
  children,
}: PixiStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Wait for container to be available
    if (!containerRef.current) return;

    // Cleanup previous application if it exists
    if (appRef.current) {
      appRef.current.destroy(true);
      appRef.current = null;
      setIsReady(false);
    }

    try {
      // For PixiJS v8, we need to create a canvas first
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      containerRef.current.appendChild(canvas);

      // Create a new PIXI application with proper initialization for v8
      const app = new PIXI.Application({
        width,
        height,
        background: backgroundColor,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        canvas, // Use the canvas we created
      });

      // Store the reference
      appRef.current = app;

      // Force a render to initialize the renderer
      app.stage.addChild(new PIXI.Container());

      // Simplified initialization approach - don't wait for renderer
      console.log("Setting PIXI application as ready");
      setTimeout(() => {
        setIsReady(true);
      }, 100);

      // Set a safety timeout in case the renderer never initializes
      const safetyTimeout = setTimeout(() => {
        if (!isReady) {
          console.log("Forcing ready state after timeout");
          setIsReady(true);
        }
      }, 1000);

      return () => {
        // Clean up on unmount
        clearTimeout(safetyTimeout);
        setIsReady(false);
        if (appRef.current) {
          appRef.current.destroy(true);
          appRef.current = null;

          // Remove canvas from DOM if it still exists
          if (canvas.parentNode) {
            canvas.parentNode.removeChild(canvas);
          }
        }
      };
    } catch (error) {
      console.error("Error initializing PIXI application:", error);
    }
  }, [width, height, backgroundColor]);

  return (
    <div
      ref={containerRef}
      style={{
        width,
        height,
        border: "1px solid red",
        position: "relative",
      }}
    >
      {!isReady && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0,0,0,0.1)",
            color: "white",
            fontSize: "20px",
          }}
        >
          Initializing map...
        </div>
      )}
      {appRef.current && isReady && children(appRef.current)}
    </div>
  );
}
