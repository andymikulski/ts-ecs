import { ECS } from './ECS';
import SpatialHash from './SpatialHash';

class Position extends ECS.Component {
  constructor(
    public x: number = 0,
    public y: number = 0) {
    super();
  }
}

class Spawner extends ECS.Component { }

class SpawningSys extends ECS.System {
  requiredComps = [Spawner];
  public EntityTick(ent: ECS.Entity, deltaMs: number) {

  }
}

class Velocity extends ECS.Component {
  public xVel: number = 0;
  public yVel: number = 0;
}

class Motion extends ECS.System {
  requiredComps = [Position, Velocity];


  private _pos: Position;
  private _vel: Velocity;
  public EntityTick(ent: ECS.Entity, deltaMs: number) {
    this._pos = <Position>ent.GetComponent(Position);
    this._vel = <Velocity>ent.GetComponent(Velocity);

    this._pos.x += this._vel.xVel * deltaMs;
    this._pos.y += this._vel.yVel * deltaMs;
  }
}

class GravityWell extends ECS.System {
  requiredComps = [Position, Velocity];

  private _pos: Position;
  private _vel: Velocity;

  private xMouse: number;
  private yMouse: number;

  public BeforeTick() {
    this.xMouse = MouseResource.Instance.xMouse;
    this.yMouse = MouseResource.Instance.yMouse;
  }

  public EntityTick(ent: ECS.Entity, deltaMs: number) {
    this._pos = <Position>ent.GetComponent(Position);
    this._vel = <Velocity>ent.GetComponent(Velocity);

    this._vel.xVel += ((this.xMouse - this._pos.x) / 10000) * deltaMs;
    this._vel.yVel += ((this.yMouse - this._pos.y) / 10000) * deltaMs;
  }
}


interface SpeciesType {
  Update(pos: Position): void;
  GetColor(): string;
}

class Species extends ECS.Component {
  constructor(public type: SpeciesType) {
    super();
  }
}

class Sand implements SpeciesType {

  private color = ['#F4A460', '#E1A95F', '#C2B280', '#C19A6B'][Math.floor(4 * Math.random())];

  public GetColor() {
    return this.color;
  }

  public Update(pos: Position) {
    const bottomNeighbor = SpaceResource.Instance.GetCell(pos.x, pos.y + 1);
    const botSpecies = bottomNeighbor && <Species>bottomNeighbor.GetComponent(Species);
    if (bottomNeighbor == null) {
      pos.y += 1;
    } else if (botSpecies.type instanceof Water) {
      SpaceResource.Instance.Swap(pos.x, pos.y, pos.x, pos.y + 1);
      (<Position>bottomNeighbor.GetComponent(Position)).y -= 1;
      pos.y += 1;
    } else {
      let hasMoved = false;
      let diagNeighbor: ECS.Entity;
      if (Math.random() > 0.5) {
        diagNeighbor = SpaceResource.Instance.GetCell(pos.x + 1, pos.y + 1);
        if (diagNeighbor == null) {
          pos.x += 1;
          pos.y += 1;
          hasMoved = true;
        }
      } else {
        diagNeighbor = SpaceResource.Instance.GetCell(pos.x - 1, pos.y + 1);
        if (diagNeighbor == null) {
          pos.x -= 1;
          pos.y += 1;
          hasMoved = true;
        }
      }

      // if (!hasMoved) {
      //   pos.x += Math.random() > 0.5 ? 1 : -1;
      // }
      if (pos.y >= 599) {
        pos.y = 599 - 1;
        return;
      }
    }
  }
}

class Water implements SpeciesType {

