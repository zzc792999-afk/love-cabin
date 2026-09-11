const http = require('http');
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'other', 'messages.json');
const CONFIG_FILE = path.join(__dirname, 'other', 'config.json');
const WISHLIST_FILE = path.join(__dirname, 'other', 'wishlist.json');

// 🔌 MongoDB 变量初始化
let dbClient = null;
let messagesCollection = null;
let configCollection = null;
let wishlistCollection = null;
let diaryCollection = null;
let decisionsCollection = null;
let polaroidsCollection = null;
let foodMenuCollection = null;
let foodOrdersCollection = null;
const mongoURI = process.env.MONGODB_URI || "";
const DIARY_FILE = path.join(__dirname, 'other', 'diary.json');
const DECISIONS_FILE = path.join(__dirname, 'other', 'decisions.json');
const POLAROIDS_FILE = path.join(__dirname, 'other', 'polaroids.json');
const FOOD_MENU_FILE = path.join(__dirname, 'other', 'food_menu.json');
const FOOD_ORDERS_FILE = path.join(__dirname, 'other', 'food_orders.json');

if (mongoURI) {
    console.log("检测到 MONGODB_URI，正在建立云数据库连接...");
    MongoClient.connect(mongoURI)
        .then(client => {
            dbClient = client;
            const db = client.db('love_cabin');
            messagesCollection = db.collection('messages');
            configCollection = db.collection('config');
            wishlistCollection = db.collection('wishlist');
            diaryCollection = db.collection('diary');
            decisionsCollection = db.collection('decisions');
            polaroidsCollection = db.collection('polaroids');
            foodMenuCollection = db.collection('food_menu');
            foodOrdersCollection = db.collection('food_orders');
            console.log("💖 MongoDB 云数据库连接成功！留言、配置、心愿单、日记、拍立得、外卖点餐和决策数据已开启云端永久化。");
        })
        .catch(err => {
            console.error("⚠️ MongoDB 连接失败，自动降级为本地 JSON 文件存储:", err.message);
            messagesCollection = null;
            configCollection = null;
            wishlistCollection = null;
            diaryCollection = null;
            decisionsCollection = null;
            polaroidsCollection = null;
            foodMenuCollection = null;
            foodOrdersCollection = null;
        });
}

// 🔐 等待数据库连接成功的 Promise 辅助方法，防止冷启动期间由于异步建立连接延迟导致 collection 变量为 null
function getDatabaseCollection(collectionName) {
    return new Promise((resolve) => {
        // 如果没有配置连接串，直接降级
        if (!mongoURI) {
            resolve(null);
            return;
        }

        let elapsed = 0;
        const interval = setInterval(() => {
            let col = null;
            if (collectionName === 'config') col = configCollection;
            else if (collectionName === 'messages') col = messagesCollection;
            else if (collectionName === 'wishlist') col = wishlistCollection;
            else if (collectionName === 'diary') col = diaryCollection;
            else if (collectionName === 'decisions') col = decisionsCollection;
            else if (collectionName === 'polaroids') col = polaroidsCollection;
            else if (collectionName === 'food_menu') col = foodMenuCollection;
            else if (collectionName === 'food_orders') col = foodOrdersCollection;

            if (col) {
                clearInterval(interval);
                resolve(col);
            } else if (dbClient !== null && !col) {
                // 连接成功了，但对应的集合没拿到（降级）
                clearInterval(interval);
                resolve(null);
            } else if (elapsed > 8000) {
                // 已经等待了 8 秒，MongoDB 依然未建立完毕（例如网络超时），放弃等待触发本地降级
                clearInterval(interval);
                resolve(null);
            }
            elapsed += 200;
        }, 200);
    });
}

// 确保本地配置数据存在
function ensureConfigFile() {
    const dir = path.dirname(CONFIG_FILE);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(CONFIG_FILE)) {
        const defaultConfigs = {
            config_meet_date: "2024-05-03",
            config_reunion_date: "2026-01-18",
            config_countdown_target: "2026-11-13",
            config_countdown_title: "在一起第 300 天",
            config_custom_announcement: "",
            gashapon_extra_spins: "0",
            gashapon_infinite_spins: "false",
            scratch_extra_spins: "0",
            scratch_infinite_spins: "false",
            scratch_used_keys: "[]",
            scratch_prizes: JSON.stringify([
                { id: 'sleep', name: '哄睡唱歌券', emoji: '💤', desc: '哲哲今晚必须给珊珊讲睡前故事或唱歌，直到珊珊安稳睡着！', hue: 220 },
                { id: 'breakfast', name: '爱心早餐券', emoji: '🍳', desc: '哲哲需要亲手做或给外卖一份精美的爱心早餐送达珊珊！', hue: 30 },
                { id: 'massage', name: '专属按摩券', emoji: '💆', desc: '哲哲为珊珊提供15分钟头部/肩颈/足部舒适按摩，手法可定制！', hue: 90 },
                { id: 'no_angry', name: '免气金牌券', emoji: '🚫', desc: '今天如果珊珊生气，哲哲必须在3分钟内无条件逗笑她，不准还嘴！', hue: 340 },
                { id: 'yes_day', name: '全天听话券', emoji: '🙆', desc: '今天哲哲对珊珊的合理要求只能说好的，当一天的‘Yes-Man’！', hue: 120 },
                { id: 'secret_gift', name: '神秘惊喜券', emoji: '🎁', desc: '哲哲需要在3天内给珊珊准备一份贴心小惊喜/小礼物！', hue: 40 },
                { id: 'blackmail', name: '表情包销毁券', emoji: '📸', desc: '无条件销毁一张哲哲手机里珊珊的搞怪照片或表情包！', hue: 270 },
                { id: 'hug_tick', name: '深情熊抱券', emoji: '🤗', desc: '兑换一次长达60秒以上的超深熊抱，随时为珊珊补充能量！', hue: 350 },
                { id: 'nickname', name: '肉麻爱称券', emoji: '🏷️', desc: '哲哲今天必须用珊珊指定的超肉麻爱称称呼她，叫错一次罚写情书！', hue: 290 }
            ]),
            scratch_pending_prize_id: "",
            scratch_pending_deck: "",
            sweetpact_peace_count: "0",
            sweetpact_love_coins: "100",
            sweetpact_contract_signed: "false",
            sweetpact_partner_a: "",
            sweetpact_partner_b: "",
            sweetpact_history_logs: "[]",
            sweetpact_miss_trigger_zuzhe: "",
            sweetpact_miss_trigger_shanshan: "",
            sweetpact_prank_diagnosed: "false",
            sweetpact_boardgame_won: "false",
            config_playlist: "[]",
            sweetpact_wheel_options: ""
        };
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaultConfigs, null, 4), 'utf8');
    }
}

// 确保本地心愿单数据文件存在
function ensureWishlistFile() {
    const dir = path.dirname(WISHLIST_FILE);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(WISHLIST_FILE)) {
        fs.writeFileSync(WISHLIST_FILE, JSON.stringify([], null, 4), 'utf8');
    }
}

