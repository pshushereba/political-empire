import React, { useState, useEffect, useCallback } from "react";
import * as PIXI from "pixi.js";
import { HexTile, TileType } from "@/types/hex";
import { useGameStore } from "@/lib/store";
import { HexFactory } from "@/lib/mapGenerator";
import { PixiStage } from "./PixiStage";

// Define colors for different tile types
const TILE_COLORS = {
  [TileType.PLAINS]: 0x8bc34a, // Light green
  [TileType.FOREST]: 0x2e7d32, // Dark green
  [TileType.MOUNTAINS]: 0x795548, // Brown
  [TileType.RIVER]: 0x42a5f5, // Light blue
  [TileType.HILLS]: 0x9e9e9e, // Gray
  [TileType.DESERT]: 0xffd54f, // Yellow
  [TileType.COAST]: 0x4fc3f7, // Lighter blue
  [TileType.LAKE]: 0x1976d2, // Darker blue
};

// Hex drawing function
const drawHex = (
  g: PIXI.Graphics,
  tile: HexTile,
  options: {
    selected: boolean;
    hovered: boolean;
    scale: number;
  }
) => {
  const { selected, hovered, scale } = options;
  const color = TILE_COLORS[tile.type];

  console.log(
    "Drawing hex:",
    tile.id,
    "type:",
    tile.type,
    "color:",
    color.toString(16)
  );

  g.clear();
  g.lineStyle(2, 0x000000, selected ? 1 : hovered ? 0.8 : 0.5);
  g.beginFill(color, selected ? 1 : hovered ? 0.9 : 0.7);

  try {
    // Try to use the hex factory to get corners
    const hex = new HexFactory();
    const corners = hex.corners;

    // Draw the hexagon shape using the corners
    g.moveTo(corners[5].x * scale, corners[5].y * scale);
    corners.forEach((corner: { x: number; y: number }) => {
      g.lineTo(corner.x * scale, corner.y * scale);
    });
  } catch (error) {
    // Fallback to drawing a simple hexagon without the factory
    console.warn("Using fallback hexagon drawing method:", error);
    const size = 25 * scale;

    // Draw a hexagon manually
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const x = size * Math.cos(angle);
      const y = size * Math.sin(angle);
      if (i === 0) {
        g.moveTo(x, y);
      } else {
        g.lineTo(x, y);
      }
    }
    g.lineTo(size * Math.cos(0), size * Math.sin(0)); // Close the path
  }

  g.endFill();

  // Draw castle if present
  if (tile.castleId) {
    g.lineStyle(2, 0xff0000, 1);
    g.beginFill(0xff0000, 0.7);
    g.drawCircle(0, 0, 10 * scale);
    g.endFill();
  }
};

interface HexGridProps {
  width: number;
  height: number;
}