  public GetColor() {
    return '#00f';
  }
  public Update(pos: Position) {
    const bottomNeighbor = SpaceResource.Instance.GetCell(pos.x, pos.y + 1);
    if (bottomNeighbor == null) {
      pos.y += 1;
    } else {
      let hasMoved = false;
      let diagNeighbor: ECS.Entity;

      const first = Math.random() > 0.5 ? 1 : -1;
      if (SpaceResource.Instance.GetCell(pos.x + first, pos.y + 1) == null) {
        pos.x += first;
        pos.y += 1;
        hasMoved = true;
      } else if (SpaceResource.Instance.GetCell(pos.x - first, pos.y + 1) == null) {
        pos.x -= first;
        pos.y += 1;
        hasMoved = true;
      }
      // if (Math.random() > 0.5) {
      //   diagNeighbor = SpaceResource.Instance.GetCell(pos.x + 1, pos.y + 1);
      //   if (diagNeighbor == null) {
      //     pos.x += 1;
      //     pos.y += 1;
      //     hasMoved = true;
      //   }
      // } else {
      //   diagNeighbor = SpaceResource.Instance.GetCell(pos.x - 1, pos.y + 1);
      //   if (diagNeighbor == null) {
      //     pos.x -= 1;
      //     pos.y += 1;
      //     hasMoved = true;
      //   }
      // }

      if (!hasMoved) {
        const first = Math.random() > 0.5 ? 1 : -1;
        if (SpaceResource.Instance.GetCell(pos.x + first, pos.y) == null) {
          pos.x += first;
        } else if (SpaceResource.Instance.GetCell(pos.x - first, pos.y) == null) {
          pos.x -= first;
        }
      }
      // if (pos.y >= 599) {
      //   pos.y = 599 - 1;
      //   return;
      // }
    }
  }
}

class CellularAutomata extends ECS.System {
  requiredComps = [Position, Species];

  public EntityTick(ent: ECS.Entity, deltaMs: number) {
    const pos = <Position>ent.GetComponent(Position);
    const spec = <Species>ent.GetComponent(Species);

    spec.type.Update(pos);
  }
}


class SpaceHashResource extends ECS.Resource {

  public static Instance: SpaceHashResource;
  public hash: SpatialHash = new SpatialHash();
  public Query(x: number, y: number): ECS.Entity[] {
    return this.hash.Query(x, y);
  }

  constructor() {
    super();
    SpaceHashResource.Instance = this;
  }


  public BeforeSystemTick(uni: ECS.Universe) {
    this.hash.Clear();

    let i = 0;
    const posComponentFlag = uni.GetComponentFlag(Position);
    while (i < uni.ents.length) {
      if (uni.ents[i].componentFlags & posComponentFlag) {
        const pos = <Position>uni.ents[i].ent.GetComponent(Position);
        this.hash.Add(uni.ents[i].ent, pos.x, pos.y);
      }
      i++;
    }
  }
}

class SpaceResource extends ECS.Resource {

  public static Instance: SpaceResource;

  private world: ECS.Entity[] = [];

  constructor() {
    super();
    SpaceResource.Instance = this;
  }

  private nullCell: ECS.Entity = new ECS.Entity();
  public GetCell(x: number, y: number): ECS.Entity {
    if (x < 0 || x > 800 || y < 0 || y > 600) {
      return this.nullCell;
    }
    return this.world[SpaceResource.GetIndexForPos(x, y)] || null;
  }

  public Swap(fromX: number, fromY: number, toX: number, toY: number) {
    const idx1 = fromX + (fromY * 400);
    const idx2 = toX + (toY * 400);

    const temp = this.world[idx1];
    this.world[idx1] = this.world[idx2];
    this.world[idx2] = temp;
  }

  public Query(x: number, y: number, range: number = 2): ECS.Entity[] {
    let list: ECS.Entity[] = [];

    for (let nX = x - range; nX < x + range; nX++) {
      for (let nY = y - range; nY < y + range; nY++) {
        list.push(this.GetCell(nX, nY));
      }
    }

    return list;
  }

  private static GetIndexForPos(x: number, y: number): number {
    return x + (y * 400);
  }

  public BeforeSystemTick(uni: ECS.Universe) {
    for (let x = 0; x < 800; x++) {
      for (let y = 0; y < 600; y++) {
        this.world[x + (y * 400)] = null;
      }
    }

    let i = 0;
    const posComponentFlag = uni.GetComponentFlag(Position);
    while (i < uni.ents.length) {
      if (uni.ents[i].componentFlags & posComponentFlag) {
        const pos = <Position>uni.ents[i].ent.GetComponent(Position);

        this.world[pos.x + (pos.y * 400)] = uni.ents[i].ent;
      }
      i++;
    }
  }
}