// 确保本地日记数据文件存在
function ensureDiaryFile() {
    const dir = path.dirname(DIARY_FILE);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(DIARY_FILE)) {
        fs.writeFileSync(DIARY_FILE, JSON.stringify([], null, 4), 'utf8');
    }
}

// 确保本地决策数据文件存在
function ensureDecisionsFile() {
    const dir = path.dirname(DECISIONS_FILE);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(DECISIONS_FILE)) {
        fs.writeFileSync(DECISIONS_FILE, JSON.stringify([], null, 4), 'utf8');
    }
}

// 确保本地拍立得相册数据文件存在
function ensurePolaroidsFile() {
    const dir = path.dirname(POLAROIDS_FILE);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(POLAROIDS_FILE)) {
        fs.writeFileSync(POLAROIDS_FILE, JSON.stringify([], null, 4), 'utf8');
    }
}

// 默认爱心外卖菜单
const DEFAULT_FOOD_MENU = [
    // 🍳 元气早餐
    { id: "dish_1", category: "breakfast", name: "爱心太阳蛋烤吐司", emoji: "🍳🥪", desc: "香脆吐司搭配溏心太阳蛋与火腿片，哲哲亲手现烤，元气满满！", price: "亲亲 1 次 💋", tag: "招牌早点", available: true },
    { id: "dish_2", category: "breakfast", name: "暖胃皮蛋瘦肉粥", emoji: "🥣", desc: "精选大米慢熬40分钟，肉丝滑嫩，暖胃更暖心，适合赖床早晨~", price: "说一句想我 🌸", tag: "温润暖胃", available: true },
    { id: "dish_3", category: "breakfast", name: "芝士厚蛋烧", emoji: "🧀🥚", desc: "层层蛋皮包裹浓郁拉丝芝士，奶香扑鼻，口感超级细腻！", price: "抱抱 10 秒 🫂", tag: "奶香浓郁", available: true },

    // 🍲 招牌大餐
    { id: "dish_4", category: "main", name: "哲哲秘制可乐鸡翅", emoji: "🍗", desc: "经典可乐慢煨入味，色泽红亮鲜甜多汁，骨肉分离超级下饭！", price: "夸哲哲帅 🌟", tag: "必点招牌", available: true },
    { id: "dish_5", category: "main", name: "番茄浓汤牛腩面", emoji: "🍜🍅", desc: "大块牛腩炖煮两小时，沙软番茄熬出浓汤，酸甜开胃，汤都能喝光！", price: "亲亲 2 次 💋💋", tag: "大份量", available: true },
    { id: "dish_6", category: "main", name: "经典黑椒牛肉意面", emoji: "🍝", desc: "现炒嫩牛肉搭配浓郁黑椒酱汁，面条Q弹劲道，西餐厅同款享受！", price: "给哲哲捏肩 💆", tag: "主厨推荐", available: true },
    { id: "dish_7", category: "main", name: "黄金香酥炸鸡块", emoji: "🍟🍗", desc: "外皮金黄香脆，里面爆汁鲜嫩，搭配哲哲专属甜辣蘸酱~", price: "撒娇一次 🥺", tag: "香脆解馋", available: true },

    // 🍢 深夜夜宵
    { id: "dish_8", category: "night", name: "深夜灵魂泡面加双蛋", emoji: "🍜🥓", desc: "夜深肚子饿？哲哲为你煮专属泡面，加双份荷包蛋与烤肠！", price: "贴贴 5 分钟 🥰", tag: "夜宵顶流", available: true },
    { id: "dish_9", category: "night", name: "热腾腾日式关东煮", emoji: "🍢", desc: "高汤慢煨白萝卜、福袋、魔芋丝与爆汁鱼豆腐，冬夜超级治愈！", price: "一起听首歌 🎵", tag: "暖心暖身", available: true },
    { id: "dish_10", category: "night", name: "哲哲风味香烤小肉串", emoji: "🥩", desc: "现烤孜然椒盐小肉串，肉香四溢，夜宵追剧绝配！", price: "亲哲哲额头 💋", tag: "追剧神器", available: true },

    // 🧋 特调饮品
    { id: "dish_11", category: "drinks", name: "珊珊专属多肉葡萄", emoji: "🍇🧋", desc: "手剥新鲜葡萄果肉，搭配清爽茶底与浓郁芝士厚乳奶盖，去冰微糖！", price: "亲亲 1 次 💋", tag: "珊珊最爱", available: true },
    { id: "dish_12", category: "drinks", name: "手摇黑糖珍珠鲜奶", emoji: "🧋", desc: "手熬黑糖波霸珍珠，醇厚鲜奶温热包裹，甜丝丝的恋爱味道！", price: "抱抱充能 🫂", tag: "甜蜜满分", available: true },
    { id: "dish_13", category: "drinks", name: "蜜桃乌龙果粒冰茶", emoji: "🍑🍹", desc: "大颗水蜜桃果肉搭配高山乌龙，清爽解腻，果香满溢！", price: "说一句爱哲哲 💖", tag: "清爽解腻", available: true },

    // 🍰 治愈甜品
    { id: "dish_14", category: "desserts", name: "焦糖鸡蛋布丁", emoji: "🍮", desc: "duangduang超嫩滑布丁，焦糖微苦甘甜，入口即化~", price: "早点睡觉 🌙", tag: "入口即化", available: true },
    { id: "dish_15", category: "desserts", name: "草莓软糯雪媚娘", emoji: "🍓🍰", desc: "奶香拉丝糯米皮，包裹轻盈动物奶油与一整颗新鲜甜草莓！", price: "超深大拥抱 🫂", tag: "少女心爆棚", available: true }
];

// 确保本地外卖菜单与订单数据文件存在
function ensureFoodFiles() {
    const dir = path.dirname(FOOD_MENU_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(FOOD_MENU_FILE)) {
        fs.writeFileSync(FOOD_MENU_FILE, JSON.stringify(DEFAULT_FOOD_MENU, null, 4), 'utf8');
    }
    if (!fs.existsSync(FOOD_ORDERS_FILE)) {
        fs.writeFileSync(FOOD_ORDERS_FILE, JSON.stringify([], null, 4), 'utf8');
    }
}

// 确保本地留言数据文件及目录存在 (本地开发时备用)
function ensureDataFile() {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
        const defaultNotes = [
            {
                id: Date.now() - 10000,
                text: "珊珊宝贝，我们和好啦！希望以后有矛盾我们要及时沟通，永远不分开好不好！mua~~",
                color: "pink",
                emoji: "💖",
                x: 30,
                y: 40,
                date: "2026/01/18",
                author: "陈祖哲"
            },
            {
                id: Date.now() - 5000,
                text: "替陈祖哲监督白珊珊宝贝：今天也要开开心心，好好吃饭，好好想他哦！",
                color: "yellow",
                emoji: "🐾",
                x: 230,
                y: 150,
                date: "2026/02/06",
                author: "恋爱守护精灵"
            }
        ];
        fs.writeFileSync(DATA_FILE, JSON.stringify(defaultNotes, null, 4), 'utf8');
    }
}

