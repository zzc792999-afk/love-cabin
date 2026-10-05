/**
 * 🏡 Love Cabin 3.0 - 极简 3D 虚拟恋爱小窝 (Three.js 核心交互引擎)
 * 纯粹简约 · 轻量丝滑 · 家具交互 · 零卡顿按需渲染
 */

(function () {
    let scene, camera, renderer, animationFrameId;
    let roomGroup;
    let interactiveObjects = [];
    let raycaster, mouse;
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let targetRotationY = Math.PI / 4;
    let currentRotationY = Math.PI / 4;
    let targetRotationX = 0.2;
    let currentRotationX = 0.2;
    let isInitialized = false;

    // 天气与光影系统模块变量
    let ambientLight, sunLight, pinkPointLight;
    let skyMesh, skyMat, starsGroup, moonMesh, sunbeamMesh, rainGroup;
    let currentWeather = null;

    // 虚拟互动猫咪与动画状态变量
    let catGroup = null;
    let isStretching = false;
    let stretchStartTime = 0;

    // 哲哲与珊珊情侣人物与互动状态变量
    let coupleGroup = null;
    let isCuddling = false;
    let cuddleStartTime = 0;

    // 相机视角预设与电影级平滑运镜系统
    const CAMERA_PRESETS = {
        overview: {
            pos: new THREE.Vector3(13, 11, 13),
            lookAt: new THREE.Vector3(0, 1.2, 0)
        },
        bed: {
            pos: new THREE.Vector3(0.5, 4.0, 0.5),
            lookAt: new THREE.Vector3(-1.8, 1.1, -1.8)
        },
        sofa: {
            pos: new THREE.Vector3(4.2, 3.0, 1.2),
            lookAt: new THREE.Vector3(1.0, 0.6, -1.35)
        },
        cat: {
            pos: new THREE.Vector3(3.2, 2.0, 2.8),
            lookAt: new THREE.Vector3(0.9, 0.3, 0.8)
        },
        window: {
            pos: new THREE.Vector3(-0.5, 2.6, 2.5),
            lookAt: new THREE.Vector3(-3.3, 1.8, 0.5)
        }
    };
    let currentCameraView = 'overview';
    let targetCameraPos = new THREE.Vector3(13, 11, 13);
    let targetCameraLookAt = new THREE.Vector3(0, 1.2, 0);
    let currentCameraLookAt = new THREE.Vector3(0, 1.2, 0);
    let isCameraAnimating = false;

    function switchCameraView(viewKey) {
        if (!CAMERA_PRESETS[viewKey] || !camera) return;
        currentCameraView = viewKey;
        const preset = CAMERA_PRESETS[viewKey];
        targetCameraPos.copy(preset.pos);
        targetCameraLookAt.copy(preset.lookAt);
        isCameraAnimating = true;
        requestRender(80);

        document.querySelectorAll('.camera-view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === viewKey);
        });
    }

    // 按需高效渲染控制
    let renderFramesLeft = 60;
    function requestRender(frames = 30) {
        renderFramesLeft = Math.max(renderFramesLeft, frames);
    }

    // 家具定义与对应互动事件
    const FURNITURE_DEFS = {
        couple: {
            title: "💑 哲哲与珊珊",
            desc: "点击甜蜜贴贴抱抱！也可以在上方切换去沙发或地毯哦~ ❤️",
            action: () => triggerCoupleCuddle()
        },
        sofa: {
            title: "🛋️ 浪漫双人沙发",
            desc: "点击让哲哲和珊珊坐到沙发上看放映机大片！",
            action: () => moveCoupleToLocation('sofa')
        },
        cat: {
            title: "🐱 暖心陪伴小咪",
            desc: "点一下小猫咪会伸懒腰、打呼噜！随平阳天气变化互动",
            action: () => triggerCatStretch()
        },
        bed: {
            title: "🛏️ 双人暖萌床",
            desc: "臭臭已为珊珊暖好被窝啦~ 点击在被窝里相拥贴贴！",
            action: () => triggerBedAction()
        },
        window: {
            title: "🪟 浪漫飘窗软榻",
            desc: "点击让哲哲和珊珊在飘窗看平阳风景与夜空繁星~",
            action: () => moveCoupleToLocation('window')
        },
        rug: {
            title: "🌸 软萌粉红地毯",
            desc: "点击让哲哲和珊珊来到地毯上陪小猫咪玩耍~",
            action: () => moveCoupleToLocation('rug')
        },
        fridge: {
            title: "🧊 爱心小冰箱",
            desc: "冰镇饮料与美味外卖已备齐！点击进入外卖店选餐",
            action: () => { window.location.href = 'other/takeout.html'; }
        },
        tv: {
            title: "📺 回忆时光放映机",
            desc: "放映我们从相识至今的美好回忆与合照",
            action: () => triggerPhotoSlideshow()
        },
        punchingBag: {
            title: "🥊 暴揍出气沙袋",
            desc: "惹宝贝生气了？立即狠狠暴揍臭臭！打到气消为止",
            action: () => { window.location.href = 'other/slap.html'; }
        },
        mailbox: {
            title: "💌 床头秘密信箱",
            desc: "查看两人的甜蜜留言与时光信件",
            action: () => triggerMailboxAction()
        },
        gramophone: {
            title: "📻 复古黑胶留声机",
            desc: "点播专属浪漫背景音乐",
            action: () => toggleMusicPlayer()
        }
    };

    // 初始化 3D 舞台
    function init3DStage() {
        const container = document.getElementById('cabin-3d-viewport');
        if (!container || isInitialized) return;

        const width = container.clientWidth || 360;
        const height = container.clientHeight || 420;

        // 1. 创建场景
        scene = new THREE.Scene();
        scene.background = null;

        // 2. 正交/微透视相机 (经典等角轴测 Isometric 视角)
        const aspect = width / height;
        camera = new THREE.PerspectiveCamera(40, aspect, 0.1, 100);
        camera.position.set(13, 11, 13);
        camera.lookAt(0, 1.2, 0);

        // 3. 轻量极速渲染器 (无昂贵阴影，1.0 像素比，保证零卡顿)
        renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: "high-performance" });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.0));
        renderer.shadowMap.enabled = false;
        container.innerHTML = '';
        container.appendChild(renderer.domElement);

        // 4. 温馨柔和光影系统
        ambientLight = new THREE.AmbientLight(0xfff0f3, 0.95);
        scene.add(ambientLight);

        sunLight = new THREE.DirectionalLight(0xfff5eb, 1.15);
        sunLight.position.set(8, 14, 6);
        scene.add(sunLight);

        pinkPointLight = new THREE.PointLight(0xff758c, 1.2, 16);
        pinkPointLight.position.set(0, 3.5, 0);
        scene.add(pinkPointLight);

        // 5. 房间模型组
        roomGroup = new THREE.Group();
        scene.add(roomGroup);

        buildRoomStructure();
        buildBed();
        buildFridge();
        buildTV();
        buildSofa();
        buildPunchingBag();
        buildMailbox();
        buildGramophone();
        buildDecorations();
        buildCat();
        buildCoupleFigures();

        // 6. 交互射线投射
        raycaster = new THREE.Raycaster();
        mouse = new THREE.Vector2();

        // 绑定事件
        bindEvents(container);

        isInitialized = true;
        requestRender(60);
        animate();

        // 7. 启动平阳天气联动系统
        fetchPingyangWeather();
        setInterval(fetchPingyangWeather, 10 * 60 * 1000);
    }

    // 构建简约房间基础结构 (地板与两面墙壁)
    function buildRoomStructure() {
        const floorMat = new THREE.MeshStandardMaterial({
            color: 0xfce4ec, // 奶油粉木地板
            roughness: 0.4,
            metalness: 0.1
        });
        const floor = new THREE.Mesh(new THREE.BoxGeometry(8, 0.4, 8), floorMat);
        floor.position.y = -0.2;
        roomGroup.add(floor);

        // 地毯
        const rugMat = new THREE.MeshStandardMaterial({ color: 0xff8fa3, roughness: 0.8 });
        const rug = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 0.05, 32), rugMat);
        rug.position.set(0.5, 0.03, 0.5);
        roomGroup.add(rug);
        registerInteractive(rug, 'rug');

        // 墙壁材质
        const wallMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });

        // 左墙
        const wallLeft = new THREE.Mesh(new THREE.BoxGeometry(0.3, 5, 8), wallMat);
        wallLeft.position.set(-3.85, 2.3, 0);
        roomGroup.add(wallLeft);

        // 右后墙
        const wallBack = new THREE.Mesh(new THREE.BoxGeometry(8, 5, 0.3), wallMat);
        wallBack.position.set(0, 2.3, -3.85);
        roomGroup.add(wallBack);

        // 窗户 (左墙带星空/天气光效)
        const windowFrameMat = new THREE.MeshStandardMaterial({ color: 0xffb3c1 });
        const windowFrame = new THREE.Mesh(new THREE.BoxGeometry(0.35, 2.5, 2.8), windowFrameMat);
        windowFrame.position.set(-3.85, 2.4, 0.5);
        roomGroup.add(windowFrame);

        // 窗外天空底板 (受平阳实时天气影响)
        skyMat = new THREE.MeshBasicMaterial({ color: 0x1a1235 });
        skyMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.3), skyMat);
        skyMesh.rotation.y = Math.PI / 2;
        skyMesh.position.set(-3.65, 2.4, 0.5);
        roomGroup.add(skyMesh);

        // 窗外夜空繁星系统 (夜晚或晴夜显现)
        starsGroup = new THREE.Group();
        const starMat = new THREE.MeshBasicMaterial({ color: 0xfff9db });
        for (let i = 0; i < 28; i++) {
            const star = new THREE.Mesh(new THREE.SphereGeometry(0.018, 4, 4), starMat);
            star.position.set(
                -3.62,
                1.45 + Math.random() * 1.9,
                -0.6 + Math.random() * 2.2
            );
            starsGroup.add(star);
        }
        starsGroup.visible = false;
        roomGroup.add(starsGroup);

        // 窗外月亮 (弯月/暖黄色)
        moonMesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.18, 12, 12),
            new THREE.MeshBasicMaterial({ color: 0xffe066 })
        );
        moonMesh.scale.set(0.2, 1, 1);
        moonMesh.position.set(-3.62, 3.1, 1.3);
        moonMesh.visible = false;
        roomGroup.add(moonMesh);

        // 窗前丁达尔暖阳晨光 (晴天显现)
        const sunbeamGeo = new THREE.CylinderGeometry(0.35, 1.4, 4.8, 16, 1, true);
        const sunbeamColor = new THREE.MeshBasicMaterial({
            color: 0xffe8a1,
            transparent: true,
            opacity: 0.14,
            depthWrite: false,
            side: THREE.DoubleSide
        });
        sunbeamMesh = new THREE.Mesh(sunbeamGeo, sunbeamColor);
        sunbeamMesh.position.set(-1.8, 1.8, 0.8);
        sunbeamMesh.rotation.z = Math.PI / 3.2;
        sunbeamMesh.visible = false;
        roomGroup.add(sunbeamMesh);

        // 窗外平阳雨滴雨丝粒子系统 (雨天显现)
        rainGroup = new THREE.Group();
        const dropMat = new THREE.MeshBasicMaterial({
            color: 0x9be8ff,
            transparent: true,
            opacity: 0.75
        });
        for (let i = 0; i < 45; i++) {
            const drop = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.32, 4), dropMat);
            drop.position.set(
                -3.63,
                1.3 + Math.random() * 2.2,
                -0.7 + Math.random() * 2.4
            );
            rainGroup.add(drop);
        }
        rainGroup.visible = false;
        roomGroup.add(rainGroup);

        // 🪟 浪漫观景飘窗软榻 (带软糯长坐垫与可爱抱枕)
        const windowSeatGroup = new THREE.Group();
        windowSeatGroup.name = "windowSeat";

        const seatBaseMat = new THREE.MeshStandardMaterial({ color: 0xffd6e0, roughness: 0.5 });
        const seatBase = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.6, 2.9), seatBaseMat);
        seatBase.position.set(-3.35, 0.3, 0.5);
        windowSeatGroup.add(seatBase);

        const seatCushionMat = new THREE.MeshStandardMaterial({ color: 0xffccd5, roughness: 0.7 });
        const seatCushion = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.14, 2.8), seatCushionMat);
        seatCushion.position.set(-3.35, 0.67, 0.5);
        windowSeatGroup.add(seatCushion);

        const winPillow1 = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.12), new THREE.MeshStandardMaterial({ color: 0xffffff }));
        winPillow1.position.set(-3.35, 0.82, -0.65);
        winPillow1.rotation.y = 0.2;
        windowSeatGroup.add(winPillow1);

        const winPillow2 = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.12), new THREE.MeshStandardMaterial({ color: 0xa2d2ff }));
        winPillow2.position.set(-3.35, 0.82, 1.65);
        winPillow2.rotation.y = -0.2;
        windowSeatGroup.add(winPillow2);

        roomGroup.add(windowSeatGroup);
        registerInteractive(windowSeatGroup, 'window');
    }

    // 🛏️ 双人暖萌床
    function buildBed() {
        const bedGroup = new THREE.Group();
        bedGroup.name = "bed";

        // 床架
        const bedFrame = new THREE.Mesh(
            new THREE.BoxGeometry(2.8, 0.6, 3.4),
            new THREE.MeshStandardMaterial({ color: 0xffd6e0, roughness: 0.5 })
        );
        bedFrame.position.set(0, 0.3, 0);
        bedGroup.add(bedFrame);

        // 床垫
        const mattress = new THREE.Mesh(
            new THREE.BoxGeometry(2.6, 0.5, 3.2),
            new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 })
        );
        mattress.position.set(0, 0.7, 0);
        bedGroup.add(mattress);

        // 粉红被子
        const quilt = new THREE.Mesh(
            new THREE.BoxGeometry(2.62, 0.3, 2.2),
            new THREE.MeshStandardMaterial({ color: 0xff758f, roughness: 0.6 })
        );
        quilt.position.set(0, 0.9, 0.5);
        bedGroup.add(quilt);

        // 双人枕头 (珊珊 & 臭臭)
        const pillowMat = new THREE.MeshStandardMaterial({ color: 0xffccd5 });
        const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.22, 0.6), pillowMat);
        p1.position.set(-0.65, 1.05, -1.0);
        bedGroup.add(p1);

        const p2 = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.22, 0.6), pillowMat);
        p2.position.set(0.65, 1.05, -1.0);
        bedGroup.add(p2);

        // 床头爱心呼吸灯
        const heartShape = createHeartShape();
        const extrudeSettings = { depth: 0.1, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.05, bevelThickness: 0.05 };
        const heartGeo = new THREE.ExtrudeGeometry(heartShape, extrudeSettings);
        const heartMat = new THREE.MeshStandardMaterial({ color: 0xff0054, emissive: 0xff477e, emissiveIntensity: 0.6 });
        const heartMesh = new THREE.Mesh(heartGeo, heartMat);
        heartMesh.scale.set(0.4, 0.4, 0.4);
        heartMesh.rotation.z = Math.PI;
        heartMesh.position.set(0, 2.3, -1.6);
        bedGroup.add(heartMesh);
        bedGroup.userData.heartMesh = heartMesh;

        bedGroup.position.set(-1.8, 0, -1.8);
        roomGroup.add(bedGroup);
        registerInteractive(bedGroup, 'bed');
    }

    // 🧊 爱心小冰箱
    function buildFridge() {
        const fridgeGroup = new THREE.Group();
        fridgeGroup.name = "fridge";

        const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffb4a2, roughness: 0.3 });
        const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.4, 1.1), bodyMat);
        body.position.set(0, 1.2, 0);
        fridgeGroup.add(body);

        const seamMat = new THREE.MeshBasicMaterial({ color: 0xe5989b });
        const seam = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.04, 0.02), seamMat);
        seam.position.set(0, 1.3, 0.56);
        fridgeGroup.add(seam);

        const handleMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.5 });
        const handle1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.4, 0.08), handleMat);
        handle1.position.set(0.4, 1.7, 0.6);
        fridgeGroup.add(handle1);

        const handle2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.4, 0.08), handleMat);
        handle2.position.set(0.4, 0.8, 0.6);
        fridgeGroup.add(handle2);

        fridgeGroup.position.set(2.8, 0, -2.8);
        roomGroup.add(fridgeGroup);
        registerInteractive(fridgeGroup, 'fridge');
    }

    // 📺 回忆放映机 (复古小电视)
    function buildTV() {
        const tvGroup = new THREE.Group();
        tvGroup.name = "tv";

        const standMat = new THREE.MeshStandardMaterial({ color: 0xb5838d, roughness: 0.6 });
        const stand = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.7, 1.0), standMat);
        stand.position.set(0, 0.35, 0);
        tvGroup.add(stand);

        const tvCase = new THREE.Mesh(
            new THREE.BoxGeometry(1.5, 1.1, 0.6),
            new THREE.MeshStandardMaterial({ color: 0x4a4e69, roughness: 0.4 })
        );
        tvCase.position.set(0, 1.3, 0);
        tvGroup.add(tvCase);

        const screenMat = new THREE.MeshBasicMaterial({ color: 0x90e0ef });
        const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.8), screenMat);
        screen.position.set(0, 1.3, 0.31);
        tvGroup.add(screen);

        tvGroup.position.set(0.8, 0, -3.2);
        roomGroup.add(tvGroup);
        registerInteractive(tvGroup, 'tv');
    }

    // 🛋️ 双人马卡龙爱心沙发 (放映机前温馨观影专属小座)
    function buildSofa() {
        const sofaGroup = new THREE.Group();
        sofaGroup.name = "sofa";

        const sofaMat = new THREE.MeshStandardMaterial({ color: 0xffccd5, roughness: 0.6 }); // 温柔奶油粉
        const cushionMat = new THREE.MeshStandardMaterial({ color: 0xffb3c1, roughness: 0.5 }); // 坐垫

        // 1. 底座与主体
        const seat = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.28, 0.85), sofaMat);
        seat.position.set(0, 0.18, 0.05);
        sofaGroup.add(seat);

        // 2. 双人软糯坐垫 (向前 +Z)
        const cushionL = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.14, 0.76), cushionMat);
        cushionL.position.set(-0.38, 0.35, 0.08);
        sofaGroup.add(cushionL);

        const cushionR = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.14, 0.76), cushionMat);
        cushionR.position.set(0.38, 0.35, 0.08);
        sofaGroup.add(cushionR);

        // 3. 舒适大靠背 (在坐垫后方 -Z 方向，彻底告别倒着坐！)
        const back = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.65, 0.22), sofaMat);
        back.position.set(0, 0.62, -0.34);
        sofaGroup.add(back);

        // 4. 两侧圆润扶手
        const armL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.48, 0.88), sofaMat);
        armL.position.set(-0.85, 0.4, 0.05);
        sofaGroup.add(armL);

        const armR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.48, 0.88), sofaMat);
        armR.position.set(0.85, 0.4, 0.05);
        sofaGroup.add(armR);

        // 5. 沙发可爱抱枕 (背靠在靠背上)
        const pillowMatL = new THREE.MeshStandardMaterial({ color: 0xffffff });
        const pillowL = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, 0.12), pillowMatL);
        pillowL.position.set(-0.56, 0.50, -0.20);
        pillowL.rotation.z = 0.2;
        pillowL.rotation.x = -0.15;
        sofaGroup.add(pillowL);

        const pillowMatR = new THREE.MeshStandardMaterial({ color: 0xa2d2ff });
        const pillowR = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, 0.12), pillowMatR);
        pillowR.position.set(0.56, 0.50, -0.20);
        pillowR.rotation.z = -0.2;
        pillowR.rotation.x = -0.15;
        sofaGroup.add(pillowR);

        // 放置在放映机前方偏右侧，微斜面向客厅与放映机，背部靠向后方，坐面正对前方
        sofaGroup.position.set(1.0, 0, -1.35);
        sofaGroup.rotation.y = -Math.PI * 0.2;
        roomGroup.add(sofaGroup);
        registerInteractive(sofaGroup, 'sofa');
    }

    // 🥊 暴揍出气沙袋 (悬挂臭臭搞怪头像)
    function buildPunchingBag() {
        const bagGroup = new THREE.Group();
        bagGroup.name = "punchingBag";

        const chainMat = new THREE.MeshStandardMaterial({ color: 0x8d99ae, metalness: 0.8 });
        const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.2), chainMat);
        chain.position.set(0, 3.8, 0);
        bagGroup.add(chain);

        const bagMat = new THREE.MeshStandardMaterial({ color: 0xe63946, roughness: 0.5 });
        const bag = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.6, 24), bagMat);
        bag.position.set(0, 2.5, 0);
        bagGroup.add(bag);

        const stripeMat = new THREE.MeshBasicMaterial({ color: 0xffb703 });
        const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.56, 0.25, 24), stripeMat);
        stripe.position.set(0, 2.5, 0);
        bagGroup.add(stripe);

        bagGroup.position.set(2.8, 0, 1.8);
        roomGroup.add(bagGroup);
        registerInteractive(bagGroup, 'punchingBag');
    }

    // 💌 床头信箱
    function buildMailbox() {
        const mailGroup = new THREE.Group();
        mailGroup.name = "mailbox";

        const pole = new THREE.Mesh(
            new THREE.CylinderGeometry(0.06, 0.06, 1.4),
            new THREE.MeshStandardMaterial({ color: 0xffb703 })
        );
        pole.position.set(0, 0.7, 0);
        mailGroup.add(pole);

        const box = new THREE.Mesh(
            new THREE.BoxGeometry(0.8, 0.7, 0.9),
            new THREE.MeshStandardMaterial({ color: 0x52b788, roughness: 0.4 })
        );
        box.position.set(0, 1.6, 0);
        mailGroup.add(box);

        const flag = new THREE.Mesh(
            new THREE.BoxGeometry(0.05, 0.35, 0.2),
            new THREE.MeshBasicMaterial({ color: 0xd90429 })
        );
        flag.position.set(0.44, 1.75, -0.15);
        mailGroup.add(flag);

        mailGroup.position.set(-3.0, 0, 2.4);
        roomGroup.add(mailGroup);
        registerInteractive(mailGroup, 'mailbox');
    }

    // 📻 复古留声机
    function buildGramophone() {
        const gramoGroup = new THREE.Group();
        gramoGroup.name = "gramophone";

        const table = new THREE.Mesh(
            new THREE.CylinderGeometry(0.8, 0.8, 0.9, 24),
            new THREE.MeshStandardMaterial({ color: 0xf4a261, roughness: 0.5 })
        );
        table.position.set(0, 0.45, 0);
        gramoGroup.add(table);

        const base = new THREE.Mesh(
            new THREE.BoxGeometry(0.7, 0.25, 0.7),
            new THREE.MeshStandardMaterial({ color: 0x6d597a })
        );
        base.position.set(0, 1.05, 0);
        gramoGroup.add(base);

        const vinyl = new THREE.Mesh(
            new THREE.CylinderGeometry(0.28, 0.28, 0.02, 32),
            new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2, metalness: 0.6 })
        );
        vinyl.position.set(0, 1.18, 0);
        gramoGroup.add(vinyl);
        gramoGroup.userData.vinyl = vinyl;

        const horn = new THREE.Mesh(
            new THREE.ConeGeometry(0.4, 0.7, 24, 1, true),
            new THREE.MeshStandardMaterial({ color: 0xffd166, metalness: 0.8, roughness: 0.2 })
        );
        horn.rotation.x = Math.PI / 3;
        horn.position.set(0, 1.5, 0.15);
        gramoGroup.add(horn);

        gramoGroup.position.set(-0.2, 0, 2.9);
        roomGroup.add(gramoGroup);
        registerInteractive(gramoGroup, 'gramophone');
    }

    // 氛围装饰 (盆栽)
    function buildDecorations() {
        const plantGroup = new THREE.Group();
        const pot = new THREE.Mesh(
            new THREE.CylinderGeometry(0.35, 0.25, 0.6, 16),
            new THREE.MeshStandardMaterial({ color: 0xffffff })
        );
        pot.position.set(0, 0.3, 0);
        plantGroup.add(pot);

        const leafMat = new THREE.MeshStandardMaterial({ color: 0x588157 });
        for (let i = 0; i < 5; i++) {
            const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), leafMat);
            leaf.position.set((Math.random() - 0.5) * 0.3, 0.6 + Math.random() * 0.3, (Math.random() - 0.5) * 0.3);
            plantGroup.add(leaf);
        }
        plantGroup.position.set(3.0, 0, -0.5);
        roomGroup.add(plantGroup);
    }

    // 🐱 虚拟互动萌宠小猫咪 (暖心小橘白，安睡在地毯小软垫上)
    function buildCat() {
        catGroup = new THREE.Group();
        catGroup.name = "cat";

        // 1. 猫咪软萌坐垫 (甜甜圈造型小窝)
        const cushionMat = new THREE.MeshStandardMaterial({ color: 0xffccd5, roughness: 0.8 });
        const cushion = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.78, 0.12, 24), cushionMat);
        cushion.position.set(0, 0.06, 0);
        catGroup.add(cushion);

        const rimMat = new THREE.MeshStandardMaterial({ color: 0xffb4a2, roughness: 0.9 });
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.08, 12, 24), rimMat);
        rim.rotation.x = Math.PI / 2;
        rim.position.set(0, 0.14, 0);
        catGroup.add(rim);

        // 2. 猫咪动态动画骨架根节点
        const catAnim = new THREE.Group();
        catAnim.name = "catAnim";
        catAnim.position.set(0, 0.12, 0);
        catGroup.add(catAnim);
        catGroup.userData.catAnim = catAnim;

        // 材质定义
        const catFurMat = new THREE.MeshStandardMaterial({ color: 0xfcb07e, roughness: 0.6 }); // 温暖奶油橘
        const catWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }); // 白手白胸
        const pinkMat = new THREE.MeshStandardMaterial({ color: 0xff8fa3, roughness: 0.4 }); // 耳窝与肉垫粉

        // 躯干 (球形拉伸)
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 16), catFurMat);
        body.scale.set(0.85, 0.8, 1.15);
        body.position.set(0, 0.35, 0);
        catAnim.add(body);
        catGroup.userData.body = body;

        // 软糯白肚皮
        const belly = new THREE.Mesh(new THREE.SphereGeometry(0.35, 14, 14), catWhiteMat);
        belly.scale.set(0.75, 0.7, 0.95);
        belly.position.set(0, 0.32, 0.18);
        catAnim.add(belly);

        // 圆圆猫猫头
        const headGroup = new THREE.Group();
        headGroup.position.set(0, 0.6, 0.42);
        catAnim.add(headGroup);
        catGroup.userData.headGroup = headGroup;

        const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 16), catFurMat);
        head.scale.set(1.05, 0.95, 0.95);
        headGroup.add(head);

        // 白白腮帮子与嘴套
        const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), catWhiteMat);
        muzzle.scale.set(1.2, 0.75, 0.85);
        muzzle.position.set(0, -0.07, 0.22);
        headGroup.add(muzzle);

        // 小粉鼻
        const nose = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.04, 4), pinkMat);
        nose.rotation.x = Math.PI;
        nose.position.set(0, -0.04, 0.34);
        headGroup.add(nose);

        // 萌萌大眼睛
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
        const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), eyeMat);
        eyeL.position.set(-0.12, 0.04, 0.27);
        headGroup.add(eyeL);

        const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), eyeMat);
        eyeR.position.set(0.12, 0.04, 0.27);
        headGroup.add(eyeR);

        // 星星高光
        const shineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const shineL = new THREE.Mesh(new THREE.SphereGeometry(0.015, 6, 6), shineMat);
        shineL.position.set(-0.13, 0.06, 0.3);
        headGroup.add(shineL);
        const shineR = new THREE.Mesh(new THREE.SphereGeometry(0.015, 6, 6), shineMat);
        shineR.position.set(0.11, 0.06, 0.3);
        headGroup.add(shineR);

        // 灵动立体尖耳朵
        const earL = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.18, 4), catFurMat);
        earL.position.set(-0.18, 0.28, 0.02);
        earL.rotation.z = 0.35;
        earL.rotation.x = -0.15;
        headGroup.add(earL);

        const earLInner = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.12, 4), pinkMat);
        earLInner.position.set(-0.17, 0.27, 0.05);
        earLInner.rotation.z = 0.35;
        earLInner.rotation.x = -0.15;
        headGroup.add(earLInner);

        const earR = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.18, 4), catFurMat);
        earR.position.set(0.18, 0.28, 0.02);
        earR.rotation.z = -0.35;
        earR.rotation.x = -0.15;
        headGroup.add(earR);

        const earRInner = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.12, 4), pinkMat);
        earRInner.position.set(0.17, 0.27, 0.05);
        earRInner.rotation.z = -0.35;
        earRInner.rotation.x = -0.15;
        headGroup.add(earRInner);

        // 红色项圈与小金铃铛
        const collarMat = new THREE.MeshStandardMaterial({ color: 0xe63946 });
        const collar = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.025, 8, 16), collarMat);
        collar.rotation.x = Math.PI / 2.3;
        collar.position.set(0, -0.2, 0.08);
        headGroup.add(collar);

        const bell = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), new THREE.MeshStandardMaterial({ color: 0xffd166, metalness: 0.8, roughness: 0.2 }));
        bell.position.set(0, -0.27, 0.28);
        headGroup.add(bell);

        // 软糯前爪爪 (拉伸关键部位)
        const pawL = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), catWhiteMat);
        pawL.scale.set(0.85, 0.6, 1.25);
        pawL.position.set(-0.16, 0.12, 0.42);
        catAnim.add(pawL);
        catGroup.userData.pawL = pawL;

        const pawR = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), catWhiteMat);
        pawR.scale.set(0.85, 0.6, 1.25);
        pawR.position.set(0.16, 0.12, 0.42);
        catAnim.add(pawR);
        catGroup.userData.pawR = pawR;

        // 灵动长尾巴 (带白尾尖)
        const tailGroup = new THREE.Group();
        tailGroup.position.set(0, 0.32, -0.45);
        catAnim.add(tailGroup);
        catGroup.userData.tailGroup = tailGroup;

        const tailPart1 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.35, 8), catFurMat);
        tailPart1.position.set(0, 0.15, -0.08);
        tailPart1.rotation.x = -Math.PI / 3.5;
        tailGroup.add(tailPart1);

        const tailPart2 = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.35, 8), catWhiteMat);
        tailPart2.position.set(0, 0.38, -0.02);
        tailPart2.rotation.x = -Math.PI / 8;
        tailGroup.add(tailPart2);

        // 放置在房间粉红地毯前方，面向镜头
        catGroup.position.set(0.9, 0, 0.8);
        catGroup.rotation.y = -Math.PI / 4;
        roomGroup.add(catGroup);
        registerInteractive(catGroup, 'cat');
    }

    // 💑 哲哲 & 珊珊 专属 3D Q版情侣形象 (被窝相拥酣眠姿态 + 沙发/地毯/飘窗依偎姿态)
    function buildCoupleFigures() {
        coupleGroup = new THREE.Group();
        coupleGroup.name = "couple";

        // 共享材质
        const skinMat = new THREE.MeshStandardMaterial({ color: 0xffdfba, roughness: 0.5 });
        const blushMat = new THREE.MeshBasicMaterial({ color: 0xff8fa3, transparent: true, opacity: 0.8 });
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1d2d44 });
        const eyeShineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const boyHoodieMat = new THREE.MeshStandardMaterial({ color: 0x3d5a80, roughness: 0.6 });
        const girlDressMat = new THREE.MeshStandardMaterial({ color: 0xffb3c1, roughness: 0.5 });
        const boyHairMat = new THREE.MeshStandardMaterial({ color: 0x22222b, roughness: 0.7 });
        const girlHairMat = new THREE.MeshStandardMaterial({ color: 0x3d2314, roughness: 0.7 });

        // ==============================================================
        // 🛏️ 姿态 1: poseBed (床上专属: 两人躺平钻进暖被窝，枕在枕头上甜蜜相拥相眠)
        // ==============================================================
        const poseBed = new THREE.Group();
        poseBed.name = "poseBed";
        coupleGroup.add(poseBed);
        coupleGroup.userData.poseBed = poseBed;

        // 1.1 哲哲睡颜与枕头躺姿 (左侧枕头)
        const bedBoy = new THREE.Group();
        bedBoy.position.set(-0.65, 0.22, -0.95);
        poseBed.add(bedBoy);
        coupleGroup.userData.bedBoy = bedBoy;

        const bedBoyHead = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16), skinMat);
        bedBoy.add(bedBoyHead);

        const bedBoyHair = new THREE.Mesh(new THREE.SphereGeometry(0.235, 14, 14), boyHairMat);
        bedBoyHair.position.set(0, 0.03, -0.04);
        bedBoy.add(bedBoyHair);

        for (let i = -2; i <= 2; i++) {
            const bang = new THREE.Mesh(new THREE.ConeGeometry(0.042, 0.11, 4), boyHairMat);
            bang.position.set(i * 0.05, 0.11, 0.17);
            bang.rotation.x = Math.PI / 1.35;
            bang.rotation.z = i * 0.1;
            bedBoy.add(bang);
        }

        // 哲哲安详睡眼与红晕 (微笑月牙闭眼)
        const bedBoyEyeL = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.005, 4, 8, Math.PI), eyeMat);
        bedBoyEyeL.position.set(-0.075, 0.01, 0.195);
        bedBoyEyeL.rotation.x = Math.PI;
        bedBoy.add(bedBoyEyeL);

        const bedBoyEyeR = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.005, 4, 8, Math.PI), eyeMat);
        bedBoyEyeR.position.set(0.075, 0.01, 0.195);
        bedBoyEyeR.rotation.x = Math.PI;
        bedBoy.add(bedBoyEyeR);

        const bedBoyBlushL = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.03), blushMat);
        bedBoyBlushL.position.set(-0.10, -0.05, 0.20);
        bedBoy.add(bedBoyBlushL);
        const bedBoyBlushR = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.03), blushMat);
        bedBoyBlushR.position.set(0.10, -0.05, 0.20);
        bedBoy.add(bedBoyBlushR);

        bedBoy.rotation.z = -0.15; // 侧头深情朝向珊珊
        bedBoy.rotation.y = 0.22;

        // 哲哲伸出的温暖睡衣手臂 (搭在被单上向右牵住珊珊)
        const bedBoyArm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.42, 8), boyHoodieMat);
        bedBoyArm.rotation.z = -Math.PI / 2.3;
        bedBoyArm.position.set(-0.25, 0.14, -0.72);
        poseBed.add(bedBoyArm);

        // 1.2 珊珊宝贝睡颜与枕头依偎 (右侧枕头)
        const bedGirl = new THREE.Group();
        bedGirl.position.set(0.48, 0.20, -0.95);
        poseBed.add(bedGirl);
        coupleGroup.userData.bedGirl = bedGirl;

        const bedGirlHead = new THREE.Mesh(new THREE.SphereGeometry(0.21, 16, 16), skinMat);
        bedGirl.add(bedGirlHead);

        const bedGirlHair = new THREE.Mesh(new THREE.SphereGeometry(0.225, 14, 14), girlHairMat);
        bedGirlHair.position.set(0, 0.02, -0.04);
        bedGirl.add(bedGirlHair);

        // 珊珊长发散落枕畔
        const bedHairL = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.02, 0.46, 8), girlHairMat);
        bedHairL.position.set(-0.16, -0.12, 0.04);
        bedHairL.rotation.z = 0.35;
        bedGirl.add(bedHairL);

        const bedHairR = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.02, 0.46, 8), girlHairMat);
        bedHairR.position.set(0.16, -0.12, 0.04);
        bedHairR.rotation.z = -0.35;
        bedGirl.add(bedHairR);

        // 珊珊可爱蝴蝶结发夹
        const bedBowMat = new THREE.MeshStandardMaterial({ color: 0xff4d6d });
        const bedBow = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), bedBowMat);
        bedBow.position.set(-0.15, 0.20, 0.12);
        bedGirl.add(bedBow);

        // 珊珊甜美微笑睡眼与粉嫩腮红
        const bedGirlEyeL = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.005, 4, 8, Math.PI), eyeMat);
        bedGirlEyeL.position.set(-0.07, 0.01, 0.19);
        bedGirlEyeL.rotation.x = Math.PI;
        bedGirl.add(bedGirlEyeL);

        const bedGirlEyeR = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.005, 4, 8, Math.PI), eyeMat);
        bedGirlEyeR.position.set(0.07, 0.01, 0.19);
        bedGirlEyeR.rotation.x = Math.PI;
        bedGirl.add(bedGirlEyeR);

        const bedGirlBlushL = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.035), blushMat);
        bedGirlBlushL.position.set(-0.10, -0.055, 0.195);
        bedGirl.add(bedGirlBlushL);
        const bedGirlBlushR = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.035), blushMat);
        bedGirlBlushR.position.set(0.10, -0.055, 0.195);
        bedGirl.add(bedGirlBlushR);

        bedGirl.rotation.z = 0.22; // 侧头甜甜依偎靠向哲哲
        bedGirl.rotation.y = -0.25;

        // 珊珊捧在被窝胸口的发光水晶心
        const bedMiniHeart = new THREE.Mesh(
            new THREE.SphereGeometry(0.045, 10, 10),
            new THREE.MeshStandardMaterial({ color: 0xff477e, emissive: 0xff477e, emissiveIntensity: 0.5 })
        );
        bedMiniHeart.position.set(0.24, 0.14, -0.72);
        poseBed.add(bedMiniHeart);

        // 1.3 软萌粉红被子翻边 (整齐盖在两人胸前，严丝合缝)
        const foldMat = new THREE.MeshStandardMaterial({ color: 0xffb3c1, roughness: 0.6 });
        const foldMesh = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.18, 0.42), foldMat);
        foldMesh.position.set(-0.08, 0.12, -0.65);
        poseBed.add(foldMesh);

        const furTrim = new THREE.Mesh(
            new THREE.CylinderGeometry(0.05, 0.05, 2.38, 12),
            new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 })
        );
        furTrim.rotation.z = Math.PI / 2;
        furTrim.position.set(-0.08, 0.20, -0.84);
        poseBed.add(furTrim);

        // 1.4 床头甜蜜梦乡爱心与呼噜泡泡
        const bedHeartMat = new THREE.MeshStandardMaterial({
            color: 0xff477e,
            emissive: 0xff477e,
            emissiveIntensity: 0.6
        });
        const bedHeartGroup = new THREE.Group();
        bedHeartGroup.position.set(-0.08, 0.62, -0.95);
        poseBed.add(bedHeartGroup);
        coupleGroup.userData.bedHeartGroup = bedHeartGroup;

        const sL = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 10), bedHeartMat);
        sL.position.set(-0.035, 0.035, 0);
        bedHeartGroup.add(sL);
        const sR = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 10), bedHeartMat);
        sR.position.set(0.035, 0.035, 0);
        bedHeartGroup.add(sR);
        const bC = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.1, 12), bedHeartMat);
        bC.rotation.z = Math.PI;
        bC.position.set(0, -0.015, 0);
        bedHeartGroup.add(bC);

        // ==============================================================
        // 🛋️ 姿态 2: poseSit (沙发/地毯/飘窗专属: 自然屈膝而坐，深情揽肩依偎)
        // ==============================================================
        const poseSit = new THREE.Group();
        poseSit.name = "poseSit";
        coupleGroup.add(poseSit);
        coupleGroup.userData.poseSit = poseSit;

        // 2.1 臭臭 (陈祖哲)
        const zhezhe = new THREE.Group();
        zhezhe.name = "zhezhe";
        zhezhe.position.set(-0.32, 0, 0);
        poseSit.add(zhezhe);
        coupleGroup.userData.zhezhe = zhezhe;

        const boyBody = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.44, 16), boyHoodieMat);
        boyBody.position.set(0, 0.22, 0);
        zhezhe.add(boyBody);

        const boyHood = new THREE.Mesh(
            new THREE.TorusGeometry(0.16, 0.045, 8, 16),
            new THREE.MeshStandardMaterial({ color: 0x2b3a4a })
        );
        boyHood.rotation.x = Math.PI / 2.2;
        boyHood.position.set(0, 0.42, -0.06);
        zhezhe.add(boyHood);

        const boyHeadGroup = new THREE.Group();
        boyHeadGroup.position.set(0, 0.65, 0);
        zhezhe.add(boyHeadGroup);
        coupleGroup.userData.boyHead = boyHeadGroup;

        const boyHead = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16), skinMat);
        boyHeadGroup.add(boyHead);

        const boyHairTop = new THREE.Mesh(new THREE.SphereGeometry(0.235, 14, 14), boyHairMat);
        boyHairTop.scale.set(1.02, 1.05, 1.02);
        boyHairTop.position.set(0, 0.04, -0.03);
        boyHeadGroup.add(boyHairTop);

        for (let i = -2; i <= 2; i++) {
            const bang = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.12, 4), boyHairMat);
            bang.position.set(i * 0.05, 0.12, 0.18);
            bang.rotation.x = Math.PI / 1.3;
            bang.rotation.z = i * 0.1;
            boyHeadGroup.add(bang);
        }

        const boyEyeL = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), eyeMat);
        boyEyeL.position.set(-0.08, -0.01, 0.19);
        boyHeadGroup.add(boyEyeL);
        const boyEyeR = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), eyeMat);
        boyEyeR.position.set(0.08, -0.01, 0.19);
        boyHeadGroup.add(boyEyeR);

        const boyShineL = new THREE.Mesh(new THREE.SphereGeometry(0.01, 6, 6), eyeShineMat);
        boyShineL.position.set(-0.085, 0.005, 0.21);
        boyHeadGroup.add(boyShineL);
        const boyShineR = new THREE.Mesh(new THREE.SphereGeometry(0.01, 6, 6), eyeShineMat);
        boyShineR.position.set(0.075, 0.005, 0.21);
        boyHeadGroup.add(boyShineR);

        const boyBlushL = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.03), blushMat);
        boyBlushL.position.set(-0.11, -0.06, 0.2);
        boyHeadGroup.add(boyBlushL);
        const boyBlushR = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.03), blushMat);
        boyBlushR.position.set(0.11, -0.06, 0.2);
        boyHeadGroup.add(boyBlushR);

        const boyArmL = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.32, 8), boyHoodieMat);
        boyArmL.position.set(-0.25, 0.2, 0.05);
        boyArmL.rotation.z = 0.2;
        zhezhe.add(boyArmL);

        // 哲哲右臂宠溺搭在珊珊肩上
        const boyArmR = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.35, 8), boyHoodieMat);
        boyArmR.position.set(0.24, 0.24, 0.06);
        boyArmR.rotation.z = -1.15;
        boyArmR.rotation.x = -0.3;
        zhezhe.add(boyArmR);

        const pantsMat = new THREE.MeshStandardMaterial({ color: 0x293241 });
        const shoeMat = new THREE.MeshStandardMaterial({ color: 0xffffff });

        const boyLegs = new THREE.Group();
        boyLegs.position.set(0, 0.06, 0.1);
        zhezhe.add(boyLegs);
        coupleGroup.userData.boyLegs = boyLegs;

        const boyThighL = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.055, 0.3, 8), pantsMat);
        boyThighL.rotation.x = -Math.PI / 2.3;
        boyThighL.position.set(-0.1, 0, 0.14);
        boyLegs.add(boyThighL);

        const boyThighR = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.055, 0.3, 8), pantsMat);
        boyThighR.rotation.x = -Math.PI / 2.3;
        boyThighR.position.set(0.1, 0, 0.14);
        boyLegs.add(boyThighR);

        const boyShoeL = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.07, 0.14), shoeMat);
        boyShoeL.position.set(-0.1, -0.06, 0.28);
        boyLegs.add(boyShoeL);
        const boyShoeR = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.07, 0.14), shoeMat);
        boyShoeR.position.set(0.1, -0.06, 0.28);
        boyLegs.add(boyShoeR);

        // 2.2 珊珊宝贝 (白珊珊)
        const shanshan = new THREE.Group();
        shanshan.name = "shanshan";
        shanshan.position.set(0.24, 0, 0);
        poseSit.add(shanshan);
        coupleGroup.userData.shanshan = shanshan;

        const girlBody = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, 0.42, 16), girlDressMat);
        girlBody.position.set(0, 0.21, 0);
        shanshan.add(girlBody);

        const girlCollar = new THREE.Mesh(
            new THREE.TorusGeometry(0.12, 0.03, 8, 16),
            new THREE.MeshStandardMaterial({ color: 0xffffff })
        );
        girlCollar.rotation.x = Math.PI / 2;
        girlCollar.position.set(0, 0.41, 0.02);
        shanshan.add(girlCollar);

        const girlHeadGroup = new THREE.Group();
        girlHeadGroup.position.set(0, 0.63, 0);
        girlHeadGroup.rotation.z = -0.22; // 深度依偎哲哲肩膀
        shanshan.add(girlHeadGroup);
        coupleGroup.userData.girlHead = girlHeadGroup;

        const girlHead = new THREE.Mesh(new THREE.SphereGeometry(0.21, 16, 16), skinMat);
        girlHeadGroup.add(girlHead);

        const girlHairTop = new THREE.Mesh(new THREE.SphereGeometry(0.23, 16, 16), girlHairMat);
        girlHairTop.scale.set(1.03, 1.05, 1.04);
        girlHairTop.position.set(0, 0.03, -0.03);
        girlHeadGroup.add(girlHairTop);

        const hairStrandL = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.03, 0.45, 8), girlHairMat);
        hairStrandL.position.set(-0.16, -0.22, 0.1);
        hairStrandL.rotation.z = 0.15;
        girlHeadGroup.add(hairStrandL);

        const hairStrandR = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.03, 0.45, 8), girlHairMat);
        hairStrandR.position.set(0.16, -0.22, 0.08);
        hairStrandR.rotation.z = -0.15;
        girlHeadGroup.add(hairStrandR);

        const bowMat = new THREE.MeshStandardMaterial({ color: 0xff4d6d, roughness: 0.4 });
        const bowCenter = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), bowMat);
        bowCenter.position.set(-0.15, 0.22, 0.12);
        girlHeadGroup.add(bowCenter);
        const bowWingL = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.08, 4), bowMat);
        bowWingL.rotation.z = Math.PI / 2;
        bowWingL.position.set(-0.2, 0.22, 0.12);
        girlHeadGroup.add(bowWingL);
        const bowWingR = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.08, 4), bowMat);
        bowWingR.rotation.z = -Math.PI / 2;
        bowWingR.position.set(-0.1, 0.22, 0.12);
        girlHeadGroup.add(bowWingR);

        const girlEyeL = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 8), eyeMat);
        girlEyeL.position.set(-0.075, -0.01, 0.185);
        girlHeadGroup.add(girlEyeL);
        const girlEyeR = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 8), eyeMat);
        girlEyeR.position.set(0.075, -0.01, 0.185);
        girlHeadGroup.add(girlEyeR);

        const girlShineL = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 6), eyeShineMat);
        girlShineL.position.set(-0.08, 0.005, 0.205);
        girlHeadGroup.add(girlShineL);
        const girlShineR = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 6), eyeShineMat);
        girlShineR.position.set(0.07, 0.005, 0.205);
        girlHeadGroup.add(girlShineR);

        const girlBlushL = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.035), blushMat);
        girlBlushL.position.set(-0.11, -0.065, 0.19);
        girlHeadGroup.add(girlBlushL);
        const girlBlushR = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.035), blushMat);
        girlBlushR.position.set(0.11, -0.065, 0.19);
        girlHeadGroup.add(girlBlushR);

        const miniHeartGeo = new THREE.SphereGeometry(0.05, 12, 12);
        miniHeartGeo.scale(1, 1.2, 0.6);
        const miniHeart = new THREE.Mesh(
            miniHeartGeo,
            new THREE.MeshStandardMaterial({ color: 0xff477e, emissive: 0xff477e, emissiveIntensity: 0.4 })
        );
        miniHeart.position.set(0, 0.14, 0.24);
        shanshan.add(miniHeart);

        const girlLegMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
        const girlShoeMat = new THREE.MeshStandardMaterial({ color: 0xff758c });

        const girlLegs = new THREE.Group();
        girlLegs.position.set(0, 0.06, 0.1);
        shanshan.add(girlLegs);
        coupleGroup.userData.girlLegs = girlLegs;

        const girlThighL = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.28, 8), girlLegMat);
        girlThighL.rotation.x = -Math.PI / 2.3;
        girlThighL.position.set(-0.08, 0, 0.13);
        girlLegs.add(girlThighL);

        const girlThighR = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.28, 8), girlLegMat);
        girlThighR.rotation.x = -Math.PI / 2.3;
        girlThighR.position.set(0.08, 0, 0.13);
        girlLegs.add(girlThighR);

        const girlShoeL = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.06, 0.13), girlShoeMat);
        girlShoeL.position.set(-0.08, -0.05, 0.26);
        girlLegs.add(girlShoeL);
        const girlShoeR = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.06, 0.13), girlShoeMat);
        girlShoeR.position.set(0.08, -0.05, 0.26);
        girlLegs.add(girlShoeR);

        // 2.3 温暖甜心膝盖小盖毯
        const blanketMat = new THREE.MeshStandardMaterial({ color: 0xffccd5, roughness: 0.7 });
        const blanket = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.16, 0.42), blanketMat);
        blanket.position.set(-0.04, 0.08, 0.22);
        poseSit.add(blanket);

        const trim = new THREE.Mesh(
            new THREE.CylinderGeometry(0.04, 0.04, 0.84, 12),
            new THREE.MeshStandardMaterial({ color: 0xffffff })
        );
        trim.rotation.z = Math.PI / 2;
        trim.position.set(-0.04, 0.15, 0.02);
        poseSit.add(trim);

        // 2.4 头顶悬浮闪耀浪漫爱心
        const loveHeartMat = new THREE.MeshStandardMaterial({
            color: 0xff477e,
            emissive: 0xff477e,
            emissiveIntensity: 0.5,
            roughness: 0.3
        });
        const heartGroup = new THREE.Group();
        heartGroup.position.set(-0.04, 1.05, 0);
        poseSit.add(heartGroup);
        coupleGroup.userData.heartGroup = heartGroup;

        const sphereL = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), loveHeartMat);
        sphereL.position.set(-0.04, 0.04, 0);
        heartGroup.add(sphereL);
        const sphereR = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), loveHeartMat);
        sphereR.position.set(0.04, 0.04, 0);
        heartGroup.add(sphereR);
        const bottomCone = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.12, 16), loveHeartMat);
        bottomCone.rotation.z = Math.PI;
        bottomCone.position.set(0, -0.02, 0);
        heartGroup.add(bottomCone);

        // ==============================================================
        // 🌟 初始状态: 默认安睡在双人暖萌床中，被窝贴贴！
        // ==============================================================
        poseBed.visible = true;
        poseSit.visible = false;
        coupleGroup.position.set(-1.8, 0.95, -1.8);
        coupleGroup.rotation.y = 0;
        roomGroup.add(coupleGroup);

        registerInteractive(coupleGroup, 'couple');
    }

    // 辅助心形函数
    function createHeartShape() {
        const shape = new THREE.Shape();
        const x = 0, y = 0;
        shape.moveTo(x + 0.25, y + 0.25);
        shape.bezierCurveTo(x + 0.25, y + 0.25, x + 0.2, y, x, y);
        shape.bezierCurveTo(x - 0.3, y, x - 0.3, y + 0.35, x - 0.3, y + 0.35);
        shape.bezierCurveTo(x - 0.3, y + 0.55, x - 0.1, y + 0.77, x + 0.25, y + 0.95);
        shape.bezierCurveTo(x + 0.6, y + 0.77, x + 0.8, y + 0.55, x + 0.8, y + 0.35);
        shape.bezierCurveTo(x + 0.8, y + 0.35, x + 0.8, y, x + 0.5, y);
        shape.bezierCurveTo(x + 0.35, y, x + 0.25, y + 0.25, x + 0.25, y + 0.25);
        return shape;
    }

    // 注册可交互对象
    function registerInteractive(obj, key) {
        obj.userData.furnitureKey = key;
        obj.traverse((child) => {
            if (child.isMesh) {
                child.userData.furnitureKey = key;
                interactiveObjects.push(child);
            }
        });
    }

    // 事件绑定 (拖拽视角旋转 & 点击交互)
    function bindEvents(container) {
        const dom = renderer.domElement;

        dom.addEventListener('mousedown', onPointerDown);
        dom.addEventListener('mousemove', onPointerMove);
        window.addEventListener('mouseup', onPointerUp);

        let touchStartPos = { x: 0, y: 0 };
        let isTouchScrolling = false;

        dom.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                touchStartPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                isTouchScrolling = false;
                onPointerDown(e.touches[0]);
            }
        }, { passive: true });

        dom.addEventListener('touchmove', (e) => {
            if (e.touches.length === 1) {
                if (touchStartPos && !isTouchScrolling) {
                    const dx = Math.abs(e.touches[0].clientX - touchStartPos.x);
                    const dy = Math.abs(e.touches[0].clientY - touchStartPos.y);
                    // 纵向滑动大于横向滑动并超过微小阈值，判定为手机端常规滚动，放行原生滚动
                    if (dy > dx && dy > 8) {
                        isTouchScrolling = true;
                        isDragging = false;
                        return;
                    }
                }
                if (!isTouchScrolling) {
                    onPointerMove(e.touches[0]);
                }
            }
        }, { passive: true });

        window.addEventListener('touchend', (e) => {
            isTouchScrolling = false;
            onPointerUp(e);
        });

        window.addEventListener('resize', () => {
            if (!renderer || !camera || !container) return;
            const w = container.clientWidth || 360;
            const h = container.clientHeight || 420;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
            requestRender(20);
        });
    }

    let downPos = { x: 0, y: 0 };
    function onPointerDown(e) {
        isDragging = true;
        downPos.x = e.clientX;
        downPos.y = e.clientY;
        previousMousePosition.x = e.clientX;
        previousMousePosition.y = e.clientY;
        requestRender(20);
    }

    function onPointerMove(e) {
        if (!isDragging) return;
        const deltaX = e.clientX - previousMousePosition.x;
        const deltaY = e.clientY - previousMousePosition.y;

        targetRotationY += deltaX * 0.006;
        targetRotationX += deltaY * 0.004;
        targetRotationX = Math.max(0.05, Math.min(0.45, targetRotationX));

        previousMousePosition.x = e.clientX;
        previousMousePosition.y = e.clientY;
        requestRender(20);
    }

    function onPointerUp(e) {
        if (!isDragging) return;
        isDragging = false;
        requestRender(40);

        const upX = e.clientX || (e.changedTouches && e.changedTouches[0].clientX);
        const upY = e.clientY || (e.changedTouches && e.changedTouches[0].clientY);

        if (Math.hypot(upX - downPos.x, upY - downPos.y) < 8) {
            handleTap(upX, upY);
        }
    }

    // 处理家具点击
    function handleTap(clientX, clientY) {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(interactiveObjects, false);

        if (intersects.length > 0) {
            const hit = intersects[0].object;
            const key = hit.userData.furnitureKey;
            if (key && FURNITURE_DEFS[key]) {
                const item = FURNITURE_DEFS[key];
                showFloatingNotice(item.title, item.desc);
                triggerFurnitureBounce(key);
                setTimeout(() => item.action(), 300);
            }
        }
    }

    // 家具受击/轻弹动效
    function triggerFurnitureBounce(key) {
        const group = roomGroup.getObjectByName(key);
        if (!group) return;
        const origY = group.position.y;
        group.position.y += 0.3;
        requestRender(30);
        setTimeout(() => { group.position.y = origY; requestRender(20); }, 180);
    }

    // 交互弹窗与提示
    function showFloatingNotice(title, desc) {
        let toast = document.getElementById('cabin-3d-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'cabin-3d-toast';
            toast.style.cssText = `
                position: absolute; bottom: 18px; left: 50%; transform: translateX(-50%);
                background: rgba(255, 255, 255, 0.92); backdrop-filter: blur(12px);
                border: 1px solid rgba(255, 117, 151, 0.4); padding: 10px 18px;
                border-radius: 20px; box-shadow: 0 10px 25px rgba(255, 71, 126, 0.2);
                color: #2b2d42; font-size: 0.88rem; font-weight: 700; z-index: 100;
                pointer-events: none; transition: all 0.3s; text-align: center; white-space: nowrap;
            `;
            document.getElementById('cabin-3d-viewport').appendChild(toast);
        }
        toast.innerHTML = `<span style="color:#ff477e; font-size:1rem;">${title}</span><br><span style="font-size:0.75rem; color:#8d99ae; font-weight:normal;">${desc}</span>`;
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';

        clearTimeout(window.toastTimer);
        window.toastTimer = setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(10px)';
        }, 2200);
    }

    // 贴贴抱抱床交互 (移步至床或在被窝里相拥贴贴)
    function triggerBedAction() {
        if (currentCoupleLoc !== 'bed') {
            moveCoupleToLocation('bed');
        } else {
            triggerCoupleCuddle();
        }
    }

    function triggerPhotoSlideshow() {
        const photosTab = document.querySelectorAll('.nav-item')[1];
        if (photosTab) photosTab.click();
    }

    function triggerMailboxAction() {
        const msgTab = document.querySelectorAll('.nav-item')[2];
        if (msgTab) msgTab.click();
    }

    function toggleMusicPlayer() {
        const audio = document.getElementById('bg-music') || document.querySelector('audio');
        if (audio) {
            if (audio.paused) {
                audio.play().catch(() => {});
                showFloatingNotice("📻 留声机", "甜蜜背景音乐已开启 🎵");
            } else {
                audio.pause();
                showFloatingNotice("📻 留声机", "音乐已暂停 ⏸️");
            }
        }
    }

    // 🎵 Web Audio API 原生合成逼真猫咪呼噜声与软萌轻喵
    function playCatPurrSound() {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            if (!window.__catAudioCtx) {
                window.__catAudioCtx = new AudioCtx();
            }
            const ctx = window.__catAudioCtx;
            if (ctx.state === 'suspended') {
                ctx.resume();
            }

            const now = ctx.currentTime;

            // 1. 软萌开场奶猫轻叫 (560Hz -> 780Hz -> 460Hz)
            const meowOsc = ctx.createOscillator();
            const meowGain = ctx.createGain();
            meowOsc.type = 'sine';
            meowOsc.frequency.setValueAtTime(560, now);
            meowOsc.frequency.exponentialRampToValueAtTime(780, now + 0.15);
            meowOsc.frequency.exponentialRampToValueAtTime(460, now + 0.35);

            meowGain.gain.setValueAtTime(0.06, now);
            meowGain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

            meowOsc.connect(meowGain);
            meowGain.connect(ctx.destination);
            meowOsc.start(now);
            meowOsc.stop(now + 0.4);

            // 2. 猫咪喉腔共振节律呼噜声 (24Hz 振幅调制在 68Hz 载波，典型猫咪惬意呼噜音频)
            const carrier = ctx.createOscillator();
            carrier.type = 'triangle';
            carrier.frequency.setValueAtTime(68, now + 0.2);

            const lfo = ctx.createOscillator();
            lfo.type = 'sine';
            lfo.frequency.setValueAtTime(24, now + 0.2);

            const lfoGain = ctx.createGain();
            lfoGain.gain.setValueAtTime(0.08, now + 0.2);

            const mainGain = ctx.createGain();
            mainGain.gain.setValueAtTime(0.001, now + 0.2);
            mainGain.gain.linearRampToValueAtTime(0.12, now + 0.5);
            mainGain.gain.setValueAtTime(0.12, now + 1.6);
            mainGain.gain.exponentialRampToValueAtTime(0.001, now + 2.3);

            lfo.connect(mainGain.gain);
            carrier.connect(mainGain);

            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(150, now);

            mainGain.connect(filter);
            filter.connect(ctx.destination);

            carrier.start(now + 0.2);
            lfo.start(now + 0.2);
            carrier.stop(now + 2.35);
            lfo.stop(now + 2.35);
        } catch (e) {
            console.warn("Purr sound synthesis failed:", e);
        }
    }

    // 💭 猫咪头顶升起呼噜爱心气泡
    function spawnPurrFloatingBubble() {
        const container = document.getElementById('cabin-3d-viewport');
        if (!container || !catGroup || !camera) return;

        const catWorldPos = new THREE.Vector3();
        catGroup.getWorldPosition(catWorldPos);
        catWorldPos.y += 0.85;

        const screenPos = catWorldPos.clone().project(camera);
        const rect = container.getBoundingClientRect();
        const x = ((screenPos.x + 1) / 2) * rect.width;
        const y = ((-screenPos.y + 1) / 2) * rect.height;

        const bubbles = ['💭 咕噜噜~', '💖', '✨ 呼噜呼噜...', '🐾 舒服~', '🌸 蹭蹭宝贝~'];
        const text = bubbles[Math.floor(Math.random() * bubbles.length)];

        const bubbleEl = document.createElement('div');
        bubbleEl.className = 'cat-purr-bubble';
        bubbleEl.textContent = text;
        bubbleEl.style.cssText = `
            position: absolute;
            left: ${x + (Math.random() - 0.5) * 35}px;
            top: ${y}px;
            transform: translate(-50%, -50%) scale(0.6);
            background: rgba(255, 255, 255, 0.95);
            border: 1px solid rgba(255, 117, 151, 0.45);
            color: #ff477e;
            font-weight: 800;
            font-size: 0.82rem;
            padding: 4px 10px;
            border-radius: 14px;
            box-shadow: 0 4px 12px rgba(255, 71, 126, 0.25);
            pointer-events: none;
            z-index: 90;
            transition: all 1.2s cubic-bezier(0.2, 0.8, 0.3, 1);
            opacity: 0;
            user-select: none;
            white-space: nowrap;
        `;
        container.appendChild(bubbleEl);

        requestAnimationFrame(() => {
            bubbleEl.style.opacity = '1';
            bubbleEl.style.transform = 'translate(-50%, -90px) scale(1.05)';
        });

        setTimeout(() => {
            bubbleEl.style.opacity = '0';
            bubbleEl.style.transform = 'translate(-50%, -130px) scale(0.9)';
            setTimeout(() => bubbleEl.remove(), 400);
        }, 900);
    }

    // 💖 浪漫清脆爱心配乐合成 (八音盒灵动琶音 C5-E5-G5-B5-C6)
    function playCoupleLoveSound() {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            if (!window.__catAudioCtx) window.__catAudioCtx = new AudioCtx();
            const ctx = window.__catAudioCtx;
            if (ctx.state === 'suspended') ctx.resume();

            const notes = [523.25, 659.25, 783.99, 987.77, 1046.50];
            const start = ctx.currentTime;

            notes.forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, start + idx * 0.08);

                gain.gain.setValueAtTime(0.001, start + idx * 0.08);
                gain.gain.linearRampToValueAtTime(0.08, start + idx * 0.08 + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.001, start + idx * 0.08 + 0.45);

                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(start + idx * 0.08);
                osc.stop(start + idx * 0.08 + 0.5);
            });
        } catch (e) {
            console.warn("Couple love sound synthesis failed:", e);
        }
    }

    // 💭 哲哲与珊珊甜蜜互动对白气泡 (支持床上/沙发/地毯/飘窗实时情景定制)
    function spawnCoupleFloatingDialogue() {
        const container = document.getElementById('cabin-3d-viewport');
        if (!container || !coupleGroup || !camera) return;

        const worldPos = new THREE.Vector3();
        coupleGroup.getWorldPosition(worldPos);
        worldPos.y += (currentCoupleLoc === 'bed' ? 0.85 : 1.25);

        const screenPos = worldPos.clone().project(camera);
        const rect = container.getBoundingClientRect();
        const x = ((screenPos.x + 1) / 2) * rect.width;
        const y = ((-screenPos.y + 1) / 2) * rect.height;

        const DIALOGUES_BY_LOC = {
            bed: [
                { speaker: "珊珊", role: "girl", text: "臭臭被窝里好暖和呀，再抱紧一点点~ 💤" },
                { speaker: "哲哲", role: "boy", text: "给珊珊宝贝掖好小被角，做个甜甜的梦，臭臭一直在身边❤️" },
                { speaker: "珊珊", role: "girl", text: "听着臭臭的心跳声，是全世界最有安全感的声音~" },
                { speaker: "哲哲", role: "boy", text: "小猪珊珊快闭上眼睛，梦里也要和我在一起哦！mua~" }
            ],
            sofa: [
                { speaker: "珊珊", role: "girl", text: "臭臭我要吃草莓爆米花，快喂我一口嘛~ 🍿" },
                { speaker: "哲哲", role: "boy", text: "遵命小仙女！这份爆米花也是草莓味的心动~" },
                { speaker: "珊珊", role: "girl", text: "窝在沙发里靠着臭臭肩膀，看什么大片都超级浪漫！💕" },
                { speaker: "哲哲", role: "boy", text: "冷不冷呀？臭臭用毛毯把你裹成专属小甜筒~" }
            ],
            rug: [
                { speaker: "珊珊", role: "girl", text: "咪咪快过来翻肚皮~ 给你吃最喜欢的小鱼干！🐱" },
                { speaker: "哲哲", role: "boy", text: "小猫咪和珊珊一样可爱，都是哲哲最想宠着的小宝贝~" },
                { speaker: "珊珊", role: "girl", text: "臭臭看，小猫咪好像很喜欢我们的粉红小窝呢！" },
                { speaker: "哲哲", role: "boy", text: "因为这里充满爱意，连空气都是甜甜的~" }
            ],
            window: [
                { speaker: "珊珊", role: "girl", text: "平阳的夜空真美呀，天上有颗星星一直在眨眼呢~ ✨" },
                { speaker: "哲哲", role: "boy", text: "因为珊珊眼里有光，比平阳所有的繁星还要耀眼千百倍！🌟" },
                { speaker: "珊珊", role: "girl", text: "微风吹得好舒服，想和臭臭一直看风景看到天荒地老~" },
                { speaker: "哲哲", role: "boy", text: "不管去到哪里，只要身边有珊珊，就是最美的风景！❤️" }
            ]
        };

        const list = DIALOGUES_BY_LOC[currentCoupleLoc] || DIALOGUES_BY_LOC.bed;
        const item = list[Math.floor(Math.random() * list.length)];

        const bubbleEl = document.createElement('div');
        bubbleEl.className = 'couple-dialogue-bubble ' + item.role;
        bubbleEl.innerHTML = `<span class="dialogue-name">${item.speaker}：</span>${item.text}`;
        bubbleEl.style.cssText = `
            position: absolute;
            left: ${x}px;
            top: ${y}px;
            transform: translate(-50%, -50%) scale(0.6);
            background: ${item.role === 'girl' ? 'rgba(255, 240, 245, 0.96)' : 'rgba(240, 248, 255, 0.96)'};
            border: 1.5px solid ${item.role === 'girl' ? '#ff758c' : '#3d5a80'};
            color: ${item.role === 'girl' ? '#d90429' : '#1d3557'};
            font-weight: 700;
            font-size: 0.82rem;
            padding: 6px 14px;
            border-radius: 16px;
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
            pointer-events: none;
            z-index: 95;
            transition: all 1.3s cubic-bezier(0.2, 0.8, 0.3, 1);
            opacity: 0;
            user-select: none;
            max-width: 260px;
            text-align: left;
            line-height: 1.4;
        `;
        container.appendChild(bubbleEl);

        requestAnimationFrame(() => {
            bubbleEl.style.opacity = '1';
            bubbleEl.style.transform = 'translate(-50%, -85px) scale(1.02)';
        });

        setTimeout(() => {
            bubbleEl.style.opacity = '0';
            bubbleEl.style.transform = 'translate(-50%, -125px) scale(0.92)';
            setTimeout(() => bubbleEl.remove(), 400);
        }, 1800);
    }

    // 💑 哲哲与珊珊甜蜜贴贴抱抱核心交互
    function triggerCoupleCuddle() {
        if (isCuddling) return;
        isCuddling = true;
        cuddleStartTime = performance.now();

        // 播放专属八音盒甜蜜音效
        playCoupleLoveSound();

        // 触发绚丽彩色爱心纸屑烟花
        if (typeof window.confetti === 'function') {
            window.confetti({
                particleCount: 50,
                spread: 75,
                origin: { y: 0.62 },
                colors: ['#ff477e', '#ff758c', '#ffccd5', '#ffd166', '#a17fe0']
            });
        }

        // 弹出专属情话气泡
        spawnCoupleFloatingDialogue();

        const bedQuotes = [
            "「哲哲给珊珊掖紧暖烘烘的粉红小被角：小猪宝贝快睡吧，梦里臭臭也在呢~ mua❤️」",
            "「珊珊在被窝里甜甜拱进哲哲怀里：有臭臭在身边，哪怕外面下大雨也是最安心的！💕」",
            "「哲哲轻轻揉了揉珊珊额头：不管走到哪里，只要抱住珊珊，就拥有了全世界！✨」",
            "「珊珊枕在哲哲胳膊上：软软的枕头暖暖的你，今晚也要做超级甜的美梦~ 💤」"
        ];
        const generalQuotes = [
            "「臭臭轻轻抱住珊珊：有宝贝在身边，小窝才是全世界最温暖的地方~ mua❤️」",
            "「珊珊甜甜依偎在臭臭怀里：今天也要一直一直抱着不撒手哦~ 💕」",
            "「臭臭温柔揉了揉珊珊头发：不管窗外晴天雨天，哲哲永远都是珊珊最坚固的依靠！✨」",
            "「珊珊蹭蹭臭臭肩膀：小窝真舒服，我们要一直一直在一起！🌸」"
        ];
        const quotes = currentCoupleLoc === 'bed' ? bedQuotes : generalQuotes;
        const quote = quotes[Math.floor(Math.random() * quotes.length)];

        showFloatingNotice("💑 哲哲与珊珊甜蜜贴贴抱抱~", quote);
        requestRender(160);
    }

    // 📍 哲哲与珊珊四大甜蜜互动地点 (床上/沙发/地毯/窗台)
    let currentCoupleLoc = 'bed';
    const COUPLE_LOCATIONS = {
        bed: {
            title: "🛏️ 暖萌双人床 · 被窝相拥",
            desc: "哲哲和珊珊钻进暖烘烘的被窝里相拥酣眠，枕头软软的，好温暖呀~ 💤❤️",
            pos: { x: -1.8, y: 0.95, z: -1.8 },
            rotY: 0
        },
        sofa: {
            title: "🛋️ 浪漫双人沙发 · 依偎看大片",
            desc: "哲哲和珊珊靠在马卡龙双人沙发上，一边吃爆米花零食一边看放映机~ 🍿💕",
            pos: { x: 1.0, y: 0.36, z: -1.35 },
            rotY: -Math.PI * 0.2
        },
        rug: {
            title: "🌸 软萌粉红地毯 · 逗逗小橘猫",
            desc: "哲哲和珊珊坐在地毯软垫上，拿着逗猫棒陪咪咪玩耍，小猫咪舒服到翻肚皮~ 🐱✨",
            pos: { x: 0.25, y: 0.06, z: 0.4 },
            rotY: -Math.PI * 0.25
        },
        window: {
            title: "🪟 浪漫飘窗软榻 · 远眺平阳风景",
            desc: "哲哲和珊珊坐在大飘窗软榻上，吹着微风，一起看平阳的天空与漫天繁星~ 🌤️✨",
            pos: { x: -3.05, y: 0.72, z: 0.5 },
            rotY: -Math.PI * 0.45
        }
    };

    function moveCoupleToLocation(targetLoc) {
        if (!coupleGroup || !COUPLE_LOCATIONS[targetLoc]) return;
        currentCoupleLoc = targetLoc;
        const info = COUPLE_LOCATIONS[targetLoc];

        // 姿态切换：床上躺平被窝相拥 vs 沙发/地毯/飘窗依偎端坐
        const poseBed = coupleGroup.userData.poseBed;
        const poseSit = coupleGroup.userData.poseSit;
        if (poseBed && poseSit) {
            if (targetLoc === 'bed') {
                poseBed.visible = true;
                poseSit.visible = false;
            } else {
                poseBed.visible = false;
                poseSit.visible = true;
            }
        }

        // 播放轻快灵动音效
        playCoupleLoveSound();

        // 绚丽爱心烟花
        if (typeof window.confetti === 'function') {
            window.confetti({
                particleCount: 35,
                spread: 60,
                origin: { y: 0.65 },
                colors: ['#ff477e', '#ff758c', '#ffccd5', '#ffd166']
            });
        }

        // 弹出情侣对白气泡
        spawnCoupleFloatingDialogue();

        // 更新按钮激活状态
        document.querySelectorAll('.couple-loc-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.loc === targetLoc);
        });

        // 萌趣小跳跃过渡到新位置
        const origY = info.pos.y;
        coupleGroup.position.set(info.pos.x, origY + 0.35, info.pos.z);
        coupleGroup.rotation.y = info.rotY;

        let hopFrames = 12;
        const hopStep = () => {
            if (hopFrames > 0) {
                hopFrames--;
                coupleGroup.position.y -= 0.35 / 12;
                requestRender(10);
                requestAnimationFrame(hopStep);
            } else {
                coupleGroup.position.y = origY;
                requestRender(30);
            }
        };
        requestAnimationFrame(hopStep);

        showFloatingNotice(info.title, info.desc);
        requestRender(60);
    }

    // 🐱 伸懒腰与打呼噜核心互动
    function triggerCatStretch() {
        if (isStretching) return;
        isStretching = true;
        stretchStartTime = performance.now();

        // 播放合成呼噜声
        playCatPurrSound();

        // 伴随升起爱心呼噜气泡
        spawnPurrFloatingBubble();
        setTimeout(spawnPurrFloatingBubble, 400);
        setTimeout(spawnPurrFloatingBubble, 850);

        // 根据平阳实时天气定制猫咪暖心对白
        let weatherCatMsg = "「咕噜噜~ 呼噜呼噜... 珊珊摸得好舒服呀！小咪最喜欢宝贝啦~」";
        if (currentWeather && currentWeather.type === 'rain') {
            weatherCatMsg = "「平阳下着细雨呢，小咪在暖被窝边陪着珊珊，咕噜噜... 舒服到翻肚皮~」";
        } else if (currentWeather && currentWeather.type === 'sunny' && currentWeather.isDay) {
            weatherCatMsg = "「平阳阳光好暖和呀！小咪晒着太阳伸个大大的懒腰~ 喵呜~ 蹭蹭宝贝~」";
        } else if (currentWeather && !currentWeather.isDay) {
            weatherCatMsg = "「夜深啦，平阳的夜空好静。小咪打着小呼噜陪珊珊，今晚也要做好梦哦~ 💤」";
        }

        showFloatingNotice("🐱 咪咪惬意地伸了个大懒腰~", weatherCatMsg);
        requestRender(140);
    }

    // ================================================================
    // 🌤️ 浙江温州平阳实时天气系统与 3D 房间环境联动
    // ================================================================
    const PINGYANG_WEATHER_API = 'https://api.open-meteo.com/v1/forecast?latitude=27.666&longitude=120.57&current=temperature_2m,relative_humidity_2m,is_day,precipitation,rain,weather_code&timezone=Asia%2FShanghai';
    const WEATHER_CACHE_KEY = 'love_cabin_pingyang_weather';

    function getWeatherInfo(code, isDay) {
        if (code === 0) return { desc: isDay ? '晴朗明媚' : '晴朗星夜', icon: isDay ? '☀️' : '🌙', type: 'sunny' };
        if (code === 1) return { desc: isDay ? '晴间多云' : '微云夜', icon: isDay ? '🌤️' : '☁️', type: 'cloudy' };
        if (code === 2) return { desc: '多云和煦', icon: '⛅', type: 'cloudy' };
        if (code === 3) return { desc: '阴天温和', icon: '☁️', type: 'overcast' };
        if (code === 45 || code === 48) return { desc: '薄雾迷蒙', icon: '🌫️', type: 'fog' };
        if (code >= 51 && code <= 55) return { desc: '毛毛细雨', icon: '🌦️', type: 'rain' };
        if (code >= 61 && code <= 65) return { desc: '淅沥雨天', icon: '🌧️', type: 'rain' };
        if (code === 66 || code === 67) return { desc: '冻雨微凉', icon: '🌧️', type: 'rain' };
        if (code >= 71 && code <= 77) return { desc: '浪漫小雪', icon: '❄️', type: 'snow' };
        if (code >= 80 && code <= 82) return { desc: '阵雨淅沥', icon: '🌧️', type: 'rain' };
        if (code === 85 || code === 86) return { desc: '阵雪纷飞', icon: '🌨️', type: 'snow' };
        if (code >= 95) return { desc: '雷阵雨', icon: '⛈️', type: 'storm' };
        return { desc: isDay ? '舒适微风' : '恬静夜晚', icon: isDay ? '🌤️' : '🌙', type: 'sunny' };
    }

    function fetchPingyangWeather() {
        // 先检查本地缓存 (10 分钟内有效)
        const cachedStr = localStorage.getItem(WEATHER_CACHE_KEY);
        if (cachedStr) {
            try {
                const cached = JSON.parse(cachedStr);
                if (Date.now() - cached.timestamp < 10 * 60 * 1000) {
                    currentWeather = cached.data;
                    updateWeatherBadge(currentWeather);
                    applyWeatherToRoom(currentWeather);
                    return;
                }
            } catch (e) {}
        }

        const handleRawData = (data) => {
            if (data && data.current) {
                const c = data.current;
                const info = getWeatherInfo(c.weather_code, c.is_day);
                const weatherData = {
                    temp: Math.round(c.temperature_2m),
                    humidity: c.relative_humidity_2m,
                    isDay: c.is_day === 1,
                    code: c.weather_code,
                    rain: c.rain || c.precipitation || 0,
                    desc: info.desc,
                    icon: info.icon,
                    type: info.type
                };

                currentWeather = weatherData;
                localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify({
                    data: weatherData,
                    timestamp: Date.now()
                }));

                updateWeatherBadge(weatherData);
                applyWeatherToRoom(weatherData);
                return true;
            }
            return false;
        };

        const applyFallback = () => {
            const chinaHour = (new Date().getUTCHours() + 8) % 24;
            const isDay = chinaHour >= 6 && chinaHour < 18;
            const fallbackData = {
                temp: 21,
                humidity: 85,
                isDay: isDay,
                code: isDay ? 1 : 80,
                rain: isDay ? 0 : 0.4,
                desc: isDay ? '晴间多云' : '小阵雨',
                icon: isDay ? '🌤️' : '🌧️',
                type: isDay ? 'cloudy' : 'rain'
            };
            currentWeather = fallbackData;
            updateWeatherBadge(fallbackData);
            applyWeatherToRoom(fallbackData);
        };

        // 优先通过小屋自身后端 API 获取（速度极快、无境外网络限制），超时则降级直连
        let isHandled = false;
        const fetchBackend = () => {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 3500);

            fetch('/api/weather/pingyang', { signal: controller.signal })
                .then(res => res.json())
                .then(data => {
                    clearTimeout(timer);
                    if (!isHandled && handleRawData(data)) {
                        isHandled = true;
                    } else if (!isHandled) {
                        fetchDirect();
                    }
                })
                .catch(() => {
                    clearTimeout(timer);
                    if (!isHandled) fetchDirect();
                });
        };

        const fetchDirect = () => {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 4000);

            fetch(PINGYANG_WEATHER_API, { signal: controller.signal })
                .then(res => res.json())
                .then(data => {
                    clearTimeout(timer);
                    if (!isHandled && handleRawData(data)) {
                        isHandled = true;
                    } else if (!isHandled) {
                        applyFallback();
                    }
                })
                .catch(() => {
                    clearTimeout(timer);
                    if (!isHandled) applyFallback();
                });
        };

        fetchBackend();
    }

    // 更新界面天气挂件
    function updateWeatherBadge(data) {
        const badge = document.getElementById('cabin-weather-badge');
        const iconEl = document.getElementById('cabin-weather-icon');
        const tempEl = document.getElementById('cabin-weather-temp');
        const textEl = document.getElementById('cabin-weather-text');

        if (iconEl) iconEl.textContent = data.icon;
        if (tempEl) tempEl.textContent = `${data.temp}°C`;
        if (textEl) textEl.textContent = data.desc;

        if (badge) {
            badge.onclick = () => showWeatherCard(data);
        }
    }

    // 气候与 3D 房间环境材质/光影动态联动
    function applyWeatherToRoom(data) {
        if (!roomGroup || !skyMat) return;

        const isDay = data.isDay;
        const type = data.type;

        // 1. 窗外天空颜色与天象切换
        if (!isDay) {
            // 夜晚深邃暗夜蓝
            skyMat.color.setHex(0x0a081a);
            if (starsGroup) starsGroup.visible = true;
            if (moonMesh) moonMesh.visible = true;
            if (sunbeamMesh) sunbeamMesh.visible = false;
        } else {
            // 白天隐藏星月
            if (starsGroup) starsGroup.visible = false;
            if (moonMesh) moonMesh.visible = false;

            if (type === 'sunny') {
                skyMat.color.setHex(0x64b5f6); // 蔚蓝晴空
                if (sunbeamMesh) sunbeamMesh.visible = true;
            } else if (type === 'cloudy' || type === 'overcast') {
                skyMat.color.setHex(0x94a3b8); // 柔和银灰云天
                if (sunbeamMesh) sunbeamMesh.visible = false;
            } else if (type === 'rain' || type === 'storm') {
                skyMat.color.setHex(0x334155); // 阴郁水汽蓝灰
                if (sunbeamMesh) sunbeamMesh.visible = false;
            } else {
                skyMat.color.setHex(0x78909c);
                if (sunbeamMesh) sunbeamMesh.visible = false;
            }
        }

        // 2. 雨滴粒子系统开关
        if (rainGroup) {
            rainGroup.visible = (type === 'rain' || type === 'storm' || (data.rain && data.rain > 0));
        }

        // 3. 室内光影系统随平阳昼夜与天候联动
        if (ambientLight && sunLight && pinkPointLight) {
            if (!isDay) {
                // 夜晚模式：暖光包裹，床头爱心夜灯加亮，小窝极具私密温馨安全感
                ambientLight.color.setHex(0xffdfd3);
                ambientLight.intensity = 0.65;
                sunLight.color.setHex(0x829bb5); // 窗外淡淡银白月辉
                sunLight.intensity = 0.45;
                pinkPointLight.intensity = 1.6;
            } else if (type === 'sunny') {
                // 晴朗白天：阳光明媚通透
                ambientLight.color.setHex(0xfff5ea);
                ambientLight.intensity = 1.05;
                sunLight.color.setHex(0xfff0d4);
                sunLight.intensity = 1.35;
                pinkPointLight.intensity = 0.8;
            } else if (type === 'rain' || type === 'storm') {
                // 雨天白天：室内暖光比外面明亮温馨
                ambientLight.color.setHex(0xd0d8e2);
                ambientLight.intensity = 0.75;
                sunLight.color.setHex(0x8fa3b8);
                sunLight.intensity = 0.55;
                pinkPointLight.intensity = 1.35;
            } else {
                // 多云舒适
                ambientLight.color.setHex(0xfff0f3);
                ambientLight.intensity = 0.95;
                sunLight.color.setHex(0xfff5eb);
                sunLight.intensity = 1.1;
                pinkPointLight.intensity = 1.0;
            }
        }

        requestRender(60);
    }

    // 点击平阳天气挂件的宠溺寄语弹窗
    function showWeatherCard(data) {
        const isDay = data.isDay;
        const type = data.type;
        const temp = data.temp;

        let greeting = "";
        if (type === 'rain' || type === 'storm') {
            greeting = isDay 
                ? "平阳今天正下着雨呢，出门千万记得带伞、穿双防水的鞋子哦！小窝里小猫咪已经暖好窝啦，有臭臭牵挂着你，别着凉了宝贝~ 🌧️❤️"
                : "平阳今晚有细雨淅淅沥沥，空气湿润微凉。小猫咪正舒舒服服打着呼噜呢！哲哲已经为珊珊暖好被窝啦，盖好被子，听着雨声甜甜入睡吧~ 💤❤️";
        } else if (type === 'sunny') {
            greeting = isDay 
                ? "平阳今天阳光明媚，微风正好！小猫咪正躺在窗台边晒太阳呢。愿珊珊宝贝今天的心情也像晴空一样灿烂明媚，想你每一分每一秒~ ☀️✨"
                : "平阳的夜空晴朗静谧，满天繁星闪烁。小窝里好温暖，臭臭随时都在宝贝身边。今晚要乖乖睡个美容觉哦~ 🌙💕";
        } else if (type === 'cloudy' || type === 'overcast') {
            greeting = isDay 
                ? "平阳今天多云微风，天色柔和舒服。不管窗外云层多厚，珊珊永远是哲哲心底最温暖闪亮的小太阳~ ⛅🌸"
                : "平阳今夜云影轻柔，凉风习习。猫咪打呼噜的声音真治愈，有臭臭一直陪着珊珊，心安又甜蜜~ ☁️❤️";
        } else {
            greeting = `平阳此刻气温 ${temp}°C，舒适宜人。不管天晴下雨，这个小窝永远是属于我们最温馨的港湾~ ❤️`;
        }

        alert(`📍 浙江温州 · 平阳县实时天气联动\n\n【${data.icon} ${data.desc} · 气温 ${temp}°C · 湿度 ${data.humidity}%】\n\n💬 哲哲的暖心叮嘱：\n${greeting}`);
    }

    // 渲染循环 (极速按需渲染，静止时 0% 负载)
    function animate() {
        animationFrameId = requestAnimationFrame(animate);

        // 0. 电影级平滑运镜视角补间
        if (isCameraAnimating) {
            camera.position.lerp(targetCameraPos, 0.08);
            currentCameraLookAt.lerp(targetCameraLookAt, 0.08);
            camera.lookAt(currentCameraLookAt);

            if (camera.position.distanceTo(targetCameraPos) < 0.02 && currentCameraLookAt.distanceTo(targetCameraLookAt) < 0.02) {
                camera.position.copy(targetCameraPos);
                currentCameraLookAt.copy(targetCameraLookAt);
                camera.lookAt(currentCameraLookAt);
                isCameraAnimating = false;
            }
        }

        // 1. 猫咪伸懒腰动画计算
        if (isStretching && catGroup && catGroup.userData.catAnim) {
            const elapsed = (performance.now() - stretchStartTime) / 1000;
            const anim = catGroup.userData.catAnim;
            const body = catGroup.userData.body;
            const head = catGroup.userData.headGroup;
            const pawL = catGroup.userData.pawL;
            const pawR = catGroup.userData.pawR;
            const tail = catGroup.userData.tailGroup;

            if (elapsed < 0.5) {
                // 阶段 1: 前爪前伸低趴，后半身拱起拉伸 (经典下犬伸懒腰)
                const p = elapsed / 0.5;
                const easeP = Math.sin((p * Math.PI) / 2);

                anim.rotation.x = -0.38 * easeP;
                anim.position.y = 0.12 - 0.06 * easeP;

                pawL.position.z = 0.42 + 0.28 * easeP;
                pawL.position.y = 0.12 - 0.05 * easeP;
                pawR.position.z = 0.42 + 0.28 * easeP;
                pawR.position.y = 0.12 - 0.05 * easeP;

                head.position.y = 0.6 - 0.14 * easeP;
                head.position.z = 0.42 + 0.16 * easeP;

                body.scale.set(0.85, 0.72, 1.15 + 0.35 * easeP);

                tail.position.y = 0.32 + 0.15 * easeP;
                tail.rotation.x = 0.9 * easeP;
            } else if (elapsed < 1.0) {
                // 阶段 2: 保持深度伸展，全身呼噜高频微震颤，尾巴惬意摆动
                const vib = Math.sin(elapsed * 45) * 0.015;
                anim.position.y = 0.06 + vib;
                tail.rotation.z = Math.sin(elapsed * 16) * 0.35;
                head.rotation.z = Math.sin(elapsed * 10) * 0.1;
            } else if (elapsed < 1.5) {
                // 阶段 3: 弓背大拉伸 (拱成一道软萌彩虹)
                const p = (elapsed - 1.0) / 0.5;
                const archP = Math.sin(p * Math.PI);

                anim.rotation.x = 0.28 * archP;
                anim.position.y = 0.12 + 0.08 * archP;

                pawL.position.z = 0.42;
                pawL.position.y = 0.12;
                pawR.position.z = 0.42;
                pawR.position.y = 0.12;

                head.position.y = 0.6 + 0.06 * archP;
                head.position.z = 0.42 - 0.05 * archP;

                body.scale.set(0.88, 0.8 + 0.4 * archP, 1.15 - 0.2 * archP);
                tail.rotation.x = -0.4 * archP;
                tail.rotation.z = Math.sin(elapsed * 8) * 0.2;
            } else if (elapsed < 1.9) {
                // 阶段 4: 平滑收回原位
                const p = (elapsed - 1.5) / 0.4;
                const settleP = 1 - p;

                anim.rotation.x = 0;
                anim.position.y = 0.12;

                pawL.position.set(-0.16, 0.12, 0.42);
                pawR.position.set(0.16, 0.12, 0.42);

                head.position.set(0, 0.6, 0.42);
                head.rotation.set(0, 0, 0);

                body.scale.set(0.85, 0.8, 1.15);

                tail.position.set(0, 0.32, -0.45);
                tail.rotation.set(0, 0, 0);
            } else {
                // 伸展完成，恢复待机
                isStretching = false;
                anim.rotation.set(0, 0, 0);
                anim.position.set(0, 0.12, 0);
                pawL.position.set(-0.16, 0.12, 0.42);
                pawR.position.set(0.16, 0.12, 0.42);
                head.position.set(0, 0.6, 0.42);
                head.rotation.set(0, 0, 0);
                body.scale.set(0.85, 0.8, 1.15);
                tail.position.set(0, 0.32, -0.45);
                tail.rotation.set(0, 0, 0);
            }
        } else if (!isStretching && catGroup && catGroup.userData.catAnim) {
            // 待机轻缓呼吸与尾巴摆动
            const time = performance.now() * 0.002;
            const body = catGroup.userData.body;
            const tail = catGroup.userData.tailGroup;
            if (body) {
                body.scale.y = 0.8 + Math.sin(time * 1.6) * 0.02;
            }
            if (tail) {
                tail.rotation.z = Math.sin(time * 1.2) * 0.15;
            }
        }

        // 1.5 哲哲与珊珊情侣双姿态 (床上甜蜜呼吸相拥 vs 沙发依偎悠闲)
        if (coupleGroup) {
            const time = performance.now() * 0.002;
            const poseBed = coupleGroup.userData.poseBed;
            const poseSit = coupleGroup.userData.poseSit;

            if (poseBed && poseBed.visible) {
                // 🛌 床上被窝温存动态
                const bedBoy = coupleGroup.userData.bedBoy;
                const bedGirl = coupleGroup.userData.bedGirl;
                const bedHeartGroup = coupleGroup.userData.bedHeartGroup;

                if (isCuddling) {
                    const elapsed = (performance.now() - cuddleStartTime) / 1000;
                    if (elapsed < 0.4) {
                        const p = Math.sin((elapsed / 0.4) * Math.PI / 2);
                        if (bedBoy) bedBoy.position.x = -0.65 + 0.15 * p;
                        if (bedGirl) bedGirl.position.x = 0.48 - 0.15 * p;
                        if (bedHeartGroup) bedHeartGroup.scale.set(1 + 0.8 * p, 1 + 0.8 * p, 1 + 0.8 * p);
                    } else if (elapsed < 1.4) {
                        const sway = Math.sin(elapsed * 8) * 0.03;
                        if (bedBoy) bedBoy.position.x = -0.50 + sway;
                        if (bedGirl) bedGirl.position.x = 0.33 + sway;
                        if (bedHeartGroup) {
                            bedHeartGroup.position.y = 0.62 + Math.sin(elapsed * 12) * 0.08;
                            bedHeartGroup.rotation.y = elapsed * 3;
                        }
                    } else if (elapsed < 1.9) {
                        const p = (elapsed - 1.4) / 0.5;
                        const settleP = 1 - p;
                        if (bedBoy) bedBoy.position.x = -0.65 + 0.15 * settleP;
                        if (bedGirl) bedGirl.position.x = 0.48 - 0.15 * settleP;
                        if (bedHeartGroup) bedHeartGroup.scale.set(1 + 0.8 * settleP, 1 + 0.8 * settleP, 1 + 0.8 * settleP);
                    } else {
                        isCuddling = false;
                        if (bedBoy) bedBoy.position.x = -0.65;
                        if (bedGirl) bedGirl.position.x = 0.48;
                        if (bedHeartGroup) bedHeartGroup.scale.set(1, 1, 1);
                    }
                } else {
                    // 轻柔呼吸起伏与爱心微浮动
                    if (bedBoy) bedBoy.position.y = 0.22 + Math.sin(time * 1.5) * 0.008;
                    if (bedGirl) bedGirl.position.y = 0.20 + Math.sin(time * 1.5 + 0.4) * 0.008;
                    if (bedHeartGroup) {
                        bedHeartGroup.position.y = 0.62 + Math.sin(time * 2.2) * 0.03;
                        bedHeartGroup.rotation.y = time * 0.8;
                    }
                }
            } else if (poseSit && poseSit.visible) {
                // 🛋️ 沙发/地毯/飘窗依偎坐姿动态
                const boyLegL = coupleGroup.userData.boyLegL;
                const boyLegR = coupleGroup.userData.boyLegR;
                const girlLegL = coupleGroup.userData.girlLegL;
                const girlLegR = coupleGroup.userData.girlLegR;
                const heart = coupleGroup.userData.heartGroup;
                const zhezhe = coupleGroup.userData.zhezhe;
                const shanshan = coupleGroup.userData.shanshan;

                if (isCuddling) {
                    const elapsed = (performance.now() - cuddleStartTime) / 1000;
                    if (elapsed < 0.4) {
                        const p = Math.sin((elapsed / 0.4) * Math.PI / 2);
                        if (zhezhe) {
                            zhezhe.position.x = -0.32 + 0.1 * p;
                            zhezhe.rotation.y = 0.35 * p;
                        }
                        if (shanshan) {
                            shanshan.position.x = 0.24 - 0.1 * p;
                            shanshan.rotation.z = -0.18 - 0.2 * p;
                        }
                        if (heart) {
                            heart.scale.set(1 + 0.6 * p, 1 + 0.6 * p, 1 + 0.6 * p);
                        }
                    } else if (elapsed < 1.4) {
                        const sway = Math.sin(elapsed * 8) * 0.04;
                        if (zhezhe) zhezhe.position.x = -0.22 + sway;
                        if (shanshan) shanshan.position.x = 0.14 + sway;
                        if (heart) {
                            heart.position.y = 1.05 + Math.sin(elapsed * 12) * 0.08;
                            heart.rotation.y = elapsed * 4;
                        }
                    } else if (elapsed < 1.9) {
                        const p = (elapsed - 1.4) / 0.5;
                        const settleP = 1 - p;
                        if (zhezhe) {
                            zhezhe.position.x = -0.32 + 0.1 * settleP;
                            zhezhe.rotation.y = 0.35 * settleP;
                        }
                        if (shanshan) {
                            shanshan.position.x = 0.24 - 0.1 * settleP;
                            shanshan.rotation.z = -0.18 - 0.2 * settleP;
                        }
                        if (heart) {
                            heart.scale.set(1 + 0.6 * settleP, 1 + 0.6 * settleP, 1 + 0.6 * settleP);
                        }
                    } else {
                        isCuddling = false;
                        if (zhezhe) {
                            zhezhe.position.x = -0.32;
                            zhezhe.rotation.y = 0;
                        }
                        if (shanshan) {
                            shanshan.position.x = 0.24;
                            shanshan.rotation.z = -0.18;
                        }
                        if (heart) heart.scale.set(1, 1, 1);
                    }
                } else {
                    // 待机悠闲晃腿与头顶爱心旋转
                    if (boyLegL) boyLegL.rotation.x = Math.sin(time * 2.2) * 0.18;
                    if (boyLegR) boyLegR.rotation.x = Math.sin(time * 2.2 + 0.8) * 0.18;
                    if (girlLegL) girlLegL.rotation.x = Math.sin(time * 2.4 + 0.4) * 0.22;
                    if (girlLegR) girlLegR.rotation.x = Math.sin(time * 2.4 + 1.2) * 0.22;
                    if (heart) {
                        heart.position.y = 1.05 + Math.sin(time * 2.8) * 0.035;
                        heart.rotation.y = time * 1.5;
                    }
                }
            }
        }

        // 2. 雨天平阳雨丝粒子向下流动
        if (rainGroup && rainGroup.visible) {
            const drops = rainGroup.children;
            for (let i = 0; i < drops.length; i++) {
                drops[i].position.y -= 0.12;
                if (drops[i].position.y < 2.1) {
                    drops[i].position.y = 4.3;
                    drops[i].position.z = -0.7 + Math.random() * 2.4;
                }
            }
        }

        // 3. 动态渲染控制 (有雨、有运镜、有拉伸或有拖拽时连续渲染，其余静止省电)
        const shouldContinuousRender = isDragging || isStretching || isCuddling || isCameraAnimating || (rainGroup && rainGroup.visible) || renderFramesLeft > 0;

        if (shouldContinuousRender) {
            currentRotationY += (targetRotationY - currentRotationY) * 0.1;
            currentRotationX += (targetRotationX - currentRotationX) * 0.1;

            if (roomGroup) {
                roomGroup.rotation.y = currentRotationY;
                roomGroup.rotation.x = currentRotationX;
            }

            renderer.render(scene, camera);

            if (!isDragging && !isStretching && !isCuddling && !isCameraAnimating && (!rainGroup || !rainGroup.visible)) {
                renderFramesLeft--;
            }
        }
    }

    window.Cabin3D = {
        init: init3DStage,
        interactCouple: triggerCoupleCuddle,
        moveCouple: moveCoupleToLocation,
        getCurrentCoupleLoc: () => currentCoupleLoc,
        switchCamera: switchCameraView,
        getCurrentCameraView: () => currentCameraView,
        interactCat: triggerCatStretch,
        showWeather: () => currentWeather && showWeatherCard(currentWeather),
        refreshWeather: fetchPingyangWeather,
        destroy: () => {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            isInitialized = false;
        }
    };
})();
