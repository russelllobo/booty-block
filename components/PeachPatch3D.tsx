import * as Haptics from 'expo-haptics';
import type { ExpoWebGLRenderingContext, GLViewProps } from 'expo-gl';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { useFocusEffect, useIsFocused } from 'expo-router';
import { Minus, Plus, RotateCcw } from 'lucide-react-native';
import type { ComponentType } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import type { BufferGeometry, Group, Material, Object3D, WebGLRenderer } from 'three';

import { colors } from '../constants/theme';
import { getPeachPatchStage, PeachPatchStage } from '../lib/peachPatch';

function resolveGLView(): ComponentType<GLViewProps> | null {
  if (Platform.OS !== 'web' && !requireOptionalNativeModule('ExpoGL')) return null;

  try {
    return require('expo-gl').GLView as ComponentType<GLViewProps>;
  } catch {
    return null;
  }
}

const OptionalGLView = resolveGLView();

export const PEACH_PATCH_3D_SUPPORTED = OptionalGLView !== null;

const THREE = (PEACH_PATCH_3D_SUPPORTED ? require('three') : null) as typeof import('three');

type CameraState = {
  distance: number;
  yaw: number;
  pitch: number;
};

type AnimatedWorld = {
  root: Group;
  farmers: Group[];
  peachTrees: Group[];
  windmillBlades: Group | null;
};

const INITIAL_CAMERA: CameraState = {
  distance: 17.5,
  yaw: Math.PI * 0.24,
  pitch: Math.PI * 0.24,
};

const FARMER_COLORS = [0xE91E73, 0xF47B2C, 0x7852B8, 0x159783];
const TREE_POSITIONS: Array<[number, number]> = [
  [2.6, 2.4], [3.7, 1.85], [2.65, 3.65], [3.8, 3.35],
  [1.55, 3.45], [4.55, 2.7], [1.7, 2.1], [3.15, 4.55],
  [-0.4, -3.85], [1.05, -3.95], [2.4, -4.15], [3.75, -3.75],
  [-1.7, -4.05], [4.85, -1.25], [-4.45, -2.3], [-4.6, -3.65], [0, 4.75],
];

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function createThreeRenderer(gl: ExpoWebGLRenderingContext, width: number, height: number) {
  const canvas = {
    addEventListener: () => {},
    clientWidth: gl.drawingBufferWidth,
    clientHeight: gl.drawingBufferHeight,
    height: gl.drawingBufferHeight,
    removeEventListener: () => {},
    style: {},
    width: gl.drawingBufferWidth,
  } as unknown as HTMLCanvasElement;

  const renderer = new THREE.WebGLRenderer({
    alpha: false,
    antialias: true,
    canvas,
    context: gl as unknown as WebGLRenderingContext,
  });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height, false);
  return renderer;
}

function standardMaterial(color: number, roughness = 0.86) {
  return new THREE.MeshStandardMaterial({
    color,
    flatShading: true,
    roughness,
    metalness: 0,
  });
}

function makeMesh(
  geometry: BufferGeometry,
  material: Material,
  position: [number, number, number],
  castShadow = true,
  receiveShadow = true,
) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = receiveShadow;
  return mesh;
}

function addBox(
  parent: Object3D,
  size: [number, number, number],
  position: [number, number, number],
  material: Material,
  castShadow = true,
) {
  const mesh = makeMesh(new THREE.BoxGeometry(...size), material, position, castShadow, true);
  parent.add(mesh);
  return mesh;
}

function addPeachTree(parent: Object3D, x: number, z: number, scale: number, materials: FarmMaterials) {
  const tree = new THREE.Group();
  tree.position.set(x, 0, z);
  tree.scale.setScalar(scale);

  addBox(tree, [0.25, 1.3, 0.25], [0, 0.65, 0], materials.trunk);
  const canopyGeometry = new THREE.DodecahedronGeometry(0.68, 0);
  tree.add(makeMesh(canopyGeometry, materials.leaf, [0, 1.55, 0]));
  tree.add(makeMesh(new THREE.DodecahedronGeometry(0.5, 0), materials.leafDark, [-0.44, 1.43, 0.08]));
  tree.add(makeMesh(new THREE.DodecahedronGeometry(0.5, 0), materials.leafLight, [0.42, 1.45, -0.06]));

  const peachGeometry = new THREE.SphereGeometry(0.13, 7, 5);
  tree.add(makeMesh(peachGeometry, materials.peach, [-0.25, 1.56, 0.49]));
  tree.add(makeMesh(peachGeometry.clone(), materials.peach, [0.33, 1.34, 0.43]));
  tree.userData.baseRotation = ((x * 13 + z * 7) % 11) * 0.007;
  parent.add(tree);
  return tree;
}