// 获取 MIME 类型
function getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
        '.html': 'text/html; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.ico': 'image/x-icon',
        '.svg': 'image/svg+xml',
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav',
        '.zip': 'application/zip'
    };
    return mimeTypes[ext] || 'application/octet-stream';
}

const server = http.createServer((req, res) => {
    // 允许跨域 (CORS) 方便开发与部署后的前后端分离调用
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // 自动清除网页、API 数据及样式脚本的浏览器缓存，保证每次打开都是从云端拉取最新的控制数据
    const isStaticMedia = req.url.match(/\.(mp3|wav|png|jpg|jpeg|gif|ico|svg|zip)$/i);
    if (!isStaticMedia) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    checkQuarrelBlock(req, res, () => {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const pathname = decodeURIComponent(url.pathname);

        // 探活专用轻量接口：供 cron-job 保活使用，避免因主页体积过大导致“输出过大”失败
        if (pathname === '/ping') {
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('ok');
            return;
        }

        // ==========================================
        // API 路由
        // ==========================================

    // 1. 获取留言列表
    if (pathname === '/api/messages' && req.method === 'GET') {
        if (messagesCollection) {
            // 从 MongoDB 读取
            messagesCollection.find({}).toArray()
                .then(notes => {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(notes));
                })
                .catch(err => {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: '从云数据库读取留言失败' }));
                });
        } else {
            // 本地 fallback
            ensureDataFile();
            fs.readFile(DATA_FILE, 'utf8', (err, data) => {
                if (err) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: '无法读取本地留言数据' }));
                    return;
                }
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(data);
            });
        }
        return;
    }

    // 2. 发布新留言
    if (pathname === '/api/messages' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                const newNote = JSON.parse(body);
                if (messagesCollection) {
                    // 保存至 MongoDB
                    messagesCollection.insertOne(newNote)
                        .then(() => {
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: true, note: newNote }));
                        })
                        .catch(err => {
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: '保存云留言数据失败' }));
                        });
                } else {
                    // 本地 fallback
                    ensureDataFile();
                    fs.readFile(DATA_FILE, 'utf8', (err, data) => {
                        let notes = [];
                        if (!err && data) {
                            try { notes = JSON.parse(data); } catch(e) {}
                        }
                        notes.push(newNote);
                        fs.writeFile(DATA_FILE, JSON.stringify(notes, null, 4), 'utf8', (writeErr) => {
                            if (writeErr) {
                                res.writeHead(500, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ error: '保存本地留言失败' }));
                                return;
                            }
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: true, note: newNote }));
                        });
                    });
                }
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: '无效的 JSON 数据格式' }));
            }
        });
        return;
    }

    // 3. 删除留言
    if (pathname === '/api/messages' && req.method === 'DELETE') {
        const idToDelete = parseInt(url.searchParams.get('id'));
        if (isNaN(idToDelete)) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: '无效的 ID' }));
            return;
        }

        if (messagesCollection) {
            // 从 MongoDB 删除
            messagesCollection.deleteOne({ id: idToDelete })
                .then(() => {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                })
                .catch(err => {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: '云数据删除失败' }));
                });
        } else {
            // 本地 fallback
            ensureDataFile();
            fs.readFile(DATA_FILE, 'utf8', (err, data) => {
                if (err) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: '无法读取本地留言数据' }));
                    return;
                }
                try {
                    let notes = JSON.parse(data);
                    const filteredNotes = notes.filter(n => n.id !== idToDelete);
                    fs.writeFile(DATA_FILE, JSON.stringify(filteredNotes, null, 4), 'utf8', (writeErr) => {
                        if (writeErr) {
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: '保存本地留言失败' }));
                            return;
                        }
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true }));
                    });
                } catch (e) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: '本地数据解析失败' }));
                }
            });
        }
        return;
    }

    // 3.5 修改已发布便签的位置坐标 (拖拽位置同步)
    if (pathname === '/api/messages' && req.method === 'PUT') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                const updateData = JSON.parse(body);
                const idToUpdate = parseInt(updateData.id);
                if (isNaN(idToUpdate)) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: '无效的 ID' }));
                    return;
                }

                if (messagesCollection) {
                    messagesCollection.updateOne(
                        { id: idToUpdate },
                        { $set: { x: parseFloat(updateData.x), y: parseFloat(updateData.y) } }
                    )
                        .then(() => {
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: true }));
                        })
                        .catch(err => {
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: '更新云留言位置失败' }));
                        });
                } else {
                    ensureDataFile();
                    fs.readFile(DATA_FILE, 'utf8', (err, data) => {
                        if (err) {
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: '无法读取本地数据' }));
                            return;
                        }
                        try {
                            let notes = JSON.parse(data);
                            const idx = notes.findIndex(n => n.id === idToUpdate);
                            if (idx !== -1) {
                                notes[idx].x = parseFloat(updateData.x);
                                notes[idx].y = parseFloat(updateData.y);
                                fs.writeFile(DATA_FILE, JSON.stringify(notes, null, 4), 'utf8', (writeErr) => {
                                    if (writeErr) {
                                        res.writeHead(500, { 'Content-Type': 'application/json' });
                                        res.end(JSON.stringify({ error: '保存本地数据失败' }));
                                        return;
                                    }
                                    res.writeHead(200, { 'Content-Type': 'application/json' });
                                    res.end(JSON.stringify({ success: true }));
                                });
                            } else {
                                res.writeHead(404, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ error: '找不到该留言' }));
                            }
                        } catch(e) {
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: '解析本地数据失败' }));
                        }
                    });
                }
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: '无效的 JSON 格式' }));
            }
        });
        return;
    }

    // 3.6 获取心愿单列表
    if (pathname === '/api/wishlist' && req.method === 'GET') {
        getDatabaseCollection('wishlist')
            .then(col => {
                if (col) {
                    return col.findOne({ id: "global_wishlist" })
                        .then(doc => {
                            if (!doc) {
                                res.writeHead(200, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify([]));
                            } else {
                                res.writeHead(200, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify(doc.items || []));
                            }
                        })
                        .catch(err => {
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: '从云端获取心愿单失败' }));
                        });
                } else {
                    ensureWishlistFile();
                    fs.readFile(WISHLIST_FILE, 'utf8', (err, data) => {
                        if (err) {
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: '读取本地心愿单失败' }));
                            return;
                        }
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(data);
                    });
                }
            });
        return;
    }

    // 3.7 保存更新心愿单列表
    if (pathname === '/api/wishlist' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                const wishlistItems = JSON.parse(body);
                getDatabaseCollection('wishlist')
                    .then(col => {
                        if (col) {
                            return col.updateOne(
                                { id: "global_wishlist" },
                                { $set: { items: wishlistItems } },
                                { upsert: true }
                            )
                            .then(() => {
                                res.writeHead(200, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ success: true }));
                            })
                            .catch(err => {
                                res.writeHead(500, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ error: '保存云端心愿单失败' }));
                            });
                        } else {
                            ensureWishlistFile();
                            fs.writeFile(WISHLIST_FILE, JSON.stringify(wishlistItems, null, 4), 'utf8', (writeErr) => {
                                if (writeErr) {
                                    res.writeHead(500, { 'Content-Type': 'application/json' });
                                    res.end(JSON.stringify({ error: '保存本地心愿单失败' }));
                                    return;
                                }
                                res.writeHead(200, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ success: true }));
                            });
                        }
                    });
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: '无效的 JSON 格式' }));
            }
        });
        return;
    }

    // 3.8 获取双人日记列表
    if (pathname === '/api/diary' && req.method === 'GET') {
        getDatabaseCollection('diary')
            .then(col => {
                if (col) {
                    return col.find({}).sort({ timestamp: -1 }).toArray()
                        .then(docs => {
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify(docs));
                        });
                } else {
                    ensureDiaryFile();
                    fs.readFile(DIARY_FILE, 'utf8', (err, data) => {
                        if (err) {
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: '读取本地日记失败' }));
                            return;
                        }
                        try {
                            const list = JSON.parse(data);
                            list.sort((a, b) => b.timestamp - a.timestamp);
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify(list));
                        } catch(e) {
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify([]));
                        }
                    });
                }
            })
            .catch(err => {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: '获取日记失败' }));
            });
        return;
    }

    // 3.9 新增双人日记条目
    if (pathname === '/api/diary' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const entry = JSON.parse(body);
                entry.timestamp = entry.timestamp || Date.now();
                entry.id = entry.id || Math.random().toString(36).substring(2, 9);
                getDatabaseCollection('diary')
                    .then(col => {
                        if (col) {
                            return col.insertOne(entry)
                                .then(() => {
                                    res.writeHead(200, { 'Content-Type': 'application/json' });
                                    res.end(JSON.stringify({ success: true, entry }));
                                });
                        } else {
                            ensureDiaryFile();
                            fs.readFile(DIARY_FILE, 'utf8', (readErr, data) => {
                                let list = [];
                                if (!readErr) {
                                    try { list = JSON.parse(data); } catch(e) {}
                                }
                                list.push(entry);
                                fs.writeFile(DIARY_FILE, JSON.stringify(list, null, 4), 'utf8', (writeErr) => {
                                    if (writeErr) {
                                        res.writeHead(500, { 'Content-Type': 'application/json' });
                                        res.end(JSON.stringify({ error: '保存本地日记失败' }));
                                        return;
                                    }
                                    res.writeHead(200, { 'Content-Type': 'application/json' });
                                    res.end(JSON.stringify({ success: true, entry }));
                                });
                            });
                        }
                    })
                    .catch(err => {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: '保存日记失败' }));
                    });
            } catch(e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: '无效的 JSON 格式' }));
            }
        });
        return;
    }

    // 3.10 删除日记条目
    if (pathname === '/api/diary' && req.method === 'DELETE') {
        const id = url.searchParams.get('id');
        if (!id) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: '缺失 id 参数' }));
            return;
        }
        getDatabaseCollection('diary')
            .then(col => {
                if (col) {
                    return col.deleteOne({ id: id })
                        .then(() => {
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: true }));
                        });
                } else {
                    ensureDiaryFile();
                    fs.readFile(DIARY_FILE, 'utf8', (readErr, data) => {
                        if (readErr) {
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: '删除本地日记失败' }));
                            return;
                        }
                        let list = [];
                        try { list = JSON.parse(data); } catch(e) {}
                        list = list.filter(item => item.id !== id);
                        fs.writeFile(DIARY_FILE, JSON.stringify(list, null, 4), 'utf8', (writeErr) => {
                            if (writeErr) {
                                res.writeHead(500, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ error: '更新本地日记失败' }));
                                      return;
                            }
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: true }));
                        });
                    });
                }
            })
            .catch(err => {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: '删除日记失败' }));
            });
        return;
    }

    // 3.11 获取拍立得相册数据
    if (pathname === '/api/polaroids' && req.method === 'GET') {
        getDatabaseCollection('polaroids')
            .then(col => {
                if (col) {
                    return col.find({}).sort({ timestamp: -1 }).toArray()
                        .then(docs => {
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify(docs));
                        });
                } else {
                    ensurePolaroidsFile();
                    fs.readFile(POLAROIDS_FILE, 'utf8', (err, data) => {
                        if (err) {
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: '读取本地相册失败' }));
                            return;
                        }
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(data || '[]');
                    });
                }
            })
            .catch(err => {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: '获取相册数据失败' }));
            });
        return;
    }

    // 3.12 新增拍立得相片
    if (pathname === '/api/polaroids' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const item = JSON.parse(body);
                item.timestamp = item.timestamp || Date.now();
                item.id = item.id || 'pol_' + Date.now();
                getDatabaseCollection('polaroids')
                    .then(col => {
                        if (col) {
                            return col.insertOne(item)
                                .then(() => {
                                    res.writeHead(200, { 'Content-Type': 'application/json' });
                                    res.end(JSON.stringify({ success: true, item }));
                                });
                        } else {
                            ensurePolaroidsFile();
                            fs.readFile(POLAROIDS_FILE, 'utf8', (readErr, data) => {
                                let list = [];
                                if (!readErr) {
                                    try { list = JSON.parse(data); } catch(e) {}
                                }
                                list.unshift(item);
                                fs.writeFile(POLAROIDS_FILE, JSON.stringify(list, null, 4), 'utf8', (writeErr) => {
                                    if (writeErr) {
                                        res.writeHead(500, { 'Content-Type': 'application/json' });
                                        res.end(JSON.stringify({ error: '保存本地相册失败' }));
                                        return;
                                    }
                                    res.writeHead(200, { 'Content-Type': 'application/json' });
                                    res.end(JSON.stringify({ success: true, item }));
                                });
                            });
                        }
                    })
                    .catch(err => {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: '保存相片失败' }));
                    });
            } catch(e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: '无效的 JSON 格式' }));
            }
        });
        return;
    }

    // 3.13 删除拍立得相片
    if (pathname === '/api/polaroids' && req.method === 'DELETE') {
        const id = url.searchParams.get('id');
        if (!id) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: '缺失 id 参数' }));
            return;
        }
        getDatabaseCollection('polaroids')
            .then(col => {
                if (col) {
                    return col.deleteOne({ id: id })
                        .then(() => {
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: true }));
                        });
                } else {
                    ensurePolaroidsFile();
                    fs.readFile(POLAROIDS_FILE, 'utf8', (readErr, data) => {
                        if (readErr) {
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: '读取本地相册失败' }));
                            return;
                        }
                        let list = [];
                        try { list = JSON.parse(data); } catch(e) {}
                        list = list.filter(item => item.id !== id);
                        fs.writeFile(POLAROIDS_FILE, JSON.stringify(list, null, 4), 'utf8', (writeErr) => {
                            if (writeErr) {
                                res.writeHead(500, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ error: '更新本地相册失败' }));
                                return;
                            }
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: true }));
                        });
                    });
                }
            });
        return;
    }

    // 3.14 获取爱心外卖菜单列表
    if (pathname === '/api/food/menu' && req.method === 'GET') {
        getDatabaseCollection('food_menu')
            .then(col => {
                if (col) {
                    return col.find({}).toArray()
                        .then(docs => {
                            if (!docs || docs.length === 0) {
                                // 初始化默认菜单
                                return col.insertMany(DEFAULT_FOOD_MENU)
                                    .then(() => {
                                        res.writeHead(200, { 'Content-Type': 'application/json' });
                                        res.end(JSON.stringify(DEFAULT_FOOD_MENU));
                                    });
                            }
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify(docs));
                        });
                } else {
                    ensureFoodFiles();
                    fs.readFile(FOOD_MENU_FILE, 'utf8', (err, data) => {
                        if (err) {
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: '读取本地菜单失败' }));
                            return;
                        }
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(data || JSON.stringify(DEFAULT_FOOD_MENU));
                    });
                }
            })
            .catch(err => {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: '获取菜单失败' }));
            });
        return;
    }

    // 3.15 新增或编辑外卖菜品
    if (pathname === '/api/food/menu' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const dish = JSON.parse(body);
                dish.id = dish.id || 'dish_' + Date.now();
                getDatabaseCollection('food_menu')
                    .then(col => {
                        if (col) {
                            return col.updateOne({ id: dish.id }, { $set: dish }, { upsert: true })
                                .then(() => {
                                    res.writeHead(200, { 'Content-Type': 'application/json' });
                                    res.end(JSON.stringify({ success: true, dish }));
                                });
                        } else {
                            ensureFoodFiles();
                            fs.readFile(FOOD_MENU_FILE, 'utf8', (readErr, data) => {
                                let list = [];
                                try { list = JSON.parse(data); } catch(e) {}
                                const idx = list.findIndex(d => d.id === dish.id);
                                if (idx >= 0) list[idx] = dish;
                                else list.push(dish);
                                fs.writeFile(FOOD_MENU_FILE, JSON.stringify(list, null, 4), 'utf8', (writeErr) => {
                                    if (writeErr) {
                                        res.writeHead(500, { 'Content-Type': 'application/json' });
                                        res.end(JSON.stringify({ error: '保存本地菜单失败' }));
                                        return;
                                    }
                                    res.writeHead(200, { 'Content-Type': 'application/json' });
                                    res.end(JSON.stringify({ success: true, dish }));
                                });
                            });
                        }
                    })
                    .catch(err => {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: '保存菜品失败' }));
                    });
            } catch(e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: '无效的 JSON 格式' }));
            }
        });
        return;
    }

    // 3.16 删除外卖菜品
    if (pathname === '/api/food/menu' && req.method === 'DELETE') {
        const id = url.searchParams.get('id');
        if (!id) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: '缺失 id 参数' }));
            return;
        }
        getDatabaseCollection('food_menu')
            .then(col => {
                if (col) {
                    return col.deleteOne({ id })
                        .then(() => {
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: true }));
                        });
                } else {
                    ensureFoodFiles();
                    fs.readFile(FOOD_MENU_FILE, 'utf8', (readErr, data) => {
                        let list = [];
                        try { list = JSON.parse(data); } catch(e) {}
                        list = list.filter(d => d.id !== id);
                        fs.writeFile(FOOD_MENU_FILE, JSON.stringify(list, null, 4), 'utf8', (writeErr) => {
                            if (writeErr) {
                                res.writeHead(500, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ error: '更新本地菜单失败' }));
                                return;
                            }
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: true }));
                        });
                    });
                }
            })
            .catch(err => {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: '删除菜品失败' }));
            });
        return;
    }

    // 3.17 获取外卖订单列表
    if (pathname === '/api/food/orders' && req.method === 'GET') {
        getDatabaseCollection('food_orders')
            .then(col => {
                if (col) {
                    return col.find({}).sort({ timestamp: -1 }).toArray()
                        .then(docs => {
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify(docs || []));
                        });
                } else {
                    ensureFoodFiles();
                    fs.readFile(FOOD_ORDERS_FILE, 'utf8', (err, data) => {
                        if (err) {
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: '读取本地订单失败' }));
                            return;
                        }
                        try {
                            const list = JSON.parse(data);
                            list.sort((a, b) => b.timestamp - a.timestamp);
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify(list));
                        } catch(e) {
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify([]));
                        }
                    });
                }
            })
            .catch(err => {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: '获取订单失败' }));
            });
        return;
    }

    // 3.18 珊珊提交新外卖订单
    if (pathname === '/api/food/orders' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const order = JSON.parse(body);
                order.id = 'ord_' + Date.now();
                order.timestamp = order.timestamp || Date.now();
                order.status = 'pending'; // pending (待接单) -> cooking (烹饪中) -> delivering (配送中) -> completed (已完成)

                getDatabaseCollection('food_orders')
                    .then(col => {
                        if (col) {
                            return col.insertOne(order)
                                .then(() => {
                                    res.writeHead(200, { 'Content-Type': 'application/json' });
                                    res.end(JSON.stringify({ success: true, order }));
                                });
                        } else {
                            ensureFoodFiles();
                            fs.readFile(FOOD_ORDERS_FILE, 'utf8', (readErr, data) => {
                                let list = [];
                                try { list = JSON.parse(data); } catch(e) {}
                                list.unshift(order);
                                fs.writeFile(FOOD_ORDERS_FILE, JSON.stringify(list, null, 4), 'utf8', (writeErr) => {
                                    if (writeErr) {
                                        res.writeHead(500, { 'Content-Type': 'application/json' });
                                        res.end(JSON.stringify({ error: '保存本地订单失败' }));
                                        return;
                                    }
                                    res.writeHead(200, { 'Content-Type': 'application/json' });
                                    res.end(JSON.stringify({ success: true, order }));
                                });
                            });
                        }
                    })
                    .catch(err => {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: '提交订单失败' }));
                    });
            } catch(e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: '无效的 JSON 格式' }));
            }
        });
        return;
    }

    // 3.19 哲哲更新外卖订单状态
    if (pathname === '/api/food/orders' && req.method === 'PUT') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const updatePayload = JSON.parse(body);
                const orderId = updatePayload.id;
                const newStatus = updatePayload.status;

                if (!orderId || !newStatus) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: '缺失 id 或 status 参数' }));
                    return;
                }

                getDatabaseCollection('food_orders')
                    .then(col => {
                        if (col) {
                            return col.updateOne({ id: orderId }, { $set: { status: newStatus, updateTime: Date.now() } })
                                .then(() => {
                                    res.writeHead(200, { 'Content-Type': 'application/json' });
                                    res.end(JSON.stringify({ success: true, id: orderId, status: newStatus }));
                                });
                        } else {
                            ensureFoodFiles();
                            fs.readFile(FOOD_ORDERS_FILE, 'utf8', (readErr, data) => {
                                let list = [];
                                try { list = JSON.parse(data); } catch(e) {}
                                const idx = list.findIndex(o => o.id === orderId);
                                if (idx >= 0) {
                                    list[idx].status = newStatus;
                                    list[idx].updateTime = Date.now();
                                    fs.writeFile(FOOD_ORDERS_FILE, JSON.stringify(list, null, 4), 'utf8', (writeErr) => {
                                        if (writeErr) {
                                            res.writeHead(500, { 'Content-Type': 'application/json' });
                                            res.end(JSON.stringify({ error: '更新本地订单失败' }));
                                            return;
                                        }
                                        res.writeHead(200, { 'Content-Type': 'application/json' });
                                        res.end(JSON.stringify({ success: true, id: orderId, status: newStatus }));
                                    });
                                } else {
                                    res.writeHead(404, { 'Content-Type': 'application/json' });
                                    res.end(JSON.stringify({ error: '找不到该订单' }));
                                }
                            });
                        }
                    })
                    .catch(err => {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: '更新订单失败' }));
                    });
            } catch(e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: '无效的 JSON 格式' }));
            }
        });
        return;
    }

    // 3.20 删除外卖订单
    if (pathname === '/api/food/orders' && req.method === 'DELETE') {
        const id = url.searchParams.get('id');
        if (!id) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: '缺失 id 参数' }));
            return;
        }
        getDatabaseCollection('food_orders')
            .then(col => {
                if (col) {
                    return col.deleteOne({ id })
                        .then(() => {
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: true }));
                        });
                } else {
                    ensureFoodFiles();
                    fs.readFile(FOOD_ORDERS_FILE, 'utf8', (readErr, data) => {
                        let list = [];
                        try { list = JSON.parse(data); } catch(e) {}
                        list = list.filter(o => o.id !== id);
                        fs.writeFile(FOOD_ORDERS_FILE, JSON.stringify(list, null, 4), 'utf8', (writeErr) => {
                            if (writeErr) {
                                res.writeHead(500, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ error: '删除本地订单失败' }));
                                return;
                            }
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: true }));
                        });
                    });
                }
            })
            .catch(err => {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: '删除订单失败' }));
            });
        return;
    }

    // 3.21 获取决策记录列表
    if (pathname === '/api/decisions' && req.method === 'GET') {
        getDatabaseCollection('decisions')
            .then(col => {
                if (col) {
                    return col.find({}).sort({ timestamp: -1 }).limit(20).toArray()
                        .then(docs => {
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify(docs));
                        });
                } else {
                    ensureDecisionsFile();
                    fs.readFile(DECISIONS_FILE, 'utf8', (err, data) => {
                        if (err) {
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: '读取本地决策记录失败' }));
                            return;
                        }
                        try {
                            const list = JSON.parse(data);
                            list.sort((a, b) => b.timestamp - a.timestamp);
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify(list.slice(0, 20)));
                        } catch(e) {
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify([]));
                        }
                    });
                }
            })
            .catch(err => {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: '获取决策记录失败' }));
            });
        return;
    }

    // 3.12 新增决策记录条目
    if (pathname === '/api/decisions' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const record = JSON.parse(body);
                record.timestamp = record.timestamp || Date.now();
                getDatabaseCollection('decisions')
                    .then(col => {
                        if (col) {
                            return col.insertOne(record)
                                .then(() => {
                                    res.writeHead(200, { 'Content-Type': 'application/json' });
                                    res.end(JSON.stringify({ success: true, record }));
                                });
                        } else {
                            ensureDecisionsFile();
                            fs.readFile(DECISIONS_FILE, 'utf8', (readErr, data) => {
                                let list = [];
                                if (!readErr) {
                                    try { list = JSON.parse(data); } catch(e) {}
                                }
                                list.push(record);
                                list.sort((a, b) => b.timestamp - a.timestamp);
                                list = list.slice(0, 50); // 只保留最近50条
                                fs.writeFile(DECISIONS_FILE, JSON.stringify(list, null, 4), 'utf8', (writeErr) => {
                                    if (writeErr) {
                                        res.writeHead(500, { 'Content-Type': 'application/json' });
                                        res.end(JSON.stringify({ error: '保存本地决策记录失败' }));
                                        return;
                                    }
                                    res.writeHead(200, { 'Content-Type': 'application/json' });
                                    res.end(JSON.stringify({ success: true, record }));
                                });
                            });
                        }
                    })
                    .catch(err => {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: '保存决策记录失败' }));
                    });
            } catch(e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: '无效的 JSON 格式' }));
            }
        });
        return;
    }

    // 4. 获取全局配置
    if (pathname === '/api/config' && req.method === 'GET') {
        let finished = false;
        
        // 10秒超时防护：防止 MongoDB Atlas 冷启动查询挂起导致前端控制台死锁
        const timer = setTimeout(() => {
            if (!finished) {
                finished = true;
                console.warn("GET config database call timed out, falling back to local file.");
                serveLocalConfig();
            }
        }, 10000);

        getDatabaseCollection('config')
            .then(col => {
                if (finished) return;
                if (col) {
                    return col.findOne({ id: "global" })
                        .then(cfg => {
                            if (finished) return;
                            if (!cfg) {
                                const defaultConfigs = {
                                    id: "global",
                                    config_meet_date: "2024-05-03",
                                    config_reunion_date: "2026-01-18",
                                    config_countdown_target: "2026-11-13",
                                    config_countdown_title: "在一起第 300 天",
                                    config_custom_announcement: "",
                                    gashapon_extra_spins: "0",
                                    gashapon_infinite_spins: "false",
                                    gashapon_inventory: "{}",
                                    gashapon_prizes: JSON.stringify([
                                        { id: 'bobo', name: '啵啵卡', emoji: '💋', desc: '利用此卡可以找臭臭兑换一个亲亲！', hue: 350 },
                                        { id: 'milktea', name: '奶茶卡', emoji: '🥤', desc: '可以找臭臭兑换一杯珊珊爱喝的奶茶！', hue: 35 },
                                        { id: 'sese', name: '色色卡', emoji: '🔞', desc: '可以让臭臭脱光光哦！', hue: 330 },
                                        { id: 'tinghua', name: '听话卡', emoji: '👂', desc: '可以让臭臭听装屁屁的合理的话五分钟！', hue: 200 },
                                        { id: 'queen', name: '装屁屁女王卡', emoji: '👑', desc: '使用此卡可以变成装屁屁女王！', hue: 45 },
                                        { id: 'aixin', name: '爱心卡', emoji: '❤️', desc: '利用此卡可以找臭臭兑换一次亲自做的好吃的！', hue: 0 },
                                        { id: 'pipi', name: '屁屁卡', emoji: '🍑', desc: '可以扣臭臭的屁屁！', hue: 100 },
                                        { id: 'sajiao', name: '撒娇卡', emoji: '🥺', desc: '可以让臭臭对珊珊撒娇一次！', hue: 280 },
                                        { id: 'coax', name: '无条件哄好卡', emoji: '🧸', desc: '可以让臭臭原本不开心的心情变好哦！', hue: 340 },
                                        { id: 'forgive', name: '认错免罚卡', emoji: '🙇', desc: '当做错的时候利用此卡可以免去一次惩罚！', hue: 120 },
                                        { id: 'supreme', name: '至尊卡', emoji: '✨', desc: '可以兑换 any one 你想要的卡，或自己编写一张卡！', hue: 50 }
                                    ]),
                                    scratch_extra_spins: "0",
                                    scratch_infinite_spins: "false",
                                    scratch_used_keys: "[]",
                                    scratch_prizes: JSON.stringify([
                                        { id: 'sleep', name: '哄睡唱歌券', emoji: '💤', desc: '哲哲今晚必须给珊珊讲睡前故事或唱歌，直到珊珊安稳睡着！', hue: 220 },
                                        { id: 'breakfast', name: '爱心早餐券', emoji: '🍳', desc: '哲哲需要亲手做或给外卖一份精美的爱心早餐送达珊珊！', hue: 30 },
                                        { id: 'massage', name: '专属按摩券', emoji: '💆', desc: '哲哲为珊珊提供15分钟头部/肩颈/足部舒适按摩，手法可定制！', hue: 90 },
                                        { id: 'no_angry', name: '免气金牌券', emoji: '🚫', desc: '今天如果珊珊生气，哲哲必须在3分钟内无条件逗笑她，不准还嘴！', hue: 340 },
                                        { id: 'yes_day', name: '全天听话券', emoji: '🙆', desc: '今天哲哲对珊珊的合理要求只能说好的，当一天的‘Yes-Man’！', hue: 120 },
                                        { id: 'secret_gift', name: '神秘惊喜券', emoji: '🎁', desc: '哲哲需要在3天内给珊珊准备一份贴心小惊喜/小礼物！', hue: 40 },
                                        { id: 'blackmail', name: '表情包销毁券', emoji: '📸', desc: '无条件销毁一张哲哲手机里珊珊的搞怪照片或表情包！', hue: 270 },
                                        { id: 'hug_tick', name: '深情熊抱券', emoji: '🤗', desc: '兑换一次长达60秒以上的超深熊抱，随时为珊珊补充能量！', hue: 350 },
                                        { id: 'nickname', name: '肉麻爱称券', emoji: '🏷️', desc: '哲哲今天必须用珊珊指定的超肉麻爱称称呼她，叫错一次罚写情书！', hue: 290 }
                                    ]),
                                    scratch_pending_prize_id: "",
                                    scratch_pending_deck: "",
                                    sweetpact_peace_count: "0",
                                    sweetpact_love_coins: "100",
                                    sweetpact_contract_signed: "false",
                                    sweetpact_partner_a: "",
                                    sweetpact_partner_b: "",
                                    sweetpact_history_logs: "[]",
                                    sweetpact_miss_trigger_zuzhe: "",
                                    sweetpact_miss_trigger_shanshan: "",
                                    sweetpact_prank_diagnosed: "false",
                                    sweetpact_boardgame_won: "false",
                                    config_playlist: "[]",
                                    sweetpact_wheel_options: ""
                                };
                                return col.insertOne(defaultConfigs).then(() => defaultConfigs);
                            }
                            if (cfg) {
                                if (cfg.config_countdown_target === '2026-08-05') {
                                    cfg.config_countdown_target = '2026-11-13';
                                    cfg.config_countdown_title = '在一起第 300 天';
                                    col.updateOne({ id: "global" }, { $set: { config_countdown_target: '2026-11-13', config_countdown_title: '在一起第 300 天' } })
                                        .catch(err => console.error("Auto upgrade database to 300 days failed:", err));
                                }
                            }
                            return cfg;
                        })
                        .then(cfg => {
                            if (cfg && !finished) {
                                finished = true;
                                clearTimeout(timer);
                                res.writeHead(200, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify(cfg));
                            }
                        })
                        .catch(err => {
                            if (!finished) {
                                finished = true;
                                clearTimeout(timer);
                                serveLocalConfig();
                            }
                        });
                } else {
                    finished = true;
                    clearTimeout(timer);
                    serveLocalConfig();
                }
            });

        function serveLocalConfig() {
            ensureConfigFile();
            fs.readFile(CONFIG_FILE, 'utf8', (err, data) => {
                if (err) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: '无法读取本地配置数据' }));
                    return;
                }
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.config_countdown_target === '2026-08-05') {
                        parsed.config_countdown_target = '2026-11-13';
                        parsed.config_countdown_title = '在一起第 300 天';
                        fs.writeFileSync(CONFIG_FILE, JSON.stringify(parsed, null, 4), 'utf8');
                        data = JSON.stringify(parsed);
                    }
                } catch(e) {}
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(data);
            });
        }
        return;
    }

    // 5. 更新全局配置
    if (pathname === '/api/config' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                const newConfig = JSON.parse(body);
                // 过滤掉 _id 字段防止 mongodb 报错
                delete newConfig._id;
                
                // 1. 双向写回本地 config.json 做热备份缓存，防止云数据库超时降级读取时数据不同步
                ensureConfigFile();
                fs.readFile(CONFIG_FILE, 'utf8', (err, data) => {
                    let cfgs = {};
                    if (!err && data) {
                        try { cfgs = JSON.parse(data); } catch(e) {}
                    }
                    const updated = Object.assign({}, cfgs, newConfig);
                    fs.writeFile(CONFIG_FILE, JSON.stringify(updated, null, 4), 'utf8', () => {});
                });

                getDatabaseCollection('config')
                    .then(col => {
                        if (col) {
                            // 保存至 MongoDB 云数据库
                            return col.updateOne(
                                { id: "global" },
                                { $set: newConfig },
                                { upsert: true }
                            )
                            .then(() => {
                                res.writeHead(200, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ success: true, config: newConfig }));
                            });
                        } else {
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: true, config: newConfig }));
                        }
                    })
                        .catch(err => {
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: '保存云配置失败' }));
                        });

            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: '无效的 JSON 格式' }));
            }
        });
        return;
    }


    // ==========================================
    // 静态资源托管
    // ==========================================
    let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);

    // 如果路径是目录，默认读取 index.html
    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            // 支持子目录的 index.html 路由
            const possibleIndex = path.join(filePath, 'index.html');
            fs.stat(possibleIndex, (errIdx, statsIdx) => {
                if (!errIdx && statsIdx.isFile()) {
                    serveFile(possibleIndex, req, res);
                } else {
                    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
                    res.end('404 找不到该文件');
                }
            });
        } else {
            serveFile(filePath, req, res);
        }
    });
    });
});