export const HexGrid: React.FC<HexGridProps> = ({ width, height }) => {
  const {
    tiles,
    selectedTileId,
    hoveredTileId,
    viewPosition,
    zoomLevel,
    selectTile,
    hoverTile,
    panView,
    zoomView,
  } = useGameStore();

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [lastPosition, setLastPosition] = useState({ x: 0, y: 0 });

  // Log when tiles change
  useEffect(() => {
    console.log("Tiles updated in HexGrid component:", tiles.length, "tiles");
  }, [tiles]);

  // Calculate center position for initial view
  useEffect(() => {
    const centerX = width / 2;
    const centerY = height / 2;
    panView(centerX, centerY);
  }, [width, height, panView]);

  // Handle mouse wheel for zooming
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      zoomView(zoomFactor);
    },
    [zoomView]
  );

  // Handle drag start
  const handleDragStart = useCallback(
    (e: React.MouseEvent | PointerEvent) => {
      setIsDragging(true);
      const clientX = "clientX" in e ? e.clientX : 0;
      const clientY = "clientY" in e ? e.clientY : 0;

      setDragStart({
        x: clientX,
        y: clientY,
      });
      setLastPosition(viewPosition);
    },
    [viewPosition]
  );

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Handle mouse move for dragging
  const handleMouseMove = useCallback(
    (e: React.MouseEvent | PointerEvent) => {
      if (isDragging) {
        const clientX = "clientX" in e ? e.clientX : 0;
        const clientY = "clientY" in e ? e.clientY : 0;

        const dx = clientX - dragStart.x;
        const dy = clientY - dragStart.y;

        panView(lastPosition.x + dx, lastPosition.y + dy);
      }
    },
    [isDragging, dragStart, lastPosition, panView]
  );

  // Function to render our hex grid with PIXI
  const renderHexGrid = useCallback(
    (app: PIXI.Application) => {
      if (!app) {
        console.error("No PIXI Application provided");
        return null;
      }

      try {
        // Create renderer check with fallback
        if (!app.renderer) {
          console.warn("Renderer not initialized yet, will retry");
          // Return null and let the next render cycle try again
          return null;
        }

        // Log the tiles to check if they exist
        console.log("Rendering tiles:", tiles.length, "tiles available");

        // Clear the previous render
        while (app.stage.children.length > 0) {
          app.stage.removeChild(app.stage.children[0]);
        }

        // Create main container
        const container = new PIXI.Container();
        container.x = viewPosition.x;
        container.y = viewPosition.y;
        container.scale.set(zoomLevel, zoomLevel);

        // Add tiles
        tiles.forEach((tile) => {
          try {
            const graphic = new PIXI.Graphics();

            // Calculate position - use tile coordinates and hex dimensions
            // Default to 0,0 if center is undefined
            const x = tile.center?.x || tile.q * 60 + (tile.r % 2) * 30;
            const y = tile.center?.y || tile.r * 45;

            graphic.x = x;
            graphic.y = y;

            // Draw the hexagon
            drawHex(graphic, tile, {
              selected: tile.id === selectedTileId,
              hovered: tile.id === hoveredTileId,
              scale: 1,
            });

            // Make interactive
            graphic.eventMode = "static";
            graphic.cursor = "pointer";

            graphic.on("pointerdown", () => selectTile(tile.id));
            graphic.on("pointerover", () => hoverTile(tile.id));
            graphic.on("pointerout", () => hoverTile(null));

            container.addChild(graphic);
          } catch (tileError) {
            console.error("Error rendering tile:", tile.id, tileError);
          }
        });

        app.stage.addChild(container);

        // Add interaction with the canvas for panning/zooming
        // Get the HTMLCanvasElement using the appropriate method for PixiJS v8
        let canvas: HTMLCanvasElement | null = null;

        if (app.renderer.canvas) {
          canvas = app.renderer.canvas;
        } else if (app.renderer.view) {
          const view = app.renderer.view as unknown;
          const viewWithElement = view as { element?: HTMLCanvasElement };
          if (viewWithElement.element) {
            canvas = viewWithElement.element;
          }
        }

        if (canvas) {
          canvas.onpointerdown = (e) => handleDragStart(e);
          canvas.onpointerup = () => handleDragEnd();
          canvas.onpointerout = () => handleDragEnd();
          canvas.onpointermove = (e) => handleMouseMove(e);
        } else {
          console.warn("Canvas element not found or not accessible");
        }
      } catch (error) {
        console.error("Error rendering hex grid:", error);
      }

      return null;
    },
    [
      tiles,
      viewPosition,
      zoomLevel,
      selectedTileId,
      hoveredTileId,
      selectTile,
      hoverTile,
      handleDragStart,
      handleDragEnd,
      handleMouseMove,
    ]
  );

  return (
    <div style={{ width, height, overflow: "hidden" }} onWheel={handleWheel}>
      <PixiStage width={width} height={height} backgroundColor={0x87ceeb}>
        {(app) => renderHexGrid(app)}
      </PixiStage>
    </div>
  );
};
