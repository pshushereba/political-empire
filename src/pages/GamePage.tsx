import { useState } from "react";
import { Link } from "react-router-dom";
import { CanvasHexGrid } from "@/components/game/CanvasHexGrid";
import { useGameStore } from "@/lib/store";

export default function GamePage() {
  const { generateNewMap, selectedTileId, tiles, placeCastle } = useGameStore();
  const [castleName, setCastleName] = useState("");

  // Get selected tile details if any
  const selectedTile = selectedTileId
    ? tiles.find((t) => t.id === selectedTileId)
    : null;

  const handleCreateCastle = () => {
    if (selectedTileId && castleName) {
      placeCastle(selectedTileId, castleName);
      setCastleName("");
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-4">
      <div className="z-10 w-full max-w-6xl items-center justify-between text-sm mb-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold mb-4">Political Empire</h1>
          <Link to="/" className="text-blue-500 hover:underline">
            Return Home
          </Link>
        </div>

        <div className="flex gap-4 mb-4">
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded"
            onClick={() => {
              console.log("Generate New Map button clicked");
              generateNewMap();
              // Force a re-render to ensure the map is displayed
              setTimeout(() => {
                console.log("Forcing re-render");
                // This empty setState will force a re-render
                setCastleName(castleName);
              }, 100);
            }}
          >
            Generate New Map
          </button>

          <button
            className="px-4 py-2 bg-green-500 text-white rounded"
            onClick={() => {
              console.log("Generate Larger Map button clicked");
              generateNewMap({ width: 20, height: 20 });
              // Force a re-render to ensure the map is displayed
              setTimeout(() => {
                console.log("Forcing re-render");
                // This empty setState will force a re-render
                setCastleName(castleName);
              }, 100);
            }}
          >
            Generate Larger Map
          </button>
        </div>
      </div>

      <div className="flex w-full h-[calc(100vh-200px)]">
        {/* Main game area */}
        <div className="flex-1 border border-gray-300 rounded">
          <CanvasHexGrid width={1000} height={800} />
        </div>

        {/* Sidebar */}
        <div className="w-80 ml-4 border border-gray-300 rounded p-4">
          <h2 className="text-xl font-bold mb-2">Game Info</h2>

          {selectedTile ? (
            <div className="mb-4">
              <h3 className="text-lg font-semibold">Selected Tile</h3>
              <p>
                Position: ({selectedTile.q}, {selectedTile.r})
              </p>
              <p>Type: {selectedTile.type}</p>
              <p>Resources:</p>
              <ul className="ml-4">
                <li>Food: {selectedTile.resources.food}</li>
                <li>Wood: {selectedTile.resources.wood}</li>
                <li>Stone: {selectedTile.resources.stone}</li>
                <li>Metal: {selectedTile.resources.metal}</li>
                <li>Gold: {selectedTile.resources.gold}</li>
              </ul>

              {!selectedTile.castleId && (
                <div className="mt-4">
                  <h4 className="font-semibold">Build Castle</h4>
                  <input
                    type="text"
                    value={castleName}
                    onChange={(e) => setCastleName(e.target.value)}
                    placeholder="Castle name"
                    className="w-full p-2 border border-gray-300 rounded mt-2"
                  />
                  <button
                    onClick={handleCreateCastle}
                    disabled={!castleName}
                    className="mt-2 px-4 py-2 bg-purple-500 text-white rounded disabled:bg-gray-400"
                  >
                    Build Castle
                  </button>
                </div>
              )}
            </div>
          ) : (
            <p>Select a tile to see details</p>
          )}

          <div className="mt-4">
            <h3 className="text-lg font-semibold">Instructions</h3>
            <ul className="ml-4 list-disc">
              <li>Click on a tile to select it</li>
              <li>Drag to pan the map</li>
              <li>Use mouse wheel to zoom</li>
              <li>Build castles on suitable terrain</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
