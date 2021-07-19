const ID_SEQ_START = -1;
const CONTAINER_SIZE = 8; // TODO: set to 32 after normalizing container locations

export enum ResourceID {}
export enum ComponentTypeID {}
export enum EntityID {}

export class Entity<T extends Component[] = []> {
  // IMPORTANT: don't add more than 12 properties, otherwise V8 will use for this object dictionary mode.
  //            this also mean that you not allow to add more properties to entity instance
  components: { [key: string]: ComponentsContainer };
  pool: EntityPool<[]> | undefined;
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

type PoolInstances<T extends Array<typeof Component>> = {
  [K in keyof T]: T[K] extends new (...args: any[]) => infer A ? A : never;
};
type PoolInstancesUndef<T extends Array<typeof Component>> = {
  [K in keyof T]: T[K] extends new (...args: any[]) => infer A
    ? A | undefined
    : never;
};

export class EntityPool<T extends Array<typeof Component>> {
  entities: Entity<T>[];
  components: T;
  create?: (...args: PoolInstances<T>) => Entity<PoolInstances<T>>;
  reuse?: (
    world: World,
    entity: Entity<PoolInstances<T>>,
    reset: (
      create: (...args: PoolInstances<T>) => Entity<PoolInstances<T>>,
      ...args: PoolInstancesUndef<T>
    ) => Entity<PoolInstances<T>>
  ) => Entity<PoolInstances<T>>;
  instantiate?: (
    world: World,
    instantiate: (
      create: (...args: PoolInstances<T>) => Entity<PoolInstances<T>>
    ) => Entity<PoolInstances<T>>
  ) => Entity<PoolInstances<T>>;

  constructor(components: [...T]) {
    this.entities = [];
    this.components = components;
    this.create = undefined;
  }

  pop(): Entity<T> | undefined {
    if (this.create === undefined) {
      this.init();
    }

    return this.entities.pop();
  }

  init() {
    for (const Component of this.components) {
      if (Component.id === undefined) {
        Component.init();
      }
    }
    const vars = this.components.map(({ id }) => `c${id}`);
    const storages = Array.from(
      new Set(this.components.map((c) => c.storage_row_id))
    );

    this.create = new Function(
      ...["Entity", "pool", "components"],
      ` 
        return (${vars.join(",")}) => {
          const entity = new Entity();
          ${storages
            .map(
              (storage_id) => `
              var s${storage_id} = new components[${this.components.findIndex(
                (c) => c.storage_row_id === storage_id
              )}].container_class();
              ${this.components
                .filter((c) => c.storage_row_id === storage_id)
                .map(
                  (c) => `s${storage_id}._${c.container_column_id} = c${c.id}`
                )
                .join("\n")}
              `
            )
            .join("\n")}
          
          entity.pool = pool;
          entity.components = {
            ${storages
              .map((storage_id) => {
                return `
                  _${storage_id}: s${storage_id}, 
                `;
              })
              .join("\n")}
          }

          return entity;
        }
      `
    )(Entity, this, this.components) as EntityPool<T>["create"];

    this.reuse = new Function(
      ...["create", "components", "ComponentsCollection"],
      `
        return (world, entity, reset) => {
          ${storages
            .map(
              (storage_id) => `
              var s${storage_id} = entity.components._${storage_id};
              ${this.components
                .filter((c) => c.storage_row_id === storage_id)
                .map(
                  (c) =>
                    `var c${c.id} = s${storage_id}?._${c.container_column_id};`
                )
                .join("\n")}
              `
            )
            .join("\n")}

          const new_entity = reset(create, ${vars.join(",")});
          
          ${this.components
            .map(
              (_, i) => `
              const Constructor${i} = components[${i}];
              let collection${i} = world.components.get(Constructor${i});
              if (collection${i} === undefined) {
                collection${i} = new ComponentsCollection();
                world.components.set(Constructor${i}, collection${i});
              }
              collection${i}.size += 1;
              collection${i}.refs.push(new_entity.ref);
          `
            )
            .join("\n")}


          return new_entity;
        }
      `
    )(
      this.create,
      this.components,
      ComponentsCollection
    ) as EntityPool<T>["reuse"];

    this.instantiate = new Function(
      ...["create", "components", "ComponentsCollection"],
      `
        return (world, instantiate) => {
          const new_entity = instantiate(create);
          
          ${this.components
            .map(
              (_, i) => `
              const Constructor${i} = components[${i}];
              let collection${i} = world.components.get(Constructor${i});
              if (collection${i} === undefined) {
                collection${i} = new ComponentsCollection();
                world.components.set(Constructor${i}, collection${i});
              }
              collection${i}.size += 1;
              collection${i}.refs.push(new_entity.ref);
          `
            )
            .join("\n")}

          return new_entity;
        }
      `
    )(
      this.create,
      this.components,
      ComponentsCollection
    ) as EntityPool<T>["instantiate"];
  }

