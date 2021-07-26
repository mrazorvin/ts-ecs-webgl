import { Hash } from "./Hash";
import { Component, Entity, World } from "./World";

type DeleteFunction = (entity: Entity, world: World) => void;
type HashType = Hash<typeof Component>;

export class DeleteEntity {
  static func_cache = new Map<HashType, DeleteFunction>();
  static delete(entity: Entity, world: World): void {
    let func = this.func_cache.get(entity.hash);
    if (func === undefined) {
      func = this.generate_function(entity.hash);
      this.func_cache.set(entity.hash, func);
    }

    return func(entity, world);
  }

  // prettier-ignore
  static generate_function(hash: HashType): DeleteFunction {
    let components: Array<typeof Component> = [];
    let current_hash: HashType | undefined = hash;
    while (current_hash && current_hash.value !== Component) {
      components.push(current_hash.value);
      current_hash = current_hash.prev;
    }
    components = components.reverse();
    const storages = [
      ...new Set(components.map(({ storage_row_id }) => storage_row_id)),
    ];
    const body = `
      ${components
        .map((component) => `
          var coll_${component.id} = world.components[${component.id}];
        `).join("")
      }
        
      var components = entity.components;
      ${storages
        .map(
          (storage_id) => `
          var s${storage_id} = components._${storage_id};
          ${components.filter((component) => storage_id === component.storage_row_id)
            .map(
              (component) => `
                var comp_${component.id} = s${storage_id}._${component.container_column_id};
                s${storage_id}._${component.container_column_id} = null;
              `).join("\n")}
        `).join("\n")
      }

      ${components
        .map(
          (component) => `
            if (comp_${component.id} != null) {
              coll_${component.id}.size -= 1;
              coll_${component.id}.refs[entity.register._${component.storage_row_id}._${component.container_column_id}] = coll_${component.id}.refs[coll_${component.id}.size];
              coll_${component.id}.refs.length = coll_${component.id}.size;
            }
          `
        ).join("\n")}
    `;
    console.log(body);
    const func = new Function("entity", "world", body);

    return func as DeleteFunction;
  }
}
