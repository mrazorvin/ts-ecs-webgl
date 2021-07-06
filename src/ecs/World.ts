export class ComponentID {
  #type = ComponentID;
}

export class EntityID {
  #type = EntityID;
}

export enum ResourceID {}
export enum ComponentTypeID {}

export class Entity<T extends Component[] = []> {
  id = new EntityID();
  components = new Map<typeof Component, ComponentID>();
}

interface WorldShape {
  system(system: System): void;
  system_once(system: System): void;
  query<T extends Array<typeof Component>>(
    components: [...T],
    reduce: (
      entity: Entity<
        { [K in keyof T]: T[K] extends new () => infer A ? A : Component }
      >,
      ...args: {
        [K in keyof T]: T[K] extends new () => infer A ? A : Component;
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
        { [K in keyof T]: T[K] extends new () => infer A ? A : Component }
      >,
      ...args: {
        [K in keyof T]: T[K] extends new () => infer A ? A : Component;
      }
    ) => void
  ) {
    return this.world.query(components, reduce);
  }

  finish() {
    this.finished = true;
  }
}

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
}

let global_id_seq = 0;

export abstract class Resource {
  static id(): ResourceID {
    let id: undefined | ResourceID;
    if (id === undefined) {
      id = (`${global_id_seq++}` as unknown) as ResourceID;
      this.id = () => id!;
    }

    return id;
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
  components = new Map<
    typeof Component,
    Map<ComponentID, { entity: EntityID; component: Component }>
  >();
  resources = new Map<ResourceID, Resource>();
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
        { [K in keyof T]: T[K] extends new () => infer A ? A : Component }
      >,
      ...args: {
        [K in keyof T]: T[K] extends new () => infer A ? A : Component;
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
    const constructor = (resource.constructor as unknown) as typeof Resource;

    this.resources.set(constructor.id(), resource);
  }

  entity<T extends Component[]>(...components: [...T]): Entity<T> {
    const entity = new Entity();
    this.entities.set(entity.id, entity);

    for (const component of components) {
      const constructor = component.constructor as typeof Component;
      entity.components.set(constructor, component.id);

      if (!this.components.has(constructor)) {
        this.components.set(constructor, new Map());
      }

      this.components
        .get(constructor)!
        .set(component.id, { entity: entity.id, component });
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

  start() {
    this.world.resource(this.info);
    this.raf = requestAnimationFrame(this.execute);
  }

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

type KeyShape = { [id: string]: KeyShape | undefined } & {
  SubKey: new () => KeyShape;
  get(id: ResourceID | ComponentTypeID): KeyShape;
  fn?: (...args: any[]) => any;
};

class Key implements KeyShape {
  [id: string]: KeyShape | undefined;

  // @ts-ignore
  SubKey = class SubKey extends Key {} as new () => KeyShape;

  // @ts-ignore
  get(id: ResourceID | ComponentTypeID): KeyShape {
    return this[id] || (this[id] = new this.SubKey());
  }

  // @ts-ignore
  fn?: (...args: any[]) => any;
}

const entity_injectors_cache = new Key();
const resources_injectors_cache = new Key();

function get_cache(
  cache: Key,
  deps: Array<{ id(): ResourceID | ComponentTypeID }>
) {
  switch (deps.length) {
    case 0:
      return cache;
    case 1:
      return cache.get(deps[0].id());
    case 2:
      return cache.get(deps[0].id()).get(deps[1].id());
    case 3:
      return cache.get(deps[0].id()).get(deps[1].id()).get(deps[2].id());
    case 4:
      return cache
        .get(deps[0].id())
        .get(deps[1].id())
        .get(deps[2].id())
        .get(deps[3].id());
    case 5:
      return cache
        .get(deps[0].id())
        .get(deps[1].id())
        .get(deps[2].id())
        .get(deps[3].id())
        .get(deps[4].id());
    case 6:
      return cache
        .get(deps[0].id())
        .get(deps[1].id())
        .get(deps[2].id())
        .get(deps[3].id())
        .get(deps[4].id())
        .get(deps[5].id());
    case 7:
      return cache
        .get(deps[0].id())
        .get(deps[1].id())
        .get(deps[2].id())
        .get(deps[3].id())
        .get(deps[4].id())
        .get(deps[5].id())
        .get(deps[6].id());

    case 8:
      return cache
        .get(deps[0].id())
        .get(deps[1].id())
        .get(deps[2].id())
        .get(deps[3].id())
        .get(deps[4].id())
        .get(deps[5].id())
        .get(deps[6].id())
        .get(deps[7].id());
    case 9:
      return cache
        .get(deps[0].id())
        .get(deps[1].id())
        .get(deps[2].id())
        .get(deps[3].id())
        .get(deps[4].id())
        .get(deps[5].id())
        .get(deps[6].id())
        .get(deps[7].id())
        .get(deps[8].id());
  }

  throw new Error(
    `[Injector -> FastID] more than 9 dependencies don't supported`
  );
}

function inject_resources_and_sub_world(world: World, system: System) {
  const cache = get_cache(resources_injectors_cache, system.dependencies);

  if (cache.fn === undefined) {
    const variables = system.dependencies.map((_, i) => `d${i}`);
    const injector_factory = new Function(`return (dependencies, SubWorld) => {
      return (world, system) => {
        const sub_world = new SubWorld(system.world ?? world);
        ${variables
          .map(
            (v, i) => `
              var ${v} = world.resources.get(dependencies[${i}].id())
              if (!${v}) return false;
            `
          )
          .join("\n;")}
        
          system.exec(sub_world, ${variables.join(",")});
          return true;
      }
    }`)();

    cache.fn = injector_factory(system.dependencies, SubWorld);
  }

  return cache.fn!(world, system);
}

const DEFAULT_COLLECTION = new Map();

function inject_entity_and_component(
  world: World,
  components: Array<typeof Component>,
  fn: (entity: Entity, ...components: Component[]) => void
) {
  const cache = get_cache(entity_injectors_cache, components);

  if (cache.fn === undefined) {
    if (components.length === 0) return;

    const variables1 = components.map((_, i) => `d${i}`);
    const variables2 = components.map((_, i) => `c${i}`);
    const injector_factory = new Function(`return (components, default_collection) => {
      return (world, fn) => {
        ${variables1
          .map((v, i) => `var ${v} = world.components.get(components[${i}])`)
          .join(";\n")}
        var size = Infinity;
        var components_collection = ${variables1[0]} ?? default_collection;
        ${variables1
          .map(
            (variable) => `
            if (${variable}?.size < size) {
                components_collection = ${variable};
                size = ${variable}.size;
            }
          `
          )
          .join("\n")}
        
        for (const component of components_collection.values()) {
          const entity = world.entities.get(component.entity);
          if (!entity) continue;
          ${variables2
            .map(
              (_, i) => `
                var component${i} = entity.components.get(components[${i}]);
                if (!component${i}) continue;
              `
            )
            .join("\n")}

            ${variables2
              .map(
                (variable, i) =>
                  `
                    var ${variable} = ${variables1[i]}.get(component${i});
                    if (!${variable}) continue;
                  `
              )
              .join("\n")}

              fn(entity, ${variables2
                .map((variable) => `${variable}.component`)
                .join(",")});
        }
      }
    }`)();

    cache.fn = injector_factory(components, DEFAULT_COLLECTION);
  }

  return cache.fn!(world, fn);
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

export function sys<
  T extends Array<(new (...args: any[]) => Resource) & { id(): ResourceID }>
>(
  args: [...T],
  fn: (
    world: SubWorld,
    ...args: {
      [K in keyof T]: T[K] extends new (...args: any[]) => infer A ? A : void;
    }
  ) => void
) {
  return new DynamicSystem(args, fn);
}