// 文件发送处理（支持大文件 HTTP Range 分块加载）
function serveFile(filePath, req, res) {
    const contentType = getMimeType(filePath);
    
    fs.stat(filePath, (err, stats) => {
        if (err) {
            res.writeHead(404);
            res.end();
            return;
        }
        
        const fileSize = stats.size;
        const range = req.headers.range;
        
        if (range) {
            // 处理大音视频 Range 请求，支持浏览器拖动进度条
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            
            if (start >= fileSize) {
                res.writeHead(416, {
                    'Content-Range': `bytes */${fileSize}`
                });
                res.end();
                return;
            }
            
            const chunksize = (end - start) + 1;
            const file = fs.createReadStream(filePath, { start, end });
            
            res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': contentType
            });
            file.pipe(res);
        } else {
            // 普通资源直接流式返回
            res.writeHead(200, {
                'Content-Length': fileSize,
                'Content-Type': contentType
            });
            fs.createReadStream(filePath).pipe(res);
        }
    });
}

// ================================================================
// 💥 吵架冷静期拦截逻辑与吵架全屏公告模板
// ================================================================
function checkQuarrelBlock(req, res, next) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = decodeURIComponent(url.pathname);
    
    // 如果是请求 HTML 页面（首页或子页面），且不是 admin 管理后台
    const isHtmlRequest = pathname === '/' || pathname.endsWith('.html') || pathname.endsWith('/');
    const isAdminRequest = pathname.includes('admin.html');

    if (isHtmlRequest && !isAdminRequest) {
        let finished = false;
        
        // 2秒超时防挂：若云数据库查询在2秒内没响应，则自动降级执行本地配置文件校验，防止数据库卡顿导致网页打不开
        const timer = setTimeout(() => {
            if (!finished) {
                finished = true;
                console.warn("Quarrel check database call timed out, falling back to local configuration.");
                checkLocalQuarrel(next);
            }
        }, 2000);

        if (configCollection) {
            configCollection.findOne({ id: "global" })
                .then(cfg => {
                    if (!finished) {
                        finished = true;
                        clearTimeout(timer);
                        if (cfg && cfg.quarrel_mode === 'true') {
                            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                            res.end(renderQuarrelPage(cfg.quarrel_text));
                        } else {
                            next();
                        }
                    }
                })
                .catch(() => {
                    if (!finished) {
                        finished = true;
                        clearTimeout(timer);
                        checkLocalQuarrel(next);
                    }
                });
        } else {
            finished = true;
            clearTimeout(timer);
            checkLocalQuarrel(next);
        }
    } else {
        next();
    }

    function checkLocalQuarrel(nextCallback) {
        ensureConfigFile();
        fs.readFile(CONFIG_FILE, 'utf8', (err, data) => {
            if (!err && data) {
                try {
                    const cfg = JSON.parse(data);
                    if (cfg.quarrel_mode === 'true') {
                        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                        res.end(renderQuarrelPage(cfg.quarrel_text));
                        return;
                    }
                } catch(e) {}
            }
            nextCallback();
        });
    }
}

