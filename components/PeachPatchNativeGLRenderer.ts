import type { ExpoWebGLRenderingContext } from 'expo-gl';
import type { BufferAttribute, BufferGeometry, Camera, Material, Mesh, Scene } from 'three';

type NativeGLGeometry = {
  count: number;
  normalBuffer: WebGLBuffer;
  positionBuffer: WebGLBuffer;
};

type NativeGLProgram = {
  attributes: {
    normal: number;
    position: number;
  };
  program: WebGLProgram;
  uniforms: {
    baseColor: WebGLUniformLocation;
    fogColor: WebGLUniformLocation;
    modelViewMatrix: WebGLUniformLocation;
    normalMatrix: WebGLUniformLocation;
    projectionMatrix: WebGLUniformLocation;
    unlit: WebGLUniformLocation;
  };
};

export type PeachPatchNativeGLRenderer = {
  dispose: () => void;
  render: (scene: Scene, camera: Camera) => void;
  setSize: (width: number, height: number) => void;
};

const SKY_COLOR = [0x7d / 255, 0xb8 / 255, 0xe8 / 255] as const;

const WEBGL1_VERTEX_SHADER = `
  precision highp float;

  attribute vec3 position;
  attribute vec3 normal;

  uniform mat4 modelViewMatrix;
  uniform mat4 projectionMatrix;
  uniform mat3 normalMatrix;

  varying vec3 vNormal;
  varying float vViewDepth;

  void main() {
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vViewDepth = length(viewPosition.xyz);
    gl_Position = projectionMatrix * viewPosition;
  }
`;

const WEBGL1_FRAGMENT_SHADER = `
  precision mediump float;

  uniform vec3 baseColor;
  uniform vec3 fogColor;
  uniform float unlit;

  varying vec3 vNormal;
  varying float vViewDepth;

  vec3 acesToneMap(vec3 color) {
    return clamp(
      (color * (2.51 * color + 0.03)) / (color * (2.43 * color + 0.59) + 0.14),
      0.0,
      1.0
    );
  }

  void main() {
    vec3 normalDirection = normalize(vNormal);
    vec3 sunDirection = normalize(vec3(-0.46, 0.77, 0.43));
    float sun = max(dot(normalDirection, sunDirection), 0.0);
    float skyMix = normalDirection.y * 0.5 + 0.5;
    vec3 hemisphere = mix(vec3(0.22, 0.34, 0.18), vec3(1.0, 0.94, 0.88), skyMix);
    vec3 lighting = hemisphere * 0.82 + vec3(1.0, 0.91, 0.76) * sun * 0.82;
    vec3 linearColor = mix(baseColor * lighting, baseColor, unlit) * 1.15;
    vec3 displayColor = pow(acesToneMap(linearColor), vec3(1.0 / 2.2));
    float fogAmount = smoothstep(23.0, 49.0, vViewDepth);
    gl_FragColor = vec4(mix(displayColor, fogColor, fogAmount), 1.0);
  }
`;

const WEBGL2_VERTEX_SHADER = `#version 300 es
  precision highp float;

  in vec3 position;
  in vec3 normal;

  uniform mat4 modelViewMatrix;
  uniform mat4 projectionMatrix;
  uniform mat3 normalMatrix;

  out vec3 vNormal;
  out float vViewDepth;

  void main() {
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vViewDepth = length(viewPosition.xyz);
    gl_Position = projectionMatrix * viewPosition;
  }
`;

const WEBGL2_FRAGMENT_SHADER = `#version 300 es
  precision mediump float;

  uniform vec3 baseColor;
  uniform vec3 fogColor;
  uniform float unlit;

  in vec3 vNormal;
  in float vViewDepth;
  out vec4 fragmentColor;

  vec3 acesToneMap(vec3 color) {
    return clamp(
      (color * (2.51 * color + 0.03)) / (color * (2.43 * color + 0.59) + 0.14),
      0.0,
      1.0
    );
  }

  void main() {
    vec3 normalDirection = normalize(vNormal);
    vec3 sunDirection = normalize(vec3(-0.46, 0.77, 0.43));
    float sun = max(dot(normalDirection, sunDirection), 0.0);
    float skyMix = normalDirection.y * 0.5 + 0.5;
    vec3 hemisphere = mix(vec3(0.22, 0.34, 0.18), vec3(1.0, 0.94, 0.88), skyMix);
    vec3 lighting = hemisphere * 0.82 + vec3(1.0, 0.91, 0.76) * sun * 0.82;
    vec3 linearColor = mix(baseColor * lighting, baseColor, unlit) * 1.15;
    vec3 displayColor = pow(acesToneMap(linearColor), vec3(1.0 / 2.2));
    float fogAmount = smoothstep(23.0, 49.0, vViewDepth);
    fragmentColor = vec4(mix(displayColor, fogColor, fogAmount), 1.0);
  }
`;

