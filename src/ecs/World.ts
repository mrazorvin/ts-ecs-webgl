const ID_SEQ_START = -1;
const CONTAINER_SIZE = 8; // TODO: set to 32 after normalizing container locations

export enum ResourceID {}
export enum ComponentTypeID {}
export enum EntityID {}

export class Entity<T extends Component[] = []> {
  // IMPORTANT: don't add more than 12 properties, otherwise V8 will use for this object dictionary mode.
  //            this also mean that you not allow to add more properties to entity instance
  components: { [key: string]: { [key: string]: Component } };
  pool: Pool | undefined;
  ref: EntityRef;

  constructor(...args: any[]) {
    this.components = {};
    this.ref = new EntityRef(this);
    this.pool = undefined;
  }
}

export class EntityRef {
  entity: Entity | undefined;
  constructor(entity?: Entity) {
    this.entity = entity;
  }
}

class Pool {
  entities: Entity[];
  constructor() {
    this.entities = [];
  }

  push(entity: Entity) {
    entity.ref = new EntityRef(entity);
    this.entities.push(entity);
  }
}

let global_id = 0;

export abstract class Component {
  static id: number;

  constructor(...args: any[]) {}

  static get<T>(
    this: (new (...args: any[]) => T) & typeof Component,
    entity: Entity
  ): T | undefined {
    return undefined;
  }

  // TODO: normalize container locations
  static storage_row_id = ID_SEQ_START;
  static container_column_id = ID_SEQ_START;

  private static _set(entity: Entity, component: Component): Component {
    return component;
  }

  static set(entity: Entity, component: Component) {
    this.init();
    return this._set(entity, component);
  }

  static init() {
    if (
      this.container_column_id === ID_SEQ_START ||
      this.storage_row_id === ID_SEQ_START
    ) {
      this.id = global_id++;

      if (Component.last_container_column_id >= CONTAINER_SIZE) {
        Component.last_container_row_id += 1;
        Component.last_container_column_id = 0;
        Component.container_class_cache[
          `_${Component.last_container_row_id}`
        ] = class ComponentsContainer {
          [key: string]: Component;
        };
      } else {
        Component.last_container_column_id += 1;
      }

      this.storage_row_id = Component.last_container_row_id;
      this.container_column_id = Component.last_container_column_id;

      this.get = new Function(
        "entity",
        `return entity.components._${this.storage_row_id} && entity.components._${this.storage_row_id}._${this.container_column_id}`
      ) as typeof this.get;
      this._set = new Function(
        "Component",
        `return (entity, component) => {
          return (entity.components._${this.storage_row_id} || 
            (entity.components._${this.storage_row_id} = new Component.container_class_cache._${this.storage_row_id}()) 
          )._${this.container_column_id} = component
        }`
      )(Component) as typeof this.set;
    }
  }
}

export namespace Component {
  export let last_container_row_id = ID_SEQ_START;
  export let last_container_column_id = CONTAINER_SIZE;
  export const container_class_cache: {
    [key: string]: new (...args: any) => { [key: string]: Component };
  } = {};
}

export abstract class Resource {
  constructor(...args: any[]) {}

  static get<T>(
    this: (new (...args: any[]) => T) & typeof Resource,
    world: World
  ): T | undefined {
    return undefined as T | undefined;
  }

  private static _set(world: World, resource: Resource): Resource {
    return resource;
  }

  static storage_row_id = ID_SEQ_START;
  static container_column_id = ID_SEQ_START;
  static set(world: World, resource: Resource) {
    this.init();
    return this._set(world, resource);
  }

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
        `return world.resources._${this.storage_row_id} && world.resources._${this.storage_row_id}._${this.container_column_id}`
      ) as typeof this.get;
      this._set = new Function(
        "Resource",
        `return (world, resource) => {
          return (world.resources._${this.storage_row_id} || 
            (world.resources._${this.storage_row_id} = new Resource.container_class_cache._${this.storage_row_id}()) 
          )._${this.container_column_id} = resource
        }`
      )(Resource) as typeof this.set;
    }
  }

  name() {}
}

export namespace Resource {
  export let last_container_row_id = ID_SEQ_START;
  export let last_container_column_id = CONTAINER_SIZE;
  export const container_class_cache: {
    [key: string]: new (...args: any) => { [key: string]: Resource };
  } = {};
}

