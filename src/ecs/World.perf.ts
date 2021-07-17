import { Component, World } from "./World";

const world = new World();
const clases = [];
for (let i = 0; i < 5000; i++) {
  clases.push(class _c extends Component {});
  world.entity([new clases[clases.length - 1]()]);
}
class TestComponent extends Component {}
class TestComponent1 extends Component {}
class TestComponent2 extends Component {}
class TestComponent3 extends Component {}
class TestComponent4 extends Component {}
class TestComponent5 extends Component {}
class TestComponent6 extends Component {}
class TestComponent7 extends Component {}
class TestComponent8 extends Component {}

for (let i = 0; i < 40; i++) {
  for (let z = 0; z < 100; z++)
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
        .map((x, y) => new clases[y * x + i + z]()),
    ]);
}

const query = [
  TestComponent,
  TestComponent1,
  TestComponent2,
  TestComponent3,
  TestComponent4,
  TestComponent5,
  TestComponent6,
  TestComponent7,
];

query: {
  console.time("query");
  let y = [] as any;
  function x() {
    world.query(query, (entity, t1, t2, t3, t4) => {
      y[0] = t1;
      y[1] = t2;
      y[2] = t3;
      y[3] = entity;
      y[4] = y[4] != null ? y[4] + 1 : 0;
    });
  }

  for (let i = 0; i < 10; i++) {
    x();
  }

  console.log(y.map((x: any) => (x instanceof Object ? {} : x)));
  console.log(console.log(y[3].components));
  console.timeEnd("query");
}

console.time("manual-query");
let y = [] as any;

function x() {
  for (const ref of world.components.get(TestComponent1)!.refs) {
    if (ref.entity) {
      y[0] = TestComponent1.get(ref.entity);
      y[1] = TestComponent2.get(ref.entity);
      y[2] = TestComponent3.get(ref.entity);
      y[3] = TestComponent4.get(ref.entity);
      TestComponent5.get(ref.entity);
      TestComponent6.get(ref.entity);
      TestComponent7.get(ref.entity);
      TestComponent8.get(ref.entity);
      y[4] = y[4] != null ? y[4] + 1 : 0;
      if (!y[4]) continue;
    }
  }
}

for (let i = 0; i < 1000; i++) {
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
    for (const entity of world.components.get(TestComponent1)!.refs) {
      y[0] = y1.x();
      y[1] = y2.x();
      y[2] = y3.x();
      y[3] = y4.x();
      y[4] = y[4] != null ? y[4] + 1 : 0;
    }
  }

  for (let i = 0; i < 1000; i++) {
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
