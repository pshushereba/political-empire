import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between text-sm lg:flex">
        <div className="fixed bottom-0 left-0 flex h-48 w-full items-end justify-center lg:static lg:h-auto lg:w-auto lg:bg-none">
          <div className="pointer-events-none flex place-items-center gap-2 p-8 lg:pointer-events-auto lg:p-0">
            Political Empire Game
          </div>
        </div>
      </div>

      <div className="relative flex place-items-center mb-12">
        <h1 className="text-5xl font-bold">Political Empire</h1>
      </div>

      <div className="mb-32 grid text-center lg:max-w-5xl lg:w-full lg:mb-0 lg:grid-cols-1 lg:text-left">
        <Link
          to="/game"
          className="group rounded-lg border border-gray-300 px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30"
        >
          <h2 className="mb-3 text-2xl font-semibold">
            Play Now{" "}
            <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
              →
            </span>
          </h2>
          <p className="m-0 max-w-[30ch] text-sm opacity-50">
            Enter the world of political strategy and empire building
          </p>
        </Link>
      </div>

      <div className="mt-12 text-center">
        <h2 className="text-2xl font-bold mb-4">About Political Empire</h2>
        <p className="mb-4 max-w-2xl">
          Political Empire is a browser-based multiplayer game where you build
          and manage your own political state. Make decisions that shape your
          society, construct buildings, raise armies, and interact with other
          players in a dynamic world.
        </p>
        <p className="max-w-2xl">
          Your political choices matter - every decision pushes your regime
          toward different ideologies, from communism to fascism, libertarianism
          to authoritarianism, progressive to traditional values.
        </p>
      </div>
    </main>
  );
}
