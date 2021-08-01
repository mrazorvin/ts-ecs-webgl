// body extraction
// scope: {
//   class MyClass {
//       constructor(public x: number, public z: number) { }
//   }
//   const method_start = "constructor(";
//   const method_end = "){";
//   const class_body = MyClass.toString().replaceAll(" ", "");
//   const constructor_start_pos = class_body.indexOf(method_start);
//   const constructor_end_pos = class_body.indexOf(method_end);

//   let braces = 1;
//   let new_body = "";
//   for (let i = constructor_end_pos + method_end.length; i < class_body.length; i++) {
//       const letter = class_body[i];
//       if (letter === "{") braces +=1;
//       if (letter === "}") braces -=1;
//       if (braces === 0) break;
//       new_body += letter;

//   }
//   console.log(`
//       function (${class_body.slice(constructor_start_pos + method_start.length, constructor_end_pos)}) {
//       ${new_body}
//       }
//   `);
// }

// interface _$ {
//   (name: string): undefined;
//   <R extends any[]>(
//     name: string,
//     fn: (fn: <A extends any[]>(components: [...A], fn: (...args: A) => void) => unknown) => new (...args: [...R]) => {}
//   ): { prep(...args: R): unknown };
// }

// function $(): any;
// function $<
//   T extends any[],
//   Y extends (fn: <FN extends <CTX>(this: CTX, ...args: T) => void>(fn: FN) => FN) => new (...args: any[]) => {}
// >(...args: [...T, Y]) {}

// let $!: _$;

// // prettier-ignore
// const Fetch = $("Fetch") ?? $("Fetch", (fn) => class {
//   constructor(public _atlas: typeof atlas, public ctx: WebGL, public world: World) {}
//   do = fn(
//     [Sprite, Transform, Creature, Creature, Creature, Creature, Creature, Creature, Creature],
//     (sprite, transform, creature) => {
//       Sprite.render(
//         this.ctx,
//         sprite,
//         Transform.view(main_world, transform),
//         this.frame.rect[0] / atlas.grid_width,
//         this.frame.rect[1] / atlas.grid_height
//     );
//   })
// })

// Fetch.prep;

// no map involved, just pure objects wi
// render?.Fetch.prep();