function renderQuarrelPage(customText) {
    const text = customText || '哼！双方（珊珊与哲哲）正在发生一些小摩擦，恋爱小屋为了维护和平暂时关闭闭门反省！气消了就会重新打开哦~ 🥺';
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>⚠️ 恋爱小屋冷静期 ⚠️</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;500;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        :root {
            --bg-color: #0b0b10;
            --text-color: #ffffff;
            --primary: #ff4757;
            --secondary: #ffa502;
        }
        
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        
        body {
            background: var(--bg-color);
            color: var(--text-color);
            font-family: 'Outfit', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            overflow: hidden;
            position: relative;
        }

        /* 背景流光动画 */
        .ambient-bg {
            position: absolute;
            width: 100%;
            height: 100%;
            top: 0;
            left: 0;
            z-index: 1;
            background: radial-gradient(circle at 30% 30%, rgba(255, 71, 87, 0.12) 0%, transparent 50%),
                        radial-gradient(circle at 70% 70%, rgba(255, 165, 2, 0.08) 0%, transparent 50%);
            animation: pulseBg 8s ease-in-out infinite alternate;
        }

        @keyframes pulseBg {
            0% { transform: scale(1); }
            100% { transform: scale(1.05); }
        }
        
        .card {
            background: rgba(255, 255, 255, 0.02);
            backdrop-filter: blur(25px);
            -webkit-backdrop-filter: blur(25px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 24px;
            padding: 40px 30px;
            width: 90%;
            max-width: 500px;
            text-align: center;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4);
            z-index: 10;
            animation: cardAppear 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        @keyframes cardAppear {
            0% { opacity: 0; transform: translateY(40px) scale(0.95); }
            100% { opacity: 1; transform: translateY(0) scale(1); }
        }

        .icon-box {
            font-size: 4rem;
            color: var(--primary);
            margin-bottom: 20px;
            position: relative;
            display: inline-block;
            animation: heartbeat 1.5s infinite;
        }

        @keyframes heartbeat {
            0% { transform: scale(1); filter: drop-shadow(0 0 5px rgba(255, 71, 87, 0.3)); }
            14% { transform: scale(1.1); filter: drop-shadow(0 0 15px rgba(255, 71, 87, 0.6)); }
            28% { transform: scale(1); filter: drop-shadow(0 0 5px rgba(255, 71, 87, 0.3)); }
            42% { transform: scale(1.1); filter: drop-shadow(0 0 15px rgba(255, 71, 87, 0.6)); }
            70% { transform: scale(1); filter: drop-shadow(0 0 5px rgba(255, 71, 87, 0.3)); }
        }

        h1 {
            font-size: 1.8rem;
            font-weight: 700;
            margin-bottom: 15px;
            background: linear-gradient(135deg, var(--primary), #ffa502);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            letter-spacing: 2px;
        }

        p {
            font-size: 1.05rem;
            line-height: 1.6;
            color: #a4b0be;
            margin-bottom: 30px;
            padding: 0 10px;
            font-weight: 300;
        }

        .status-badge {
            background: rgba(255, 71, 87, 0.1);
            border: 1px solid rgba(255, 71, 87, 0.2);
            color: var(--primary);
            padding: 8px 16px;
            border-radius: 30px;
            font-size: 0.85rem;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            margin-bottom: 25px;
            font-weight: 500;
        }

        .footer {
            font-size: 0.8rem;
            color: #57606f;
            border-top: 1px solid rgba(255, 255, 255, 0.05);
            padding-top: 20px;
        }
    </style>
</head>
<body>
    <div class="ambient-bg"></div>
    <div class="card">
        <div class="icon-box">
            <i class="fas fa-heart-crack"></i>
        </div>
        <div>
            <div class="status-badge">
                <i class="fas fa-triangle-exclamation"></i> 冷静期模式已启动
            </div>
        </div>
        <h1>恋爱小屋暂时休业</h1>
        <p>${text}</p>
        <div class="footer">
            <i class="fas fa-user-shield"></i> 哲哲已在管理后台开启保护，气消后即可重新开放访问
        </div>
    </div>
</body>
</html>
    `;
}

server.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(`❤️ 时光小屋云/本地 Node 后端服务已启动！`);
    console.log(`🌐 监听端口: ${PORT}`);
    if (mongoURI) {
        console.log(`☁️ 留言持久化机制: MongoDB 云端数据库储存`);
    } else {
        console.log(`📁 留言持久化机制: 本地 JSON 降级文件储存`);
    }
    console.log(`==================================================`);
});

module.exports = server;