interface WorldShape {
  system(system: System): void;
  system_once(system: System): void;
  query<T extends Array<typeof Component>>(
    components: [...T],
    reduce: (
      entity: Entity<
        {
          [K in keyof T]: T[K] extends new (...args: any[]) => infer A
            ? A
            : Component;
        }
      >,
      ...args: {
        [K in keyof T]: T[K] extends new (...args: any[]) => infer A
          ? A
          : Component;
      }
    ) => void
  ): void;
}

export class ComponentsCollection {
  refs: EntityRef[];
  size: number;
  holes: number;

  constructor() {
    this.refs = [];
    this.size = 0;
    this.holes = 0;
  }
}

export class World implements WorldShape {
  // IMPORTANT: Don't add > 12 properties V8 otherwise, V8 will use dictionary
  components: Map<typeof Component, ComponentsCollection>;
  resources: { [key: string]: { [key: string]: Resource } };
  systems: System[];
  systems_once: System[];
  on_tick_end: Array<() => void>;

  constructor() {
    this.components = new Map();
    this.resources = {};
    this.systems = [];
    this.systems_once = [];
    this.on_tick_end = [];
  }

  /**
   * it's possible to optimize engine even more:
   * - when user request single component we could iterate over map without additional requests
   * - we could link entities with their components and reduce total map access count to 1
   *    - drawback = multiple component owners,
   * - similar optimization could be applied to resource with similar drawback
   */
  query<T extends Array<typeof Component>>(
    components: [...T],
    fn: (
      entity: Entity<
        {
          [K in keyof T]: T[K] extends new (...args: any[]) => infer A
            ? A
            : Component;
        }
      >,
      ...args: {
        [K in keyof T]: T[K] extends new (...args: any[]) => infer A
          ? A
          : Component;
      }
    ) => void
  ) {
    inject_entity_and_component(this, components, fn as any);
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

  entity<T extends Component[]>(components: [...T]): Entity<T> {
    const entity = new Entity();

    for (const component of components) {
      const Constructor = component.constructor as typeof Component;
      Constructor.set(entity, component);

      let collection = this.components.get(Constructor);
      if (!collection) {
        collection = new ComponentsCollection();
        this.components.set(Constructor, collection);
      }

      collection.size += 1;
      collection.refs.push(entity.ref);
    }

    return entity;
  }

  delete_entity(entity: Entity) {
    entity.ref.entity = undefined;
    if (entity.pool) entity.pool.push(entity);
  }
}

export class SubWorld implements WorldShape {
  private world: WorldShape;
  private finished: boolean;

  constructor(world: WorldShape) {
    this.finished = false;
    this.world = world;
  }

  system(system: System) {
    if (this.finished === true) return;
    if (system.world === undefined) system.world = this;

    this.world.system(system);
  }

  system_once(system: System) {
    if (this.finished === true) return;
    if (system.world === undefined) {
      system.world = this;
    }

    this.world.system_once(system);
  }

  query<T extends Array<typeof Component>>(
    components: [...T],
    reduce: (
      entity: Entity<
        {
          [K in keyof T]: T[K] extends new (...args: any[]) => infer A
            ? A
            : Component;
        }
      >,
      ...args: {
        [K in keyof T]: T[K] extends new (...args: any[]) => infer A
          ? A
          : Component;
      }
    ) => void
  ) {
    return this.world.query(components, reduce);
  }

  finish() {
    this.finished = true;
  }
}

export abstract class System<R extends Resource[] = Resource[]> {
  abstract dependencies: { [K in keyof R]: (new () => R[K]) & typeof Resource };
  abstract exec(world: SubWorld, ...resources: R): void;
  world: WorldShape | undefined;
}

export abstract class BaseScheduler {
  constructor(public world: World) {}

  abstract start(): void;

