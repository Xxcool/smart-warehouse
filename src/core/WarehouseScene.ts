import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EntityKey } from '../types/warehouse';

export interface PickCallback {
  (entityKey: EntityKey, anchorWorldPos: [number, number, number], isMoving: boolean): void;
}

export interface AgvItem {
  node: THREE.Object3D;
  offset: number;
  cargoMesh: THREE.Mesh;
  hasCargo: boolean;
}

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
  private conveyorCargoList: { mesh: THREE.Mesh; offset: number }[] = [];
  private warehouseModel: THREE.Group | null = null;
  private movingRoadTruck: THREE.Object3D | null = null;
  private exteriorGroundMesh: THREE.Mesh | null = null;
  private truckRoadMesh: THREE.Mesh | null = null;
  private roadStripesMesh: THREE.Mesh | null = null;
  private warehouseFloorMesh: THREE.Mesh | null = null;
  private cargoLineMeshes: THREE.Mesh[] = [];
  private glassWallMeshes: THREE.Mesh[] = [];
  private mullionMeshes: THREE.Mesh[] = [];
  private cyberInteriorLight: THREE.PointLight | null = null;
  private holoScreenPanelMesh: THREE.Mesh | null = null;
  private holoScreenBorderMesh: THREE.Mesh | null = null;
  private holoStandMeshes: THREE.Mesh[] = [];
  private holoScreenTexture: THREE.CanvasTexture | null = null;
  private ambientLight: THREE.AmbientLight | null = null;
  private hemiLight: THREE.HemisphereLight | null = null;
  private sunLight: THREE.DirectionalLight | null = null;
  private fillLight: THREE.DirectionalLight | null = null;
  public currentTheme: 'studio' | 'cyber' = 'cyber';
  private agvCurve: THREE.CatmullRomCurve3;

  private currentTrackedObject: THREE.Object3D | null = null;
  private clickedAnchorWorldPos = new THREE.Vector3();
  private tempProjVec = new THREE.Vector3();

  private clock = new THREE.Clock();
  private accumulatedTime = 0;
  private isAnimationPaused = false;
  private reqAnimationId = 0;
  private onPickCallback: PickCallback | null = null;
  private onBlankClickCallback: (() => void) | null = null;
  private onPositionUpdateCallback: ((x: number, y: number, behind: boolean) => void) | null = null;

  private downPos = { x: 0, y: 0 };
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();

  constructor(container: HTMLElement) {
    this.container = container;

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
    this.controls.enableZoom = false; // 禁用 OrbitControls 原生变倍，由 3D 相机 Dolly 驱动

    // 5. 初始化光照
    this.initLights();
    this.setTheme(this.currentTheme);

    // 6. 初始化 AGV 巡线导引样条 (避开南区货架托盘，Z=4.95)
    this.agvCurve = this.initAgvRoute();

    // 7. 初始化传送带动态纸箱
    this.initConveyorCargo();

    // 7.1 初始化悬浮赛博微光粒子
    this.initCyberParticles();

    // 8. 绑定事件
    this.bindEvents();

    // 9. 启动动画主循环
    this.animate = this.animate.bind(this);
    this.animate();
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
    this.sunLight.shadow.bias = -0.00012;
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

  private initCyberParticles() {
    const particleCount = 120;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 32;
      positions[i * 3 + 1] = 0.5 + Math.random() * 5.2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 22;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0x00f0ff,
      size: 0.16,
      transparent: true,
      opacity: 0.70,
      blending: THREE.AdditiveBlending
    });
    this.cyberParticles = new THREE.Points(geometry, material);
    this.scene.add(this.cyberParticles);
  }

  private initAgvRoute(): THREE.CatmullRomCurve3 {
    const agvPathPoints = [
      // 1. 1号装卸月台自动化滚筒驳运交接工位 (货箱精准对接处)
      new THREE.Vector3(-9.2, 0.12, -5.5),
      new THREE.Vector3(-7.2, 0.12, -5.5),
      new THREE.Vector3(-6.8, 0.12, -5.0),
      // 2. 西侧主干巡线车道 (平直向南，直达南侧通道)
      new THREE.Vector3(-6.8, 0.12, -4.6),
      new THREE.Vector3(-6.8, 0.12, 0.0),
      new THREE.Vector3(-6.8, 0.12, 4.6),
      // 3. 南侧中央走廊宽阔车道 (笔直横跨主通道)
      new THREE.Vector3(-4.0, 0.12, 4.6),
      new THREE.Vector3(0.0, 0.12, 4.6),
      new THREE.Vector3(4.0, 0.12, 4.6),
      new THREE.Vector3(6.8, 0.12, 4.6),
      // 4. 东侧出入库车道 (经过2/3号月台前侧，笔直向北)
      new THREE.Vector3(6.8, 0.12, 0.0),
      new THREE.Vector3(6.8, 0.12, -4.6),
      // 5. 北侧分拣主干道 (向西巡航)
      new THREE.Vector3(4.0, 0.12, -4.6),
      new THREE.Vector3(0.0, 0.12, -4.6),
      new THREE.Vector3(-4.0, 0.12, -4.6),
      new THREE.Vector3(-6.8, 0.12, -4.6),
      new THREE.Vector3(-9.2, 0.12, -4.8),
      new THREE.Vector3(-9.2, 0.12, -5.5)
    ];
    const curve = new THREE.CatmullRomCurve3(agvPathPoints, true, 'centripetal', 0.05);

    // 导引虚线 (与地面发光导轨 100% 重合微浮)
    const routeGeo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(280));
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
      const p = curve.getPointAt(t);
      const tg = curve.getTangentAt(t);
      const arrow = new THREE.Mesh(arrowGeo, arrowMat);
      arrow.position.set(p.x, 0.13, p.z);
      arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tg);
      navArrowsGroup.add(arrow);
    }
    this.scene.add(navArrowsGroup);

    return curve;
  }

  private initConveyorCargo() {
    const cBoxGeo = new THREE.BoxGeometry(0.55, 0.38, 0.55);
    const cBoxMatKraft = new THREE.MeshStandardMaterial({ color: 0xb58958, roughness: 0.75 });
    const cBoxMatWhite = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.35 });
    for (let i = 0; i < 4; i++) {
      const bMat = i % 2 === 0 ? cBoxMatKraft : cBoxMatWhite;
      const cBox = new THREE.Mesh(cBoxGeo, bMat);
      cBox.castShadow = true;
      cBox.receiveShadow = true;
      cBox.userData = { entityKey: 'conveyor_dock1' as EntityKey };
      this.scene.add(cBox);
      this.interactiveMeshes.push(cBox);
      this.conveyorCargoList.push({ mesh: cBox, offset: i / 4.0 });
    }
  }

  public loadModel(onProgress?: (percent: number, items: number) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      const gltfLoader = new GLTFLoader();
      const modelUrl = '/smart_warehouse.glb?v=2.2.1';

      gltfLoader.load(
        modelUrl,
        (gltf) => {
          this.warehouseModel = gltf.scene;
          this.scene.add(this.warehouseModel);

          this.warehouseModel.traverse((child) => {
            if ((child as any).isLight) {
              (child as any).intensity = 0;
              return;
            }

            if ((child as THREE.Mesh).isMesh) {
              const n = child.name;

              // 1. 浅蓝通透高保真钢化玻璃幕墙与双面透光
              if (n.startsWith('Glass_')) {
                child.castShadow = false;
                child.receiveShadow = false;
                this.glassWallMeshes.push(child as THREE.Mesh);
                (child as THREE.Mesh).material = new THREE.MeshPhysicalMaterial({
                  color: 0x88c2f5,
                  transparent: true,
                  opacity: 0.32,
                  roughness: 0.05,
                  metalness: 0.06,
                  transmission: 0.90,
                  ior: 1.50,
                  reflectivity: 0.65,
                  clearcoat: 0.85,
                  clearcoatRoughness: 0.06,
                  depthWrite: false,
                  side: THREE.DoubleSide
                });
              } else if (n.startsWith('Mullion_')) {
                // 1.1 玻璃幕墙深色高刚性金属立柱与横梁骨架
                this.mullionMeshes.push(child as THREE.Mesh);
                child.castShadow = true;
                child.receiveShadow = true;
              } else if (n.startsWith('AGV_Trajectory_Laser_Line')) {
                // 2. AGV 轨迹中心高亮发光线
                child.castShadow = false;
                child.receiveShadow = false;
                (child as THREE.Mesh).material = new THREE.MeshBasicMaterial({
                  color: 0x00f3ff
                });
              } else if (n.startsWith('AGV_Track_Base_Band')) {
                // 2.1 AGV 轨迹导轨路面基带
                child.castShadow = false;
                child.receiveShadow = true;
                (child as THREE.Mesh).material = new THREE.MeshStandardMaterial({
                  color: 0x142234,
                  roughness: 0.35,
                  metalness: 0.25
                });
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
                // 4. 室内发光全息管控看板 (投射高科技动态态势 UI)
                this.holoScreenPanelMesh = child as THREE.Mesh;
                child.castShadow = false;
                child.receiveShadow = false;
                if (!this.holoScreenTexture) {
                  this.holoScreenTexture = this.createHoloScreenTexture();
                }
                (child as THREE.Mesh).material = new THREE.MeshStandardMaterial({
                  map: this.holoScreenTexture,
                  emissive: 0xffffff,
                  emissiveMap: this.holoScreenTexture,
                  emissiveIntensity: 0.65,
                  roughness: 0.20,
                  metalness: 0.10,
                  side: THREE.DoubleSide
                });
              } else if (n === 'Holo_Screen_Border') {
                // 4.1 全息大屏钛合金外框与微光包边
                this.holoScreenBorderMesh = child as THREE.Mesh;
                child.castShadow = true;
                child.receiveShadow = true;
                (child as THREE.Mesh).material = new THREE.MeshStandardMaterial({
                  color: 0x1f3452,
                  roughness: 0.25,
                  metalness: 0.80,
                  emissive: 0x004466,
                  emissiveIntensity: 0.35
                });
              } else if (n.startsWith('Holo_Stand_')) {
                // 4.2 全息大屏金属落地支撑脚架
                this.holoStandMeshes.push(child as THREE.Mesh);
                child.castShadow = true;
                child.receiveShadow = true;
                (child as THREE.Mesh).material = new THREE.MeshStandardMaterial({
                  color: 0x475569,
                  roughness: 0.30,
                  metalness: 0.85
                });
              } else {
                child.castShadow = true;
                child.receiveShadow = true;
              }

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
              } else if (n.includes('AGV_')) {
                matchedKey = 'agv_robot';
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

          // 提取 7 台 AGV 机器人并挂载动态接驳货箱 (支持牛皮纸箱与白膜包装箱动态移载)
          const agvBoxGeo = new THREE.BoxGeometry(0.52, 0.32, 0.42);
          for (let i = 1; i <= 7; i++) {
            const agvName = `AGV_Robot_${i < 10 ? '0' + i : i}`;
            const node = this.warehouseModel.getObjectByName(agvName);
            if (node) {
              const cargoMesh = new THREE.Mesh(agvBoxGeo, i % 2 === 1 ? this.agvKraftMat : this.agvWhiteMat);
              cargoMesh.position.set(0, 0.30, 0); // 端正贴合在 AGV 承载平台上表面
              cargoMesh.castShadow = true;
              cargoMesh.receiveShadow = true;
              cargoMesh.userData.entityKey = 'agv_robot';
              cargoMesh.visible = false; // 由动画状态机依据当前所处工位动态控制显隐
              node.add(cargoMesh);
              this.interactiveMeshes.push(cargoMesh);

              this.agvRobots.push({
                node: node,
                offset: (i - 1) / 7.0,
                cargoMesh: cargoMesh,
                hasCargo: false
              });
            }
          }

          // 提取公路巡航重卡
          this.movingRoadTruck = this.warehouseModel.getObjectByName('Truck_Moving_Road') || null;
          if (this.movingRoadTruck) {
            this.movingRoadTruck.userData.entityKey = 'outbound_truck';
            this.interactiveMeshes.push(this.movingRoadTruck);
          }

          if (this.currentTheme === 'cyber') {
            this.setTheme('cyber');
          }

          if (onProgress) onProgress(100, 109);
          resolve();
        },
        (xhr) => {
          if (xhr.lengthComputable && xhr.total > 0 && onProgress) {
            const ratio = xhr.loaded / xhr.total;
            const percent = Math.min(99, Math.floor(ratio * 75 + 20));
            const items = Math.floor((percent / 100) * 109);
            onProgress(percent, items);
          }
        },
        (err) => {
          console.error('加载 GLB 失败:', err);
          reject(err);
        }
      );
    });
  }

  // 3D 相机 Dolly 缩放 (不触动任何 DOM/页面)
  public zoomCamera(ratio: number) {
    const offset = new THREE.Vector3().subVectors(this.camera.position, this.controls.target);
    let dist = offset.length();
    dist *= ratio;
    dist = THREE.MathUtils.clamp(dist, this.controls.minDistance, this.controls.maxDistance);
    offset.setLength(dist);
    this.camera.position.copy(this.controls.target).add(offset);
    this.controls.update();
    this.triggerPopupUpdate();
  }

  public resetCameraView() {
    this.camera.position.copy(this.defaultCamPos);
    this.controls.target.copy(this.defaultTarget);
    this.controls.update();
    this.triggerPopupUpdate();
  }

  public setTopView() {
    this.camera.position.set(this.defaultTarget.x, 72, this.defaultTarget.z + 0.01);
    this.controls.target.copy(this.defaultTarget);
    this.controls.update();
    this.triggerPopupUpdate();
  }

  public toggleAnimation(): boolean {
    this.isAnimationPaused = !this.isAnimationPaused;
    return this.isAnimationPaused;
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

      if (this.warehouseFloorMesh && (this.warehouseFloorMesh.material as THREE.MeshStandardMaterial)) {
        const mat = this.warehouseFloorMesh.material as THREE.MeshStandardMaterial;
        mat.color.setHex(0x192842); // 具有通透科技感的深青蓝高反光地坪 (彻底告别死黑，阶梯立体对比)
        mat.roughness = 0.22;
        mat.metalness = 0.35;
      }
      this.glassWallMeshes.forEach((mesh) => {
        mesh.material = new THREE.MeshPhysicalMaterial({
          color: 0x88c2f5,
          transparent: true,
          opacity: 0.32,
          roughness: 0.05,
          metalness: 0.06,
          transmission: 0.90,
          ior: 1.50,
          reflectivity: 0.65,
          clearcoat: 0.85,
          clearcoatRoughness: 0.06,
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

      if (this.holoScreenPanelMesh && (this.holoScreenPanelMesh.material as THREE.MeshStandardMaterial)) {
        (this.holoScreenPanelMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.65;
      }
      if (this.holoScreenBorderMesh && (this.holoScreenBorderMesh.material as THREE.MeshStandardMaterial)) {
        const mat = this.holoScreenBorderMesh.material as THREE.MeshStandardMaterial;
        mat.color.setHex(0x1f3452);
        mat.emissive.setHex(0x004466);
        mat.emissiveIntensity = 0.35;
      }
      this.holoStandMeshes.forEach((mesh) => {
        if (mesh.material && (mesh.material as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
          (mesh.material as THREE.MeshStandardMaterial).color.setHex(0x475569);
        }
      });

      if (this.exteriorGroundMesh && (this.exteriorGroundMesh.material as THREE.MeshStandardMaterial)) {
        const mat = this.exteriorGroundMesh.material as THREE.MeshStandardMaterial;
        mat.color.setHex(0x0c1320); // 厂区外围深空夜色，与室内青蓝地坪形成鲜明阶梯明暗对比
        mat.roughness = 0.45;
        mat.metalness = 0.15;
      }
      if (this.truckRoadMesh && (this.truckRoadMesh.material as THREE.MeshStandardMaterial)) {
        const mat = this.truckRoadMesh.material as THREE.MeshStandardMaterial;
        mat.color.setHex(0x131d2c); // 外侧运输干道沥青色
        mat.roughness = 0.32;
        mat.metalness = 0.20;
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

      if (this.warehouseFloorMesh && (this.warehouseFloorMesh.material as THREE.MeshStandardMaterial)) {
        const mat = this.warehouseFloorMesh.material as THREE.MeshStandardMaterial;
        mat.color.setHex(0xe2e8f0); // 明亮展厅素雅浅灰微光地坪
        mat.roughness = 0.42;
        mat.metalness = 0.08;
      }
      this.glassWallMeshes.forEach((mesh) => {
        mesh.material = new THREE.MeshPhysicalMaterial({
          color: 0xc8e0f8,
          transparent: true,
          opacity: 0.25,
          roughness: 0.12,
          metalness: 0.04,
          transmission: 0.92,
          ior: 1.48,
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

      if (this.holoScreenPanelMesh && (this.holoScreenPanelMesh.material as THREE.MeshStandardMaterial)) {
        (this.holoScreenPanelMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.20;
      }
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
        mat.color.setHex(0xdce5ef);
        mat.roughness = 0.45;
        mat.metalness = 0.10;
      }
      if (this.truckRoadMesh && (this.truckRoadMesh.material as THREE.MeshStandardMaterial)) {
        const mat = this.truckRoadMesh.material as THREE.MeshStandardMaterial;
        mat.color.setHex(0xcad5e1);
        mat.roughness = 0.35;
        mat.metalness = 0.15;
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
  }

  public toggleTheme(): 'studio' | 'cyber' {
    const next = this.currentTheme === 'studio' ? 'cyber' : 'studio';
    this.setTheme(next);
    return next;
  }

  public setTrackedAnchor(anchorPos: [number, number, number], targetMesh: THREE.Object3D | null = null) {
    this.currentTrackedObject = targetMesh;
    this.clickedAnchorWorldPos.set(anchorPos[0], anchorPos[1], anchorPos[2]);
    this.triggerPopupUpdate();
  }

  public clearTrackedAnchor() {
    this.currentTrackedObject = null;
  }

  public onPick(callback: PickCallback) {
    this.onPickCallback = callback;
  }

  public onBlankClick(callback: () => void) {
    this.onBlankClickCallback = callback;
  }

  public onPositionUpdate(callback: (x: number, y: number, behind: boolean) => void) {
    this.onPositionUpdateCallback = callback;
  }

  private triggerPopupUpdate() {
    if (!this.onPositionUpdateCallback) return;

    if (this.currentTrackedObject) {
      this.currentTrackedObject.getWorldPosition(this.tempProjVec);
      this.tempProjVec.y += 0.8;
    } else {
      this.tempProjVec.copy(this.clickedAnchorWorldPos);
    }

    this.tempProjVec.project(this.camera);

    const behind = this.tempProjVec.z >= 1.0;
    const rawX = (this.tempProjVec.x * 0.5 + 0.5) * window.innerWidth;
    const rawY = (-(this.tempProjVec.y * 0.5) + 0.5) * window.innerHeight;

    this.onPositionUpdateCallback(rawX, rawY, behind);
  }

  private bindEvents() {
    // 滚轮与触控板手势：仅驱动 3D 相机缩放
    window.addEventListener('wheel', (e) => {
      const el = e.target as HTMLElement;
      if (el && el.closest('.popup-content')) return; // 允许弹窗内文本滚动
      e.preventDefault();

      const isPinch = e.ctrlKey;
      const factor = isPinch ? 0.005 : 0.0016;
      const zoomRatio = 1 + e.deltaY * factor;
      this.zoomCamera(zoomRatio);
    }, { passive: false });

    // 严防 Mac Safari / Chrome 双指缩放触发 Viewport Zoom
    document.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });
    document.addEventListener('gesturechange', (e) => e.preventDefault(), { passive: false });
    document.addEventListener('gestureend', (e) => e.preventDefault(), { passive: false });

    // 键盘快捷键
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '=' || e.key === '-' || e.key === '0')) {
        e.preventDefault();
        if (e.key === '+' || e.key === '=') this.zoomCamera(0.85);
        if (e.key === '-') this.zoomCamera(1.18);
        if (e.key === '0') this.resetCameraView();
      } else if (e.key === '+' || e.key === '=') {
        this.zoomCamera(0.85);
      } else if (e.key === '-') {
        this.zoomCamera(1.18);
      } else if (e.key === 'r' || e.key === 'R') {
        this.resetCameraView();
      } else if (e.key === 't' || e.key === 'T') {
        this.setTopView();
      } else if (e.code === 'Space') {
        this.toggleAnimation();
      }
    });

    // 拾取交互
    window.addEventListener('pointerdown', (e) => {
      this.downPos.x = e.clientX;
      this.downPos.y = e.clientY;
    });

    window.addEventListener('pointerup', (e) => {
      const target = e.target as HTMLElement;
      if (
        target.closest('.anchored-popup') ||
        target.closest('.floating-controls-dock') ||
        target.closest('.digital-twin-header') ||
        target.closest('.kpi-ribbon-bar')
      ) {
        return;
      }

      const dist = Math.hypot(e.clientX - this.downPos.x, e.clientY - this.downPos.y);
      if (dist < 6) {
        this.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
        this.pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;

        this.raycaster.setFromCamera(this.pointer, this.camera);
        const intersects = this.raycaster.intersectObjects(this.interactiveMeshes, true);

        if (intersects.length > 0) {
          const hit = intersects[0];
          let obj: THREE.Object3D | null = hit.object;

          while (obj && !obj.userData.entityKey && obj.parent) {
            obj = obj.parent;
          }

          if (obj && obj.userData.entityKey) {
            const isMoving =
              obj.name.includes('AGV_') ||
              obj === this.movingRoadTruck ||
              this.conveyorCargoList.some((c) => c.mesh === hit.object);

            const trackedMesh = isMoving
              ? this.conveyorCargoList.some((c) => c.mesh === hit.object)
                ? hit.object
                : obj
              : null;

            const anchor = hit.point.clone().add(new THREE.Vector3(0, 0.35, 0));
            const anchorPos: [number, number, number] = [anchor.x, anchor.y, anchor.z];

            this.setTrackedAnchor(anchorPos, trackedMesh);

            if (this.onPickCallback) {
              this.onPickCallback(obj.userData.entityKey, anchorPos, isMoving);
            }
            return;
          }
        }

        // 点击空白处
        this.clearTrackedAnchor();
        if (this.onBlankClickCallback) {
          this.onBlankClickCallback();
        }
      }
    });

    // 窗口尺寸自适应
    window.addEventListener('resize', () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
      this.triggerPopupUpdate();
    });
  }

  private animate() {
    this.reqAnimationId = requestAnimationFrame(this.animate);
    const delta = this.clock.getDelta();

    if (!this.isAnimationPaused) {
      this.accumulatedTime += delta;
    }

    // 0. 工业机械臂点动平滑拣选姿态
    if (this.robotArmNodes.length > 0) {
      this.robotArmNodes.forEach((arm) => {
        const swing = Math.sin(this.accumulatedTime * 1.6 + arm.phase) * 0.26;
        arm.turntable.rotation.z = swing;
        arm.wrist.rotation.z = Math.cos(this.accumulatedTime * 2.2 + arm.phase) * 0.38;
      });
    }

    // 0.1 漂浮微光粒子轻微游弋
    if (this.cyberParticles) {
      this.cyberParticles.rotation.y = this.accumulatedTime * 0.035;
    }

    // 1. AGV 真实闭环物流作业状态机 (接驳装载 ➔ 重载运送 ➔ 机械臂/货垛卸货 ➔ 空车回流)
    if (this.agvRobots.length > 0) {
      this.agvRobots.forEach((item, idx) => {
        const t = (this.accumulatedTime * 0.035 + item.offset) % 1.0;
        const pt = this.agvCurve.getPointAt(t);
        const tangent = this.agvCurve.getTangentAt(t);

        item.node.position.set(pt.x, 0.1, pt.z);
        const dir = new THREE.Vector3(tangent.x, 0, tangent.z).normalize();
        item.node.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir);

        // 状态机流转判定：
        // 阶段 A: [0.06, 0.62] -> 【重载运输阶段】
        // 从 1 号月台末端 (X = -7.2, Z = -5.5) 接驳装载纸箱，经西、南主干道运往东侧立体立垛/分拣岛
        // 阶段 B: [0.62, 1.00] 或 [0.00, 0.06] -> 【空车巡航阶段】
        // 东区卸货后变为空载状态，经由北侧主干道空车回流，驶往 1 号月台接驳位准备接货
        const isLoaded = t >= 0.06 && t < 0.62;
        if (item.cargoMesh.visible !== isLoaded) {
          item.cargoMesh.visible = isLoaded;
          item.hasCargo = isLoaded;
          // 每次在月台新装载时，与传送带物料一致交替颜色 (牛皮纸箱 / 白色薄膜箱)
          if (isLoaded) {
            const cycle = Math.floor(this.accumulatedTime * 0.035 + item.offset);
            const isKraft = (idx + cycle) % 2 === 0;
            item.cargoMesh.material = isKraft ? this.agvKraftMat : this.agvWhiteMat;
          }
        }
      });
    }

    // 2. 传送带纸箱动态流 (自冷链车厢经伸缩滚筒驳运至月台尽头，与 AGV 接驳位精准咬合)
    if (this.conveyorCargoList.length > 0) {
      this.conveyorCargoList.forEach((item) => {
        const t = (this.accumulatedTime * 0.11 + item.offset) % 1.0;
        // 起点在卡车车厢内 X = -15.8，终点在伸缩流水线末端 X = -7.4 (正对 AGV 接驳工位)
        const curX = -15.8 + t * 8.4;
        // 当货箱到达传送带末端 (t > 0.86) 正对 AGV 车顶，微调高度模拟平滑移载
        const curY = t > 0.86 ? 0.94 - (t - 0.86) * 1.8 : 0.94;
        item.mesh.position.set(curX, Math.max(0.68, curY), -5.5);
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

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.triggerPopupUpdate();
  }

  public destroy() {
    cancelAnimationFrame(this.reqAnimationId);
    this.renderer.dispose();
    if (this.renderer.domElement && this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
