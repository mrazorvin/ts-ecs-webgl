import { Hash } from "./Hash";
import { Entity, World, ComponentsCollection } from "./World";
import { Component, HASH_HEAD } from "./Component";

type PoolInstances<T extends Array<typeof Component>> = {
  [K in keyof T]: T[K] extends new (...args: any[]) => infer A ? A : never;
};

type PoolInstancesUndef<T extends Array<typeof Component>> = {
  [K in keyof T]: T[K] extends new (...args: any[]) => infer A
    ? A | undefined
    : never;
};

export class EntityPool<T extends Array<typeof Component>> {
  id: number;
  hash: Hash<typeof Component>;
  entities: Entity<T>[];
  components: T;

  create: ((...args: PoolInstances<T>) => Entity<PoolInstances<T>>) | undefined;

  reuse:
    | ((
        world: World,
        entity: Entity<PoolInstances<T>>,
        reset: (
          create: (...args: PoolInstances<T>) => Entity<PoolInstances<T>>,
          ...args: PoolInstancesUndef<T>
        ) => Entity<PoolInstances<T>>
      ) => Entity<PoolInstances<T>>)
    | undefined;

  instantiate:
    | ((
        world: World,
        instantiate: (
          create: (...args: PoolInstances<T>) => Entity<PoolInstances<T>>
        ) => Entity<PoolInstances<T>>
      ) => Entity<PoolInstances<T>>)
    | undefined;

  constructor(components: [...T]) {
    this.hash = components.reduce(
      (acc, component) => acc.add(component),
      HASH_HEAD
    );
    this.id = EntityPool.global_id++;
    this.entities = [];
    this.components = components;
    this.create = undefined;
    this.reuse = undefined;
    this.instantiate = undefined;
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
              let collection${i} = world.components[Constructor${i}.id];
              if (collection${i} === undefined) {
                collection${i} = new ComponentsCollection();
                world.components[Constructor${i}.id] = collection${i};
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
              let collection${i} = world.components[Constructor${i}.id];
              if (collection${i} === undefined) {
                collection${i} = new ComponentsCollection();
                world.components[Constructor${i}.id] = collection${i};
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

export namespace EntityPool {
  export let global_id = 0;
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
