/* IDEAS
1. genotypes could be RPG stats, and combat is automated RPG combat
*/

import { useState, useRef, useEffect, useReducer } from "react";
import cytoscape, { ElementsDefinition } from "cytoscape";
import popper from "cytoscape-popper";

import "./popper.css";

import { Creature } from "./data/State";
import { AppProps } from "../App";

import { v4 as uuidv4 } from "uuid";
const columnify = require("columnify");

class BreedingCreature {
  fertility_left: number;
  creature: Creature;

  constructor(creature: Creature) {
    this.creature = creature;
    this.fertility_left = creature.fertility;
  }

  private static vary(n: number, amount: number): number {
    // vary by n * 1 +- amount, e.g. 0.1 => 0.9 * n to 1.1 * n
    return n * (Math.random() * amount * 2) + 1 - amount;
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
      const weight = Math.random();
      // assign fertility
      if (trait === "fertility") {
        const [father, mother] = a.creature.sex ? [a, b] : [b, a];
        const balanced =
          (weight / 3) * father.creature[trait] +
          (1 - weight) * mother.creature[trait];
        let result = child.sex ? balanced * 3 : balanced;
        child[trait] = this.vary(result, 0.1);
      }
      // assign all other traits
      let result =
        weight * a.creature[trait] + (1 - weight) * b.creature[trait];

      child[trait] = this.vary(result, 0.1);
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
  selected: BreedingCreature[]; // max 2

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

  select(breeding: BreedingCreature): void {
    const sex = breeding.creature.sex;
    switch (this.selected.length) {
      case 0:
        this.selected[0] = breeding;
        break;
      case 1: {
        // only pair if opposite sexed
        if (this.selected[0].creature.sex === sex) break;
        this.selected[1] = breeding;
        break;
      }
      case 2: {
        // always keep opposite sex node
        if (this.selected[0].creature.sex !== sex) {
          this.selected[1] = breeding;
          break;
        } else if (this.selected[1].creature.sex !== sex) {
          this.selected[0] = breeding;
          break;
        }
      }
    }
  }

  deselect(): void {
    this.selected = [];
  }
}

// Components
function Children(props: { children: Creature[] }) {
  function display(c: Creature): String {
    return `${columnify(c)}\n\n`;
  }

  return (
    <div className="children">
      {props.children.map((child) => (
        <p className="child" key={child.id}>
          {display(child)}
        </p>
      ))}
    </div>
  );
}

export function Breed(props: AppProps) {
  const [state] = useState<BreedingState>(
    new BreedingState(props.gameState.playerPop)
  );
  const [, forceUpdate] = useReducer((x) => x + 1, 0);

  const cy = useRef<cytoscape.Core>();
  const cytoEl = useRef(null);

  function initCyEles(population: BreedingCreature[]): ElementsDefinition {
    const elements: ElementsDefinition = {
      nodes: [],
      edges: [],
    };

    // add each population member as a node
    for (const breeding of population) {
      elements.nodes.push({
        data: {
          id: breeding.creature.id,
          breeding: breeding,
          tooltipOn: false,
        },
      });
    }
    return elements;
  }

  // call on every graph interaction
  function updateUI() {
    // update selected edge
    if (!cy.current) return;
    cy.current.remove("#selected-edge");
    if (state.selected.length === 2) {
      const color = state.canBreed() ? "green" : "red";
      cy.current
        .add({
          group: "edges",
          data: {
            id: "selected-edge",
            source: state.selected[0].creature.id,
            target: state.selected[1].creature.id,
          },
        })
        .style({ "line-color": color });
    }
    // update rest of UI
    forceUpdate();
  }

  useEffect(() => {
    // for node tooltips
    cytoscape.use(popper);

    // set cy object
    cy.current = cytoscape({
      container: cytoEl.current,
      elements: initCyEles(state.population),
    });
    cy.current.nodes().forEach((node) => {
      node.style({
        "background-color": node.data("breeding").creature.sex
          ? "grey"
          : "pink",
      });
    });

    // set event handlers
    cy.current.on("select", "node", (evt) => {
      const node = evt.target;
      state.select(node.data("breeding"));
      updateUI();
    });

    cy.current.elements().unbind("mouseover");
    cy.current.on("mouseover", "node", (evt) => {
      const node = evt.target;
      node.popperRefObj2 = node.popper({
        content: () => {
          let content = document.createElement("div");
          content.classList.add("popper-div");
          content.innerHTML = `${JSON.stringify(
            node.data("breeding"),
            null,
            "\t"
          )}`;

          document.body.appendChild(content);
          return content;
        },
      });
    });

    cy.current.elements().unbind("mouseout");
    cy.current.on("mouseout", "node", (evt) => {
      const node = evt.target;
      if (node.popper) {
        node.popperRefObj2.state.elements.popper.remove();
        node.popperRefObj2.destroy();
      }
    });

    cy.current.on("tap", (evt) => {
      if (evt.target !== cy.current) return;
      if (!cy.current) return;
      cy.current.nodes().forEach((node: any) => {
        if (node.data("tooltipOn")) {
          node.popperRefObj.state.elements.popper.remove();
          node.popperRefObj.destroy();
          node.data("tooltipOn", false);
        }
      });
      state.deselect();
      updateUI();
    });

    cy.current.on("tap", "node", (evt) => {
      const node = evt.target;
      // tooltip
      if (node.data("tooltipOn")) {
        node.popperRefObj.state.elements.popper.remove();
        node.popperRefObj.destroy();
        node.popperRefObj2.state.elements.popper.remove();
        node.popperRefObj2.destroy();
        node.data("tooltipOn", false);
      } else {
        node.popperRefObj = node.popper({
          content: () => {
            let content = document.createElement("div");
            content.classList.add("popper-div");
            content.innerHTML = `${JSON.stringify(
              node.data("breeding"),
              null,
              "\t"
            )}`;

            document.body.appendChild(content);
            return content;
          },
        });
        node.data("tooltipOn", true);
      }
    });

    /*cy.current.on("mouseover", "node", (evt) => {
      const node = evt.target;
      node.qtip({
        content: node.toString(),
      });
    });*/
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  let cyStyle = {
    height: "90vh",
    width: "45vw",
  };

  return (
    <div className="self-center">
      <button
        disabled={!state.canBreed()}
        onClick={() => {
          state.doBreed();
          updateUI();
        }}
      >
        Breed
      </button>
      <button onClick={props.advancePhase}>Next Phase</button>
      <div className="flex flex-row">
        <pre>
          <div ref={cytoEl} className="self-center" style={cyStyle}></div>
        </pre>
        <pre className="overflow-y-auto">
          <div className="children" style={cyStyle}>
            <Children children={state.children} />
          </div>
        </pre>
      </div>
    </div>
  );
}

/*
    // add each bred pair as an edge
    state.bred.forEach((count, [a, b]) => {
      elements.edges.push({
        data: {
          id: `${a.creature.id}-${b.creature.id}`,
          source: a.creature.id,
          target: b.creature.id,
          count: count,
        },
      });
    });
*/
