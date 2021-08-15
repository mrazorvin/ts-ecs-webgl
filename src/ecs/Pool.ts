import { Hash } from "./Hash";
import { Entity, World, ComponentsCollection, EntityRef } from "./World";
import { SubWorld } from "./SubWorld";
import { IComponent, HASH_HEAD } from "./Component";

type PoolInstances<T extends Array<typeof IComponent>> = {
  [K in keyof T]: T[K] extends new (...args: any[]) => infer A ? A : never;
};

type PoolInstancesUndef<T extends Array<typeof IComponent>> = {
  [K in keyof T]: T[K] extends new (...args: any[]) => infer A ? A | undefined : never;
};

export class EntityPool<T extends Array<typeof IComponent>, W extends typeof SubWorld | undefined = undefined> {
  id: number;
  hash: Hash<typeof IComponent>;
  entities: Entity[];
  components: T;
  max_pool_size: number;
  create: ((...args: PoolInstances<T>) => Entity) | undefined;
  has_sub_world: W;

  reuse:
    | ((
        world: World,
        entity: Entity,
        reset: (world: World, create: (...args: PoolInstances<T>) => Entity, ...args: PoolInstancesUndef<T>) => Entity
      ) => Entity)
    | undefined;

  instantiate:
    | ((world: World, instantiate: (world: World, create: (...args: PoolInstances<T>) => Entity) => Entity) => Entity)
    | undefined;

  constructor(raw_components: [...T], sub_world_class?: W) {
    const components = [...raw_components] as T;
    if (sub_world_class !== undefined) {
      components.push(sub_world_class);
    }
    this.hash = components.reduce((acc, component) => acc.add(component), HASH_HEAD);
    this.id = EntityPool.global_id++;
    this.entities = [];
    this.components = components;
    this.create = undefined;
    this.reuse = undefined;
    this.instantiate = undefined;
    this.max_pool_size = 20;
    this.has_sub_world = sub_world_class!;
  }

  pop(): Entity | undefined {
    if (this.create === undefined) {
      this.init();
    }

    return this.entities.pop();
  }

  pool_push(entity: Entity) {
    if (this.entities.length < this.max_pool_size) this.entities.push(entity);
  }

  init() {
    const vars = this.components.map(({ id }) => `c${id}`);
    const storages = Array.from(new Set(this.components.map((c) => c.storage_row_id)));

    this.create = new Function(
      ...["Entity", "pool", "components", "EntityRef"],
      ` 
        return function create(${vars.join(",")}) {
          const prev_entity = create.prev_entity;
          if (prev_entity !== undefined) {
            const components = prev_entity.components;
            ${storages
              .map(
                (storage_id) => `

                var s${storage_id} = components._${storage_id};
                ${this.components
                  .filter((c) => c.storage_row_id === storage_id)
                  .map((c) => `s${storage_id}._${c.container_column_id} = c${c.id};`)
                  .join("\n")}
                `
              )
              .join("\n")}
            prev_entity.ref = new EntityRef(prev_entity);
            return prev_entity;
          }

          const entity = new Entity();
          ${storages
            .map(
              (storage_id) => `
              var s${storage_id} = new components[${this.components.findIndex(
                (c) => c.storage_row_id === storage_id
              )}].container_class();
              ${this.components
                .filter((c) => c.storage_row_id === storage_id)
                .map((c) => `s${storage_id}._${c.container_column_id} = c${c.id}`)
                .join("\n")}
              `
            )
            .join("\n")}
          
          entity.hash = pool.hash;
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
    )(Entity, this, this.components, EntityRef) as EntityPool<T>["create"];

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
                .map((c) => `var c${c.id} = s${storage_id}?._${c.container_column_id};`)
                .join("\n")}
              `
            )
            .join("\n")}

          create.prev_entity = entity;
          const new_entity = reset(world, create, ${vars.join(",")});
          const register = new_entity.register;
          create.prev_entity = undefined;
                
