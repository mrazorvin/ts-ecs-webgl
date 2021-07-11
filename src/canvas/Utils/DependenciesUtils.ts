/* tslint:disable:no-any */
type Runtime = any;
/* tslint:enable:no-any */

export namespace DependenciesUtils {
  // @helper-types
  export interface Path<A extends string> {}
  export type TupleKeys =
    | "0"
    | "1"
    | "2"
    | "3"
    | "4"
    | "5"
    | "6"
    | "7"
    | "8"
    | "9";
  export interface Arity {
    "0": [];
    "1": [Runtime];
    "2": [Runtime, Runtime];
    "3": [Runtime, Runtime, Runtime];
    "4": [Runtime, Runtime, Runtime, Runtime];
    "5": [Runtime, Runtime, Runtime, Runtime, Runtime];
    "6": [Runtime, Runtime, Runtime, Runtime, Runtime, Runtime];
    "7": [Runtime, Runtime, Runtime, Runtime, Runtime, Runtime, Runtime];
    "8": [
      Runtime,
      Runtime,
      Runtime,
      Runtime,
      Runtime,
      Runtime,
      Runtime,
      Runtime
    ];
    "9": [
      Runtime,
      Runtime,
      Runtime,
      Runtime,
      Runtime,
      Runtime,
      Runtime,
      Runtime,
      Runtime
    ];
  }

  // @array-to-object
  type GetPath<O extends {}> = O extends Path<infer A> ? A : never;
  type GetInstance<O extends {}> = {
    [K in keyof O as `${GetPath<O[K]>}`]: O[K];
  };
  type ConstructObjectFromArray<A extends Runtime[]> = GetInstance<
    {
      [K in keyof A as `${K extends TupleKeys ? K : never}`]: A[K];
    }
  >;

  // @dependencies-builder
  export interface DependencyClass {
    type: string;
  }

  export interface DependencyInstance {}

  type ExtractDependency<T extends { type: string }> = T extends new (
    ...args: Runtime[]
  ) => infer A
    ? A & Path<T["type"]>
    : T extends { create(...args: Runtime[]): infer B }
    ? B & Path<T["type"]>
    : never;

  type DefaultDependency = ExtractDependency<Runtime>;

  export type DependenciesToArguments<
    T extends Dependencies<Runtime[]>
  > = T extends Dependencies<[...infer A]> ? A : [];

  export class Dependencies<T> {
    static create<T extends DefaultDependency[]>(dependencies: T) {
      return new Dependencies(dependencies);
    }

    /**
     * Marker property to satisfy typescript
     */
    dependencies: T = [] as never;

    private constructor(public constructors: DefaultDependency[]) {}
  }

  export function dependOn(): Dependencies<[]>;

  export function dependOn<A1 extends DependencyClass>(
    a1: A1
  ): Dependencies<[ExtractDependency<A1>]>;

  export function dependOn<
    A1 extends DependencyClass,
    A2 extends DependencyClass
  >(
    a1: A1,
    a2: A2
  ): Dependencies<[ExtractDependency<A1>, ExtractDependency<A2>]>;

  export function dependOn<
    A1 extends DependencyClass,
    A2 extends DependencyClass,
    A3 extends DependencyClass
  >(
    // @args
    a1: A1,
    a2: A2,
    a3: A3
  ): Dependencies<
    [ExtractDependency<A1>, ExtractDependency<A2>, ExtractDependency<A3>]
  >;

  export function dependOn<
    A1 extends DependencyClass,
    A2 extends DependencyClass,
    A3 extends DependencyClass,
    A4 extends DependencyClass
  >(
    // @args
    a1: A1,
    a2: A2,
    a3: A3,
    a4: A4
  ): Dependencies<
    [
      ExtractDependency<A1>,
      ExtractDependency<A2>,
      ExtractDependency<A3>,
      ExtractDependency<A4>
    ]
  >;

  export function dependOn<
    A1 extends DependencyClass,
    A2 extends DependencyClass,
    A3 extends DependencyClass,
    A4 extends DependencyClass,
    A5 extends DependencyClass
  >(
    // @args
    a1: A1,
    a2: A2,
    a3: A3,
    a4: A4,
    a5: A5
  ): Dependencies<
    [
      ExtractDependency<A1>,
      ExtractDependency<A2>,
      ExtractDependency<A3>,
      ExtractDependency<A4>,
      ExtractDependency<A5>
    ]
  >;

  export function dependOn<
    A1 extends DependencyClass,
    A2 extends DependencyClass,
    A3 extends DependencyClass,
    A4 extends DependencyClass,
    A5 extends DependencyClass,
    A6 extends DependencyClass
  >(
    // @args
    a1: A1,
    a2: A2,
    a3: A3,
    a4: A4,
    a5: A5,
    a6: A6
  ): Dependencies<
    [
      ExtractDependency<A1>,
      ExtractDependency<A2>,
      ExtractDependency<A3>,
      ExtractDependency<A4>,
      ExtractDependency<A5>,
      ExtractDependency<A6>
    ]
  >;