function addFarmer(parent: Object3D, index: number, materials: FarmMaterials) {
  const farmer = new THREE.Group();
  const shirt = standardMaterial(FARMER_COLORS[index % FARMER_COLORS.length]);

  addBox(farmer, [0.12, 0.42, 0.14], [-0.09, 0.21, 0], materials.denim);
  addBox(farmer, [0.12, 0.42, 0.14], [0.09, 0.21, 0], materials.denim);
  const body = makeMesh(new THREE.CylinderGeometry(0.2, 0.24, 0.54, 6), shirt, [0, 0.66, 0]);
  farmer.add(body);
  farmer.add(makeMesh(new THREE.SphereGeometry(0.23, 7, 5), materials.skin, [0, 1.05, 0]));
  farmer.add(makeMesh(new THREE.CylinderGeometry(0.34, 0.34, 0.06, 12), materials.straw, [0, 1.27, 0]));
  farmer.add(makeMesh(new THREE.CylinderGeometry(0.19, 0.22, 0.13, 10), materials.strawDark, [0, 1.35, 0]));

  farmer.userData.index = index;
  farmer.userData.radiusX = 1.45 + (index % 2) * 0.75;
  farmer.userData.radiusZ = 0.78 + (index % 3) * 0.38;
  farmer.userData.offsetX = index % 2 === 0 ? -0.4 : 1.15;
  farmer.userData.offsetZ = index % 3 === 0 ? 0.15 : -0.4;
  parent.add(farmer);
  return farmer;
}

function addBarn(parent: Object3D, materials: FarmMaterials) {
  const barn = new THREE.Group();
  barn.position.set(-3.25, 0, -2.65);
  addBox(barn, [2.25, 1.7, 1.7], [0, 0.85, 0], materials.barn);
  const roof = makeMesh(new THREE.ConeGeometry(1.72, 1.15, 4), materials.roof, [0, 2.08, 0]);
  roof.rotation.y = Math.PI / 4;
  roof.scale.z = 0.72;
  barn.add(roof);
  addBox(barn, [0.75, 1.08, 0.07], [0, 0.67, 0.87], materials.barnDoor);
  addBox(barn, [0.08, 1.08, 0.04], [0, 0.67, 0.92], materials.roof, false);
  addBox(barn, [0.75, 0.08, 0.04], [0, 0.67, 0.93], materials.roof, false);
  parent.add(barn);
}

function addShed(parent: Object3D, materials: FarmMaterials) {
  const shed = new THREE.Group();
  shed.position.set(-2.55, 0, -2.2);
  addBox(shed, [1.4, 1.04, 1.15], [0, 0.52, 0], materials.shed);
  const roof = makeMesh(new THREE.ConeGeometry(1.05, 0.72, 4), materials.roof, [0, 1.35, 0]);
  roof.rotation.y = Math.PI / 4;
  roof.scale.z = 0.8;
  shed.add(roof);
  addBox(shed, [0.45, 0.72, 0.05], [0, 0.46, 0.59], materials.trunk);
  parent.add(shed);
}

function addWindmill(parent: Object3D, materials: FarmMaterials) {
  const windmill = new THREE.Group();
  windmill.position.set(4.1, 0, -3.65);
  addBox(windmill, [0.78, 2.4, 0.78], [0, 1.2, 0], materials.windmill);
  const roof = makeMesh(new THREE.ConeGeometry(0.72, 0.9, 4), materials.roof, [0, 2.82, 0]);
  roof.rotation.y = Math.PI / 4;
  windmill.add(roof);

  const blades = new THREE.Group();
  blades.position.set(0, 1.8, 0.46);
  for (let index = 0; index < 4; index += 1) {
    const blade = makeMesh(new THREE.BoxGeometry(0.17, 1.1, 0.07), materials.blade, [0, 0.67, 0]);
    const arm = new THREE.Group();
    arm.rotation.z = index * Math.PI / 2;
    arm.add(blade);
    blades.add(arm);
  }
  blades.add(makeMesh(new THREE.CylinderGeometry(0.16, 0.16, 0.16, 8), materials.trunk, [0, 0, 0]));
  blades.children[4].rotation.x = Math.PI / 2;
  windmill.add(blades);
  parent.add(windmill);
  return blades;
}