          ${this.components
            .map(
              (component, i) => `
                var collection${i} = world.components.get(${component.id}) 
                if (collection${i} === undefined) {
                  collection${i} = new ComponentsCollection();
                  world.components.set(${component.id}, collection${i});
                };
                register._${component.storage_row_id}._${component.container_column_id} = collection${i}.size;
                collection${i}.refs[collection${i}.size] = new_entity;
                collection${i}.size += 1;
          `
            )
            .join("\n")}


          return new_entity;
        }
      `
    )(this.create, this.components, ComponentsCollection) as EntityPool<T>["reuse"];

    this.instantiate = new Function(
      ...["create", "components", "ComponentsCollection"],
      `
        return (world, instantiate) => {
          const new_entity = instantiate(world, create);
          const register = new_entity.register = {
            ${storages
              .map((storage) => {
                return `_${storage}: new components[${this.components.findIndex(
                  ({ storage_row_id }) => storage_row_id === storage
                )}].register_class()`;
              })
              .join(",\n")}
          };

          ${this.components
            .map(
              (component, i) => `
                var collection${i} = world.components.get(${component.id}) 
                if (collection${i} === undefined) {
                  collection${i} = new ComponentsCollection();
                  world.components.set(${component.id}, collection${i});
                };
                register._${component.storage_row_id}._${component.container_column_id} = collection${i}.size;
                collection${i}.refs[collection${i}.size] = new_entity;
                collection${i}.size += 1;
              `
            )
            .join("\n")}

          return new_entity;
        }
      `
    )(this.create, this.components, ComponentsCollection) as EntityPool<T>["instantiate"];
  }

  push(entity: Entity) {
    this.entities.push(entity);
  }
}

export namespace EntityPool {
  export let global_id = 0;
}

export class Pool<T extends Array<typeof IComponent>> {
  instantiate: (world: World, create: (...args: PoolInstances<T>) => Entity) => Entity;
  reuse: (world: World, create: (...args: PoolInstances<T>) => Entity, ...args: PoolInstancesUndef<T>) => Entity;

  pool: EntityPool<T>;

  constructor(pool: EntityPool<T, undefined>, instantiate: Pool<T>["instantiate"], reuse: Pool<T>["reuse"]) {
    this.pool = pool;
    this.reuse = reuse;
    this.instantiate = instantiate;
  }

  get(world: World): Entity<undefined> {
    const _entity = this.pool.pop();
    const entity =
      _entity === undefined
        ? this.pool.instantiate!(world, this.instantiate)
        : this.pool.reuse!(world, _entity, this.reuse);

    return entity as Entity<undefined>;
  }
}

export class WorldPool<T extends Array<typeof IComponent>> {
  init_world: <T extends World>(world: T) => T;
  world_reuse: <PREV extends World, NEXT extends World>(prev_world: PREV, next_world: NEXT) => NEXT;
  instantiate: (world: World, create: (...args: PoolInstances<T>) => Entity) => Entity;
  reuse: (world: World, create: (...args: PoolInstances<T>) => Entity, ...args: PoolInstancesUndef<T>) => Entity;

  pool: EntityPool<T, typeof SubWorld>;
  constructor(params: {
    pool: EntityPool<T, typeof SubWorld>;
    instantiate: WorldPool<T>["instantiate"];
    reuse: WorldPool<T>["reuse"];
    init_world: WorldPool<T>["init_world"];
    world_reuse: WorldPool<T>["world_reuse"];
  }) {
    this.pool = params.pool;
    this.instantiate = params.instantiate;
    this.reuse = params.reuse;
    this.init_world = params.init_world;
    this.world_reuse = params.world_reuse;
  }

  get(world: World): Entity<World> {
    const prev_entity = this.pool.pop();
    if (prev_entity === undefined) {
      const entity = this.pool.instantiate!(world, this.instantiate) as unknown as Entity<World>;
      entity.world = this.init_world(new World());
      return entity;
    } else {
      const entity = this.pool.reuse!(world, prev_entity, this.reuse) as unknown as Entity<World>;
      const prev_world = entity.world;
      entity.world = this.world_reuse(prev_world, new World());
      prev_world.dispose();
      return entity;
    }
  }
}
