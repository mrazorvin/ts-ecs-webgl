import { Component, ComponentTypeID } from "./World";

export interface HashValue<T extends number> {
  id: T;
}

export class Hash<T extends number = number> {
  value: HashValue<T>;
  prev: undefined | Hash<T>;
  possible_next: Map<T, Hash<T>>;

  static path_to_head: Array<HashValue<any>> = [];

  constructor(component_constructor: HashValue<T>, prev: Hash<T> | undefined) {
    this.value = component_constructor;
    this.prev = prev;
    this.possible_next = new Map();
  }

  add(value: HashValue<T>): Hash<T> {
    if (value === this.value) {
      return this;
    }

    if (this.value.id < value.id) {
      let tail_hash = this.possible_next.get(value.id);
      if (tail_hash === undefined) {
        tail_hash = new Hash(value, this);
        this.possible_next.set(value.id, tail_hash);
      }

      return tail_hash;
    } else {
      const path_to_head: Array<HashValue<T>> = Hash.path_to_head;
      let length = 0;
      let hash: Hash<T> | undefined = this;
      while (hash && hash.value.id > value.id) {
        path_to_head[length] = hash.value;
        length += 1;
        hash = hash.prev;
      }

      if (hash === undefined) {
        throw new Error(
          `[World -> ComponentsHash] provided value.id=${value.id} is less than hash root, this behavior currently not supported`
        );
      }
      let tail_hash = hash.possible_next.get(value.id);
      if (tail_hash === undefined) {
        tail_hash = new Hash(value, this);
        hash.possible_next.set(value.id, tail_hash);
      }

      for (let i = 0; i < length; i++) {
        const value = path_to_head[i];
        let next_tail = tail_hash.possible_next.get(value.id);
        if (next_tail === undefined) {
          next_tail = new Hash(value, tail_hash);
          tail_hash.possible_next.set(value.id, next_tail);
        }
        tail_hash = next_tail as Hash<T>;
      }

      return tail_hash;
    }
  }
}

export namespace Hash {
  export const get = (
    component_constructor: typeof Component,
    current_hash: Hash
  ) => {
    return current_hash.add(component_constructor);
  };
}

// components.hash