class MouseResource extends ECS.Resource {
  public static Instance: MouseResource;

  public xMouse: number = 0;
  public yMouse: number = 0;

  constructor() {
    super();
    MouseResource.Instance = this;

    window.addEventListener('mousemove', (evt: MouseEvent) => {
      this.xMouse = evt.clientX;
      this.yMouse = evt.clientY;
    });
  }
}


class Display extends ECS.System {
  requiredComps = [Position, Species];
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;


  constructor() {
    super();

    this.canvas = document.createElement('canvas');
    this.canvas.height = 600;
    this.canvas.width = 800;
    this.context = this.canvas.getContext('2d');

    document.body.appendChild(this.canvas);
  }

  public BeforeTick() {
    this.context.clearRect(0, 0, 800, 600);
    // this.context.beginPath();
  }

  private _pos: Position;
  private _spec: Species;

  public EntityTick(ent: ECS.Entity, deltaMs: number) {
    // console.log('updating entity..');
    this._pos = <Position>ent.GetComponent(Position);
    this._spec = <Species>ent.GetComponent(Species);

    this.context.strokeStyle = this._spec.type.GetColor();// instanceof Water ? '#00f' : '#EDC9AF';
    this.context.strokeRect(this._pos.x, this._pos.y, 1, 1);
  }

  public AfterTick() {
    // this.context.closePath();
    // this.context.stroke();
  }
}

class Boundary extends ECS.System {
  requiredComps = [Position];

  private _pos: Position;
  // private _vel: Velocity;
  public EntityTick(ent: ECS.Entity, deltaMs: number) {
    this._pos = <Position>ent.GetComponent(Position);
    // this._vel = <Velocity>ent.GetComponent(Velocity);

    if (this._pos.x >= 800 || this._pos.x < 0) {
      if (this._pos.x < 0) {
        this._pos.x = 1;
      } else {
        this._pos.x = 800 - 1;
      }
      // this._vel.xVel *= -1;
    }

    if (this._pos.y >= 600 || this._pos.y < 0) {
      if (this._pos.y < 0) {
        this._pos.y = 1;
      } else {
        this._pos.y = 600 - 1;
      }
      // this._vel.yVel *= -1;
    }
  }
}

function main() {
  console.log('Main..');
  const universe = new ECS.Universe();

  console.log('Registering components..');
  universe.RegisterComponent(Position);
  universe.RegisterComponent(Species);
  // universe.RegisterComponent(Velocity);

  console.log('Registering system..');
  universe.RegisterSystem(new Display());
  universe.RegisterSystem(new CellularAutomata());
  // universe.RegisterSystem(new GravityWell());
  universe.RegisterSystem(new Boundary());
  // universe.RegisterSystem(new Motion());

  console.log('Registering resources..');
  // universe.RegisterResource(new MouseResource());
  universe.RegisterResource(new SpaceResource());

  console.log('Creating entity with position/velocity..');


  const entCount = 5000;
  console.log(`Registering ${entCount} entities..`);
  let velCmp: Velocity;

  for (let i = 0; i < entCount; i++) {
    const ent = (new ECS.Entity())
      .AddComponent(new Position(200 + Math.round(50 * Math.random()), Math.round((i < entCount * 0.9 ? 600 : 200) * Math.random())))
      .AddComponent(new Species(new Water())) // i < entCount * 0.9 ? new Sand() : new Water()))
      .AddComponent(new Velocity());

    // velCmp = (<Velocity>ent.GetComponent(Velocity));
    // velCmp.xVel = Math.random() * 2;
    // velCmp.yVel = Math.random() * 2;


    universe.RegisterEntity(ent);
  }

  console.log('Ticking..');
  universe.tick();
}


setTimeout(() => {
  main();
}, 500);