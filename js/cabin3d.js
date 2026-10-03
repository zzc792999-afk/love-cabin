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

    // 按需高效渲染控制：仅在拖动或视角变化时渲染，静止时 0% GPU 消耗，极速丝滑
    let renderFramesLeft = 60;
    function requestRender(frames = 30) {
        renderFramesLeft = Math.max(renderFramesLeft, frames);
    }

    // 家具定义与对应互动事件
    const FURNITURE_DEFS = {
        bed: {
            title: "🛏️ 双人暖萌床",
            desc: "臭臭已为珊珊暖好被窝啦~ 点击贴贴抱抱！",
            action: () => triggerBedAction()
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
        const ambientLight = new THREE.AmbientLight(0xfff0f3, 0.95);
        scene.add(ambientLight);

        const sunLight = new THREE.DirectionalLight(0xfff5eb, 1.15);
        sunLight.position.set(8, 14, 6);
        scene.add(sunLight);

        const pinkPointLight = new THREE.PointLight(0xff758c, 1.2, 16);
        pinkPointLight.position.set(0, 3.5, 0);
        scene.add(pinkPointLight);

        // 5. 房间模型组
        roomGroup = new THREE.Group();
        scene.add(roomGroup);

        buildRoomStructure();
        buildBed();
        buildFridge();
        buildTV();
        buildPunchingBag();
        buildMailbox();
        buildGramophone();
        buildDecorations();

        // 6. 交互射线投射
        raycaster = new THREE.Raycaster();
        mouse = new THREE.Vector2();

        // 绑定事件
        bindEvents(container);

        isInitialized = true;
        requestRender(60);
        animate();
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

        // 窗户 (左墙带星空光效)
        const windowFrameMat = new THREE.MeshStandardMaterial({ color: 0xffb3c1 });
        const windowFrame = new THREE.Mesh(new THREE.BoxGeometry(0.35, 2.2, 2.8), windowFrameMat);
        windowFrame.position.set(-3.85, 3.2, 0.5);
        roomGroup.add(windowFrame);

        // 窗外星空深邃蓝
        const skyMat = new THREE.MeshBasicMaterial({ color: 0x1a1235 });
        const skyMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.0), skyMat);
        skyMesh.rotation.y = Math.PI / 2;
        skyMesh.position.set(-3.65, 3.2, 0.5);
        roomGroup.add(skyMesh);
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

    // 贴贴抱抱床弹窗
    function triggerBedAction() {
        const daysEl = document.getElementById('together-days-card') || document.getElementById('meet-days-card');
        const days = daysEl ? daysEl.innerText.trim() : '260';
        alert(`💖 叮！双人暖萌床贴贴成功！\n\n臭臭和珊珊已经相恋 ${days} 天啦！\n“在这个小窝里，今天也要甜甜地做个好梦哦~” mua~❤️`);
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

    // 渲染循环 (极速按需渲染，静止时 0% 负载)
    function animate() {
        animationFrameId = requestAnimationFrame(animate);

        if (isDragging || renderFramesLeft > 0) {
            currentRotationY += (targetRotationY - currentRotationY) * 0.1;
            currentRotationX += (targetRotationX - currentRotationX) * 0.1;

            if (roomGroup) {
                roomGroup.rotation.y = currentRotationY;
                roomGroup.rotation.x = currentRotationX;
            }

            renderer.render(scene, camera);

            if (!isDragging) {
                renderFramesLeft--;
            }
        }
    }

    window.Cabin3D = {
        init: init3DStage,
        destroy: () => {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            isInitialized = false;
        }
    };
})();
