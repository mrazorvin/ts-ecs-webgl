export class ComponentID {
  #type = ComponentID;
}

export class EntityID {
  #type = EntityID;
}

let ID_SEQ_START = -1;
let global_id_seq = 0;

export enum ResourceID {}
export enum ComponentTypeID {}

export class Entity<T extends Component[] = []> {
  id = new EntityID();
  // components = new Map<typeof Component, Component>();
  // components = [];
  components = {};
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

let global_component_row_id = ID_SEQ_START;
let global_component_column_id = ID_SEQ_START;
let classStorage = {} as any;
export abstract class Component {
  id = new ComponentID();

  static id(): ComponentTypeID {
    let id: undefined | ComponentTypeID;
    if (id === undefined) {
      id = (`${global_id_seq++}` as unknown) as ComponentTypeID;
      this.id = () => id!;
    }

    return id;
  }

  constructor(...args: any[]) {}

  static get<T>(
    this: (new (...args: any[]) => T) & typeof Component,
    entity: Entity
  ): T | undefined {
    // return entity.components.get(this) as T | undefined;
    return undefined;
  }

  // TODO: instead of treating sequence of 32 as single Storage
  // Use chess formation i.e first 4 for first second 4 for second ..
  // from 32 .. 36 again belongs to first
  static global_component_column_id = ID_SEQ_START;
  static global_component_row_id = ID_SEQ_START;
  static set(entity: Entity, resource: Component) {
    // entity.components.set(this, resource);
    // return;

    if (
      this.global_component_column_id === ID_SEQ_START &&
      this.global_component_row_id === ID_SEQ_START
    ) {
      if (
        this.global_component_column_id === global_component_column_id ||
        global_component_column_id >= CONTAINER_SIZE
      ) {
        global_component_row_id += 1;
        global_component_column_id = 0;
        classStorage[`_${global_component_row_id}`] = class Storage {};
      } else {
        global_component_column_id += 1;
      }

      this.global_component_row_id = global_component_row_id;
      this.global_component_column_id = global_component_column_id;
      this.get = new Function(
        "entity",
        `return entity.components._${this.global_component_row_id} && entity.components._${this.global_component_row_id}._${this.global_component_column_id}`
      ) as any;
    }

    const container =
      entity.components[`_${this.global_component_row_id}`] ??
      (entity.components[`_${this.global_component_row_id}`] = new classStorage[
        `_${this.global_component_row_id}`
      ]());
    container[`_${this.global_component_column_id}`] = resource;

    return resource;
  }
}

let global_resource_row_id = ID_SEQ_START;
let global_resource_column_id = ID_SEQ_START;
const CONTAINER_SIZE = 32;

export abstract class Resource {
  static id(): ResourceID {
    let id: undefined | ResourceID;
    if (id === undefined) {
      id = (`${global_id_seq++}` as unknown) as ResourceID;
      this.id = () => id!;
    }

    return id;
  }

  constructor(...args: any[]) {}

  static get<T>(
    this: (new (...args: any[]) => T) & typeof Resource,
    world: World
  ): T | undefined {
    return undefined as T | undefined;
  }

  static global_resource_column_id = ID_SEQ_START;
  static global_resource_row_id = ID_SEQ_START;
  static set(world: World, resource: Resource) {
    if (
      this.global_resource_column_id === ID_SEQ_START &&
      this.global_resource_row_id === ID_SEQ_START
    ) {
      if (
        this.global_resource_column_id === global_resource_column_id ||
        global_resource_column_id >= CONTAINER_SIZE
      ) {
        global_resource_row_id += 1;
        global_resource_column_id = 0;
      } else {
        global_resource_column_id += 1;
      }

      this.global_resource_row_id = global_resource_row_id;
      this.global_resource_column_id = global_resource_column_id;
      this.get = new Function(
        "world",
        `return world.resources[${this.global_resource_row_id}] && world.resources[${this.global_resource_row_id}][${this.global_resource_column_id}]`
      ) as any;
    }

    const container =
      world.resources[this.global_resource_row_id!] ??
      (world.resources[this.global_resource_row_id!] = Array(
        CONTAINER_SIZE
      ).fill(null));
    container[this.global_resource_column_id!] = resource;

    return resource;
  }

  name() {}
}

export abstract class System<R extends Resource[] = Resource[]> {
  abstract dependencies: { [K in keyof R]: (new () => R[K]) & typeof Resource };
  abstract exec(world: SubWorld, ...resources: R): void;
  world: WorldShape | undefined;
}

export class World implements WorldShape {
  entities = new Map<EntityID, Entity>();
  components = new Map<typeof Component, Set<Entity>>();
  resources: Array<Resource[]> = [];
  systems: System[] = [];
  systems_once: System[] = [];
  on_tick_end: Array<() => void> = [];

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

  entity<T extends Component[]>(...components: [...T]): Entity<T> {
    const entity = new Entity();
    this.entities.set(entity.id, entity);

    for (const component of components) {
      const Constructor = component.constructor as typeof Component;
      Constructor.set(entity, component);

      let set = this.components.get(Constructor);
      if (!set) {
        set = new Set();
        this.components.set(Constructor, set);
      }

      set.add(entity);
    }

    return entity;
  }
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

let component_injector = new Function(
  "default_collection",
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
                 var _${v} = world.components.get( _t${v});
              `;
            })
            .join("\n")}
          var size = Infinity;
          var components_collection = ${
            i > 0 ? `_${resource_injector_variables[0]}` : `default_collection`
          } ?? default_collection;
          ${resource_injector_variables
            .slice(0, i)
            .map((v) => {
              return `
                if (_${v}?.size < size) {
                  components_collection = _${v};
                  size = _${v}.size;
                }`;
            })
            .join("\n")}

            for (const entity of components_collection) {
              ${resource_injector_variables
                .slice(0, i)
                .map(
                  (v, i) =>
                    `
                      const ${v} = _t${v}.get(entity);
                      if (!${v}) continue;
                    `
                )
                .join("\n")}
        
              fn(${["entity"]
                .concat(resource_injector_variables.slice(0, i))
                .join(",")});
            }

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
)(DEFAULT_COLLECTION);

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
export function sys<
  T extends Array<
    (new (...args: any[]) => Resource) & {
      id(): ResourceID;
      set: IgnoreMethodSignature;
      get: IgnoreMethodSignature;
    }
  >
>(
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
