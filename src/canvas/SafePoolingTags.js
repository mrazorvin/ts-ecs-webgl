// @ts-expect-error
const Transform = Build(
  { view: Float32Array },
  { position: Float32Array },
  { scale: Float32Array },
  { rotation: Float32Array },
  { changed: Number({ default: 0 }) }
);

const pool_create = (
  // @ts-expect-errorts-expect
  prev_value: Transform,
  view: Float32Array,
  position: Float32Array,
  scale: Float32Array,
  rotation: Float32Array,
  changed: number | undefined
) => Transform;

const constructor = (
  view: Float32Array,
  position: Float32Array,
  scale: Float32Array,
  rotation: Float32Array,
  changed: number | undefined
) => Transform;

// @ts-expect-error
const VisibleCreature = Tag(Build({ position: new Float32Array(2) }));

// pool tag from the world
const manager = VisibleCreature.manager(world);
const un_managed_tag = manager.tag(); // Un_Managed_Tag<VisibleCreature>
const managed_tag = un_managed_tag.set(new Float32Array(), new Float32Array(), new Float32Array()); // ManagedTag<>
manager.attach(managed_tag /* can accept only managed tags */);
// shorthand 
VisibleCreature.attach(world, new Float32Array(), new Float32Array(), new Float32Array()) // required 

// 1. we could initialize entities only one by one, we must have access to the world + resources
// for example 

// entity
Transform.init = (prev, world, entity, next_transform) => {
  // delay component initialization if world doesn't container requirements yet  

  // so we must but all unseriializable things to one property, which is mostly refs
  // we must be able to the link with world & camera etc..., i.e
  // this is similarly things to loading but without filtering 

  // so correct way to make all components serializable
  // but hen how to ref component with world or camera or parent
  // parent   

  // should setup un-realizable properties 
  const managed_transform = next_transform.set(
    prev.ref1 || 1  // resolve ref from the world
    prev.ref2 || 2  // resolve ref from the world
    prev.ref3 || 3  // ,
  ); // ManagedTransform<T>

  return managed_transform;
}

function collection<T extends any[]>(...items: [...T]) {
  return items;
}

const t = collection(1 as const, true, false, 45 as const);

function filter<T extends [...any]>(collection: T) {
  return collection as any as [
    ...(T[0] extends number ? [T[0]] : []),
    ...(T[1] extends number ? [T[1]] : []),
    ...(T[2] extends number ? [T[2]] : []),
    ...(T[3] extends number ? [T[3]] : []),
    ...(T[4] extends number ? [T[4]] : []),
    ...(T[5] extends number ? [T[5]] : []),
  ]
}

const z = filter(t);

const Sprite = Build(
  { texture: Texture },
  { shader: Shader },
  { mesh: Mesh },
  { tile: Generic<Tile>() }
);

// method non exist because sprite contains references to  
Sprite.serializable()


// collect hero-info sub-world attributes
// 3 messages types
// - global world (all provided entities and components must be injected into global world)
// - local world (all provided entities must be injected into sub-world)
// - all of possible solution is to store all effects in global space and then re-apply them
//   for each creature (no sub-world message, needed), but then it's require to iterate over 
//   each global effect tha currently affect creature and apply it, but we need how to detect
//   which component currently belongs to which creature, since we don't want to run this effects 
//   on inactive creatures
// ??? how to effectively setup creature resource like attributes & resources 
// it's possible to som-how store partial world to component, if component part of the world
// we can store all entities related information in sub-worlds include effects like auras etc...,
// but then on render we must iterate over... alternative
// items, buffs ... etc store in sub-world and sub-world, once per XXX time create their visual representation in global world, then this will work only for visible creatures, adn remove duplication, but how to do that ? 
// this also enable artificial intelligence, i.e worlds communication must be bi-directional
// we should be able to affect global world from sub-world (i.e create effect from aura, create items 
// this also means that we must have a way to inject components in both direction from database
// cross-world ? references 
// web-worker will schedule and order-entities to prevents invalid references creation by re-creating read-only world
// what about mutable references (should be stored in special optional object)

// hacks:
// calculate custom values from attributes:
// attack speed = base + ATTRIBUTE * 23

// we could use skyrim like inventory to disable custom item positions and inventory management
// we could store Hero items and effects in global world if effects and items will be similarly