function addFence(parent: Object3D, x: number, z: number, length: number, alongX: boolean, material: Material) {
  const postCount = Math.max(2, Math.round(length / 1.1));
  for (let index = 0; index < postCount; index += 1) {
    const offset = -length / 2 + (index / (postCount - 1)) * length;
    addBox(
      parent,
      [0.1, 0.68, 0.1],
      [x + (alongX ? offset : 0), 0.34, z + (alongX ? 0 : offset)],
      material,
    );
  }
  addBox(
    parent,
    [alongX ? length : 0.08, 0.09, alongX ? 0.08 : length],
    [x, 0.42, z],
    material,
  );
}

function addCloud(parent: Object3D, position: [number, number, number], scale: number, material: Material) {
  const cloud = new THREE.Group();
  cloud.position.set(...position);
  cloud.scale.setScalar(scale);
  cloud.add(makeMesh(new THREE.DodecahedronGeometry(0.55, 0), material, [0, 0, 0], false, false));
  cloud.add(makeMesh(new THREE.DodecahedronGeometry(0.42, 0), material, [0.48, 0.08, 0], false, false));
  cloud.add(makeMesh(new THREE.DodecahedronGeometry(0.38, 0), material, [-0.5, -0.04, 0], false, false));
  parent.add(cloud);
}

type FarmMaterials = ReturnType<typeof createMaterials>;

function createMaterials() {
  return {
    grass: standardMaterial(0x6DBF47),
    islandSide: standardMaterial(0x496B2D),
    islandBase: standardMaterial(0x314A23),
    path: standardMaterial(0xEBC477),
    soil: standardMaterial(0x7B4229),
    crop: standardMaterial(0x45A94C),
    trunk: standardMaterial(0x6B3924),
    leaf: standardMaterial(0x3C9F4A),
    leafDark: standardMaterial(0x2F873D),
    leafLight: standardMaterial(0x58B84E),
    peach: standardMaterial(0xFF6F8F, 0.72),
    denim: standardMaterial(0x265C97),
    skin: standardMaterial(0xA26747),
    straw: standardMaterial(0xF3BC3C),
    strawDark: standardMaterial(0xD99B28),
    barn: standardMaterial(0xDB3159),
    barnDoor: standardMaterial(0xF7B7A6),
    roof: standardMaterial(0x5E2131),
    shed: standardMaterial(0xF29B50),
    pond: new THREE.MeshStandardMaterial({ color: 0x43A9DA, roughness: 0.25, metalness: 0.06 }),
    windmill: standardMaterial(0xF4D9A3),
    blade: standardMaterial(0xFFF1CD),
    fence: standardMaterial(0xC98442),
    cloud: new THREE.MeshBasicMaterial({ color: 0xF5FAFF }),
  };
}

function buildWorld(stage: PeachPatchStage): AnimatedWorld {
  const root = new THREE.Group();
  const materials = createMaterials();
  const farmers: Group[] = [];
  const peachTrees: Group[] = [];
  const landSize = stage.landSize;

  addBox(root, [landSize + 0.35, 0.3, landSize + 0.35], [0, -0.66, 0], materials.islandBase, false);
  addBox(root, [landSize + 0.16, 0.36, landSize + 0.16], [0, -0.43, 0], materials.islandSide, false);
  addBox(root, [landSize, 0.28, landSize], [0, -0.14, 0], materials.grass, false);
  addBox(root, [landSize * 0.82, 0.065, 0.62], [0, 0.035, 0.55], materials.path, false);
  addBox(root, [0.62, 0.065, landSize * 0.72], [0.75, 0.038, -0.55], materials.path, false);

  const cropStart = -landSize * 0.31;
  for (let row = 0; row < stage.cropRows; row += 1) {
    const z = 1.55 + row * 0.44;
    addBox(root, [2.6, 0.1, 0.28], [cropStart, 0.065, z], materials.soil, false);
    for (let plant = 0; plant < 7; plant += 1) {
      const x = cropStart - 1.12 + plant * 0.37;
      const height = 0.24 + ((plant + row) % 3) * 0.035;
      root.add(makeMesh(new THREE.ConeGeometry(0.13, height, 5), materials.crop, [x, 0.13, z]));
    }
  }

  for (let index = 0; index < stage.peachTrees; index += 1) {
    const [x, z] = TREE_POSITIONS[index % TREE_POSITIONS.length];
    peachTrees.push(addPeachTree(root, x, z, 0.76 + (index % 3) * 0.08, materials));
  }

  addShed(root, materials);
  if (stage.hasBarn) addBarn(root, materials);
  if (stage.hasPond) {
    root.add(makeMesh(new THREE.CylinderGeometry(1.05, 1.05, 0.08, 24), materials.pond, [3.25, 0.025, -2.15], false));
    root.add(makeMesh(new THREE.CylinderGeometry(0.15, 0.15, 0.025, 10), materials.crop, [2.52, 0.09, -1.68], false));
    root.add(makeMesh(new THREE.CylinderGeometry(0.13, 0.13, 0.025, 10), materials.crop, [3.85, 0.09, -2.7], false));
  }
  const windmillBlades = stage.hasWindmill ? addWindmill(root, materials) : null;

  addFence(root, -2.4, 1.25, 3.5, true, materials.fence);
  addFence(root, -4.15, 2.65, 2.8, false, materials.fence);

  for (let index = 0; index < stage.farmers; index += 1) {
    farmers.push(addFarmer(root, index, materials));
  }

  addCloud(root, [-7.5, 5.2, -6.5], 1.25, materials.cloud);
  addCloud(root, [7.2, 4.6, 2.8], 0.9, materials.cloud);
  addCloud(root, [-5.8, 3.9, 6.8], 0.7, materials.cloud);

  return { root, farmers, peachTrees, windmillBlades };
}