  export function dependOn<
    A1 extends DependencyClass,
    A2 extends DependencyClass,
    A3 extends DependencyClass,
    A4 extends DependencyClass,
    A5 extends DependencyClass,
    A6 extends DependencyClass,
    A7 extends DependencyClass
  >(
    // @args
    a1: A1,
    a2: A2,
    a3: A3,
    a4: A4,
    a5: A5,
    a6: A6,
    a7: A7
  ): Dependencies<
    [
      ExtractDependency<A1>,
      ExtractDependency<A2>,
      ExtractDependency<A3>,
      ExtractDependency<A4>,
      ExtractDependency<A5>,
      ExtractDependency<A6>,
      ExtractDependency<A7>
    ]
  >;

  export function dependOn<
    A1 extends DependencyClass,
    A2 extends DependencyClass,
    A3 extends DependencyClass,
    A4 extends DependencyClass,
    A5 extends DependencyClass,
    A6 extends DependencyClass,
    A7 extends DependencyClass,
    A8 extends DependencyClass
  >(
    // @args
    a1: A1,
    a2: A2,
    a3: A3,
    a4: A4,
    a5: A5,
    a6: A6,
    a7: A7,
    a8: A8
  ): Dependencies<
    [
      ExtractDependency<A1>,
      ExtractDependency<A2>,
      ExtractDependency<A3>,
      ExtractDependency<A4>,
      ExtractDependency<A5>,
      ExtractDependency<A6>,
      ExtractDependency<A7>,
      ExtractDependency<A8>
    ]
  >;

  export function dependOn<T extends DependencyClass[]>(...dependencies: T) {
    return Dependencies.create(dependencies);
  }

  export function compileSelectorFromDependencies<
    T extends Dependencies<Array<Path<string>>>,
    R,
    ARITY extends TupleKeys = "0"
  >(
    paths: T,
    cb: (
      ...args: [
        ...(T extends Dependencies<[...infer A]> ? A : never),
        ...Arity[ARITY]
      ]
    ) => R,
    additionalArgs = "0" as ARITY
  ): (
    state: ConstructObjectFromArray<T["dependencies"]>,
    ...args: Arity[ARITY]
  ) => R {
    const dependencies = paths.constructors.map((withPath, i) => ({
      // @ts-expect-error
      jsonPath: withPath.type as string,
    }));

    const letters = /^[A-Za-z]+$/;
    const additionalArgsNames = Array(Number(additionalArgs))
      .fill("")
      .map((_, argId) => `arg_${argId}`);

    // tslint:disable:function-constructor no-trailing-whitespace
    const fn = new Function(
      "cb",
      `
      return (cb) => (state, ${additionalArgsNames.join(",")}) => { 
        return cb(${dependencies
          .map(
            ({ jsonPath }) =>
              `state${jsonPath
                .split(".")
                .map((part) =>
                  letters.test(part)
                    ? `.${part}`
                    : `["${part.replace('"', '\\"')}"]`
                )
                .join("")}`
          )
          .concat(additionalArgsNames)
          .join(",")});
      }
    `
    );
    // tslint:enable:function-constructor no-trailing-whitespace

    return fn()(cb) as never;
  }

  // tslint:disable-next-line:no-any
  export function compileMemoizeFactory<T extends any[]>(totalArgs: number) {
    const memoizeVars = Array(totalArgs)
      .fill(0)
      .map((_, i) => ({
        arg: `a${i}`,
        cache: `a${i}_cache`,
      }));
    const reducerVar = "reducer";
    const resultVar = "result";

    // tslint:disable:function-constructor no-trailing-whitespace
    const body = `
    ${memoizeVars
      .map((variable) => `let ${variable.cache} = undefined`)
      .join("; \n")}
    let ${resultVar} = undefined;
    return (${memoizeVars.map((variable) => variable.arg).join(",")}) => {
      if (!(${memoizeVars
        .map((variable) => `Object.is(${variable.cache}, ${variable.arg})`)
        .join("&&")})) {
        ${resultVar} = ${reducerVar}(${memoizeVars
      .map((variable) => variable.arg)
      .join(",")})
      }
      ${memoizeVars
        .map((variable) => `${variable.cache} = ${variable.arg}`)
        .join("; \n")}

      return ${resultVar};
    }
  `;
    const fn = new Function(reducerVar, body);
    // tslint:enable:function-constructor no-trailing-whitespace

    return <R>(reducer: (...args: [...T]) => R): ((...args: [...T]) => R) =>
      fn(reducer);
  }

  export const createDependency = <T extends string>(propPath: T) =>
    class Dependency {
      static type = propPath;
    };

  export const createDependencyTuple = <T extends Array<Path<string>>>(
    ...args: [...T]
  ): T => args;
}
