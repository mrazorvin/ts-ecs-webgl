import { q, World } from "./World";
import { ComponentFactory, InitComponent } from "./Component";
import {
  TestComponent0,
  TestComponent1,
  TestComponent2,
  TestComponent3,
  TestComponent4,
  TestComponent5,
  TestComponent6,
  TestComponent7,
  TestComponent8,
} from "./world_spec/world_component_fixtures";

const world = new World();
// @ts-expect-error
const clases = [];
for (let i = 0; i < 6000; i++) {
  class _C extends InitComponent({ use_pool: false }) {
    static create = ComponentFactory(_C, () => new _C());
  }
  clases.push(_C);
  world.entity([clases[clases.length - 1]!.create(world)]);
}

for (let i = 0; i < 400; i++) {
  for (let z = 0; z < 5; z++)
    world.entity([
      TestComponent0.create(world),
      TestComponent1.create(world),
      TestComponent2.create(world),
      TestComponent3.create(world),
      TestComponent4.create(world),
      TestComponent5.create(world),
      TestComponent6.create(world),
      TestComponent7.create(world),
      ...Array(8)
        .fill(10)
        // @ts-expect-error
        .map((x, y) => clases[y * x + i + z].create(world)),
    ]);
}

query: {
  console.time("query");
  let y = [] as any;
  const query = {
    components: [
      TestComponent0,
      TestComponent1,
      TestComponent2,
      TestComponent3,
      TestComponent4,
      TestComponent5,
      TestComponent6,
      TestComponent7,
    ],
  } as const;

  for (let i = 0; i < 1000; i++) {
    q.run(world, query, (entity, t1, t2, t3, t4) => {
      y[0] = t1;
      y[1] = t2;
      y[2] = t3;
      y[3] = entity;
      y[4] = y[4] != null ? y[4] + 1 : 0;
    });
  }

  console.log(y.map((x: any) => (x instanceof Object ? {} : x)));
  console.log(console.log(y[3].components));
  console.timeEnd("query");
}

console.time("manual-query");
let y = [] as any;

function x() {
  for (const entity of world.components.get(TestComponent1.id)!.refs) {
    y[0] = TestComponent1.get(entity);
    y[1] = TestComponent2.get(entity);
    y[2] = TestComponent3.get(entity);
    y[3] = TestComponent4.get(entity);
    TestComponent5.get(entity);
    TestComponent6.get(entity);
    TestComponent7.get(entity);
    TestComponent8.get(entity);
    y[4] = y[4] != null ? y[4] + 1 : 0;
    if (!y[4]) continue;
  }
}

for (let i = 0; i < 10; i++) {
  x();
}

console.log(y.map((x: any) => (x instanceof Object ? {} : x)));
console.timeEnd("manual-query");

console.time("iteration-set");
iteration: {
  let y = [] as any;
  let result = {};
  let y1 = {
    x() {
      return result;
    },
  };
  let y2 = {
    x() {
      return result;
    },
  };
  let y3 = {
    x() {
      return result;
    },
  };
  let y4 = {
    x() {
      return result;
    },
  };

  function x() {
    for (const entity of world.components.get(TestComponent1.id)!.refs) {
      y[0] = y1.x();
      y[1] = y2.x();
      y[2] = y3.x();
      y[3] = y4.x();
      y[4] = y[4] != null ? y[4] + 1 : 0;
    }
  }

  for (let i = 0; i < 10; i++) {
    x();
  }

  console.log(y);
  console.timeEnd("iteration-set");
}

console.time("iteration");
iteration: {
  let y = [] as any;
  let result = {};
  let y1 = {
    x() {
      return result;
    },
  };
  let y2 = {
    x() {
      return result;
    },
  };
  let y3 = {
    x() {
      return result;
    },
  };
  let y4 = {
    x() {
      return result;
    },
  };

  function x() {
    y[0] = y1.x();
    y[1] = y2.x();
    y[2] = y3.x();
    y[3] = y4.x();
    y[4] = y[4] != null ? y[4] + 1 : 0;
  }

  for (let i = 0; i < 40000; i++) {
    x();
  }

  console.log(y);
  console.timeEnd("iteration");
}
