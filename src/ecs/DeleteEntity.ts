import { Hash } from "./Hash";
import { Component, Entity, World } from "./World";

type DeleteFunction = (entity: Entity, world: World) => void;
type HashType = Hash<typeof Component>;

export class DeleteEntity {
  static func_cache = new Map<HashType, { [key: string]: DeleteFunction }>();
  static delete(entity: Entity, world: World): void {
    let func_container = this.func_cache.get(entity.hash);
    if (func_container === undefined) {
      func_container = {};
      this.func_cache.set(entity.hash, func_container);
    }
    const key = `_${entity.pool?.id ?? ""}`;
    let func = func_container[key];
    if (func === undefined) {
      func = this.generate_function(entity.hash, entity.pool?.hash);
      func_container[key] = func;
    }

    return func(entity, world);
  }

  // prettier-ignore
  static generate_function(hash: HashType, pool_hash: HashType | undefined): DeleteFunction {
    let components: Array<typeof Component> = [];
    let pool_components: Array<typeof Component> = [];
    let current_hash: HashType | undefined = hash;
    while (current_hash && current_hash.value !== Component) {
      components.push(current_hash.value);
      current_hash = current_hash.prev;
    }
    current_hash = pool_hash;
    while (current_hash && current_hash.value !== Component) {
      pool_components.push(current_hash.value);
      current_hash = current_hash.prev;
    }
    components = components.reverse();
    const storages = [
      ...new Set(components.map(({ storage_row_id }) => storage_row_id)),
    ];
    const body = `
      ${components
        .map((component) => `
          var coll_${component.id} = world.components[${component.id}];`
        ).join("")
      }
        
      var components = entity.components;
      ${storages
        .map(
          (storage_id) => `
          var s${storage_id} = components._${storage_id};
          ${components.filter((component) => storage_id === component.storage_row_id)
            .map(
              (component) => `
                ${pool_components.includes(component) ?  "" : `s${storage_id}._${component.container_column_id} = null;`}
              `).join("\n")}
        `).join("\n")
      }

      var register = entity.register;
      ${storages
        .map((storage_id) => `
          ${components.filter((component) => storage_id === component.storage_row_id)
            .map(
              (component) => `
                var reg_${component.id} = r${storage_id}._${component.container_column_id};
                r${storage_id}._${component.container_column_id} = null;
              `).join("\n")}
        `).join("\n")
      }

      ${components
        .map(
          (component) => `
            if (reg_${component.id} != null) {
              const refs = coll_${component.id}.refs;

              coll_${component.id}.size -= 1;
              refs[reg_${component.id}] = refs[coll_${component.id}.size];
              refs.length = coll_${component.id}.size;
            }
          `
        ).join("\n")}
    `;

    const func = new Function("entity", "world", body);

    return func as DeleteFunction;
  }
}
