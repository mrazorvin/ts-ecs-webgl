import { InitComponent, IComponent, ComponentsContainer, ComponentsRegister, HASH_HEAD, ComponentTypeID } from "./Component";
import { DeleteEntity } from "./DeleteEntity";
import { Hash } from "./Hash";
import { EntityPool } from "./Pool";
import { Query } from "./Query";
import { SubWorld } from "./SubWorld";

export const ID_SEQ_START = -1;
export const CONTAINER_SIZE = 8; // TODO: set to 32 after normalizing container locations

export enum ResourceID {}
export class Entity<W extends World | undefined =  undefined> {
  // IMPORTANT: don't add more than 12 properties, otherwise V8 will use for this object dictionary mode.
  //            this also mean that you not allow to add more properties to entity instance
  components: { [key: string]: ComponentsContainer };
  register: { [key: string]: ComponentsRegister };
  hash: Hash<typeof IComponent>;
  pool: EntityPool<[]> | undefined;
  ref: EntityRef;
  world: W;

  constructor(world: W) {
    this.components = {};
    this.register = {};
    this.ref = new EntityRef(this);
    this.pool = undefined;
    this.hash = HASH_HEAD;
    this.world = world;
  }
}

export class EntityRef {
  entity: Entity<World | undefined> | undefined;
  constructor(entity?: Entity<World | undefined>) {
    this.entity = entity;
  }
}

export abstract class Resource {
  constructor(...args: any[]) {}

  // real code will be injected after initialization
  static get<T>(
    this: (new (...args: any[]) => T) & typeof Resource,
    world: World
  ): T | undefined {
    return undefined as T | undefined;
  }

  // real code will be injected after initialization
  private static _set(world: World, resource: Resource): Resource {
    return resource;
  }

  static set(world: World, resource: Resource) {
    this.init();
    return this._set(world, resource);
  }

  // it' possible that we also need normalization here
  // but because there less resources than components
  // we could just switch to array [{resource id}, {resource id}]
  static storage_row_id = ID_SEQ_START;
  static container_column_id = ID_SEQ_START;
  static init() {
    if (
      this.container_column_id === ID_SEQ_START ||
      this.storage_row_id === ID_SEQ_START
    ) {
      if (Resource.last_container_column_id >= CONTAINER_SIZE) {
        Resource.last_container_row_id += 1;
        Resource.last_container_column_id = 0;
        Resource.container_class_cache[
          `_${Resource.last_container_row_id}`
        ] = class ResourceContainer {
          [key: string]: Resource;
        };
      } else {
        Resource.last_container_column_id += 1;
      }

      this.storage_row_id = Resource.last_container_row_id;
      this.container_column_id = Resource.last_container_column_id;

      this.get = new Function(
        "world",
        `return world.resources[${this.storage_row_id}] && world.resources[${this.storage_row_id}]._${this.container_column_id}`
      ) as typeof this.get;

      this._set = new Function(
        "Resource",
        `return (world, resource) => {
          return (world.resources[${this.storage_row_id}] || 
            (world.resources[${this.storage_row_id}] = new Resource.container_class_cache._${this.storage_row_id}()) 
          )._${this.container_column_id} = resource
        }`
      )(Resource) as typeof this.set;
    }
  }

  // this property exists, to disable using other classes instead of resource in type interference
  name() {}
}

export namespace Resource {
  export let last_container_row_id = ID_SEQ_START;
  export let last_container_column_id = CONTAINER_SIZE;
  export const container_class_cache: {
    [key: string]: new (...args: any) => { [key: string]: Resource };
  } = {};
}

export class ComponentsCollection {
  refs: Entity[];
  pool: IComponent[];
  max_pool_size: number;
  size: number;

  constructor() {
    this.refs = [];
    this.pool = [];
    this.size = 0;
    this.max_pool_size = 20;
  }

  pool_push(component: IComponent) {
    if (this.pool.length < this.max_pool_size) this.pool.push(component);     
  }
}

export class World {
  components: Map<ComponentTypeID, ComponentsCollection>;
  collection_cache: Map<string, { [key: string]: ComponentsCollection}>; 
  resources: Array<{ [key: string]: Resource }>;
  systems: System[];
  systems_once: System[];
  on_tick_end: Array<() => void>;