function disposeWorld(world: Object3D) {
  const materials = new Set<Material>();
  world.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.geometry.dispose();
    const meshMaterials = Array.isArray(child.material) ? child.material : [child.material];
    meshMaterials.forEach((material) => materials.add(material));
  });
  materials.forEach((material) => material.dispose());
}

type PeachPatch3DProps = {
  completedDays: number;
  active?: boolean;
  interactive?: boolean;
};

export function PeachPatch3D({ completedDays, active = true, interactive = true }: PeachPatch3DProps) {
  const isScreenFocused = useIsFocused();
  const [isAppActive, setIsAppActive] = useState(() => AppState.currentState === 'active');
  const stage = useMemo(() => getPeachPatchStage(completedDays), [completedDays]);
  const [renderFailed, setRenderFailed] = useState(false);
  const [layoutSize, setLayoutSize] = useState({ width: 0, height: 0 });
  const cameraRef = useRef<CameraState>({ ...INITIAL_CAMERA });
  const panStartRef = useRef({ yaw: INITIAL_CAMERA.yaw, pitch: INITIAL_CAMERA.pitch });
  const pinchStartRef = useRef(INITIAL_CAMERA.distance);
  const frameRef = useRef<number | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const layoutSizeRef = useRef({ width: 0, height: 0 });

  useEffect(() => () => {
    cleanupRef.current?.();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      setIsAppActive(nextState === 'active');
    });
    return () => subscription.remove();
  }, []);

  useFocusEffect(useCallback(() => () => {
    cleanupRef.current?.();
  }, []));

  useEffect(() => {
    if (!isScreenFocused || !active || !isAppActive) cleanupRef.current?.();
  }, [active, isAppActive, isScreenFocused]);

  useEffect(() => {
    if (active && isAppActive) setRenderFailed(false);
  }, [active, isAppActive, stage.index]);

  const resetCamera = useCallback(() => {
    cameraRef.current = { ...INITIAL_CAMERA };
    void Haptics.selectionAsync().catch(() => {});
  }, []);

  const changeZoom = useCallback((amount: number) => {
    cameraRef.current.distance = clamp(cameraRef.current.distance + amount, 9.5, 27);
    void Haptics.selectionAsync().catch(() => {});
  }, []);

  const panGesture = useMemo(
    () => Gesture.Pan()
      .maxPointers(1)
      .runOnJS(true)
      .onBegin(() => {
        panStartRef.current = {
          yaw: cameraRef.current.yaw,
          pitch: cameraRef.current.pitch,
        };
      })
      .onUpdate((event) => {
        cameraRef.current.yaw = panStartRef.current.yaw - event.translationX * 0.007;
        cameraRef.current.pitch = clamp(
          panStartRef.current.pitch + event.translationY * 0.0045,
          0.28,
          1.12,
        );
      }),
    [],
  );

  const pinchGesture = useMemo(
    () => Gesture.Pinch()
      .runOnJS(true)
      .onBegin(() => {
        pinchStartRef.current = cameraRef.current.distance;
      })
      .onUpdate((event) => {
        cameraRef.current.distance = clamp(pinchStartRef.current / event.scale, 9.5, 27);
      }),
    [],
  );

  const doubleTapGesture = useMemo(
    () => Gesture.Tap()
      .numberOfTaps(2)
      .maxDuration(280)
      .runOnJS(true)
      .onEnd((_event, success) => {
        if (success) resetCamera();
      }),
    [resetCamera],
  );

  const worldGesture = useMemo(
    () => Gesture.Race(doubleTapGesture, Gesture.Simultaneous(panGesture, pinchGesture)),
    [doubleTapGesture, panGesture, pinchGesture],
  );

  const handleContextCreate = useCallback((gl: ExpoWebGLRenderingContext) => {
    cleanupRef.current?.();
    let active = true;
    const initialWidth = Math.max(1, gl.drawingBufferWidth);
    const initialHeight = Math.max(1, gl.drawingBufferHeight);
    const initialAspect = layoutSizeRef.current.width > 0 && layoutSizeRef.current.height > 0
      ? layoutSizeRef.current.width / layoutSizeRef.current.height
      : initialWidth / initialHeight;
    let renderer: WebGLRenderer;
    try {
      renderer = createThreeRenderer(gl, initialWidth, initialHeight);
    } catch (error) {
      console.error('Peach Patch renderer failed to start:', error);
      setRenderFailed(true);
      return;
    }
    renderer.setPixelRatio(1);
    renderer.setSize(initialWidth, initialHeight, false);
    renderer.setClearColor(0x7DB8E8, 1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x7DB8E8);
    scene.fog = new THREE.Fog(0x7DB8E8, 23, 49);

    const camera = new THREE.PerspectiveCamera(
      43,
      initialAspect,
      0.1,
      100,
    );
    let renderedWidth = initialWidth;
    let renderedHeight = initialHeight;
    let renderedAspect = initialAspect;

    const ambient = new THREE.HemisphereLight(0xFFF7F0, 0x385C30, 2.3);
    scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xFFF1D6, 4.1);
    sun.position.set(-9, 15, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -12;
    sun.shadow.camera.right = 12;
    sun.shadow.camera.top = 12;
    sun.shadow.camera.bottom = -12;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 35;
    scene.add(sun);

    const world = buildWorld(stage);
    scene.add(world.root);
    const startedAt = Date.now();

    const render = () => {
      if (!active) return;
      const elapsed = Date.now() - startedAt;
      const elapsedSeconds = elapsed / 1000;
      const introProgress = clamp(elapsed / 950, 0, 1);
      const introEase = 1 - Math.pow(1 - introProgress, 3);
      const cameraState = cameraRef.current;
      const distance = cameraState.distance + (1 - introEase) * 6;
      const horizontalDistance = Math.cos(cameraState.pitch) * distance;

      const nextWidth = Math.max(1, gl.drawingBufferWidth);
      const nextHeight = Math.max(1, gl.drawingBufferHeight);
      if (nextWidth !== renderedWidth || nextHeight !== renderedHeight) {
        renderedWidth = nextWidth;
        renderedHeight = nextHeight;
        renderer.setSize(renderedWidth, renderedHeight, false);
      }

      const nextAspect = layoutSizeRef.current.width > 0 && layoutSizeRef.current.height > 0
        ? layoutSizeRef.current.width / layoutSizeRef.current.height
        : renderedWidth / renderedHeight;
      if (Math.abs(nextAspect - renderedAspect) > 0.001) {
        renderedAspect = nextAspect;
        camera.aspect = renderedAspect;
        camera.updateProjectionMatrix();
      }

      camera.position.set(
        Math.sin(cameraState.yaw) * horizontalDistance,
        Math.sin(cameraState.pitch) * distance,
        Math.cos(cameraState.yaw) * horizontalDistance,
      );
      camera.lookAt(0, 0.45, 0);

      world.farmers.forEach((farmer, index) => {
        const phase = elapsedSeconds * (1.35 + (index % 3) * 0.16) + index * 1.7;
        const x = farmer.userData.offsetX + Math.cos(phase) * farmer.userData.radiusX;
        const z = farmer.userData.offsetZ + Math.sin(phase) * farmer.userData.radiusZ;
        const nextX = farmer.userData.offsetX + Math.cos(phase + 0.04) * farmer.userData.radiusX;
        const nextZ = farmer.userData.offsetZ + Math.sin(phase + 0.04) * farmer.userData.radiusZ;
        farmer.position.set(x, Math.abs(Math.sin(phase * 4)) * 0.045, z);
        farmer.rotation.y = Math.atan2(nextX - x, nextZ - z);
      });

      world.peachTrees.forEach((tree, index) => {
        tree.rotation.z = tree.userData.baseRotation + Math.sin(elapsedSeconds * 0.85 + index) * 0.009;
      });
      if (world.windmillBlades) world.windmillBlades.rotation.z = elapsedSeconds * 0.72;

      try {
        renderer.render(scene, camera);
        gl.endFrameEXP();
      } catch (error) {
        console.error('Peach Patch renderer failed to draw:', error);
        active = false;
        setRenderFailed(true);
        return;
      }
      frameRef.current = requestAnimationFrame(render);
    };

    cleanupRef.current = () => {
      if (!active) return;
      active = false;
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      // On iOS, GLView owns context destruction. Issuing disposal calls while
      // its native view is unmounting can race the context teardown.
      if (Platform.OS !== 'ios') {
        disposeWorld(world.root);
        renderer.dispose();
      }
    };

    render();
  }, [stage]);

  const shouldRender = Boolean(isScreenFocused && active && isAppActive && OptionalGLView);
  const hasMeasuredLayout = layoutSize.width > 0 && layoutSize.height > 0;
  const patchView = renderFailed && shouldRender ? (
    <View accessibilityLabel="Peach Patch preview unavailable" style={styles.glFallback} />
  ) : shouldRender && hasMeasuredLayout && OptionalGLView ? (
    <OptionalGLView
      key={`peach-patch-buffer-size-${stage.index}`}
      accessibilityLabel={`${interactive ? 'Interactive ' : ''}3D ${stage.title} with ${stage.farmers} farmers and ${stage.peachTrees} peach trees`}
      accessibilityHint={interactive ? 'Drag to orbit, pinch to zoom, or double tap to reset the camera' : undefined}
      onContextCreate={handleContextCreate}
      msaaSamples={4}
      style={styles.glView}
    />
  ) : (
    <View style={styles.glView} />
  );

  const renderedPatchView = interactive && shouldRender ? (
    <GestureDetector gesture={worldGesture}>
      <View style={styles.glContainer}>{patchView}</View>
    </GestureDetector>
  ) : patchView;

  return (
    <View
      onLayout={(event) => {
        const nextLayoutSize = {
          width: event.nativeEvent.layout.width,
          height: event.nativeEvent.layout.height,
        };
        layoutSizeRef.current = nextLayoutSize;
        setLayoutSize((currentLayoutSize) => (
          currentLayoutSize.width === nextLayoutSize.width
            && currentLayoutSize.height === nextLayoutSize.height
            ? currentLayoutSize
            : nextLayoutSize
        ));
      }}
      style={styles.container}
    >
      {renderedPatchView}

      {interactive && shouldRender ? (
        <View accessibilityRole="toolbar" pointerEvents="box-none" style={styles.cameraControls}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Zoom in"
            onPress={() => changeZoom(-2)}
            style={({ pressed }) => [styles.cameraButton, pressed && styles.cameraButtonPressed]}
          >
            <Plus size={19} stroke={colors.cocoa} strokeWidth={2.7} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Zoom out"
            onPress={() => changeZoom(2)}
            style={({ pressed }) => [styles.cameraButton, pressed && styles.cameraButtonPressed]}
          >
            <Minus size={19} stroke={colors.cocoa} strokeWidth={2.7} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Reset 3D view"
            onPress={resetCamera}
            style={({ pressed }) => [styles.cameraButton, pressed && styles.cameraButtonPressed]}
          >
            <RotateCcw size={18} stroke={colors.cocoa} strokeWidth={2.5} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    width: '100%',
  },
  glView: {
    flex: 1,
  },
  glContainer: {
    flex: 1,
  },
  glFallback: {
    backgroundColor: '#7DB8E8',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  cameraControls: {
    gap: 8,
    position: 'absolute',
    right: 16,
    top: 18,
  },
  cameraButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 249, 246, 0.9)',
    borderColor: 'rgba(91, 43, 62, 0.11)',
    borderRadius: 16,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    shadowColor: '#5B2B3E',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    width: 42,
  },
  cameraButtonPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.96 }],
  },
});
