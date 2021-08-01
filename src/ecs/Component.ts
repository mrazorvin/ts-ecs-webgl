import { Hash } from "./Hash";
import { Entity, ComponentsCollection, World } from "./World";

const container_class_cache: {
  [key: string]: ComponentsContainer;
} = {};

const register_class_cache: {
  [key: string]: ComponentsRegister;
} = {};

const ID_SEQ_START = -1;
export const COMPONENT_CONTAINER_SIZE = 8;

let global_id_seq = 0;
let last_container_row_id = ID_SEQ_START;
let last_storage_column_id = COMPONENT_CONTAINER_SIZE;

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
  static register_class: ComponentsRegister | undefined = undefined;

  constructor(...args: any[]) {}

  static get<T>(this: (new (...args: any[]) => T) & typeof IComponent, entity: Entity): T | undefined {
    return undefined;
  }

  static manager<T>(
    this: (new (...args: any[]) => T) & typeof IComponent,
    world: World
  ): {
    clear(entity: Entity): boolean;
    attach(entity: Entity, component: T): Entity;
  } {
    return null as any;
  }

  static clear_collection<T>(this: (new (...args: any[]) => T) & typeof IComponent, world: World): boolean {
    return false;
  }

  attach(world: World, entity: Entity): Entity {
    return entity;
  }
}

export function InitComponent() {
  if (last_storage_column_id >= COMPONENT_CONTAINER_SIZE) {
    last_container_row_id += 1;
    last_storage_column_id = 0;

    class ComponentsContainer {
      [key: string]: IComponent;
    }

    class ComponentsRegister {
      [key: string]: number;
    }

    container_class_cache[`_${last_container_row_id}`] = ComponentsContainer as any;

    register_class_cache[`_${last_container_row_id}`] = ComponentsRegister as any;
  } else {
    last_storage_column_id += 1;
  }

  const row_id = last_container_row_id;
  const column_id = last_storage_column_id;
  const id = global_id_seq++;

  // prettier-ignore
  class Component {
    static id = id;
    static storage_row_id = row_id;
    static container_column_id = column_id;
    static container_class = container_class_cache[`_${row_id}`];
    static register_class = register_class_cache[`_${row_id}`];

    constructor(...args: any[]) {}

    // real code will be injected after initialization
    static get = new Function(
      "entity",
      `return entity.components._${row_id} && entity.components._${row_id}._${column_id}`
    ) as typeof IComponent["get"];

    static manager = new Function("Component", "components", `return (world) => {
      const manager = world.get_collections("_${id}", components)._${id};
      if (manager.clear === undefined) {
        manager.clear = Component.clear;
        manager.attach = Component.attach;
      } 
      return manager;
    }`)(Component, [Component]) as typeof IComponent["manager"];;

    private static clear = new Function("entity", `
      // we must have this check, otherwise we might create property that we don't want on deletion 
      const container = entity.components._${row_id};
      if (container._${column_id} !== undefined && container._${column_id} !== null) {
        container._${column_id} = null;
        const register = entity.register._${row_id};
        const id = register?._${column_id};
        if (id !== undefined && id !== null) {
          register._${column_id} = null;
          this.size -= 1;
          var temp_entity = this.refs[this.size];
          temp_entity.register._${row_id}._${column_id} = id;
          this.refs[id] = temp_entity;
        }
      }

      return entity;
    `) 

    // if entity has single component, return entity to pool and   
    static clear_collection = new Function("world", `
      const collection = world.components.get(${id});
      if (collection === undefined) return false;
      const refs = collection.refs;
      for (let i = 0; i < collection.size; i++) {
        const entity = refs[i];
        entity.components._${row_id}._${column_id} = null;
        entity.register._${row_id}._${column_id} = null;
      }
      collection.size = 0;

      return true;
    `) as typeof IComponent["clear_collection"];

    private static attach = new Function(
      ...["RegisterClass", "ContainerClass", "ComponentsCollection"],
      `return function(entity, component) {
        var container = entity.components._${row_id};
        if (container === undefined) {
          container = new ContainerClass();
          container._${column_id} = component;
          entity.components._${row_id} = container;
          entity.hash = entity.hash.add(component.constructor);
        } else {
          var value = container._${column_id};
          container._${column_id} = component;
          if (value !== undefined && value !== null) {
            return entity;
          } else if (value === undefined) {
            entity.hash = entity.hash.add(component.constructor);
          }
        } 

        var id = (this.size += 1) - 1;
        this.refs[id] = entity;

        (entity.register._${row_id} || 
          (entity.register._${row_id} = new RegisterClass()) 
        )._${column_id} = id;

        return entity;
      }`
    )(register_class_cache[`_${row_id}`], 
      container_class_cache[`_${row_id}`],
      ComponentsCollection)
    
    attach(world: World, entity: Entity): Entity  {
      return Component.manager(world).attach(entity, this);
    }
  }

  const type_check: typeof IComponent = Component;
  noop(type_check);

  return Component;
}

const noop = (_: any) => _;

export const HASH_HEAD = new Hash<typeof IComponent>(IComponent, undefined);
