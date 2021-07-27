import { Hash } from "./Hash";
import { Entity, ComponentsCollection } from "./World";

const ID_SEQ_START = -1;
const CONTAINER_SIZE = 8;

export enum ComponentTypeID {}
export interface ComponentsContainer {
  components(fn: (component: Component) => void): void;
  [key: string]: Component;
}
export interface ComponentsRegister {
  [key: string]: number;
}

// move to member of static class
let global_id = 0;
export abstract class Component {
  // TODO: we already has > 10 properties, new properties could cause slow down
  //       this mean that we must group methods like _add, _set... i.e non public method and properties in sub_container
  //       maybe it will easier to ini all components in some smart way, instead of live check if component is initialized
  //       for example instead of simple extends Component we could call Extends(), and initialized ahead
  //       i.e get rid of init() calls
  static id: number;

  constructor(...args: any[]) {}

  // real code will be injected after initialization
  static get<T>(
    this: (new (...args: any[]) => T) & typeof Component,
    entity: Entity
  ): T | undefined {
    return undefined;
  }

  // real code will be injected after initialization
  // TODO
  static delete<T>(
    this: (new (...args: any[]) => T) & typeof Component,
    entity: Entity
  ): boolean {
    return false;
  }

  // real code will be injected after initialization
  private static _set<T>(
    this: (new (...args: any[]) => T) & typeof Component,
    entity: Entity,
    component: T
  ): T {
    return component;
  }

  private static _add<T>(
    this: (new (...args: any[]) => T) & typeof Component,
    collection: ComponentsCollection,
    entity: T
  ): T {
    return entity;
  }

  static set<T>(
    this: (new (...args: any[]) => T) & typeof Component,
    entity: Entity,
    component: T
  ): T {
    this.init();
    return this._set(entity, component);
  }

  static add<T>(
    this: (new (...args: any[]) => T) & typeof Component,
    collection: ComponentsCollection,
    entity: T
  ): T {
    this.init();
    return this._add(collection, entity);
  }

  static container_class: undefined | ComponentsContainer;
  static storage_row_id = ID_SEQ_START;
  static container_column_id = ID_SEQ_START;
  static init() {
    if (
      this.container_column_id === ID_SEQ_START ||
      this.storage_row_id === ID_SEQ_START
    ) {
      this.id = global_id++;

      if (Component.last_container_column_id >= CONTAINER_SIZE) {
        Component.last_container_row_id += 1;
        Component.last_container_column_id = 0;
        class ComponentsContainer {
          [key: string]: Component;
        }
        class ComponentsRegister {
          [key: string]: number;
        }
        Component.container_class_cache[
          `_${Component.last_container_row_id}`
        ] = ComponentsContainer as any;
        Component.register_class_cache[
          `_${Component.last_container_row_id}`
        ] = ComponentsRegister as any;
        const vars = Array(CONTAINER_SIZE)
          .fill(null)
          .map((_, i) => `c${i}`);
        ComponentsContainer.prototype["components"] = new Function(
          "fn",
          `
            ${vars
              .map(
                (v, i) => `
                  const ${v} = this._${i};
                  if (${v}) fn(${v});
                `
              )
              .join("\n")}
          `
        );
      } else {
        Component.last_container_column_id += 1;
      }

      this.storage_row_id = Component.last_container_row_id;
      this.container_column_id = Component.last_container_column_id;
      this.container_class =
        Component.container_class_cache[`_${this.storage_row_id}`];

      this.get = new Function(
        "entity",
        `return entity.components._${this.storage_row_id} && entity.components._${this.storage_row_id}._${this.container_column_id}`
      ) as typeof this.get;

      // TODO: Not implemented
      this.delete = new Function(
        "collection",
        "entity",
        `
          const register = entity.registers._${this.storage_row_id};
          const id = register._${this.container_column_id};
          if (register == null || id == null)  {
            return false;
          }
          else {
            let last_element = collection.pop();
            if (last_element?.ref === undefined) {
              // we need to iter only until key, then we could stope
              for (let i = collection.length - 1; i >= 0; i--) 
                if ((last_element = collection[i])?.ref) break;
            }
            register._${this.container_column_id} = null;
            return true;
          }`
      ) as typeof this.delete;

      this._set = new Function(
        ...["Component", "ContainerClass"],
        `return (entity, component) => {
          return (entity.components._${this.storage_row_id} || 
            (entity.components._${this.storage_row_id} = new ContainerClass()) 
          )._${this.container_column_id} = component
        }`
      )(Component, this.container_class) as typeof this.set;
    }
  }
}

export namespace Component {
  export let last_container_row_id = ID_SEQ_START;
  export let last_container_column_id = CONTAINER_SIZE;

  export const container_class_cache: {
    [key: string]: ComponentsContainer;
  } = {};

  export const register_class_cache: {
    [key: string]: ComponentsRegister;
  } = {};
}

export const HASH_HEAD = new Hash<typeof Component>(Component, undefined);