  constructor() {
    this.components = new Map();
    this.collection_cache = new Map();
    this.resources = [];
    this.systems = [];
    this.systems_once = [];
    this.on_tick_end = [];
  }

  clear(fn: <T extends any>(pre_world: World, next_resource: T) => any) {
    // select on resources that needed be cleared in fn
    // clear features 
    // clear systems_once
    // left systems, but mark them as non indexed
    // for all collections, move all component to second cache
  }

  query(query: Query.Prepared) {
    inject_entity_and_component(this, query.components, query.cb as any);
  }

  system(system: System) {
    this.on_tick_end.push(() => this.systems.push(system));
  }

  system_once(system: System) {
    this.on_tick_end.push(() => this.systems_once.push(system));
  }

  resource(resource: Resource) {
    const Constructor = (resource.constructor as unknown) as typeof Resource;
    Constructor.set(this, resource);
  }

  entity<W extends World | undefined>(components: IComponent[]): Entity<undefined>; 
  entity<W extends World | undefined>(components: IComponent[], world?: W): Entity<W> {
    const entity = new Entity(world!);

    if (world !== undefined) {
      SubWorld.instance.attach(world, entity);
    }

    for (const component of components) {
      component.attach(this, entity);
    }

    return entity;
  }

  delete_entity(entity: Entity) {
    DeleteEntity.delete(this, entity);
  }

  get_collections(hash: string, components: Array<typeof IComponent>) {
    let collections = this.collection_cache.get(hash);
    if (collections === undefined) {
      collections = {};
      for (const component of components) {
        let collection = this.components.get(component.id);
        if (collection === undefined) {
          collection = new ComponentsCollection();
          this.components.set(component.id, collection)
        } 
        collections[`_${component.id}`] = collection;
      }
      this.collection_cache.set(hash, collections);
    } 

    return collections;
  }
}

export interface Queries {
  [key: string]: Query 
}

export abstract class System<R extends Resource[] = Resource[]> {
  abstract dependencies: {
    [K in keyof R]: (new (...args: any[]) => R[K]) & typeof Resource;
  };
  queries: Queries;
  abstract exec(world: World, ...resources: R): void;
  constructor(...args: any[]) {
    this.queries = {};
  }
}

let GLOBAL_QUERIES: Queries = {};
let QUERIES: Queries = GLOBAL_QUERIES;

export const $ = (function $(name: string, query?: (factory: typeof Query.Factory) => typeof Query) {
  return query === undefined ? QUERIES[name] : (QUERIES[name] = Query.Constructor(query(Query.Factory)));
} as unknown as Query.$)

export abstract class BaseScheduler {
  constructor(public world: World) {}

  abstract start(): void;

  tick() {
    for (let i = 0; i < this.world.systems.length; i++) {
      const system = this.world.systems[i]!;
      QUERIES = system.queries;
      inject_resources_and_sub_world(this.world, system);
    }

    if (this.world.systems_once.length > 0) {
      this.world.systems_once = this.world.systems_once.filter(
        (system) => {
          QUERIES = system.queries;
          return !inject_resources_and_sub_world(this.world, system);
        }
      );
    }

    QUERIES = GLOBAL_QUERIES;

    if (this.world.on_tick_end.length > 0) {
      for (const fn of this.world.on_tick_end) {
        fn();
      }
      this.world.on_tick_end = [];
    }

  }
}

export class Scheduler extends BaseScheduler {
  timeout = setTimeout(() => null);
  interval = 8;

  start() {
    this.timeout = setTimeout(this.execute, this.interval);
  }

  execute = () => {
    this.stop();
    this.tick();
    this.start();
  };

  stop() {
    clearTimeout(this.timeout);
  }
}

export class LoopInfo extends Resource {
  constructor(public time_delta: number) {
    super();
  }
}

let sec = 0;

export class RafScheduler extends Scheduler {
  raf = requestAnimationFrame(() => null);
  ms_last_frame = 0;
  current_fps = 0;
  info = new LoopInfo(0);

  override start = () => {
    this.world.resource(this.info);
    this.raf = requestAnimationFrame(this.execute);
  };

