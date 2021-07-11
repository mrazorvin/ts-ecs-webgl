export namespace ShaderGlobals {
  export enum Attribute {
    Position = "a_Position",
    UV = "a_UV",
    Normal = "a_Norm",
  }

  export const Location = {
    [Attribute.Position]: 0,
    [Attribute.UV]: 1,
    [Attribute.Normal]: 2,
  };
}
