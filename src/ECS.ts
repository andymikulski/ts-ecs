import { debug } from "util";

export type EntityID = number;

export namespace ECS {
  export class Entity {
    public static NextID: EntityID = 0;
    public id: EntityID = -1;

    public comps: any = {};

    constructor() {
      this.id = Entity.NextID;
      Entity.NextID++;
    }

    private _strName: string;
    public GetComponent(comp: Component) {
      this._strName = (<Function>comp).name;
      return this.comps[this._strName];
    }

    public AddComponent(comp: Component) {
      const name = comp.constructor.name;
      this.comps[name] = comp;
      return this;
    }

    public RemoveComponent(comp: Component) {
      this._strName = (<Function>comp).name;
      delete this.comps[this._strName];
    }
  }

  export abstract class Component { }

  export abstract class System {
    abstract requiredComps: Component[];
    public compFlags: number;

    public BeforeTick(): void { }
    public AfterTick(): void { }

    public abstract EntityTick(ent: Entity, deltaMs: number): void;
  }

  export abstract class Resource {
    public BeforeSystemTick(uni: Universe): void { }
    public AfterSystemTick(uni: Universe): void { }
  }


  interface EntityData {
    ent: Entity;
    componentFlags: number;
  }

  export class Universe {
    resources: Resource[] = [];
    systems: System[] = [];
    ents: EntityData[] = [];
    components: Component[] = [];

    constructor() {
      this.tick = this.tick.bind(this);
      requestAnimationFrame(this.tick);
    }

    public GetCompiledFlags(comps: Component[]): number {
      let list: Component[];
      if (comps instanceof Array) {
        list = comps;
      } else {
        list = (<any>Object).values(comps);
      }

      let i = 0;
      let flags: number = 1 << (this.components.length * 1);

      while (i < this.components.length) {
        const idx = list.findIndex((val: Component) => {
          return val == this.components[i] || val instanceof <Function>(this.components[i]);
        });

        if (idx == -1) {
          // flags = flags << 1;
        } else {
          flags = flags | (1 << (i * 1));
        }
        i++;
      }

      return flags;
    }

    public GetComponentFlag(comp: Component): number {
      const idx = this.components.findIndex((val: Component) => {
        return comp == val || comp instanceof <Function>val;
      });

      let flags = 1 << (this.components.length);
      flags = flags | (1 << (idx * 1));

      return flags;
    }

    public RegisterComponent(comp: Component) {
      this.components.push(comp);
    }

    public RegisterSystem(sys: System) {
      sys.compFlags = this.GetCompiledFlags(sys.requiredComps);
      this.systems.push(sys);
    }

    public RegisterResource(res: Resource) {
      this.resources.push(res);
    }

    public RegisterEntity(ent: Entity) {
      const existingData = this.ents.find((dat: EntityData) => {
        return dat.ent == ent;
      });

      if (existingData) {
        existingData.componentFlags = this.GetCompiledFlags(ent.comps);
      } else {
        this.ents.push({
          ent,
          componentFlags: this.GetCompiledFlags(ent.comps),
        });
      }
    }

    private lastTick = Date.now();

    private _resCounter: number = 0;
    private _sysCounter: number = 0;
    private _now: number = 0;
    private _elapsed: number = 0;
    private _entCounter: number = 0;
    private _sys: System;
    private _dat: EntityData;
    public tick() {
      this._now = Date.now();
      this._elapsed = (this._now - this.lastTick);

      this._resCounter = 0;
      while (this._resCounter < this.resources.length) {
        this.resources[this._resCounter].BeforeSystemTick(this);
        this._resCounter++;
      }

      this._sysCounter = 0;
      // this._sysCounter %= this.systems.length;

      while (this._sysCounter < this.systems.length) {
        this._sys = this.systems[this._sysCounter];
        this._sys.BeforeTick();

        this._entCounter = 0;
        while (this._entCounter < this.ents.length) {
          this._dat = this.ents[this._entCounter];
          if (this._dat.componentFlags & this._sys.compFlags) {
            this._sys.EntityTick(this._dat.ent, this._elapsed);
          }
          this._entCounter++;
        }

        this._sys.AfterTick();
        this._sysCounter++;
      }


      // this._resCounter = 0;
      // while (this._resCounter < this.resources.length) {
      //   this.resources[this._resCounter].AfterSystemTick(this);
      //   this._resCounter++;
      // }

      this.lastTick = this._now;

      // setTimeout(this.tick, 0);
      requestAnimationFrame(this.tick);
    }
  }
}