function compileShader(gl: ExpoWebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Unable to create an OpenGL shader.');

  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) || 'Unknown shader compilation error.';
    gl.deleteShader(shader);
    throw new Error(message);
  }
  return shader;
}

function requiredUniform(gl: ExpoWebGLRenderingContext, program: WebGLProgram, name: string) {
  const location = gl.getUniformLocation(program, name);
  if (location === null) throw new Error(`OpenGL uniform ${name} is unavailable.`);
  return location;
}

function createProgram(gl: ExpoWebGLRenderingContext): NativeGLProgram {
  const supportsWebGL2 = Boolean(
    (gl as ExpoWebGLRenderingContext & { supportsWebGL2?: boolean }).supportsWebGL2,
  );
  const vertexShader = compileShader(
    gl,
    gl.VERTEX_SHADER,
    supportsWebGL2 ? WEBGL2_VERTEX_SHADER : WEBGL1_VERTEX_SHADER,
  );
  const fragmentShader = compileShader(
    gl,
    gl.FRAGMENT_SHADER,
    supportsWebGL2 ? WEBGL2_FRAGMENT_SHADER : WEBGL1_FRAGMENT_SHADER,
  );
  const program = gl.createProgram();
  if (!program) throw new Error('Unable to create the Peach Patch OpenGL program.');

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) || 'Unknown OpenGL program link error.';
    gl.deleteProgram(program);
    throw new Error(message);
  }

  return {
    attributes: {
      normal: gl.getAttribLocation(program, 'normal'),
      position: gl.getAttribLocation(program, 'position'),
    },
    program,
    uniforms: {
      baseColor: requiredUniform(gl, program, 'baseColor'),
      fogColor: requiredUniform(gl, program, 'fogColor'),
      modelViewMatrix: requiredUniform(gl, program, 'modelViewMatrix'),
      normalMatrix: requiredUniform(gl, program, 'normalMatrix'),
      projectionMatrix: requiredUniform(gl, program, 'projectionMatrix'),
      unlit: requiredUniform(gl, program, 'unlit'),
    },
  };
}

function readVertex(attribute: BufferAttribute, index: number) {
  return [attribute.getX(index), attribute.getY(index), attribute.getZ(index)] as const;
}

function writeFlatTriangle(
  positions: Float32Array,
  normals: Float32Array,
  offset: number,
  a: readonly [number, number, number],
  b: readonly [number, number, number],
  c: readonly [number, number, number],
) {
  const edgeABX = b[0] - a[0];
  const edgeABY = b[1] - a[1];
  const edgeABZ = b[2] - a[2];
  const edgeACX = c[0] - a[0];
  const edgeACY = c[1] - a[1];
  const edgeACZ = c[2] - a[2];
  let normalX = edgeABY * edgeACZ - edgeABZ * edgeACY;
  let normalY = edgeABZ * edgeACX - edgeABX * edgeACZ;
  let normalZ = edgeABX * edgeACY - edgeABY * edgeACX;
  const normalLength = Math.hypot(normalX, normalY, normalZ) || 1;
  normalX /= normalLength;
  normalY /= normalLength;
  normalZ /= normalLength;

  positions.set(a, offset);
  positions.set(b, offset + 3);
  positions.set(c, offset + 6);
  for (let vertex = 0; vertex < 3; vertex += 1) {
    normals.set([normalX, normalY, normalZ], offset + vertex * 3);
  }
}

function createGeometry(gl: ExpoWebGLRenderingContext, geometry: BufferGeometry): NativeGLGeometry {
  const position = geometry.getAttribute('position') as BufferAttribute | undefined;
  if (!position) throw new Error('Peach Patch geometry is missing vertex positions.');

  const index = geometry.getIndex();
  const vertexCount = index ? index.count : position.count;
  const triangleCount = Math.floor(vertexCount / 3);
  const positions = new Float32Array(triangleCount * 9);
  const normals = new Float32Array(triangleCount * 9);

  for (let triangle = 0; triangle < triangleCount; triangle += 1) {
    const sourceOffset = triangle * 3;
    const aIndex = index ? index.getX(sourceOffset) : sourceOffset;
    const bIndex = index ? index.getX(sourceOffset + 1) : sourceOffset + 1;
    const cIndex = index ? index.getX(sourceOffset + 2) : sourceOffset + 2;
    writeFlatTriangle(
      positions,
      normals,
      triangle * 9,
      readVertex(position, aIndex),
      readVertex(position, bIndex),
      readVertex(position, cIndex),
    );
  }

  const positionBuffer = gl.createBuffer();
  const normalBuffer = gl.createBuffer();
  if (!positionBuffer || !normalBuffer) throw new Error('Unable to create Peach Patch vertex buffers.');

  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);

  return { count: triangleCount * 3, normalBuffer, positionBuffer };
}

