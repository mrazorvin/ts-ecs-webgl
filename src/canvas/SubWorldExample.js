import { Pool } from "@mr/ecs/Pool";
import { EntityPool, Resource, sys, World } from "@mr/ecs/World";

// example of sub-world initialization outside of pool

// const world = new World();
// const sub_world = new World();
// sub_world.system(...)
// sub_world.system(...)
// sub_world.system(...)
// sub_world.system(...)

// GenericResource.init(undefined, world);
// GenericResource.init(undefined, world);
// GenericResource.init(undefined, world);

// entity with with sub_world
// component size schedule systems running
// const entity = world.entity([Component1, Component2], sub_world);

const LocalDamageApplicationSystem = sys(
  [BehaviorManager, ResourceManager, AttributeManager],
  (world, bs_manager, rs_manager, as_manager) => {
    world.query("ApplyDamage", or() ?? { components: [DamageComponent] }, (_, damage) => {
      // clear old damage components / or skip single used components
      // instead of manual check expires we could just remove damage component
      // and then on some iteration last system will clear expired behaviour components
      // so behaviour should represent temporary value, otherwise  will be too many iterations
      // if (bs_manager.expires(entity, timer)) return;
      const defense = as_manager.get(DEFENSE, 0);
      const total_damage = Math.max(damage - defense, 0);
      const health = rs_manager.get(HEALTH_RESOURCE);
      health.value -= total_damage;
    });
  }
);

LocalDamageApplicationSystem.depends(DamageComponent);

const LocalMovementAndDefenseCalculation = sys(
  [BehaviorManager, ResourceManager, AttributeManager],
  (world, bs_manager, rs_manager, as_manager) => {
    let resulted_speed = 0;
    world.query("ApplyDamage", or() ?? { components: [Speed] }, (_, { value }) => {
      resulted_speed += value;
    });
    const speed = as_manager.get(ATTR_SPEED);
    speed = resulted_speed;
  }
);

const entity_pool = new EntityPool([Component1, Component2], World);
const pool = new Pool(entity_pool, {
  create: (world, create) => create(Component1.create(world), Component2.create(world)),
  // TODO: must be implemented, manager/prev_entity/world
  reuse: (_, create, a1, a2) => create(Component1.create(a1), Component2.create(a2)),
  world_init: () => {
    const sub_world = new World();

    // resource initialization
    AttributeManager.init(undefined, sub_world);
    ResourceManager.init(undefined, sub_world);
    BehaviorManager.init(undefined, sub_world);

    // system, will be defined only once
    sub_world.system(LocalDamageApplicationSystem);
    // sub_world.system(/* ... */);
    // sub_world.system(/* ... */);
    // sub_world.system(/* ... */);

    // batch optimization
    const manage = ResourceManager.get(sub_world);

    // health / mana / shield / ... any other resource like value
    for (let attribute of attributes) {
      manage.set(world, attribute);
    }

    return world;
  },
  // wrapper around world.clear
  world_reuse: (prev_world, next_world) => {
    // re-initialize resources
    AttributeManager.init(prev_world, next_world);
    ResourceManager.init(prev_world, sub_world);
    BehaviorManager.init(prev_world, next_world);

    // manager could stay in world
    const manage = ResourceManager.get(next_world);

    // reset - health / mana / shield / ... any other resource like value
    for (let attribute of attributes) {
      manage.set(world, attribute);
    }

    return next_world;
  },
});

// modern movement system that reflect creature internal values
const GlobalMovementSystem = sys([Input], (world, input) => {
  world.query("Movement", or() ?? { components: [Hero, Movement], world: true }, (entity, movement) => {
    const speed = AttributeManager.get(entity, ATTR_SPEED, 100);
    const max_health = AttributeManager.get(entity, MAX_HEALTH, 0).v;
    const health = ResourceManager.get(entity, HEALTH_RESOURCE, 0).v;
    const modifier = health.v / max_health.v;
    const real_speed = speed * modifier;

    movement.target[0] = input.x * real_speed;
    movement.target[1] = input.y * real_speed;
  });
});

// slash damage application system / example of resource based changes
const GlobalDamageSystem = sys([Input, LocalWorld], (world, input, sscd) => {
  world.query("SlashInstance", cache() ?? { components: [SlashInstance, Transform] }, (_, slash, transform) => {
    // some how inject predicated into local world, to simplify other code
    sscd.test_collision(transform.shape, (entity) => {
      // will be attached with behaviour component
      BehaviorManager.attach(entity, slash, and() ?? [DamageComponent.create(entity, slash.damage)]);
    });
  });
});

GlobalDamageSystem.depends(SlashInstance);

const scheduler = SubWorldScheduler();

const GlobalSubWorldScheduling = sys([], (world) =>
  world.query("RunSubWorld", or() ?? { components: [SubWorld], world: true }, (entity) => scheduler.run(entity.world))
);

world.system(GlobalMovementSystem);
world.system(GlobalDamageSystem);
world.system(GlobalSubWorldScheduling);
