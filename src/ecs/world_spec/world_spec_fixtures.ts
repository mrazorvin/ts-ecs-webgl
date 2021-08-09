import { ComponentFactory } from "../Component";
import { InitComponent, Resource } from "../World";

export class TestResource0 extends Resource {
  private type = TestResource0;
}

export class TestResource1 extends Resource {
  private type = TestResource1;
}
export class TestResource2 extends Resource {
  private type = TestResource2;
}
export class TestResource3 extends Resource {
  private type = TestResource3;
}
export class TestResource4 extends Resource {
  private type = TestResource4;
}
export class TestResource5 extends Resource {
  private type = TestResource5;
}
export class TestResource6 extends Resource {
  private type = TestResource6;
}
export class TestResource7 extends Resource {
  private type = TestResource7;
}
export class TestResource8 extends Resource {
  private type = TestResource8;
}
export class TestResource9 extends Resource {
  private type = TestResource9;
}

export class TestComponent0 extends InitComponent() {
  private type = TestComponent0;
  static create = ComponentFactory(TestComponent0, () => new TestComponent0());
}

export class TestComponent1 extends InitComponent() {
  private type = TestComponent1;
  static create = ComponentFactory(TestComponent1, () => new TestComponent1());
}

export class TestComponent2 extends InitComponent() {
  private type = TestComponent2;
  static create = ComponentFactory(TestComponent2, () => new TestComponent2());
}

export class TestComponent3 extends InitComponent() {
  private type = TestComponent3;
  static create = ComponentFactory(TestComponent3, () => new TestComponent3());
}

export class TestComponent4 extends InitComponent() {
  private type = TestComponent4;
  static create = ComponentFactory(TestComponent4, () => new TestComponent4());
}

export class TestComponent5 extends InitComponent() {
  private type = TestComponent5;
  static create = ComponentFactory(TestComponent5, () => new TestComponent5());
}

export class TestComponent6 extends InitComponent() {
  private type = TestComponent6;
  static create = ComponentFactory(TestComponent6, () => new TestComponent6());
}

export class TestComponent7 extends InitComponent() {
  private type = TestComponent7;
  static create = ComponentFactory(TestComponent7, () => new TestComponent7());
}

export class TestComponent8 extends InitComponent() {
  private type = TestComponent8;
  static create = ComponentFactory(TestComponent8, () => new TestComponent8());
}

export class TestComponent9 extends InitComponent() {
  private type = TestComponent9;
  static create = ComponentFactory(TestComponent9, () => new TestComponent9());
}

export const test_components = [
  TestComponent1,
  TestComponent2,
  TestComponent3,
  TestComponent4,
  TestComponent5,
  TestComponent6,
  TestComponent7,
  TestComponent8,
  TestComponent9,
];
