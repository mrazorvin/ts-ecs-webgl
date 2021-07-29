import { Hash } from "./Hash";
import { Entity, World } from "./World";
import { IComponent } from "./Component";

type DeleteFunction = (world: World, entity: Entity) => void;
type HashType = Hash<typeof IComponent>;

export class DeleteEntity {
  static func_cache = new Map<HashType, { [key: string]: DeleteFunction }>();
  static delete(world: World, entity: Entity): void {
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

    return func(world, entity);
  }

  // prettier-ignore
  static generate_function(hash: HashType, pool_hash: HashType | undefined): DeleteFunction {
    let components: Array<typeof IComponent> = [];
    let pool_components: Array<typeof IComponent> = [];
    let current_hash: HashType | undefined = hash;
    while (current_hash && current_hash.value !== IComponent) {
      components.push(current_hash.value);
      current_hash = current_hash.prev;
    }
    current_hash = pool_hash;
    while (current_hash && current_hash.value !== IComponent) {
      pool_components.push(current_hash.value);
      current_hash = current_hash.prev;
    }
    components = components.reverse();
    const storages = [
      ...new Set(components.map(({ storage_row_id }) => storage_row_id)),
    ];
    const body = `return (world, entity) => {
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
          var r${storage_id} = register._${storage_id};
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
              coll_${component.id}.size -= 1
              const temp_entity = coll_${component.id}.refs[coll_${component.id}.size];
              temp_entity.entity.register._${component.storage_row_id}._${component.container_column_id} = reg_${component.id};
              coll_${component.id}.refs[reg_${component.id}] = temp_entity;
              coll_${component.id}.refs[coll_${component.id}.size] = undefined;
            }
          `
        ).join("\n")}
          
        entity.ref.entity = undefined;
        ${pool_hash !== undefined ? `entity.pool.push(entity);` : undefined}
    }`;

    const func = new Function("pool_hash", body);

    return func(pool_hash) as DeleteFunction;
  }
}
