import { IComponent } from "./Component";
import { Entity } from "./World";

export class Query<CTX_ARGS extends any[] = any[]> {
  constructor(...args: CTX_ARGS) {}

  query!: Query.QueryInfo;
  components!: Array<typeof IComponent>;
  cb!: (entity: Entity, ...args: IComponent[]) => void;
  prep(...args: CTX_ARGS): Query.Prepared<this> {
    return (this as unknown) as Query.Prepared<this>;
  }
}

export namespace Query {
  const PreparedSymbol = Symbol("Prepared");
  export type Prepared<T extends Query = Query> = T & { [PreparedSymbol]: true };

  export function Factory(
    components: Array<typeof IComponent>,
    cb: (entity: Entity, ...args: IComponent[]) => void
  ): QueryInfo {
    return {
      components,
      cb,
    };
  }

  export function Constructor(QueryConstructor: typeof Query): Query {
    const method_start = "constructor(";
    const method_end = "){";
    const class_body = QueryConstructor.toString().replaceAll(" ", "");
    const constructor_start_pos = class_body.indexOf(method_start);
    const constructor_end_pos = class_body.indexOf(method_end);

    let new_body = "";
    for (let i = constructor_end_pos + method_end.length; i < class_body.indexOf("this.query"); i++) {
      new_body += class_body[i];
    }

    const get_prep = new Function(`
      return function prep(${class_body.slice(constructor_start_pos + method_start.length, constructor_end_pos)}) {
        ${new_body}

        return this;
      }
    `) as () => Query["prep"];

    const query = new QueryConstructor();
    query.prep = get_prep();
    query.cb = query.query.cb;
    query.components = query.query.components;

    return query;
  }

  export interface QueryInfo {
    components: Array<typeof IComponent>;
    cb: (entity: Entity, ...args: IComponent[]) => void;
  }

  type Instances<T extends Array<typeof IComponent>> = {
    [K in keyof T]: T[K] extends new (...args: any[]) => infer A ? A : never;
  };

  export interface $ {
    <NAME extends string>(name: NAME): undefined;
    <NAME extends string, R extends any[], I extends {}>(
      name: NAME,
      fn: (
        fn: <A extends Array<typeof IComponent>>(
          components: [...A],
          fn: (entity: Entity, ...args: Instances<A>) => void
        ) => QueryInfo
      ) => new (...args: [...R]) => I & Pick<Query, "query">
    ): Query<R> & I;
  }
}
