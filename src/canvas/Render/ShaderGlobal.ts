export namespace ShaderGlobals {
  export enum Attributes {
    Position = "a_Position",
    UV = "a_UV",
  }

  export const Location = {
    [Attributes.Position]: 0,
    [Attributes.UV]: 1,
  };
}