  tick() {
    for (const system of this.world.systems) {
      inject_resources_and_sub_world(this.world, system);
    }

    if (this.world.systems_once.length > 0) {
      this.world.systems_once = this.world.systems_once.filter(
        (system) => !inject_resources_and_sub_world(this.world, system)
      );
    }

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

export class RafScheduler extends Scheduler {
  raf = requestAnimationFrame(() => null);
  ms_last_frame = 0;
  current_fps = 0;
  info = new LoopInfo(0);

  start = () => {
    this.world.resource(this.info);
    this.raf = requestAnimationFrame(this.execute);
  };

  execute = () => {
    const ms_now = performance.now();
    const ms_delta = (ms_now - this.ms_last_frame) / 1000;

    this.current_fps = Math.floor(1 / ms_delta);
    this.ms_last_frame = ms_now;
    this.info.time_delta = ms_delta;

    this.tick();
    this.start();
  };

  stop() {
    cancelAnimationFrame(this.raf);
  }
}

const resource_injector_variables = Array(9)
  .fill(0)
  .map((_, i) => `_${i}`);
const resource_injector = new Function(`return (SubWorld) => {
  return (world, system) => {
    const sub_world = new SubWorld(system.world ?? world);
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

            system.exec(${["sub_world"]
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
  }
}`)()(SubWorld);

function inject_resources_and_sub_world(world: World, system: System) {
  return resource_injector(world, system);
}

const DEFAULT_COLLECTION = new Map();

class Cacher {
  static storage = new Map<string, Function>();
  static get_func(components: Array<typeof Component>) {
    const id = components
      .sort((c1, c2) => {
        const comp = c2.storage_row_id - c1.storage_row_id;
        return comp;
      })
      .map((component) => {
        if (component.id === undefined) {
          component.init();
        }
        return component.id;
      })
      .join("_");
    let fn = this.storage.get(id);
    if (!fn) {
      fn = new Function(
        "entity",
        "fn",
        `
        ${[...new Set(components.map((v) => v.storage_row_id))]
          .map(
            (id) => `
            const __${id} = entity.components._${id}
            ${components
              .filter((v) => v.storage_row_id === id)
              .map(
                (v) =>
                  `const _${v.id} = __${v.storage_row_id}?._${v.container_column_id};
                  if (_${v.id} === undefined) return;`
              )
              .join("\n")}
            `
          )
          .join(";")}
       
          
          fn(${["entity"]
            .concat(components.map(({ id }) => `_${id}`))
            .join(",")});
        `
      );

      console.log(fn.toString());

      this.storage.set(id, fn);
    }

    return fn;
  }
}

let component_injector = new Function(
  "cacher",
  `
  ${resource_injector_variables
    .map((_, i) => {
      return `
        function inject${i}(world, fn, components) {
          ${resource_injector_variables
            .slice(0, i)
            .map((v, i) => {
              return `
                 var _t${v} = components[${i}];
                 var _${v} = world.components.get(_t${v})?.refs;
              `;
            })
            .join("\n")}
          var size = Infinity;
          var components_collection = ${
            i > 0 ? `_${resource_injector_variables[0]}` : `undefined`
          };
          ${resource_injector_variables
            .slice(0, i)
            .map((v) => {
              return `
                if (_${v}?.length < size) {
                  components_collection = _${v};
                  size = _${v}.length;
                }`;
            })
            .join("\n")}

            if (!components_collection) return;

            const inject = cacher.get_func(components);
            let tail = components_collection.length;
            const length = components_collection.length;
            main: for (let head = 0; head < length; head++) {
              let ref = components_collection[head];
              let entity = ref.entity;
              if (!entity) { 
                for (;;) {
                  tail -= 1;
                  if (tail === head) break main;
                  ref = components_collection[tail];
                  entity = ref.entity;
                  if (entity) components_collection[head] = ref;
                  else continue
                }
              }

              inject(entity, fn);
            }
            components_collection.length = tail;
        }`;
    })
    .join("\n")}

  return (world, fn, components) => {
    switch (components.length) {
      ${resource_injector_variables
        .map((_, i) => {
          return `
            case ${i}: {
              return inject${i}(world, fn, components);
            }`;
        })
        .join("\n")}
      default: {
        "[Injector -> FastID] more than 9 dependencies don't supported";
      }
    }
  }
  `
)(Cacher);

function inject_entity_and_component(
  world: World,
  components: Array<typeof Component>,
  fn: (entity: Entity, ...components: Component[]) => void
) {
  return component_injector(world, fn, components);
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

type IgnoreMethodSignature = any;
export function sys<T extends Array<new (...args: any[]) => Resource>>(
  args: [...T],
  fn: (
    world: SubWorld,
    ...args: {
      [K in keyof T]: T[K] extends new (...args: any[]) => infer A ? A : void;
    }
  ) => void
) {
  return new DynamicSystem(args as any, fn);
}
