import { Hash } from "./Hash";
import { Entity, ComponentsCollection } from "./World";

const container_class_cache: {
  [key: string]: ComponentsContainer;
} = {};

const register_class_cache: {
  [key: string]: ComponentsRegister;
} = {};

const ID_SEQ_START = -1;
const CONTAINER_SIZE = 8;

let global_id_seq = 0;
let last_container_row_id = ID_SEQ_START;
let last_storage_column_id = CONTAINER_SIZE;

export enum ComponentTypeID {}

export interface ComponentsContainer {
  [key: string]: IComponent;
}

export interface ComponentsRegister {
  [key: string]: number;
}

// TODO: add component ot register
// TODO: remove single component code
// TODO: clear collection code
// TODO: hash-match code
// move to member of static class
export class IComponent {
  // TODO: we already has > 10 properties, new properties could cause slow down
  //       this mean that we must group methods like _add, _set... i.e non public method and properties in sub_container
  //       maybe it will easier to ini all components in some smart way, instead of live check if component is initialized
  //       for example instead of simple extends Component.Extends() we could call Extends(), and initialized ahead
  //       i.e get rid of init() calls
  static id = -Infinity as ComponentTypeID;
  static storage_row_id = ID_SEQ_START;
  static container_column_id = ID_SEQ_START;
  static container_class: ComponentsContainer | undefined = undefined;

  constructor(...args: any[]) {}

  static get<T>(
    this: (new (...args: any[]) => T) & typeof IComponent,
    entity: Entity
  ): T | undefined {
    return undefined;
  }

  static delete<T>(
    this: (new (...args: any[]) => T) & typeof IComponent,
    entity: Entity
  ): boolean {
    return false;
  }

  static set<T>(
    this: (new (...args: any[]) => T) & typeof IComponent,
    entity: Entity,
    component: T
  ): T {
    return component;
  }

  static add<T>(
    this: (new (...args: any[]) => T) & typeof IComponent,
    collection: ComponentsCollection,
    entity: T
  ): T {
    return entity;
  }
}

export function InitComponent() {
  if (last_storage_column_id >= CONTAINER_SIZE) {
    last_container_row_id += 1;
    last_storage_column_id = 0;

    class ComponentsContainer {
      [key: string]: IComponent;
    }

    class ComponentsRegister {
      [key: string]: number;
    }

    container_class_cache[
      `_${last_container_row_id}`
    ] = ComponentsContainer as any;

    register_class_cache[
      `_${last_container_row_id}`
    ] = ComponentsRegister as any;
  } else {
    last_storage_column_id += 1;
  }

  const row_id = last_container_row_id;
  const column_id = last_storage_column_id;

  // prettier-ignore
  class Component {
    static id = global_id_seq++;
    static storage_row_id = row_id;
    static container_column_id = column_id;
    static container_class = container_class_cache[`_${row_id}`];

    constructor(...args: any[]) {}

    // real code will be injected after initialization
    static get = new Function(
      "entity",
      `return entity.components._${row_id} && entity.components._${row_id}._${column_id}`
    ) as typeof IComponent["get"];

    static delete = new Function("collection", "entity", `
      const register = entity.registers._${column_id};
      const id = register._${row_id};
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
        register._${column_id} = null;
        return true;
      }
    `) as typeof IComponent["delete"];

    static set = new Function(
      ...["Component", "ContainerClass"],
          `return (entity, component) => {
        return (entity.components._${row_id} || 
          (entity.components._${row_id} = new ContainerClass()) 
        )._${column_id} = component
      }`
    )(Component, container_class_cache[`_${row_id}`]) as typeof IComponent["set"];

    static add = null as any as typeof IComponent["add"];
  }

  const type_check: typeof IComponent = Component;
  noop(type_check);

  return Component;
}

const noop = (_: any) => _;

export const HASH_HEAD = new Hash<typeof IComponent>(IComponent, undefined);
