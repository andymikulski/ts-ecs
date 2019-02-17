import { EntityID, ECS } from "./ECS";


export type HashBucket = { [loc: string]: ECS.Entity[] };

export default class SpatialHash {
  private buckets: HashBucket = {};
  private cellSize: number = 4;

  public Clear() {
    this.buckets = {};
    // let i = 0;
    // for (const key in this.buckets) {
    // this.buckets[key] = [];
    // }
  }

  public Add(ent: ECS.Entity, x: number, y: number): void {
    const key = this.GetPosKey(x, y);
    if (!this.buckets[key]) {
      this.buckets[key] = [];
    }
    this.buckets[key].push(ent);
  }

  private GetPosKey(x: number, y: number): string {
    return `${Math.round(x / this.cellSize) * this.cellSize},${Math.round(y / this.cellSize) * this.cellSize}`;
  }

  private _found: ECS.Entity[];
  private _empty: ECS.Entity[] = [];

  public Query(x: number, y: number, range: number = 3): ECS.Entity[] {
    this._found = [];

    for (let X = x - range; X < x + range; X += this.cellSize) {
      for (let Y = y - range; Y < y + range; Y += this.cellSize) {
        Array.prototype.push.apply(this._found, this.buckets[this.GetPosKey(X, Y)] || this._empty);
      }
    }

    return this._found;
  }

  public GetPoint(x: number, y: number): ECS.Entity[] {
    const found = this.Query(x, y, 1);
    return found;
  }
}