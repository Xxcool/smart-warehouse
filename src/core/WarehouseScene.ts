import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EntityKey } from '../types/warehouse';

export interface PickCallback {
  (entityKey: EntityKey, anchorWorldPos: [number, number, number], isMoving: boolean): void;
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
  private agvRobots: { node: THREE.Object3D; offset: number }[] = [];
  private conveyorCargoList: { mesh: THREE.Mesh; offset: number }[] = [];
  private warehouseModel: THREE.Group | null = null;
  private movingRoadTruck: THREE.Object3D | null = null;
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
    this.scene.background = new THREE.Color(0xe7eef6);
    this.scene.fog = new THREE.Fog(0xe7eef6, 80, 200);

    // 2. 相机 (34° FOV 保证整仓完整居中铺满)
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(34, w / h, 0.1, 1000);
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

    // 6. 初始化 AGV 巡线导引样条 (避开南区货架托盘，Z=4.95)
    this.agvCurve = this.initAgvRoute();

    // 7. 初始化传送带动态纸箱
    this.initConveyorCargo();

    // 8. 绑定事件
    this.bindEvents();

    // 9. 启动动画主循环
    this.animate = this.animate.bind(this);
    this.animate();
  }

  private initLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.88);
    this.scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xdbe4ee, 0.65);
    this.scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 1.25);
    sunLight.position.set(30, 42, 26);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.bias = -0.00015;
    sunLight.shadow.camera.left = -32;
    sunLight.shadow.camera.right = 32;
    sunLight.shadow.camera.top = 32;
    sunLight.shadow.camera.bottom = -32;
    this.scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0xe7eef6, 0.45);
    fillLight.position.set(-25, 25, -25);
    this.scene.add(fillLight);
  }

  private initAgvRoute(): THREE.CatmullRomCurve3 {
    const agvPathPoints = [
      new THREE.Vector3(-8.8, 0.08, -5.5),
      new THREE.Vector3(-7.2, 0.08, -5.5),
      new THREE.Vector3(-6.5, 0.08, -4.5),
      new THREE.Vector3(-6.5, 0.08, 4.2),
      new THREE.Vector3(-5.8, 0.08, 4.95),
      new THREE.Vector3(5.0, 0.08, 4.95),  // 南侧走廊中线，保持 0.61m 安全避让托盘
      new THREE.Vector3(5.8, 0.08, 4.2),
      new THREE.Vector3(5.8, 0.08, -4.8),
      new THREE.Vector3(5.0, 0.08, -5.6),
      new THREE.Vector3(-5.5, 0.08, -5.6),
      new THREE.Vector3(-7.2, 0.08, -5.6),
      new THREE.Vector3(-8.8, 0.08, -5.5)
    ];
    const curve = new THREE.CatmullRomCurve3(agvPathPoints, true, 'centripetal', 0.05);

    // 导引虚线
    const routeGeo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(260));
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
    for (let t = 0; t < 1.0; t += 0.06) {
      const p = curve.getPointAt(t);
      const tg = curve.getTangentAt(t);
      const arrow = new THREE.Mesh(arrowGeo, arrowMat);
      arrow.position.set(p.x, 0.09, p.z);
      arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tg);
      navArrowsGroup.add(arrow);
    }
    this.scene.add(navArrowsGroup);

    return curve;
  }

  private initConveyorCargo() {
    const cBoxGeo = new THREE.BoxGeometry(0.55, 0.38, 0.55);
    const cBoxMatBlue = new THREE.MeshStandardMaterial({ color: 0x93c5fd, roughness: 0.35 });
    const cBoxMatWhite = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 });
    for (let i = 0; i < 6; i++) {
      const bMat = i % 2 === 0 ? cBoxMatBlue : cBoxMatWhite;
      const cBox = new THREE.Mesh(cBoxGeo, bMat);
      cBox.castShadow = true;
      cBox.receiveShadow = true;
      cBox.userData = { entityKey: 'conveyor_dock1' as EntityKey };
      this.scene.add(cBox);
      this.interactiveMeshes.push(cBox);
      this.conveyorCargoList.push({ mesh: cBox, offset: i / 6.0 });
    }
  }

  public loadModel(onProgress?: (percent: number, items: number) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      const gltfLoader = new GLTFLoader();
      const modelUrl = '/smart_warehouse.glb';

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
              child.castShadow = true;
              child.receiveShadow = true;

              const n = child.name;
              let matchedKey: EntityKey | null = null;

              if (n.includes('Workstation') || n.startsWith('WS_')) {
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

          // 提取 7 台 AGV 机器人
          for (let i = 1; i <= 7; i++) {
            const agvName = `AGV_Robot_${i < 10 ? '0' + i : i}`;
            const node = this.warehouseModel.getObjectByName(agvName);
            if (node) {
              this.agvRobots.push({
                node: node,
                offset: (i - 1) / 7.0
              });
            }
          }

          // 提取公路巡航重卡
          this.movingRoadTruck = this.warehouseModel.getObjectByName('Truck_Moving_Road') || null;
          if (this.movingRoadTruck) {
            this.movingRoadTruck.userData.entityKey = 'outbound_truck';
            this.interactiveMeshes.push(this.movingRoadTruck);
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

    // 1. AGV 沿正交中线巡线作业
    if (this.agvRobots.length > 0) {
      this.agvRobots.forEach((item) => {
        const t = (this.accumulatedTime * 0.035 + item.offset) % 1.0;
        const pt = this.agvCurve.getPointAt(t);
        const tangent = this.agvCurve.getTangentAt(t);

        item.node.position.set(pt.x, 0.1, pt.z);
        const dir = new THREE.Vector3(tangent.x, 0, tangent.z).normalize();
        item.node.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir);
      });
    }

    // 2. 传送带纸箱动态流
    if (this.conveyorCargoList.length > 0) {
      this.conveyorCargoList.forEach((item) => {
        const t = (this.accumulatedTime * 0.10 + item.offset) % 1.0;
        const curX = -15.5 + t * 7.5;
        item.mesh.position.set(curX, 0.94, -5.5);
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