  push(entity: Entity) {
    this.entities.push(entity);
  }
}

export class Pool<T extends Array<typeof Component>> {
  instantiate: (
    create: (...args: PoolInstances<T>) => Entity<PoolInstances<T>>
  ) => Entity<PoolInstances<T>>;

  reuse: (
    create: (...args: PoolInstances<T>) => Entity<PoolInstances<T>>,
    ...args: PoolInstancesUndef<T>
  ) => Entity<PoolInstances<T>>;

  pool: EntityPool<T>;

  constructor(
    pool: EntityPool<T>,
    instantiate: Pool<T>["instantiate"],
    reuse: Pool<T>["reuse"]
  ) {
    this.pool = pool;
    this.reuse = reuse;
    this.instantiate = instantiate;
  }

  get(world: World) {
    const _entity = this.pool.pop();
    const entity =
      _entity === undefined
        ? this.pool.instantiate!(world, this.instantiate)
        : this.pool.reuse!(world, _entity, this.reuse);

    return entity;
  }
}

interface ComponentsContainer {
  components(fn: (component: Component) => void): void;
  [key: string]: Component;
}

// move to member of static class
let global_id = 0;
export abstract class Component {
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
  private static _set(entity: Entity, component: Component): Component {
    return component;
  }

  static set(entity: Entity, component: Component) {
    this.init();
    return this._set(entity, component);
  }

  // TODO: normalize container locations
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
        Component.container_class_cache[
          `_${Component.last_container_row_id}`
        ] = ComponentsContainer as any;
        const vars = Array(CONTAINER_SIZE)
          .fill(null)
          .map((_, i) => `c${i}`);
        ComponentsContainer.prototype.components = new Function(
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

// TODO: add_entity, delete_entity, add_component, delete_component, add_resource, delete_resource
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

  constructor() {
    this.refs = [];
    this.size = 0;
  }
}

export class World implements WorldShape {
  // IMPORTANT: Don't add more than 12 properties otherwise, V8 will use dictionary mode fot this object
  // IMPORTANT: Try to keep as less as possible methods in world, and it namespace
  //            because prototype chain also subject for dictionary mode optimization
  //            for example: generate functions for adding entities and components
  //                         add_entity1(world, ...), add_entity2(world, ...)
  //                         add_component1(world, entity, ...), add_component2(world, entity, ...)
  //            i.e it's mean that world should left only method that needed for hierarchy calls
  //                system, system_once ...
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
    for (const key in entity.components) {
      const container = entity.components[key];
      container.components((component) => {
        const collection = this.components.get(
          component.constructor as typeof Component
        );
        if (collection) {
          collection.size -= 1;
        }
      });
    }
  }
}

// TODO: inject world directly into SubWorld, and allow us to call his methods
export class SubWorld implements WorldShape {
  origin_world: World;
  private world: WorldShape;
  private finished: boolean;

  constructor(world: WorldShape, origin_world: World) {
    this.finished = false;
    this.world = world;
    this.origin_world = origin_world;
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
  abstract dependencies: {
    [K in keyof R]: (new (...args: any[]) => R[K]) & typeof Resource;
  };
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

    // loop info actualization must be part of behavior contract
    // we could pas 1 / {ms_delta} to show user how fractional of second left
    // from the previous second
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

// it's possible to generate more optimized code
const resource_injector = new Function(`return (SubWorld) => {
  return (world, system) => {
    const sub_world = new SubWorld(system.world ?? world, world);
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

const noop = () => void 0;

// TODO: refactor names]
class Cacher {
  static storage = new Map<string, Function>();
  static get_func(components: Array<typeof Component>) {
    let id = "";
    for (const component of components) {
      if (component.id === undefined) return noop;
      id += `_${component.id}`;
    }
    let fn = this.storage.get(id);
    if (fn === undefined) {
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

      this.storage.set(id, fn);
    }

    return fn;
  }
}

// TOOD: refactor names
// TOOD: we need more test for this function
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
                 var _t${v} = world.components.get(components[${i}]);
                 var _${v} = _t${v}?.refs;
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
                if (_t${v}?.size < size) {
                  components_collection = _${v};
                  size = _t${v}.size;
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
                  if (entity) {
                    components_collection[head] = ref;
                    break;
                  } else continue
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
