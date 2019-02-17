import { ECS, EntityID } from './ECS';

class VoteCollection extends ECS.Component {
  public score: number;
  public votes: Vote[];
}

class Vote extends ECS.Component {
  public baseValue: number;
  public currentValue: number;
  public submission: EntityID;

  constructor(value: number) {
    super();
    this.baseValue = value;
    this.currentValue = value;
  }
}

class VoteDecay extends ECS.Component {
  constructor(public decayRate: number = 0.0001) {
    super();
  }
}

class Decay extends ECS.System {
  requiredComps = [Vote, VoteDecay];

  public EntityTick(ent: ECS.Entity, deltaMs: number) {
    const vote = <Vote>ent.GetComponent(Vote);
    const voteDecay = <VoteDecay>ent.GetComponent(VoteDecay);
    vote.currentValue = Math.max(0, vote.currentValue - (voteDecay.decayRate * deltaMs));
  }
}


class SubmissionScores extends ECS.System {
  requiredComps = [VoteCollection];

  public EntityTick(ent: ECS.Entity, deltaMs: number) {
    const col = <VoteCollection>ent.GetComponent(VoteCollection);

    let i = 0;
    let total = 0;
    while (i < col.votes.length) {
      total += col.votes[i].currentValue;
      i++;
    }

    col.score = total;
  }
}


function main() {
  console.log('Main..');
  const universe = new ECS.Universe();

  console.log('Registering components..');
  universe.RegisterComponent(Vote);
  universe.RegisterComponent(VoteCollection);
  universe.RegisterComponent(VoteDecay);

  console.log('Registering system..');
  universe.RegisterSystem(new Decay());
  universe.RegisterSystem(new SubmissionScores());

  const entCount = 1000000;
  console.log(`Registering ${entCount} entities..`);
  for (let i = 0; i < entCount; i++) {
    const ent = (new ECS.Entity())
      .AddComponent(new Vote(100))
      .AddComponent(new VoteDecay());

    (<Vote>ent.GetComponent(Vote)).baseValue = 100;

    universe.RegisterEntity(ent);
  }

  const test = () => {

    setTimeout(test, 5000 * Math.random());
  };

  setTimeout(test, 5000);

  console.log('Ticking..');
  universe.tick();
}


main();