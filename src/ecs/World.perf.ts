import { $, World } from "./World";
import { InitComponent } from "./Component";

const world = new World();
// @ts-expect-error
const clases = [];
for (let i = 0; i < 6000; i++) {
  clases.push(class _c extends InitComponent() {});
  world.entity([new clases[clases.length - 1]!()]);
}
class TestComponent extends InitComponent() {}
class TestComponent1 extends InitComponent() {}
class TestComponent2 extends InitComponent() {}
class TestComponent3 extends InitComponent() {}
class TestComponent4 extends InitComponent() {}
class TestComponent5 extends InitComponent() {}
class TestComponent6 extends InitComponent() {}
class TestComponent7 extends InitComponent() {}
class TestComponent8 extends InitComponent() {}

for (let i = 0; i < 400; i++) {
  for (let z = 0; z < 5; z++)
    world.entity([
      new TestComponent(),
      new TestComponent1(),
      new TestComponent2(),
      new TestComponent3(),
      new TestComponent4(),
      new TestComponent5(),
      new TestComponent6(),
      new TestComponent7(),
      ...Array(8)
        .fill(10)
        // @ts-expect-error
        .map((x, y) => new clases[y * x + i + z]()),
    ]);
}

query: {
  console.time("query");
  let y = [] as any;

  for (let i = 0; i < 1000; i++) {
    // prettier-ignore
    const query =  $("fn") ?? $("fn", (create) => class {
      constructor(public y: any[]) {}
      query = create(
        [
          TestComponent,
          TestComponent1,
          TestComponent2,
          TestComponent3,
          TestComponent4,
          TestComponent5,
          TestComponent6,
          TestComponent7,
        ],
        (entity, t1, t2, t3, t4) => {
          this.y[0] = t1;
          this.y[1] = t2;
          this.y[2] = t3;
          this.y[3] = entity;
          this.y[4] = this.y[4] != null ? this.y[4] + 1 : 0;
        }
      )
    });

    world.query(query.prep(y));
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
