import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { AgvFleet, AgvStatus, EntityKey, EntitySelection } from '../types/warehouse';
import { AGV_LAPS_PER_SECOND, getAgvFrame } from './agvSimulation';

interface AgvItem extends AgvStatus {
  node: THREE.Object3D;
  offset: number;
  cargoMesh: THREE.Mesh;
  beltMesh: THREE.Mesh;
}

const AGV_COUNT = 7;

export class WarehouseScene {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;

  private defaultCamPos = new THREE.Vector3(56, 44, 54);
  private defaultTarget = new THREE.Vector3(2.0, 0.5, -2.5);

  private interactiveMeshes: THREE.Object3D[] = [];
  private agvRobots: AgvItem[] = [];
  private agvKraftMat = new THREE.MeshStandardMaterial({ color: 0xb58958, roughness: 0.75 });
  private agvWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.35 });
  private robotArmNodes: { turntable: THREE.Object3D; wrist: THREE.Object3D; phase: number }[] = [];
  private cyberParticles: THREE.Points | null = null;
  private particleInitialY: Float32Array | null = null;
  private particlePhases: Float32Array | null = null;
  private warehouseModel: THREE.Group | null = null;
  private movingRoadTruck: THREE.Object3D | null = null;
  private exteriorGroundMesh: THREE.Mesh | null = null;
  private truckRoadMesh: THREE.Mesh | null = null;
  private roadStripesMesh: THREE.Mesh | null = null;
  private warehouseFloorMesh: THREE.Mesh | null = null;
  private epoxyNormalMap: THREE.CanvasTexture | null = null;
  private roadNormalMap: THREE.CanvasTexture | null = null;
  private truckCabMaterials: THREE.MeshPhysicalMaterial[] = [];
  private isTransitioningCamera = false;
  private camTransitionStartTime = 0;
  private camTransitionDuration = 0.85;
  private camStartPos = new THREE.Vector3();
  private camEndPos = new THREE.Vector3();
  private camStartLookAt = new THREE.Vector3();
  private camEndLookAt = new THREE.Vector3();
  private cargoLineMeshes: THREE.Mesh[] = [];
  private glassWallMeshes: THREE.Mesh[] = [];
  private mullionMeshes: THREE.Mesh[] = [];
  private cyberInteriorLight: THREE.PointLight | null = null;
  private outdoorYardLight: THREE.PointLight | null = null;
  private holoScreenPanelMesh: THREE.Mesh | null = null;
  private holoScreenBorderMesh: THREE.Mesh | null = null;
  private holoStandMeshes: THREE.Mesh[] = [];
  private holoScreenTexture: THREE.CanvasTexture | null = null;
  private ambientLight: THREE.AmbientLight | null = null;
  private hemiLight: THREE.HemisphereLight | null = null;
  private sunLight: THREE.DirectionalLight | null = null;
  private fillLight: THREE.DirectionalLight | null = null;
  public currentTheme: 'studio' | 'cyber' = 'cyber';
  private agvRoute: ReturnType<WarehouseScene['initAgvRoute']>;

  private currentTrackedObject: THREE.Object3D | null = null;
  private hasTrackedAnchor = false;
  private clickedAnchorWorldPos = new THREE.Vector3();
  private tempProjVec = new THREE.Vector3();

  private clock = new THREE.Clock();
  private lifecycle = new AbortController();
  private destroyed = false;
  private accumulatedTime = 0;
  private isAnimationPaused = false;
  private reqAnimationId = 0;
  private onPickCallback: ((selection: EntitySelection) => void) | null = null;
  private onFleetUpdateCallback: ((fleet: AgvFleet) => void) | null = null;
  private onManualViewCallback: (() => void) | null = null;
  private onBlankClickCallback: (() => void) | null = null;
  private onPositionUpdateCallback: ((x: number, y: number, behind: boolean) => void) | null = null;

  private downPos: { pointerId: number; x: number; y: number } | null = null;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();

  constructor(container: HTMLElement) {
    this.container = container;
    this.animate = this.animate.bind(this);

    // 1. 场景
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a101b);
    this.scene.fog = new THREE.Fog(0x0a101b, 65, 200);

    // 2. 相机 (34° FOV 保证整仓完整居中铺满，优化近远裁剪面杜绝大场景深度缓冲精度不足)
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(34, w / h, 0.5, 500);
    this.camera.position.copy(this.defaultCamPos);

    // 3. 渲染器
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.container.appendChild(this.renderer.domElement);

    // 4. 控制器
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.10;
    this.controls.maxPolarAngle = Math.PI / 2.15;
    this.controls.minDistance = 14;
    this.controls.maxDistance = 130;
    this.controls.target.copy(this.defaultTarget);

    // 5. 初始化光照与地面微表面法线贴图
    this.epoxyNormalMap = this.generateEpoxyNormalMap();
    this.roadNormalMap = this.generateRoadNormalMap();
    this.initLights();
    this.setTheme(this.currentTheme);

    // 6. 初始化 AGV 巡线导引路线
    this.agvRoute = this.initAgvRoute();

    // 7.1 初始化悬浮赛博微光粒子
    this.initCyberParticles();

    // 8. 绑定事件
    this.bindEvents();

    // 9. 启动动画主循环
    this.requestRender();
  }

  private initLights() {
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.90);
    this.scene.add(this.ambientLight);

    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0xdbe4ee, 0.65);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xffffff, 1.35);
    this.sunLight.position.set(32, 44, 28);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.bias = -0.0002;
    this.sunLight.shadow.normalBias = 0.025;
    this.sunLight.shadow.camera.left = -32;
    this.sunLight.shadow.camera.right = 32;
    this.sunLight.shadow.camera.top = 32;
    this.sunLight.shadow.camera.bottom = -32;
    this.scene.add(this.sunLight);

    this.fillLight = new THREE.DirectionalLight(0xd9e8f8, 0.45);
    this.fillLight.position.set(-25, 25, -25);
    this.scene.add(this.fillLight);

    // 室内柔和科技冷光，照亮深色高反光地坪与机械臂
    this.cyberInteriorLight = new THREE.PointLight(0x00e5ff, 2.4, 55, 1.1);
    this.cyberInteriorLight.position.set(0, 5.8, 0);
    this.scene.add(this.cyberInteriorLight);

    // 室外货运月台与运输干道高杆工业投光照明 (照亮公路沥青质感与重卡车身，真实还原现代物流园区夜间照明)
    this.outdoorYardLight = new THREE.PointLight(0xd5e8ff, 2.4, 85, 1.2);
    this.outdoorYardLight.position.set(24, 14, 0);
    this.scene.add(this.outdoorYardLight);
  }

  private generateEpoxyNormalMap(): THREE.CanvasTexture {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const imgData = ctx.createImageData(size, size);
    const data = imgData.data;

    // 无缝平滑高频 Value Noise (高精工业微橘皮质感，消除低频大波纹)
    const makeSeamlessNoise = (gridW: number, gridH: number, seed: number) => {
      const table = new Float32Array(gridW * gridH);
      for (let j = 0; j < gridH; j++) {
        for (let i = 0; i < gridW; i++) {
          const s = Math.sin(i * 127.1 + j * 311.7 + seed) * 43758.5453123;
          table[j * gridW + i] = s - Math.floor(s);
        }
      }
      return (u: number, v: number) => {
        const gx = ((u * gridW) % gridW + gridW) % gridW;
        const gy = ((v * gridH) % gridH + gridH) % gridH;
        const i0 = Math.floor(gx);
        const j0 = Math.floor(gy);
        const i1 = (i0 + 1) % gridW;
        const j1 = (j0 + 1) % gridH;
        const fx = gx - i0;
        const fy = gy - j0;
        const sx = fx * fx * (3 - 2 * fx);
        const sy = fy * fy * (3 - 2 * fy);

        const v00 = table[j0 * gridW + i0];
        const v10 = table[j0 * gridW + i1];
        const v01 = table[j1 * gridW + i0];
        const v11 = table[j1 * gridW + i1];

        const v0 = v00 + sx * (v10 - v00);
        const v1 = v01 + sx * (v11 - v01);
        return v0 + sy * (v1 - v0);
      };
    };

    const n1 = makeSeamlessNoise(32, 32, 101);
    const n2 = makeSeamlessNoise(64, 64, 202);
    const n3 = makeSeamlessNoise(128, 128, 303);

    const heights = new Float32Array(size * size);
    for (let y = 0; y < size; y++) {
      const v = y / size;
      for (let x = 0; x < size; x++) {
        const u = x / size;
        const h = n1(u, v) * 0.50 + n2(u, v) * 0.35 + n3(u, v) * 0.15;
        heights[y * size + x] = h;
      }
    }

    const bumpScale = 0.9;
    for (let y = 0; y < size; y++) {
      const yPrev = (y - 1 + size) % size;
      const yNext = (y + 1) % size;
      for (let x = 0; x < size; x++) {
        const xPrev = (x - 1 + size) % size;
        const xNext = (x + 1) % size;

        const dx = (heights[y * size + xNext] - heights[y * size + xPrev]) * bumpScale;
        const dy = (heights[yNext * size + x] - heights[yPrev * size + x]) * bumpScale;
        const dz = 1.0;

        const len = Math.hypot(dx, dy, dz);
        const nx = -dx / len;
        const ny = -dy / len;
        const nz = dz / len;

        const idx = (y * size + x) * 4;
        data[idx] = Math.round((nx * 0.5 + 0.5) * 255);
        data[idx + 1] = Math.round((ny * 0.5 + 0.5) * 255);
        data[idx + 2] = Math.round((nz * 0.5 + 0.5) * 255);
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(48, 36);
    return texture;
  }

  private generateRoadNormalMap(): THREE.CanvasTexture {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const imgData = ctx.createImageData(size, size);
    const data = imgData.data;

    const makeSeamlessNoise = (gridW: number, gridH: number, seed: number) => {
      const table = new Float32Array(gridW * gridH);
      for (let j = 0; j < gridH; j++) {
        for (let i = 0; i < gridW; i++) {
          const s = Math.sin(i * 157.3 + j * 271.9 + seed) * 43758.5453123;
          table[j * gridW + i] = s - Math.floor(s);
        }
      }
      return (u: number, v: number) => {
        const gx = ((u * gridW) % gridW + gridW) % gridW;
        const gy = ((v * gridH) % gridH + gridH) % gridH;
        const i0 = Math.floor(gx);
        const j0 = Math.floor(gy);
        const i1 = (i0 + 1) % gridW;
        const j1 = (j0 + 1) % gridH;
        const fx = gx - i0;
        const fy = gy - j0;
        const sx = fx * fx * (3 - 2 * fx);
        const sy = fy * fy * (3 - 2 * fy);

        const v00 = table[j0 * gridW + i0];
        const v10 = table[j0 * gridW + i1];
        const v01 = table[j1 * gridW + i0];
        const v11 = table[j1 * gridW + i1];

        const v0 = v00 + sx * (v10 - v00);
        const v1 = v01 + sx * (v11 - v01);
        return v0 + sy * (v1 - v0);
      };
    };

    const n1 = makeSeamlessNoise(32, 32, 404);
    const n2 = makeSeamlessNoise(64, 64, 505);
    const n3 = makeSeamlessNoise(128, 128, 606);

    const heights = new Float32Array(size * size);
    for (let y = 0; y < size; y++) {
      const v = y / size;
      for (let x = 0; x < size; x++) {
        const u = x / size;
        const h = n1(u, v) * 0.40 + n2(u, v) * 0.35 + n3(u, v) * 0.25;
        heights[y * size + x] = h;
      }
    }

    const bumpScale = 1.0;
    for (let y = 0; y < size; y++) {
      const yPrev = (y - 1 + size) % size;
      const yNext = (y + 1) % size;
      for (let x = 0; x < size; x++) {
        const xPrev = (x - 1 + size) % size;
        const xNext = (x + 1) % size;

        const dx = (heights[y * size + xNext] - heights[y * size + xPrev]) * bumpScale;
        const dy = (heights[yNext * size + x] - heights[yPrev * size + x]) * bumpScale;
        const dz = 1.0;
        const len = Math.hypot(dx, dy, dz);

        const idx = (y * size + x) * 4;
        data[idx] = Math.round((-dx / len * 0.5 + 0.5) * 255);
        data[idx + 1] = Math.round((-dy / len * 0.5 + 0.5) * 255);
        data[idx + 2] = Math.round((dz / len * 0.5 + 0.5) * 255);
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(36, 96);
    return texture;
  }

  private createHoloScreenTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 576;
    const ctx = canvas.getContext('2d')!;

    // 1. 深色微晶科技背景与网格
    ctx.fillStyle = '#06101c';
    ctx.fillRect(0, 0, 1024, 576);

    // 细密科技网格
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.10)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= 1024; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 576);
      ctx.stroke();
    }
    for (let y = 0; y <= 576; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1024, y);
      ctx.stroke();
    }

    // 2. 外部科技边框与四角直角切角标
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.50)';
    ctx.lineWidth = 2;
    ctx.strokeRect(16, 16, 992, 544);

    const cornerLen = 24;
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 4;
    // 左上
    ctx.beginPath(); ctx.moveTo(14, 14 + cornerLen); ctx.lineTo(14, 14); ctx.lineTo(14 + cornerLen, 14); ctx.stroke();
    // 右上
    ctx.beginPath(); ctx.moveTo(1010 - cornerLen, 14); ctx.lineTo(1010, 14); ctx.lineTo(1010, 14 + cornerLen); ctx.stroke();
    // 左下
    ctx.beginPath(); ctx.moveTo(14, 562 - cornerLen); ctx.lineTo(14, 562); ctx.lineTo(14 + cornerLen, 562); ctx.stroke();
    // 右下
    ctx.beginPath(); ctx.moveTo(1010 - cornerLen, 562); ctx.lineTo(1010, 562); ctx.lineTo(1010, 562 - cornerLen); ctx.stroke();

    // 3. 顶部大屏标题条
    ctx.fillStyle = 'rgba(0, 240, 255, 0.15)';
    ctx.fillRect(20, 20, 984, 56);
    ctx.fillStyle = '#00f0ff';
    ctx.font = 'bold 24px "Orbitron", "Inter", sans-serif';
    ctx.fillText('智慧仓储数字孪生全域监控看板 · TELEMETRY MONITOR', 42, 56);

    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(950, 48, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('ONLINE', 965, 53);

    // 4. 左侧指标模块：AGV 运力态势
    ctx.fillStyle = 'rgba(11, 23, 40, 0.75)';
    ctx.fillRect(40, 100, 440, 200);
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(40, 100, 440, 200);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('AGV 集群运力与实时调度态势', 60, 134);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px "Orbitron", sans-serif';
    ctx.fillText('7 / 7', 60, 184);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '14px sans-serif';
    ctx.fillText('全域集群在线  |  激光导引精度 ±2mm', 160, 178);

    // 虚拟动态折线
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    const pts = [140, 165, 130, 175, 120, 180, 150, 190, 145, 195, 160, 210];
    for (let i = 0; i < pts.length; i++) {
      const px = 60 + i * 32;
      const py = 280 - (pts[i] - 100);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // 5. 右侧指标模块：高位立垛与冷链仓
    ctx.fillStyle = 'rgba(11, 23, 40, 0.75)';
    ctx.fillRect(520, 100, 460, 200);
    ctx.strokeRect(520, 100, 460, 200);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('气密恒温冷链仓与立垛库容遥测', 540, 134);

    ctx.fillStyle = '#00f0ff';
    ctx.font = 'bold 36px "Orbitron", sans-serif';
    ctx.fillText('-18.2 °C', 540, 184);
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('温控 100% 达标  |  微气压差 +25Pa', 710, 178);

    // 进度条
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(540, 220, 420, 12);
    ctx.fillStyle = '#00f0ff';
    ctx.fillRect(540, 220, 370, 12);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '13px sans-serif';
    ctx.fillText('立库容积率: 88.4% (708 / 800 托)', 540, 255);

    // 6. 底部工位与自动化月台流水状态
    ctx.fillStyle = 'rgba(11, 23, 40, 0.75)';
    ctx.fillRect(40, 320, 940, 210);
    ctx.strokeRect(40, 320, 940, 210);

    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('3大月台出入库泊位联动  &  六轴工业机械臂拣选台', 60, 354);

    const docks = [
      { name: '1号月台 (伸缩滚筒)', stat: '高速驳运中 · 120件/分', color: '#10b981' },
      { name: '2号月台 (冷链重挂)', stat: '生鲜密封对接 · -18°C', color: '#38bdf8' },
      { name: '3号月台 (干线厢车)', stat: '整托出库 · 准备离泊', color: '#f59e0b' }
    ];

    docks.forEach((d, idx) => {
      const dx = 60 + idx * 310;
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(dx, 380, 290, 120);
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.strokeRect(dx, 380, 290, 120);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText(d.name, dx + 16, 415);

      ctx.fillStyle = d.color;
      ctx.font = '14px sans-serif';
      ctx.fillText(d.stat, dx + 16, 450);
    });

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  private createParticleTexture(): THREE.CanvasTexture {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // 绘制柔和羽化光晕圆斑 (消除生硬方块像素点假影)
    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0.0, 'rgba(56, 189, 248, 0.90)');
    grad.addColorStop(0.25, 'rgba(14, 165, 233, 0.35)');
    grad.addColorStop(0.60, 'rgba(2, 132, 199, 0.08)');
    grad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  private initCyberParticles() {
    const particleCount = 60;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    this.particleInitialY = new Float32Array(particleCount);
    this.particlePhases = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 30;
      const y = 0.8 + Math.random() * 4.2;
      positions[i * 3 + 1] = y;
      this.particleInitialY[i] = y;
      this.particlePhases[i] = Math.random() * Math.PI * 2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.35,
      map: this.createParticleTexture(),
      transparent: true,
      opacity: 0.32,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.cyberParticles = new THREE.Points(geometry, material);
    this.cyberParticles.visible = this.currentTheme === 'cyber';
    this.scene.add(this.cyberParticles);
  }

  private initAgvRoute() {
    // 用 Path 的二维坐标表示地面的 X/Z。absarc 会用直线接到圆弧切点。
    const path = new THREE.Path();
    const westX = -6.8;
    const eastX = 6.8;
    const northZ = -4.6;
    const southZ = 4.6;
    const dockX = -8.92;
    const dockZ = -5.5;
    const pickupX = -8.5;
    const unloadZ = -1.5;
    const aisleRadius = 0.7;
    const dockRadius = 0.4;
    // 缩短月台回转支路，让七台车等距巡线时能错开支路交叉口。
    const dockExitRadius = 0.8;
    const quarterTurn = Math.PI / 2;

    // 以模型的取货圆环为环路起点，在东侧卸货圆环记录已行驶距离。
    path.moveTo(pickupX, dockZ);
    path.lineTo(westX - dockExitRadius, dockZ);
    path.absarc(westX - dockExitRadius, dockZ + dockExitRadius, dockExitRadius, -quarterTurn, 0);
    path.absarc(westX + aisleRadius, southZ - aisleRadius, aisleRadius, Math.PI, quarterTurn, true);
    path.absarc(eastX - aisleRadius, southZ - aisleRadius, aisleRadius, quarterTurn, 0, true);
    path.lineTo(eastX, unloadZ);
    const unloadDistance = path.getLength();
    path.absarc(eastX - aisleRadius, northZ + aisleRadius, aisleRadius, 0, -quarterTurn, true);
    path.absarc(dockX + dockRadius, northZ - dockRadius, dockRadius, quarterTurn, Math.PI);
    path.absarc(dockX + dockRadius, dockZ + dockRadius, dockRadius, Math.PI, 3 * quarterTurn);
    path.lineTo(pickupX, dockZ);

    const routeGeo = new THREE.BufferGeometry().setFromPoints(
      path.getPoints().map((point) => new THREE.Vector3(point.x, 0.12, point.y))
    );
    const routeMat = new THREE.LineDashedMaterial({
      color: 0x00f0ff,
      dashSize: 0.6,
      gapSize: 0.35,
      linewidth: 3
    });
    const agvGroundRoute = new THREE.Line(routeGeo, routeMat);
    agvGroundRoute.computeLineDistances();
    this.scene.add(agvGroundRoute);

    // 箭头指示
    const navArrowsGroup = new THREE.Group();
    const arrowGeo = new THREE.ConeGeometry(0.18, 0.4, 4);
    arrowGeo.rotateX(Math.PI / 2);
    const arrowMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    for (let t = 0; t < 1.0; t += 0.05) {
      const p = path.getPoint(t);
      const tg = path.getTangent(t);
      const arrow = new THREE.Mesh(arrowGeo, arrowMat);
      arrow.position.set(p.x, 0.13, p.y);
      arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(tg.x, 0, tg.y));
      navArrowsGroup.add(arrow);
    }
    this.scene.add(navArrowsGroup);

    return { path, unloadProgress: unloadDistance / path.getLength() };
  }

  public async loadModel(onProgress: (percent: number) => void): Promise<void> {
    const signal = this.lifecycle.signal;
    const timeout = window.setTimeout(() => this.lifecycle.abort(), 30_000);
    try {
      onProgress(15);
      const response = await fetch('/smart_warehouse.glb?v=2.3.0', { signal });
      if (!response.ok) throw new Error(`GLB request failed (${response.status})`);

      const data = await response.arrayBuffer();
      onProgress(75);
      const gltf = await new GLTFLoader().parseAsync(data, '/');
      if (signal.aborted) {
        this.disposeResources(gltf.scene);
        throw new Error('GLB loading was canceled or timed out');
      }

      this.attachWarehouse(gltf.scene);
      this.updateSimulation(true);
      this.clock.getDelta();
      this.requestRender();
      onProgress(100);
    } finally {
      window.clearTimeout(timeout);
    }
  }

  private attachWarehouse(model: THREE.Group) {
    this.warehouseModel = model;
    this.scene.add(this.warehouseModel);

    this.warehouseModel.traverse((child) => {
      if ((child as any).isLight) {
        (child as any).intensity = 0;
        return;
      }

      if ((child as THREE.Mesh).isMesh) {
        const n = child.name;

        // 1. 浅蓝通透高保真钢化玻璃幕墙与双面透光 (光学级透射)
        if (n.startsWith('Glass_')) {
          child.castShadow = false;
          child.receiveShadow = false;
          this.glassWallMeshes.push(child as THREE.Mesh);
          (child as THREE.Mesh).material = new THREE.MeshPhysicalMaterial({
            color: 0xcbe6ff,
            transparent: true,
            opacity: 1.0,
            roughness: 0.05,
            metalness: 0.02,
            transmission: 0.92,
            ior: 1.52,
            thickness: 0.5,
            reflectivity: 0.65,
            clearcoat: 0.85,
            clearcoatRoughness: 0.04,
            depthWrite: false,
            side: THREE.DoubleSide
          });
        } else if (n.startsWith('Mullion_')) {
          // 1.1 玻璃幕墙深色高刚性金属立柱与横梁骨架
          this.mullionMeshes.push(child as THREE.Mesh);
          child.castShadow = true;
          child.receiveShadow = true;
        } else if (n.startsWith('AGV_Trajectory_Laser_Line') || n.startsWith('AGV_Track_Base_Band')) {
          // 隐藏模型内的旧导轨，地面导引线和车辆统一使用运行时路线。
          child.visible = false;
          return;
        } else if (n.startsWith('AGV_Waypoint_')) {
          // 2.2 AGV 导航地标与工位圆环
          child.castShadow = false;
          child.receiveShadow = false;
          (child as THREE.Mesh).material = new THREE.MeshBasicMaterial({
            color: 0x00f3ff,
            side: THREE.DoubleSide
          });
        } else if (n.startsWith('Cargo_Line_')) {
          // 2.3 货物存储区/托盘定置区工业 5S 琥珀黄色标线 (与 AGV 行驶轨迹清晰区分)
          child.castShadow = false;
          child.receiveShadow = false;
          child.renderOrder = 4;
          child.position.y += 0.015; // 抬高15mm杜绝与地面共面 Z-fighting
          (child as THREE.Mesh).material = new THREE.MeshBasicMaterial({
            color: 0xf59e0b,
            polygonOffset: true,
            polygonOffsetFactor: -3,
            polygonOffsetUnits: -3,
            depthTest: true
          });
          this.cargoLineMeshes.push(child as THREE.Mesh);
        } else if (n === 'Warehouse_Floor') {
          // 3. 高反光地坪 (由 setTheme 根据当前模式统一着色与高光设定)
          this.warehouseFloorMesh = child as THREE.Mesh;
          child.castShadow = false;
          child.receiveShadow = true;
        } else if (n === 'Exterior_Ground') {
          this.exteriorGroundMesh = child as THREE.Mesh;
          child.castShadow = false;
          child.receiveShadow = true;
        } else if (n === 'Truck_Road_East') {
          this.truckRoadMesh = child as THREE.Mesh;
          child.castShadow = false;
          child.receiveShadow = true;
        } else if (n === 'Road_Stripes_Unified') {
          this.roadStripesMesh = child as THREE.Mesh;
          child.castShadow = false;
          child.receiveShadow = false;
          child.renderOrder = 5;
        } else if (n === 'Holo_Screen_Panel') {
          // 隐藏原 GLB 内部被完全包裹遮挡的旧模型面板
          child.visible = false;
        } else if (n === 'Holo_Screen_Border') {
          // 4.1 全息大屏钛合金外框底壳与后背板
          this.holoScreenBorderMesh = child as THREE.Mesh;
          child.castShadow = true;
          child.receiveShadow = true;
          (child as THREE.Mesh).material = new THREE.MeshStandardMaterial({
            color: 0x162232,
            roughness: 0.28,
            metalness: 0.75
          });
        } else if (n.startsWith('Holo_Stand_')) {
          // 4.2 全息大屏金属落地支撑脚架
          this.holoStandMeshes.push(child as THREE.Mesh);
          child.castShadow = true;
          child.receiveShadow = true;
          (child as THREE.Mesh).material = new THREE.MeshStandardMaterial({
            color: 0x5a6d85,
            roughness: 0.25,
            metalness: 0.85
          });
        } else if (n.endsWith('_Glass')) {
          child.castShadow = false;
          child.receiveShadow = false;
          child.renderOrder = 10;
        } else {
          child.castShadow = true;
          child.receiveShadow = true;
        }

        // 5. 补齐重型卡车 PBR 清漆车漆、透明车窗玻璃与金属件分级管线
        const meshObj = child as THREE.Mesh;
        if (meshObj.material) {
          const matList = Array.isArray(meshObj.material) ? meshObj.material : [meshObj.material];
          matList.forEach((m, idx) => {
            if (!m) return;
            if (m.name === 'Mat_Truck_Cab') {
              const carPaint = new THREE.MeshPhysicalMaterial({
                color: this.currentTheme === 'cyber' ? 0x1e6bb8 : 0x2563eb,
                metalness: 0.38,
                roughness: 0.20,
                clearcoat: 1.0,
                clearcoatRoughness: 0.04
              });
              this.truckCabMaterials.push(carPaint);
              if (Array.isArray(meshObj.material)) {
                (meshObj.material as THREE.Material[])[idx] = carPaint;
              } else {
                meshObj.material = carPaint;
              }
            } else if (m.name === 'Mat_Glass_Cyan') {
              // 高透汽车级透明物理玻璃：光线直透座舱内部方向盘、座椅与发光屏，表面叠加镜面清漆高光
              const truckGlass = new THREE.MeshPhysicalMaterial({
                color: 0xe0f2fe,
                transparent: true,
                opacity: 0.20,
                roughness: 0.03,
                metalness: 0.05,
                clearcoat: 1.0,
                clearcoatRoughness: 0.03,
                depthWrite: false,
                side: THREE.DoubleSide
              });
              meshObj.castShadow = false;
              meshObj.receiveShadow = false;
              meshObj.renderOrder = 10;
              if (Array.isArray(meshObj.material)) {
                (meshObj.material as THREE.Material[])[idx] = truckGlass;
              } else {
                meshObj.material = truckGlass;
              }
            } else if (m.name === 'Mat_Screen_Glow') {
              // 自发光天青色液晶屏与前大灯/雾灯：BasicMaterial 无阴影接收，配合 polygonOffset 彻底杜绝共面与自阴影闪烁
              const ledLight = new THREE.MeshBasicMaterial({
                color: 0x67e8f9,
                polygonOffset: true,
                polygonOffsetFactor: -3,
                polygonOffsetUnits: -3,
                toneMapped: false
              });
              if (Array.isArray(meshObj.material)) {
                (meshObj.material as THREE.Material[])[idx] = ledLight;
              } else {
                meshObj.material = ledLight;
              }
            } else if (m.name === 'Mat_TailLight_Glow') {
              // 真实工业高亮红宝石尾灯
              const redLed = new THREE.MeshBasicMaterial({
                color: 0xf43f5e,
                polygonOffset: true,
                polygonOffsetFactor: -3,
                polygonOffsetUnits: -3,
                toneMapped: false
              });
              if (Array.isArray(meshObj.material)) {
                (meshObj.material as THREE.Material[])[idx] = redLed;
              } else {
                meshObj.material = redLed;
              }
            } else if (m.name === 'Mat_Marker_Glow') {
              // 车顶与货厢侧面琥珀黄安全示宽小灯
              const amberLed = new THREE.MeshBasicMaterial({
                color: 0xfbbf24,
                polygonOffset: true,
                polygonOffsetFactor: -3,
                polygonOffsetUnits: -3,
                toneMapped: false
              });
              if (Array.isArray(meshObj.material)) {
                (meshObj.material as THREE.Material[])[idx] = amberLed;
              } else {
                meshObj.material = amberLed;
              }
            } else if (m.name === 'Mat_Seat_Fabric') {
              if ((m as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
                const std = m as THREE.MeshStandardMaterial;
                std.color.setHex(0x334155);
                std.metalness = 0.08;
                std.roughness = 0.65;
              }
            } else if (m.name === 'Mat_Dashboard') {
              if ((m as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
                const std = m as THREE.MeshStandardMaterial;
                std.color.setHex(0x1e293b);
                std.metalness = 0.05;
                std.roughness = 0.70;
              }
            } else if (m.name === 'Mat_Truck_Box') {
              if ((m as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
                const std = m as THREE.MeshStandardMaterial;
                std.metalness = 0.08;
                std.roughness = 0.32;
              }
            } else if (m.name === 'Mat_Steel_Frame') {
              if ((m as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
                const std = m as THREE.MeshStandardMaterial;
                std.metalness = 0.90;
                std.roughness = 0.24;
              }
            } else if (m.name === 'Mat_Conveyor_Metal') {
              if ((m as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
                const std = m as THREE.MeshStandardMaterial;
                std.metalness = 0.96;
                std.roughness = 0.14;
              }
            } else if (m.name === 'Mat_Dark_Trim') {
              if ((m as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
                const std = m as THREE.MeshStandardMaterial;
                std.metalness = 0.02;
                std.roughness = 0.85;
              }
            }
          });
        }

        // 工位圆环仅用于导引，车辆由各自的 GLB 根节点统一登记。
        if (n.startsWith('AGV_')) return;

        let matchedKey: EntityKey | null = null;

        if (n.includes('Workstation') || n.startsWith('WS_') || n.includes('Robot_')) {
          matchedKey = 'pc_workstation';
        } else if (n.includes('Conveyor') || n.includes('Sort_Table')) {
          matchedKey = 'conveyor_dock1';
        } else if (n.includes('Cold_') || n.includes('Snowflake')) {
          matchedKey = 'cold_storage';
        } else if (n.includes('Pallet_South')) {
          matchedKey = 'pallet_south';
        } else if (n.includes('Pallet_East') || n.includes('Pallet_North') || n.includes('Pallet_West')) {
          matchedKey = 'pallet_east';
        } else if (n.includes('Truck_Stationary_Dock1')) {
          matchedKey = 'truck_dock1';
        } else if (n.includes('Truck_Stationary_Dock2')) {
          matchedKey = 'truck_dock2';
        } else if (n.includes('Truck_Stationary_Dock3') || n.includes('Truck_Moving_Road')) {
          matchedKey = 'outbound_truck';
        }

        if (matchedKey) {
          child.userData.entityKey = matchedKey;
          this.interactiveMeshes.push(child);
        }
      }
    });

    // 提取 6 台六轴工业机械臂关节，用于平滑拣选点动动画
    for (let i = 1; i <= 6; i++) {
      const prefix = `Workstation_Robot_${i < 10 ? '0' + i : i}`;
      const tt = this.warehouseModel.getObjectByName(`${prefix}_Turntable`);
      const wrist = this.warehouseModel.getObjectByName(`${prefix}_Wrist`);
      if (tt && wrist) {
        this.robotArmNodes.push({ turntable: tt, wrist: wrist, phase: i * 1.15 });
      }
    }

    // 每台车配对登记一只车载箱和一只传送带箱，供同一次到站交替显示。
    const agvBoxGeo = new THREE.BoxGeometry(0.52, 0.32, 0.42);
    for (let id = 1; id <= AGV_COUNT; id++) {
      const agvName = `AGV_Robot_${String(id).padStart(2, '0')}`;
      const node = this.warehouseModel.getObjectByName(agvName);
      if (!node) continue;

      const cargoMesh = new THREE.Mesh(agvBoxGeo, this.agvKraftMat);
      cargoMesh.position.y = 0.30;
      cargoMesh.castShadow = true;
      cargoMesh.receiveShadow = true;
      node.add(cargoMesh);
      Object.assign(node.userData, { entityKey: 'agv_robot', agvId: id, moves: true });

      const beltMesh = new THREE.Mesh(agvBoxGeo, this.agvWhiteMat);
      beltMesh.castShadow = true;
      beltMesh.receiveShadow = true;
      beltMesh.userData = { entityKey: 'conveyor_dock1', moves: true };
      this.scene.add(beltMesh);
      this.interactiveMeshes.push(node, beltMesh);

      this.agvRobots.push({
        id,
        node,
        offset: (id - 1) / AGV_COUNT,
        cargoMesh,
        beltMesh,
        phase: 'returning',
        hasCargo: false
      });
    }

    // 提取公路巡航重卡
    this.movingRoadTruck = this.warehouseModel.getObjectByName('Truck_Moving_Road') || null;
    if (this.movingRoadTruck) {
      this.movingRoadTruck.userData.entityKey = 'outbound_truck';
      this.movingRoadTruck.userData.moves = true;
      this.interactiveMeshes.push(this.movingRoadTruck);
    }

    // 4.3 构建居于大屏边框前表面的超清自发光全息管控大屏 (不受内部死黑模型包裹)
    if (!this.holoScreenTexture) {
      this.holoScreenTexture = this.createHoloScreenTexture();
    }
    const screenGeo = new THREE.PlaneGeometry(4.25, 2.42);
    const screenMat = new THREE.MeshBasicMaterial({
      map: this.holoScreenTexture,
      side: THREE.DoubleSide
    });
    this.holoScreenPanelMesh = new THREE.Mesh(screenGeo, screenMat);
    this.holoScreenPanelMesh.position.set(4.48, 1.80, -7.12);
    this.holoScreenPanelMesh.rotation.y = -0.2366;
    this.holoScreenPanelMesh.renderOrder = 3;
    this.scene.add(this.holoScreenPanelMesh);

    this.setTheme(this.currentTheme);
  }

  // 3D 相机 Dolly 缩放 (不触动任何 DOM/页面)
  public zoomCamera(ratio: number) {
    this.isTransitioningCamera = false;
    const offset = new THREE.Vector3().subVectors(this.camera.position, this.controls.target);
    let dist = offset.length();
    dist *= ratio;
    dist = THREE.MathUtils.clamp(dist, this.controls.minDistance, this.controls.maxDistance);
    offset.setLength(dist);
    this.camera.position.copy(this.controls.target).add(offset);
    this.controls.update();
    this.requestRender();
  }

  public resetCameraView() {
    this.smoothResetCameraView(0.85);
  }

  public smoothResetCameraView(duration = 0.85) {
    this.startCameraTransition(this.defaultCamPos, this.defaultTarget, duration);
  }

  public setTopView() {
    this.startCameraTransition(
      new THREE.Vector3(this.defaultTarget.x, 72, this.defaultTarget.z + 0.01),
      this.defaultTarget,
      0.85
    );
  }

  public focusHoloScreen() {
    this.startCameraTransition(
      new THREE.Vector3(3.4, 2.05, -3.2),
      new THREE.Vector3(4.48, 1.80, -7.12),
      0.85
    );
  }

  public startCameraTransition(endPos: THREE.Vector3, endLookAt: THREE.Vector3, duration = 0.85) {
    this.camStartPos.copy(this.camera.position);
    this.camEndPos.copy(endPos);
    this.camStartLookAt.copy(this.controls.target);
    this.camEndLookAt.copy(endLookAt);
    this.camTransitionDuration = duration;
    this.camTransitionStartTime = performance.now();
    this.isTransitioningCamera = true;
    this.requestRender();
  }

  public focusOnEntity(key: EntityKey, anchorPos: [number, number, number]) {
    const target = new THREE.Vector3(anchorPos[0], Math.max(0.4, anchorPos[1] - 0.4), anchorPos[2]);
    const camOffset = new THREE.Vector3(-4.5, 4.0, 5.0);

    switch (key) {
      case 'agv_robot':
        camOffset.set(-4.0, 3.2, 4.2);
        break;
      case 'pc_workstation':
        camOffset.set(-4.2, 3.8, 4.8);
        break;
      case 'conveyor_dock1':
        camOffset.set(-5.5, 4.2, 5.5);
        break;
      case 'truck_dock1':
        camOffset.set(-5.5, 3.2, 4.5);
        break;
      case 'truck_dock2':
      case 'outbound_truck':
        camOffset.set(5.5, 3.0, 4.2);
        break;
      case 'cold_storage':
        camOffset.set(-5.5, 4.0, 6.2);
        break;
      case 'pallet_south':
      case 'pallet_east':
        camOffset.set(-5.0, 4.5, 5.2);
        break;
    }

    const endCamPos = target.clone().add(camOffset);
    this.startCameraTransition(endCamPos, target, 0.85);
  }

  public focusOnTruckCockpit() {
    this.startCameraTransition(
      new THREE.Vector3(24.8, 3.0, 5.0),
      new THREE.Vector3(22.8, 2.1, 3.1),
      0.85
    );
  }

  public selectEntityByKey(key: EntityKey) {
    const targetObj = this.interactiveMeshes.find((m) => m.visible && m.userData.entityKey === key);
    if (targetObj) {
      const box = new THREE.Box3().setFromObject(targetObj);
      const center = new THREE.Vector3();
      box.getCenter(center);
      const anchorPos: [number, number, number] = [center.x, box.max.y + 0.35, center.z];
      this.pickEntity(targetObj, anchorPos);
    }
  }

  public setAnimationPaused(paused: boolean) {
    if (paused === this.isAnimationPaused) return;
    this.isAnimationPaused = paused;
    this.clock.getDelta();
    this.requestRender();
  }

  public setCyberParticlesVisible(visible: boolean) {
    if (this.cyberParticles) {
      this.cyberParticles.visible = visible && this.currentTheme === 'cyber';
      this.requestRender();
    }
  }

  public setTheme(theme: 'studio' | 'cyber') {
    this.currentTheme = theme;
    if (theme === 'cyber') {
      // 赛博深空全息模式：与深色微晶 HUD 100% 融合，通透深青蓝高反光地坪 + 绚丽全息看板
      this.scene.background = new THREE.Color(0x0a101b);
      this.scene.fog = new THREE.Fog(0x0a101b, 65, 200);

      if (this.ambientLight) {
        this.ambientLight.intensity = 0.85;
        this.ambientLight.color.setHex(0x6080a2);
      }
      if (this.hemiLight) {
        this.hemiLight.intensity = 0.55;
        this.hemiLight.color.setHex(0x38bdf8);
      }
      if (this.sunLight) {
        this.sunLight.intensity = 1.25;
        this.sunLight.color.setHex(0xdbeaff);
      }
      if (this.fillLight) {
        this.fillLight.intensity = 0.65;
        this.fillLight.color.setHex(0x00f0ff);
      }
      if (this.cyberInteriorLight) {
        this.cyberInteriorLight.intensity = 2.4;
      }
      if (this.outdoorYardLight) {
        this.outdoorYardLight.intensity = 2.4;
        this.outdoorYardLight.color.setHex(0xd5e8ff);
      }
      if (this.cyberParticles) {
        this.cyberParticles.visible = true;
      }

      if (this.warehouseFloorMesh && (this.warehouseFloorMesh.material as THREE.MeshStandardMaterial)) {
        const mat = this.warehouseFloorMesh.material as THREE.MeshStandardMaterial;
        mat.color.setHex(0x162335); // 工业哑光微晶深青地坪 (微橘皮高反光，干净利落无波纹)
        mat.roughness = 0.28;
        mat.metalness = 0.15;
        if (!mat.normalMap && this.epoxyNormalMap) {
          mat.normalMap = this.epoxyNormalMap;
        }
        mat.normalScale.set(0.035, 0.035);
      }
      this.truckCabMaterials.forEach((mat) => {
        mat.color.setHex(0x1e6bb8);
        mat.metalness = 0.38;
        mat.roughness = 0.20;
        mat.clearcoat = 1.0;
        mat.clearcoatRoughness = 0.04;
      });
      this.glassWallMeshes.forEach((mesh) => {
        mesh.material = new THREE.MeshPhysicalMaterial({
          color: 0xcbe6ff,
          transparent: true,
          opacity: 1.0,
          roughness: 0.05,
          metalness: 0.02,
          transmission: 0.92,
          ior: 1.52,
          thickness: 0.5,
          reflectivity: 0.65,
          clearcoat: 0.85,
          clearcoatRoughness: 0.04,
          depthWrite: false,
          side: THREE.DoubleSide
        });
      });
      this.mullionMeshes.forEach((mesh) => {
        if (mesh.material && (mesh.material as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
          const mat = mesh.material as THREE.MeshStandardMaterial;
          mat.color.setHex(0x1a2b40);
          mat.roughness = 0.25;
          mat.metalness = 0.75;
        }
      });
      this.cargoLineMeshes.forEach((mesh) => {
        if (mesh.material && (mesh.material as THREE.MeshBasicMaterial).isMeshBasicMaterial) {
          (mesh.material as THREE.MeshBasicMaterial).color.setHex(0xf59e0b); // 5S 琥珀工业黄
        }
      });

      if (this.holoScreenBorderMesh && (this.holoScreenBorderMesh.material as THREE.MeshStandardMaterial)) {
        const mat = this.holoScreenBorderMesh.material as THREE.MeshStandardMaterial;
        mat.color.setHex(0x1a2638);
        mat.roughness = 0.28;
        mat.metalness = 0.75;
      }
      this.holoStandMeshes.forEach((mesh) => {
        if (mesh.material && (mesh.material as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
          (mesh.material as THREE.MeshStandardMaterial).color.setHex(0x5a6d85);
        }
      });

      if (this.exteriorGroundMesh && (this.exteriorGroundMesh.material as THREE.MeshStandardMaterial)) {
        const mat = this.exteriorGroundMesh.material as THREE.MeshStandardMaterial;
        mat.color.setHex(0x151f2d); // 厂区外围夜间硬化地坪色
        mat.roughness = 0.85;
        mat.metalness = 0.05;
      }
      if (this.truckRoadMesh && (this.truckRoadMesh.material as THREE.MeshStandardMaterial)) {
        const mat = this.truckRoadMesh.material as THREE.MeshStandardMaterial;
        mat.color.setHex(0x354458); // 外侧运输干道真实深灰工业沥青色 (自然通透，绝不发黑，与现实公路质感一致)
        mat.roughness = 0.72;
        mat.metalness = 0.06;
        if (!mat.normalMap && this.roadNormalMap) {
          mat.normalMap = this.roadNormalMap;
        }
        mat.normalScale.set(0.045, 0.045);
      }
      if (this.roadStripesMesh) {
        this.roadStripesMesh.material = new THREE.MeshBasicMaterial({
          color: 0x00f3ff,
          polygonOffset: true,
          polygonOffsetFactor: -2,
          polygonOffsetUnits: -2
        });
      }
    } else {
      // 明亮展厅沙盘模式：对齐 cover.jpg 原版明亮展台实物风格
      this.scene.background = new THREE.Color(0xe7eef6);
      this.scene.fog = new THREE.Fog(0xe7eef6, 80, 200);

      if (this.ambientLight) {
        this.ambientLight.intensity = 0.90;
        this.ambientLight.color.setHex(0xffffff);
      }
      if (this.hemiLight) {
        this.hemiLight.intensity = 0.65;
        this.hemiLight.color.setHex(0xffffff);
      }
      if (this.sunLight) {
        this.sunLight.intensity = 1.35;
        this.sunLight.color.setHex(0xffffff);
      }
      if (this.fillLight) {
        this.fillLight.intensity = 0.45;
        this.fillLight.color.setHex(0xd9e8f8);
      }
      if (this.cyberInteriorLight) {
        this.cyberInteriorLight.intensity = 0.5;
      }
      if (this.outdoorYardLight) {
        this.outdoorYardLight.intensity = 0.8;
        this.outdoorYardLight.color.setHex(0xffffff);
      }
      if (this.cyberParticles) {
        this.cyberParticles.visible = false;
      }

      if (this.warehouseFloorMesh && (this.warehouseFloorMesh.material as THREE.MeshStandardMaterial)) {
        const mat = this.warehouseFloorMesh.material as THREE.MeshStandardMaterial;
        mat.color.setHex(0xe8edf3); // 明亮展厅素雅浅灰微光地坪
        mat.roughness = 0.32;
        mat.metalness = 0.06;
        if (!mat.normalMap && this.epoxyNormalMap) {
          mat.normalMap = this.epoxyNormalMap;
        }
        mat.normalScale.set(0.025, 0.025);
      }
      this.truckCabMaterials.forEach((mat) => {
        mat.color.setHex(0x2563eb);
        mat.metalness = 0.30;
        mat.roughness = 0.24;
        mat.clearcoat = 1.0;
        mat.clearcoatRoughness = 0.04;
      });
      this.glassWallMeshes.forEach((mesh) => {
        mesh.material = new THREE.MeshPhysicalMaterial({
          color: 0xc8e0f8,
          transparent: true,
          opacity: 0.90,
          roughness: 0.08,
          metalness: 0.02,
          transmission: 0.92,
          ior: 1.50,
          thickness: 0.5,
          depthWrite: false,
          side: THREE.DoubleSide
        });
      });
      this.mullionMeshes.forEach((mesh) => {
        if (mesh.material && (mesh.material as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
          const mat = mesh.material as THREE.MeshStandardMaterial;
          mat.color.setHex(0x334155);
          mat.roughness = 0.40;
          mat.metalness = 0.45;
        }
      });
      this.cargoLineMeshes.forEach((mesh) => {
        if (mesh.material && (mesh.material as THREE.MeshBasicMaterial).isMeshBasicMaterial) {
          (mesh.material as THREE.MeshBasicMaterial).color.setHex(0xd97706); // 展厅高反差工业暖黄标线
        }
      });

      if (this.holoScreenBorderMesh && (this.holoScreenBorderMesh.material as THREE.MeshStandardMaterial)) {
        const mat = this.holoScreenBorderMesh.material as THREE.MeshStandardMaterial;
        mat.color.setHex(0x475569);
        mat.emissive.setHex(0x000000);
        mat.emissiveIntensity = 0;
      }
      this.holoStandMeshes.forEach((mesh) => {
        if (mesh.material && (mesh.material as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
          (mesh.material as THREE.MeshStandardMaterial).color.setHex(0x64748b);
        }
      });

      if (this.exteriorGroundMesh && (this.exteriorGroundMesh.material as THREE.MeshStandardMaterial)) {
        const mat = this.exteriorGroundMesh.material as THREE.MeshStandardMaterial;
        mat.color.setHex(0xdce4ec);
        mat.roughness = 0.85;
        mat.metalness = 0.05;
      }
      if (this.truckRoadMesh && (this.truckRoadMesh.material as THREE.MeshStandardMaterial)) {
        const mat = this.truckRoadMesh.material as THREE.MeshStandardMaterial;
        mat.color.setHex(0x64748b); // 展厅哑光中灰柏油路面
        mat.roughness = 0.80;
        mat.metalness = 0.05;
        if (!mat.normalMap && this.roadNormalMap) {
          mat.normalMap = this.roadNormalMap;
        }
        mat.normalScale.set(0.03, 0.03);
      }
      if (this.roadStripesMesh) {
        this.roadStripesMesh.material = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          polygonOffset: true,
          polygonOffsetFactor: -2,
          polygonOffsetUnits: -2
        });
      }
    }
    this.requestRender();
  }

  public toggleTheme(): 'studio' | 'cyber' {
    const next = this.currentTheme === 'studio' ? 'cyber' : 'studio';
    this.setTheme(next);
    return next;
  }

  private pickEntity(object: THREE.Object3D, anchor: [number, number, number]) {
    const { entityKey, agvId, moves } = object.userData;
    this.currentTrackedObject = moves ? object : null;
    this.hasTrackedAnchor = true;
    this.clickedAnchorWorldPos.set(...anchor);
    this.triggerPopupUpdate();
    this.focusOnEntity(entityKey, anchor);
    this.onPickCallback?.({ key: entityKey, agvId });
  }

  public clearTrackedAnchor() {
    this.currentTrackedObject = null;
    this.hasTrackedAnchor = false;
  }

  public onPick(callback: (selection: EntitySelection) => void) {
    this.onPickCallback = callback;
  }

  public onFleetUpdate(callback: (fleet: AgvFleet) => void) {
    this.onFleetUpdateCallback = callback;
  }

  public onManualView(callback: () => void) {
    this.onManualViewCallback = callback;
  }

  public onBlankClick(callback: () => void) {
    this.onBlankClickCallback = callback;
  }

  public onPositionUpdate(callback: (x: number, y: number, behind: boolean) => void) {
    this.onPositionUpdateCallback = callback;
  }

  private triggerPopupUpdate() {
    if (!this.hasTrackedAnchor || !this.onPositionUpdateCallback) return;

    if (this.currentTrackedObject) {
      if (!this.currentTrackedObject.visible) {
        this.clearTrackedAnchor();
        this.onBlankClickCallback?.();
        return;
      }
      this.currentTrackedObject.getWorldPosition(this.tempProjVec);
      this.tempProjVec.y += 0.8;
    } else {
      this.tempProjVec.copy(this.clickedAnchorWorldPos);
    }

    this.tempProjVec.project(this.camera);
    const canvas = this.renderer.domElement.getBoundingClientRect();
    const behind = Math.abs(this.tempProjVec.x) > 1 || Math.abs(this.tempProjVec.y) > 1 ||
      this.tempProjVec.z < -1 || this.tempProjVec.z >= 1;
    const x = canvas.left + (this.tempProjVec.x * 0.5 + 0.5) * canvas.width;
    const y = canvas.top + (-this.tempProjVec.y * 0.5 + 0.5) * canvas.height;
    this.onPositionUpdateCallback(x, y, behind);
  }

  private bindEvents() {
    const canvas = this.renderer.domElement;
    const { signal } = this.lifecycle;

    this.controls.addEventListener('change', () => this.requestRender());
    this.controls.addEventListener('start', () => {
      this.isTransitioningCamera = false;
      this.requestRender();
    });

    canvas.addEventListener('pointerdown', (e) => {
      if (!e.isPrimary) {
        this.downPos = null;
        this.onManualViewCallback?.();
      } else if (e.button === 0) {
        this.downPos = { pointerId: e.pointerId, x: e.clientX, y: e.clientY };
      }
    }, { signal });

    canvas.addEventListener('pointerup', (e) => {
      if (e.button !== 0) {
        this.onManualViewCallback?.();
        return;
      }
      const start = this.downPos;
      if (!start || start.pointerId !== e.pointerId) return;
      this.downPos = null;
      if (Math.hypot(e.clientX - start.x, e.clientY - start.y) >= 6) {
        this.onManualViewCallback?.();
        return;
      }
      this.pickAt(e.clientX, e.clientY);
    }, { signal });
    canvas.addEventListener('pointercancel', () => { this.downPos = null; }, { signal });
    canvas.addEventListener('wheel', () => this.onManualViewCallback?.(), { signal, passive: true });

    window.addEventListener('resize', () => {
      const w = this.container.clientWidth;
      const h = this.container.clientHeight;
      if (!w || !h) return;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
      this.requestRender();
    }, { signal });

    document.addEventListener('visibilitychange', () => {
      this.clock.getDelta();
      if (document.hidden) {
        cancelAnimationFrame(this.reqAnimationId);
        this.reqAnimationId = 0;
      } else {
        this.requestRender();
      }
    }, { signal });
  }

  private pickAt(x: number, y: number) {
    const canvas = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(
      ((x - canvas.left) / canvas.width) * 2 - 1,
      1 - ((y - canvas.top) / canvas.height) * 2
    );
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.interactiveMeshes, true);
    for (const hit of hits) {
      let object: THREE.Object3D | null = hit.object;
      while (object?.visible && !object.userData.entityKey) object = object.parent;
      if (!object?.visible) continue;
      this.pickEntity(object, [hit.point.x, hit.point.y + 0.35, hit.point.z]);
      return;
    }

    this.clearTrackedAnchor();
    this.onBlankClickCallback?.();
  }

  private requestRender() {
    if (!this.destroyed && !document.hidden && !this.reqAnimationId) {
      this.reqAnimationId = requestAnimationFrame(this.animate);
    }
  }

  private updateSimulation(forceFleetUpdate = false) {
    // 0. 工业机械臂点动平滑拣选姿态
    if (this.robotArmNodes.length > 0) {
      this.robotArmNodes.forEach((arm) => {
        const swing = Math.sin(this.accumulatedTime * 1.6 + arm.phase) * 0.26;
        arm.turntable.rotation.z = swing;
        arm.wrist.rotation.z = Math.cos(this.accumulatedTime * 2.2 + arm.phase) * 0.38;
      });
    }

    // 0.1 漂浮微光粒子轻柔沉浮游弋 (柔和自然空气微粒动效，杜绝生硬方块感)
    if (this.cyberParticles && this.cyberParticles.visible && this.particleInitialY && this.particlePhases) {
      this.cyberParticles.rotation.y = this.accumulatedTime * 0.012;
      const posAttr = this.cyberParticles.geometry.getAttribute('position') as THREE.BufferAttribute;
      const array = posAttr.array as Float32Array;
      for (let i = 0; i < this.particleInitialY.length; i++) {
        array[i * 3 + 1] = this.particleInitialY[i] + Math.sin(this.accumulatedTime * 0.85 + this.particlePhases[i]) * 0.18;
      }
      posAttr.needsUpdate = true;
    }

    const { path, unloadProgress } = this.agvRoute;
    const routeLength = path.getLength();
    const pickup = path.getPoint(0);
    const forward = new THREE.Vector3(1, 0, 0);
    const direction = new THREE.Vector3();
    const beltStartX = -15.8;
    const agvHeight = 0.1;
    let fleetChanged = forceFleetUpdate;

    for (const item of this.agvRobots) {
      const frame = getAgvFrame(this.accumulatedTime, item.id, item.offset, routeLength, unloadProgress);
      const pt = path.getPoint(frame.progress);
      const tangent = path.getTangent(frame.progress);
      item.node.position.set(pt.x, agvHeight, pt.y);
      direction.set(tangent.x, 0, tangent.y);
      item.node.quaternion.setFromUnitVectors(forward, direction);

      if (item.phase !== frame.phase || item.hasCargo !== frame.hasCargo) fleetChanged = true;
      item.phase = frame.phase;
      item.hasCargo = frame.hasCargo;
      item.cargoMesh.visible = frame.hasCargo;
      item.cargoMesh.material = frame.cargoIsKraft ? this.agvKraftMat : this.agvWhiteMat;

      item.beltMesh.visible = frame.beltProgress >= 0;
      if (item.beltMesh.visible) {
        const x = THREE.MathUtils.lerp(beltStartX, pickup.x, frame.beltProgress);
        const deck = agvHeight + item.cargoMesh.position.y;
        const height = THREE.MathUtils.lerp(0.94, deck, frame.beltTransfer);
        item.beltMesh.position.set(x, height, pickup.y);
        item.beltMesh.material = frame.cargoIsKraft ? this.agvWhiteMat : this.agvKraftMat;
      }
    }

    if (fleetChanged) {
      this.onFleetUpdateCallback?.({
        vehicles: this.agvRobots.map(({ id, phase, hasCargo }) => ({ id, phase, hasCargo })),
        speed: routeLength * AGV_LAPS_PER_SECOND,
        lapSeconds: 1 / AGV_LAPS_PER_SECOND
      });
    }

    // 3. 仓库外公路重型物流车巡航 (与月台货车保持 3 米间距，X = 28.5)
    if (this.movingRoadTruck) {
      const roadSpeed = 4.5;
      const roadMinZ = -26.0;
      const roadMaxZ = 24.0;
      const roadSpan = roadMaxZ - roadMinZ; // 50m
      const curZ = roadMinZ + ((this.accumulatedTime * roadSpeed) % roadSpan);
      this.movingRoadTruck.position.set(28.5, 0.3, curZ);
    }

  }

  private animate() {
    this.reqAnimationId = 0;
    const delta = this.clock.getDelta();
    const running = !this.isAnimationPaused && this.warehouseModel !== null;
    if (running) {
      // 标签页恢复和长帧不应跳过接驳工位。
      this.accumulatedTime += Math.min(delta, 0.1);
      this.updateSimulation();
    }

    // 4. 由远及近平滑运镜插值 (基于三次缓动曲线)
    if (this.isTransitioningCamera) {
      const elapsed = (performance.now() - this.camTransitionStartTime) / 1000;
      const progress = Math.min(1.0, elapsed / this.camTransitionDuration);
      const ease =
        progress < 0.5
          ? 4 * progress * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      this.camera.position.lerpVectors(this.camStartPos, this.camEndPos, ease);
      this.controls.target.lerpVectors(this.camStartLookAt, this.camEndLookAt, ease);

      if (progress >= 1.0) {
        this.isTransitioningCamera = false;
      }
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.triggerPopupUpdate();

    if (running || this.isTransitioningCamera) this.requestRender();
  }

  private disposeResources(root: THREE.Object3D, textures: THREE.Texture[] = []) {
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    const maps = new Set(textures);

    root.traverse((object) => {
      const renderable = object as THREE.Mesh;
      if (renderable.geometry) geometries.add(renderable.geometry);
      if (!renderable.material) return;
      const list = Array.isArray(renderable.material) ? renderable.material : [renderable.material];
      for (const material of list) materials.add(material);
    });

    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) {
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) maps.add(value);
      }
      material.dispose();
    }
    for (const texture of maps) texture.dispose();
  }

  public destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.lifecycle.abort();
    cancelAnimationFrame(this.reqAnimationId);
    this.controls.dispose();
    const textures = [this.epoxyNormalMap, this.roadNormalMap].filter((value) => value !== null);
    this.disposeResources(this.scene, textures);
    this.sunLight?.shadow.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
