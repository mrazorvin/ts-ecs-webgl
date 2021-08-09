import { Hash } from "./Hash";
import { Entity, World, ComponentsCollection, EntityRef } from "./World";
import { IComponent, HASH_HEAD } from "./Component";

type PoolInstances<T extends Array<typeof IComponent>> = {
  [K in keyof T]: T[K] extends new (...args: any[]) => infer A ? A : never;
};

type PoolInstancesUndef<T extends Array<typeof IComponent>> = {
  [K in keyof T]: T[K] extends new (...args: any[]) => infer A ? A | undefined : never;
};

export class EntityPool<T extends Array<typeof IComponent>> {
  id: number;
  hash: Hash<typeof IComponent>;
  entities: Entity<PoolInstances<T>>[];
  components: T;
  max_pool_size: number;
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
        instantiate: (create: (...args: PoolInstances<T>) => Entity<PoolInstances<T>>) => Entity<PoolInstances<T>>
      ) => Entity<PoolInstances<T>>)
    | undefined;

  constructor(components: [...T]) {
    this.hash = components.reduce((acc, component) => acc.add(component), HASH_HEAD);
    this.id = EntityPool.global_id++;
    this.entities = [];
    this.components = components;
    this.create = undefined;
    this.reuse = undefined;
    this.instantiate = undefined;
    this.max_pool_size = 200;
  }

  pop(): Entity<PoolInstances<T>> | undefined {
    if (this.create === undefined) {
      this.init();
    }

    return this.entities.pop();
  }

  pool_push(entity: Entity<PoolInstances<T>>) {
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
          const new_entity = reset(create, ${vars.join(",")});
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
          const new_entity = instantiate(create);
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
  instantiate: (create: (...args: PoolInstances<T>) => Entity<PoolInstances<T>>) => Entity<PoolInstances<T>>;

  reuse: (
    create: (...args: PoolInstances<T>) => Entity<PoolInstances<T>>,
    ...args: PoolInstancesUndef<T>
  ) => Entity<PoolInstances<T>>;

  pool: EntityPool<T>;

  constructor(pool: EntityPool<T>, instantiate: Pool<T>["instantiate"], reuse: Pool<T>["reuse"]) {
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