function materialColor(material: Material) {
  const color = (material as Material & { color?: { b: number; g: number; r: number } }).color;
  return color ? [color.r, color.g, color.b] as const : [1, 1, 1] as const;
}

export function createPeachPatchNativeGLRenderer(
  gl: ExpoWebGLRenderingContext,
): PeachPatchNativeGLRenderer {
  const shader = createProgram(gl);
  const geometries = new Map<BufferGeometry, NativeGLGeometry>();
  let width = Math.max(1, gl.drawingBufferWidth);
  let height = Math.max(1, gl.drawingBufferHeight);
  let hasValidatedFramebuffer = false;

  gl.useProgram(shader.program);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.enable(gl.CULL_FACE);
  gl.cullFace(gl.BACK);
  gl.frontFace(gl.CCW);
  gl.clearColor(...SKY_COLOR, 1);

  const projectionMatrix = new Float32Array(16);
  const modelViewMatrix = new Float32Array(16);
  const normalMatrix = new Float32Array(9);

  return {
    dispose: () => {
      geometries.forEach((geometry) => {
        gl.deleteBuffer(geometry.positionBuffer);
        gl.deleteBuffer(geometry.normalBuffer);
      });
      geometries.clear();
      gl.deleteProgram(shader.program);
    },
    render: (scene, camera) => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, width, height);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.useProgram(shader.program);

      scene.updateMatrixWorld(true);
      camera.updateMatrixWorld(true);
      projectionMatrix.set(camera.projectionMatrix.elements);
      gl.uniformMatrix4fv(shader.uniforms.projectionMatrix, false, projectionMatrix);
      gl.uniform3f(shader.uniforms.fogColor, ...SKY_COLOR);

      scene.traverse((object) => {
        const mesh = object as Mesh;
        if (!mesh.isMesh || !mesh.visible) return;
        const material = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as Material;
        if (!material || !material.visible) return;

        let geometry = geometries.get(mesh.geometry);
        if (!geometry) {
          geometry = createGeometry(gl, mesh.geometry);
          geometries.set(mesh.geometry, geometry);
        }

        mesh.modelViewMatrix.multiplyMatrices(camera.matrixWorldInverse, mesh.matrixWorld);
        mesh.normalMatrix.getNormalMatrix(mesh.matrixWorld);
        modelViewMatrix.set(mesh.modelViewMatrix.elements);
        normalMatrix.set(mesh.normalMatrix.elements);
        const color = materialColor(material);

        gl.uniformMatrix4fv(shader.uniforms.modelViewMatrix, false, modelViewMatrix);
        gl.uniformMatrix3fv(shader.uniforms.normalMatrix, false, normalMatrix);
        gl.uniform3f(shader.uniforms.baseColor, ...color);
        gl.uniform1f(shader.uniforms.unlit, material.type === 'MeshBasicMaterial' ? 1 : 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, geometry.positionBuffer);
        gl.enableVertexAttribArray(shader.attributes.position);
        gl.vertexAttribPointer(shader.attributes.position, 3, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, geometry.normalBuffer);
        gl.enableVertexAttribArray(shader.attributes.normal);
        gl.vertexAttribPointer(shader.attributes.normal, 3, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLES, 0, geometry.count);
      });

      if (!hasValidatedFramebuffer) {
        const framebufferStatus = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        if (framebufferStatus !== gl.FRAMEBUFFER_COMPLETE) {
          throw new Error(`Peach Patch framebuffer is incomplete (${framebufferStatus}).`);
        }
        const renderError = gl.getError();
        if (renderError !== gl.NO_ERROR) {
          throw new Error(`Peach Patch OpenGL draw failed (${renderError}).`);
        }
        hasValidatedFramebuffer = true;
      }
    },
    setSize: (nextWidth, nextHeight) => {
      width = Math.max(1, nextWidth);
      height = Math.max(1, nextHeight);
      gl.viewport(0, 0, width, height);
    },
  };
}