  override execute = () => {
    const ms_now = performance.now();
    const ms_delta = (ms_now - this.ms_last_frame) / 1000;

    this.current_fps = Math.floor(1 / ms_delta);
    this.ms_last_frame = ms_now;

    // loop info actualization must be part of behavior contract
    // we could pas 1 / {ms_delta} to show user how fractional of second left
    // from the previous second
    this.info.time_delta = ms_delta;
    sec += ms_delta;

    if (sec >= 1) {
      console.time("tick")
    }

    this.tick();
    this.start();

    if (sec >= 1) {
      console.timeEnd("tick")
      sec = 0;
    }
  };

  override stop() {
    cancelAnimationFrame(this.raf);
  }
}

const resource_injector_variables = Array(9)
  .fill(0)
  .map((_, i) => `_${i}`);

// it's possible to generate more optimized code
const resource_injector = new Function("world", "system", `
    switch (system.dependencies.length) {
      ${resource_injector_variables
        .map((_, i) => {
          return `
            case ${i}: {
           ${resource_injector_variables
             .slice(0, i)
             .map(
               (v, i) => ` 
                const ${v} = system.dependencies[${i}].get(world);
                if (!${v}) return false;`
             )
             .join("\n")}

            system.exec(${["world"]
              .concat(resource_injector_variables.slice(0, i))
              .join(",")});
            return true;
        }`;
        })
        .join("\n")}
      default: {
        throw new Error("Can't inject more than 9 resource");
      }
    }
`);


function inject_resources_and_sub_world(world: World, system: System) {
  return resource_injector(world, system);
}

const noop = () => void 0;

// TODO: refactor names
class Cacher {
  static storage = new Map<string, Function>();
  static get_func(components: Array<typeof IComponent>) {
    let id = "";
    for (const component of components) {
      id += `_${component.id}`;
    }
    let fn = this.storage.get(id);
    if (fn === undefined) {
      const body = `return (world, fn) => {
        const collections = world.get_collections("${id}", components);
        let size = Infinity;
        let components_collection;
        ${components.map(({ id }) => `
          if (collections._${id}.size < size) {
            size = collections._${id}.size;
            components_collection = collections._${id}.refs;
          }
        `).join("\n")}; 
      

        for (let i = 0; i < size; i++) {
          const entity = components_collection[i];
          const e_components = entity.components;
          ${[...new Set(components.map((v) => v.storage_row_id))]
            .map(
              (id) => `
              const __${id} = e_components._${id}
              ${components
                .filter((v) => v.storage_row_id === id)
                .map(
                  (v) =>
                    `const _${v.id} = __${v.storage_row_id}?._${v.container_column_id};
                    if (_${v.id} === undefined || _${v.id} === null) continue;`
                )
                .join("\n")}
              `
            )
            .join(";")}
        
            fn(${["entity"]
              .concat(components.map(({ id }) => `_${id}`))
              .join(",")});
        }
      }`;
      fn = new Function("components", body)(components);


      this.storage.set(id, fn!);
    }

    return fn!;
  }
}

// TODO: think about logging / statistic in development mode
//       for actions like add / remove resource, entity
//       without browser blocking
//       we could grab some statics like total entity/ resource iteration
//       tunning time time, unsed systems simple counters, which could be eliminated in production mode
//        on other side we want to log as possible user actions
//        like user do -thin and user do that
//        move this info to trello

function inject_entity_and_component(
  world: World,
  components: Array<typeof IComponent>,
  fn: (entity: Entity, ...components: IComponent[]) => void
) {
  const inject = Cacher.get_func(components)!;


  return inject(world, fn);
}

export class DynamicSystem extends System {
  public dependencies: System["dependencies"];
  public exec: System["exec"];

  constructor(dependencies: System["dependencies"], exec: System["exec"]) {
    super();

    this.dependencies = dependencies;
    this.exec = exec;
  }
}

export function sys<T extends Array<new (...args: any[]) => Resource>>(
  args: [...T],
  fn: (
    world: World,
    ...args: {
      [K in keyof T]: T[K] extends new (...args: any[]) => infer A ? A : void;
    }
  ) => void
) {
  return new DynamicSystem(args as any, fn);
}

export { EntityPool, InitComponent };