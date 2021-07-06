import { Component } from "@mr/ecs/World";
import { Shader, ShaderID } from "./Render/Shader";
import { WebGL } from "./Render/WebGL";

export class View extends Component {
  shaders: Map<typeof Shader, ShaderID>;

  constructor(...shaders: Array<[typeof Shader, ShaderID]>) {
    super();
    this.shaders = new Map(shaders);
  }

  get<T extends typeof Shader>(ctx: WebGL, type: T) {
    const id = this.shaders.get(type);
    return id != null ? ctx.shaders.get(id) : undefined;
  }
}
