import React, { useRef, useEffect, useState } from "react";
import { HexTile, TileType } from "@/types/hex";
import { useGameStore } from "@/lib/store";

interface CanvasHexGridProps {
  width: number;
  height: number;
}

// Define colors for different tile types
const TILE_COLORS = {
  [TileType.PLAINS]: "#8bc34a", // Light green
  [TileType.FOREST]: "#2e7d32", // Dark green
  [TileType.MOUNTAINS]: "#795548", // Brown
  [TileType.RIVER]: "#42a5f5", // Light blue
  [TileType.HILLS]: "#9e9e9e", // Gray
  [TileType.DESERT]: "#ffd54f", // Yellow
  [TileType.COAST]: "#4fc3f7", // Lighter blue
  [TileType.LAKE]: "#1976d2", // Darker blue
};

export const CanvasHexGrid: React.FC<CanvasHexGridProps> = ({
  width,
  height,
}) => {
  const {
    tiles,
    selectedTileId,
    hoveredTileId,
    viewPosition,
    zoomLevel,
    selectTile,
    panView,
    zoomView,
  } = useGameStore();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const lastPositionRef = useRef({ x: viewPosition.x, y: viewPosition.y });
  const isInitializedRef = useRef(false);
  const [showResetButton, setShowResetButton] = useState(false);

  // Draw function for a single hexagon
  const drawHex = (
    ctx: CanvasRenderingContext2D,
    tile: HexTile,
    x: number,
    y: number,
    size: number,
    selected: boolean,
    hovered: boolean
  ) => {
    const color = TILE_COLORS[tile.type];

    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const pointX = x + size * Math.cos(angle);
      const pointY = y + size * Math.sin(angle);
      if (i === 0) {
        ctx.moveTo(pointX, pointY);
      } else {
        ctx.lineTo(pointX, pointY);
      }
    }
    ctx.closePath();

    // Fill with different opacity based on selected/hovered
    ctx.fillStyle = color;
    ctx.globalAlpha = selected ? 1 : hovered ? 0.9 : 0.7;
    ctx.fill();

    // Draw border
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.globalAlpha = selected ? 1 : hovered ? 0.8 : 0.5;
    ctx.stroke();

    ctx.globalAlpha = 1;

    // Draw castle if present
    if (tile.castleId) {
      ctx.beginPath();
      ctx.arc(x, y, size / 3, 0, Math.PI * 2);
      ctx.fillStyle = "#ff0000";
      ctx.globalAlpha = 0.7;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#ff0000";
      ctx.globalAlpha = 1;
      ctx.stroke();
    }
  };

  // Draw the entire grid
  const drawGrid = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    console.log(
      `Drawing grid with ${tiles.length} tiles at position (${viewPosition.x}, ${viewPosition.y}) with zoom ${zoomLevel}`
    );

    try {
      // Clear the entire canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Reset any existing transformations
      ctx.setTransform(1, 0, 0, 1, 0, 0);

      // Set transform for panning/zooming - start with a clean state
      ctx.save();

      // Ensure viewPosition is within reasonable bounds
      const centerX = width / 2;
      const centerY = height / 2;
      const maxPanDistance = Math.max(width, height) * 3;

      // Check if we're at an extreme position
      const distanceFromCenter = Math.sqrt(
        (viewPosition.x - centerX) ** 2 + (viewPosition.y - centerY) ** 2
      );

      // If at extreme position, use center instead
      let effectiveX = viewPosition.x;
      let effectiveY = viewPosition.y;

      if (distanceFromCenter > maxPanDistance) {
        console.warn(
          "View position is extremely far from center, using constrained position instead"
        );
        // Use a constrained position
        const scale = maxPanDistance / distanceFromCenter;
        effectiveX = centerX + (viewPosition.x - centerX) * scale;
        effectiveY = centerY + (viewPosition.y - centerY) * scale;
      }

      ctx.translate(effectiveX, effectiveY);

      // Apply zoom - but ensure it's within reasonable bounds
      const safeZoom = Math.max(0.1, Math.min(3.0, zoomLevel));
      if (safeZoom !== zoomLevel) {
        console.warn(
          `Zoom level ${zoomLevel} is out of safe range, using ${safeZoom} instead`
        );
      }
      ctx.scale(safeZoom, safeZoom);

      // Calculate grid boundaries as before
      let minX = Number.MAX_VALUE;
      let minY = Number.MAX_VALUE;
      let maxX = Number.MIN_VALUE;
      let maxY = Number.MIN_VALUE;

      // Use consistent tile spacing in all calculations
      const tileWidth = 52;
      const tileHeight = 45;
      const oddRowOffset = 26;

      // First pass to determine grid boundaries
      tiles.forEach((tile) => {
        const x =
          tile.center?.x || tile.q * tileWidth + (tile.r % 2) * oddRowOffset;
        const y = tile.center?.y || tile.r * tileHeight;

        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      });

      // Calculate grid dimensions
      const gridWidth = maxX - minX;
      const gridHeight = maxY - minY;

      // Calculate offset to center the grid
      const offsetX = -minX - gridWidth / 2;
      const offsetY = -minY - gridHeight / 2;

      // Apply additional translation to center the grid
      ctx.translate(offsetX, offsetY);

      // Size of hexes
      const hexSize = 30;

      // Draw each tile
      tiles.forEach((tile) => {
        try {
          // Calculate position with consistent spacing
          // Use the same constants as in the boundary calculation
          const x =
            tile.center?.x || tile.q * tileWidth + (tile.r % 2) * oddRowOffset;
          const y = tile.center?.y || tile.r * tileHeight;

          const isSelected = tile.id === selectedTileId;
          const isHovered = tile.id === hoveredTileId;

          drawHex(ctx, tile, x, y, hexSize, isSelected, isHovered);
        } catch (tileError) {
          console.error("Error drawing tile:", tileError);
        }
      });

      ctx.restore();
    } catch (error) {
      console.error("Error in drawGrid:", error);
    }
  };

  // Initialize the view position once
  useEffect(() => {
    if (!isInitializedRef.current) {
      // Calculate appropriate center position
      // We want to center the map in the container
      const centerX = width / 2;
      const centerY = height / 2;

      // Calculate the map size based on tile count
      // Estimate the grid dimensions based on the number of tiles
      const gridSize = Math.sqrt(tiles.length);
      const mapWidth = gridSize * 60; // Approximate width based on tile size
      const mapHeight = gridSize * 45; // Approximate height based on tile size

      // Calculate initial zoom to fit map in view with some padding
      const scaleX = (width * 0.8) / mapWidth;
      const scaleY = (height * 0.8) / mapHeight;
      const initialZoom = Math.min(scaleX, scaleY, 1); // Don't zoom in more than 1x

      console.log(
        "Initializing map view with center:",
        centerX,
        centerY,
        "zoom:",
        initialZoom
      );

      // Update the zoom level
      zoomView(initialZoom / zoomLevel); // Adjust relative to current zoom level

      // Position the view to center the map
      panView(centerX, centerY);

      isInitializedRef.current = true;
    }
  }, [panView, zoomView, width, height, tiles.length, zoomLevel]);

  // Initialize and handle canvas clicks
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas dimensions
    canvas.width = width;
    canvas.height = height;

    // Draw initial state
    drawGrid();

    // Handle mouse events for interaction
    const handleMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      lastPositionRef.current = { x: viewPosition.x, y: viewPosition.y };
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingRef.current) {
        const dx = e.clientX - dragStartRef.current.x;
        const dy = e.clientY - dragStartRef.current.y;

        // Calculate new position
        const newX = lastPositionRef.current.x + dx;
        const newY = lastPositionRef.current.y + dy;

        // Limit panning to reasonable bounds
        // Let's say we don't want the map to move too far from the center
        const maxPanDistance = Math.max(width, height) * 2;

        // Calculate the distance from center
        const centerX = width / 2;
        const centerY = height / 2;
        const distanceFromCenter = Math.sqrt(
          (newX - centerX) ** 2 + (newY - centerY) ** 2
        );

        // If distance is too great, limit it
        if (distanceFromCenter > maxPanDistance) {
          console.log("Limiting pan distance to prevent map from disappearing");
          // Scale back to max allowed distance
          const scale = maxPanDistance / distanceFromCenter;
          const limitedX = centerX + (newX - centerX) * scale;
          const limitedY = centerY + (newY - centerY) * scale;
          panView(limitedX, limitedY);

          // Show the reset button when we're near the boundary
          setShowResetButton(true);
        } else {
          // Normal panning
          panView(newX, newY);

          // Show reset button when we're far from center
          const farThreshold = Math.max(width, height) * 0.8;
          setShowResetButton(distanceFromCenter > farThreshold);
        }
      }
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      zoomView(zoomFactor);
    };

    const handleClick = (e: MouseEvent) => {
      // Calculate clicked position in grid coordinates
      const rect = canvas.getBoundingClientRect();

      // Get raw click coordinates in canvas space
      const rawX = e.clientX - rect.left;
      const rawY = e.clientY - rect.top;

      console.log("Click detected at raw coordinates:", rawX, rawY);
      console.log("Current view position:", viewPosition.x, viewPosition.y);

      // Convert to world coordinates by subtracting view position and dividing by zoom
      const worldX = (rawX - viewPosition.x) / zoomLevel;
      const worldY = (rawY - viewPosition.y) / zoomLevel;

      console.log("World coordinates:", worldX, worldY);

      let closestTile: HexTile | null = null;
      let closestDistance = Number.MAX_VALUE;

      try {
        // We need to account for the offset we applied when drawing the grid
        // Calculate grid boundaries
        let minX = Number.MAX_VALUE;
        let minY = Number.MAX_VALUE;
        let maxX = Number.MIN_VALUE;
        let maxY = Number.MIN_VALUE;

        tiles.forEach((tile) => {
          const x = tile.center?.x || tile.q * 52 + (tile.r % 2) * 26;
          const y = tile.center?.y || tile.r * 45;

          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        });

        // Calculate the same offset we use in drawing
        const gridWidth = maxX - minX;
        const gridHeight = maxY - minY;
        const offsetX = -minX - gridWidth / 2;
        const offsetY = -minY - gridHeight / 2;

        // Apply offset to the world coordinates to match the drawing coordinates
        const adjustedX = worldX - offsetX;
        const adjustedY = worldY - offsetY;

        console.log(
          "Adjusted coordinates with grid offset:",
          adjustedX,
          adjustedY
        );

        tiles.forEach((tile: HexTile) => {
          const tileX = tile.center?.x || tile.q * 52 + (tile.r % 2) * 26;
          const tileY = tile.center?.y || tile.r * 45;

          const distance = Math.sqrt(
            (adjustedX - tileX) ** 2 + (adjustedY - tileY) ** 2
          );

          if (distance < closestDistance && distance < 40) {
            closestDistance = distance;
            closestTile = tile;
          }
        });

        if (closestTile) {
          console.log(
            "Selected tile:",
            (closestTile as HexTile).id,
            "type:",
            (closestTile as HexTile).type,
            "distance:",
            closestDistance
          );
          selectTile((closestTile as HexTile).id);

          // Immediately redraw to show the selection without waiting for React to re-render
          drawGrid();
        } else {
          console.log(
            "No tile found at click location - too far from any tile"
          );
        }
      } catch (error) {
        console.error("Error in handleClick:", error);
      }
    };

    // Add event listeners
    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("wheel", handleWheel);
    canvas.addEventListener("click", handleClick);

    return () => {
      // Clean up event listeners
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("wheel", handleWheel);
      canvas.removeEventListener("click", handleClick);
    };
  }, [
    panView,
    selectTile,
    viewPosition.x,
    viewPosition.y,
    zoomLevel,
    zoomView,
    width,
    height,
    tiles,
  ]);

  // Redraw when necessary values change
  useEffect(() => {
    try {
      if (canvasRef.current) {
        drawGrid();
      }
    } catch (error) {
      console.error("Error in redraw effect:", error);
    }
  }, [
    tiles,
    selectedTileId,
    hoveredTileId,
    viewPosition.x,
    viewPosition.y,
    zoomLevel,
  ]);

  // Function to reset the view to default position
  const resetView = () => {
    console.log("Performing complete view reset");

    try {
      // Force a complete state reset through the store
      // Calculate default position
      const centerX = width / 2;
      const centerY = height / 2;

      // Calculate optimal zoom based on map size
      const gridSize = Math.sqrt(tiles.length);
      const mapWidth = gridSize * 52;
      const mapHeight = gridSize * 45;
      const scaleX = (width * 0.8) / mapWidth;
      const scaleY = (height * 0.8) / mapHeight;
      const initialZoom = Math.min(scaleX, scaleY, 1);

      // Directly set the absolute zoom level through the store
      // This completely ignores the current zoom level
      console.log(
        `Setting absolute zoom to ${initialZoom} and position to (${centerX}, ${centerY})`
      );

      // Set exact position and zoom
      panView(centerX, centerY);

      // Force the store to reset the zoom level to exactly the initial value
      // We accomplish this by calculating the ratio between the current and desired zoom
      zoomView(initialZoom / zoomLevel);

      // Force a redraw with a delay
      setTimeout(() => {
        console.log("Redrawing after reset");
        if (canvasRef.current) {
          // Re-apply the proper translation before drawing
          drawGrid();
        }
        setShowResetButton(false);
      }, 100);
    } catch (error) {
      console.error("Error during view reset:", error);
    }
  };

  // Force the reset button to appear if the map appears to be out of center
  useEffect(() => {
    // Check if map appears to be far from center
    const centerX = width / 2;
    const centerY = height / 2;
    const distanceFromCenter = Math.sqrt(
      (viewPosition.x - centerX) ** 2 + (viewPosition.y - centerY) ** 2
    );

    const farThreshold = Math.max(width, height) * 0.5; // Lower threshold to make it appear more often
    const shouldShowButton =
      distanceFromCenter > farThreshold || zoomLevel < 0.5 || zoomLevel > 2;

    if (shouldShowButton !== showResetButton) {
      console.log(
        `${
          shouldShowButton ? "Showing" : "Hiding"
        } reset button: distance=${distanceFromCenter.toFixed(
          2
        )}, threshold=${farThreshold.toFixed(2)}`
      );
      setShowResetButton(shouldShowButton);
    }
  }, [
    viewPosition.x,
    viewPosition.y,
    zoomLevel,
    width,
    height,
    showResetButton,
  ]);

  // Show reset button on component mount
  useEffect(() => {
    // Force reset button to show for a few seconds on initial load
    setShowResetButton(true);
    const timer = setTimeout(() => {
      if (!isDraggingRef.current) {
        setShowResetButton(false);
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  // Hard reset function for when the map is completely lost
  const hardReset = () => {
    console.log("Performing EMERGENCY hard reset of map view");

    try {
      // Reset state hard with direct DOM manipulation if needed
      const centerX = width / 2;
      const centerY = height / 2;

      // Force zoom reset by directly updating store
      // Reset to a known "safe" zoom level
      zoomView(1.0 / zoomLevel); // Reset to zoom level 1.0

      // Force position to center with direct update
      panView(centerX, centerY);

      // Completely recreate the canvas to eliminate any transformation issues
      const canvas = canvasRef.current;
      if (canvas) {
        const parent = canvas.parentNode;
        if (parent) {
          // Remove and recreate canvas element
          parent.removeChild(canvas);
          const newCanvas = document.createElement("canvas");
          newCanvas.width = width;
          newCanvas.height = height;
          newCanvas.style.position = "absolute";
          newCanvas.style.top = "0";
          newCanvas.style.left = "0";
          parent.appendChild(newCanvas);
          canvasRef.current = newCanvas;

          // Reattach event listeners (would need to be done in the next render cycle)
          setTimeout(() => {
            isInitializedRef.current = false; // Force re-initialization on next render
            // This will trigger a re-render and cause our useEffect hooks to run again
            setShowResetButton(true); // Ensure the reset button remains visible

            // Force a complete redraw with clean state
            drawGrid();
          }, 100);
        }
      }
    } catch (error) {
      console.error("Error during emergency reset:", error);
      // Last resort - reload the page
      alert("Map reset failed. Page will reload to recover.");
      window.location.reload();
    }
  };

  // Find a tile at the given screen coordinates
  const tileAt = (screenX: number, screenY: number): HexTile | null => {
    try {
      if (!canvasRef.current) return null;

      // Convert screen coordinates to grid coordinates
      // First invert the view transform
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const canvasX = screenX - rect.left;
      const canvasY = screenY - rect.top;

      // Check if we're at an extreme position that might cause calculation issues
      const centerX = width / 2;
      const centerY = height / 2;
      const maxPanDistance = Math.max(width, height) * 3;
      const distanceFromCenter = Math.sqrt(
        (viewPosition.x - centerX) ** 2 + (viewPosition.y - centerY) ** 2
      );

      if (distanceFromCenter > maxPanDistance) {
        console.warn(
          "View position is extremely far from center, tile detection may be unreliable"
        );
      }

      // Use the same constants as in drawGrid for consistency
      const tileWidth = 52;
      const tileHeight = 45;
      const oddRowOffset = 26;
      const hexSize = 30;

      // Calculate grid boundaries (same as in drawGrid)
      let minX = Number.MAX_VALUE;
      let minY = Number.MAX_VALUE;
      let maxX = Number.MIN_VALUE;
      let maxY = Number.MIN_VALUE;

      tiles.forEach((tile: HexTile) => {
        const x =
          tile.center?.x || tile.q * tileWidth + (tile.r % 2) * oddRowOffset;
        const y = tile.center?.y || tile.r * tileHeight;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      });

      const gridWidth = maxX - minX;
      const gridHeight = maxY - minY;
      const offsetX = -minX - gridWidth / 2;
      const offsetY = -minY - gridHeight / 2;

      // Invert the transformations
      // (x' - viewPosition.x) / zoomLevel - offsetX = x
      const safeZoom = Math.max(0.1, Math.min(3.0, zoomLevel));
      const effectiveViewX = viewPosition.x;
      const effectiveViewY = viewPosition.y;

      const gridX = (canvasX - effectiveViewX) / safeZoom - offsetX;
      const gridY = (canvasY - effectiveViewY) / safeZoom - offsetY;

      console.log(
        `Screen coords (${screenX}, ${screenY}) to grid coords (${gridX}, ${gridY})`
      );

      // Find the closest tile
      let closestTile: HexTile | null = null;
      let closestDistance = Number.MAX_VALUE;

      for (const tile of tiles) {
        const tileX =
          tile.center?.x || tile.q * tileWidth + (tile.r % 2) * oddRowOffset;
        const tileY = tile.center?.y || tile.r * tileHeight;

        const dx = tileX - gridX;
        const dy = tileY - gridY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Only consider tiles within the hex size
        if (distance < hexSize * 1.2 && distance < closestDistance) {
          closestDistance = distance;
          closestTile = tile;
        }
      }

      if (closestTile) {
        console.log(`Found tile at (${closestTile.q}, ${closestTile.r})`);
      } else {
        console.log(`No tile found near (${gridX}, ${gridY})`);
      }

      return closestTile;
    } catch (error) {
      console.error("Error in tileAt:", error);
      return null;
    }
  };

  // Handle click event
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    try {
      console.log("Canvas clicked");

      if (isDraggingRef.current) {
        // If we're currently panning, don't select a tile
        return;
      }

      const tile = tileAt(e.clientX, e.clientY);

      if (tile) {
        console.log(`Clicked on tile: ${tile.id} at (${tile.q}, ${tile.r})`);
        selectTile(tile.id);
      } else {
        console.log(
          "No tile at click position - attempting to recenter if far from view"
        );

        // Check if we might be far from the map
        const centerX = width / 2;
        const centerY = height / 2;
        const maxPanDistance = Math.max(width, height) * 3;
        const distanceFromCenter = Math.sqrt(
          (viewPosition.x - centerX) ** 2 + (viewPosition.y - centerY) ** 2
        );

        // If we're far from center, try to recenter
        if (distanceFromCenter > maxPanDistance) {
          resetView();
        }
      }
    } catch (error) {
      console.error("Error handling click:", error);
      // Try to recover with a reset
      hardReset();
    }
  };

  return (
    <div
      style={{
        width,
        height,
        overflow: "hidden",
        position: "relative",
        border: "1px solid blue",
      }}
    >
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ position: "absolute", top: 0, left: 0 }}
        onClick={handleClick}
      />

      {showResetButton && (
        <button
          onClick={resetView}
          style={{
            position: "absolute",
            bottom: "20px",
            right: "20px",
            zIndex: 100,
            padding: "10px 16px",
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            color: "white",
            border: "2px solid white",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: "16px",
            boxShadow: "0 0 10px rgba(0,0,0,0.5)",
          }}
        >
          Reset View
        </button>
      )}

      {/* Always present emergency reset button (smaller, in top right) */}
      <button
        onClick={hardReset}
        style={{
          position: "absolute",
          top: "10px",
          right: "10px",
          zIndex: 100,
          padding: "4px 8px",
          backgroundColor: "rgba(255, 0, 0, 0.7)",
          color: "white",
          border: "1px solid white",
          borderRadius: "4px",
          cursor: "pointer",
          fontSize: "12px",
        }}
      >
        Emergency Reset
      </button>
    </div>
  );
};
