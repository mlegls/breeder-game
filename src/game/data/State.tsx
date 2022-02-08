import { v4 as uuidv4 } from 'uuid';

export enum GamePhase {
  Breed,
  Select,
  Battle,
}

export class Creature {
  public id: string;

  constructor(
    public sex: boolean = false,
    public fertility: number = 0,

    public hp_max: number = 0,
    public def: number = 0,

    public atk_dmg: number = 0,
    public atk_range: number = 0, // pixels
    public atk_cd: number = 0, // frames
    public atk_crit: number = 0, // chance as decimal 0-1

    public spd: number = 0, // pixels / 100 frames
    public tenacity: number = 0, // cd reduction
    public brutality: number = 0 // chance to kill vs capture
  ) {
    this.id = uuidv4();
  }

  public static randomCreature(): Creature {
    return new Creature(
      Math.random() > 0.5, // gender
      Math.floor(Math.random() * 5), // fertility

      Math.random() * 500, // hp_max
      Math.random() * 50, // def

      Math.random() * 50, // atk_dmg
      Math.random() * 200, // atk_range
      Math.random() * 60 * 4, // atk_cd
      Math.random(), // atk_crit

      Math.random() * 100, // spd
      Math.random(), // tenacity
      Math.random() // brutality
    );
  }
}

export class GlobalState {
  playerPop: Creature[];
  enemyPop: Creature[];

  constructor() {
    this.playerPop = [];
    this.enemyPop = [];

    for (let i = 0; i < 10; i++) {
      this.playerPop.push(Creature.randomCreature());
      this.enemyPop.push(Creature.randomCreature());
    }
  }
}
