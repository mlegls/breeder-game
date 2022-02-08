/* IDEAS
1. genotypes could be RPG stats, and combat is automated RPG combat
*/

import { useState } from "react";
import { ElementsDefinition } from "cytoscape";

import { Creature, GlobalState, GamePhase } from "./data/State";
import { AppProps } from "../App";

import { v4 as uuidv4 } from "uuid";

class BreedingCreature {
  fertility_left: number;
  creature: Creature;

  constructor(creature: Creature) {
    this.creature = creature;
    this.fertility_left = creature.fertility;
  }

  public static canBreed(a: BreedingCreature, b: BreedingCreature): boolean {
    if (a.creature.sex === b.creature.sex) return false;
    if (a.fertility_left < 1 || b.fertility_left < 1) return false;
    return true;
  }

  public static breed(
    a: BreedingCreature,
    b: BreedingCreature
  ): Creature | undefined {
    if (!this.canBreed(a, b)) return;
    const child = new Creature();
    let trait: keyof Creature;
    for (trait in child) {
      // assign id
      if (trait === "id") {
        child[trait] = uuidv4();
        continue;
      }
      // assign random value
      if (trait === "sex") {
        child[trait] = Math.random() > 0.5;
        continue;
      }
      // assign all other traits
      const weight = Math.random();
      child[trait] =
        weight * a.creature[trait] + (1 - weight) * b.creature[trait];
    }
    a.fertility_left--;
    b.fertility_left--;
    return child;
  }
}

class BreedingState {
  population: BreedingCreature[];
  bred: Map<[BreedingCreature, BreedingCreature], number>;
  children: Creature[];
  selected: [BreedingCreature, BreedingCreature] | [BreedingCreature] | [];

  constructor(population: Creature[]) {
    this.population = [];
    for (const creature of population) {
      this.population.push(new BreedingCreature(creature));
    }
    this.bred = new Map();
    this.children = [];
    this.selected = [];
  }

  canBreed(): boolean {
    if (this.selected.length !== 2) return false;
    return BreedingCreature.canBreed(this.selected[0], this.selected[1]);
  }

  doBreed(): void {
    if (this.selected.length !== 2) return;
    const child = BreedingCreature.breed(this.selected[0], this.selected[1]);
    if (!child) return;
    this.bred.set(
      [this.selected[0], this.selected[1]],
      (this.bred.get([this.selected[0], this.selected[1]]) ?? 0) + 1
    );
    this.children.push(child);
  }
}

export function Breed(props: AppProps) {
  const [state, setState] = useState<BreedingState>(
    new BreedingState(props.gameState.playerPop)
  );

  function cytoscapeElements(state: BreedingState): ElementsDefinition {
    const elements: ElementsDefinition = {
      nodes: [],
      edges: [],
    };

    // add each population member as a node
    for (const breeding of state.population) {
      elements.nodes.push({
        data: {
          id: breeding.creature.id,
          breeding: breeding,
        },
      });
    }

    // add each bred pair as an edge
 
    // add selected as an edge
    if (state.selected.length !== 2) return elements;
    elements.edges.push({
      data: {
        id: "selected",
        source: state.selected[0].creature.id,
        target: state.selected[1].creature.id,
        canBreed: state.canBreed(),
      },
    });

    return elements;
  }

  return <div></div>;
}
