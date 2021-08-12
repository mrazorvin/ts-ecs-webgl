import { ComponentFactory, InitComponent } from "../Component";

export class TestComponent0 extends InitComponent({ use_pool: 20 }) {
  private type = TestComponent0;
  static create = ComponentFactory(TestComponent0, () => new TestComponent0());
}

export class TestComponent1 extends InitComponent({ use_pool: 20 }) {
  private type = TestComponent1;
  static create = ComponentFactory(TestComponent1, () => new TestComponent1());
}

export class TestComponent2 extends InitComponent({ use_pool: 20 }) {
  private type = TestComponent2;
  static create = ComponentFactory(TestComponent2, () => new TestComponent2());
}

export class TestComponent3 extends InitComponent({ use_pool: 20 }) {
  private type = TestComponent3;
  static create = ComponentFactory(TestComponent3, () => new TestComponent3());
}

export class TestComponent4 extends InitComponent({ use_pool: 20 }) {
  private type = TestComponent4;
  static create = ComponentFactory(TestComponent4, () => new TestComponent4());
}

export class TestComponent5 extends InitComponent({ use_pool: 20 }) {
  private type = TestComponent5;
  static create = ComponentFactory(TestComponent5, () => new TestComponent5());
}

export class TestComponent6 extends InitComponent({ use_pool: 20 }) {
  private type = TestComponent6;
  static create = ComponentFactory(TestComponent6, () => new TestComponent6());
}

export class TestComponent7 extends InitComponent({ use_pool: 20 }) {
  private type = TestComponent7;
  static create = ComponentFactory(TestComponent7, () => new TestComponent7());
}

export class TestComponent8 extends InitComponent({ use_pool: 20 }) {
  private type = TestComponent8;
  static create = ComponentFactory(TestComponent8, () => new TestComponent8());
}

export class TestComponent9 extends InitComponent({ use_pool: 20 }) {
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
