import { useState } from "react";

import "98.css";

import { Breed } from "./game/Breed";
import { Select } from "./game/Select";
import { Battle } from "./game/Battle";

import { GlobalState, GamePhase } from "./game/data/State";

export type AppProps = {
  gamePhase: GamePhase;
  advancePhase: () => void;
  gameState: GlobalState;
  updateState: (state: GlobalState) => void;
}

export function App() {
  const [phase, setPhase] = useState<GamePhase>(GamePhase.Breed);
  const [state, setState] = useState<GlobalState>(new GlobalState());

  function mainContent(phase: GamePhase) {
    switch (phase) {
      case GamePhase.Breed:
        return (
          <Breed
            gamePhase={phase}
            advancePhase={() => setPhase(GamePhase.Select)}
            gameState={state}
            updateState={setState}
          />
        );
      case GamePhase.Select:
        return (
          <Select
            gamePhase={phase}
            advancePhase={() => setPhase(GamePhase.Battle)}
            gameState={state}
            updateState={setState}
          />
        );
      case GamePhase.Battle:
        return (
          <Battle
            gamePhase={phase}
            advancePhase={() => setPhase(GamePhase.Breed)}
            gameState={state}
            updateState={setState}
          />
        );
    }
  }

  return (
    <div className="window w-screen h-screen">
      <div className="title-bar">
        <div className="title-bar-text">Breeder Game</div>
      </div>
      {/*end title-bar*/}
      <div className="content flex flex-col">{mainContent(phase)}</div>
      {/*end content*/}
    </div>
  );
}

export default App;
