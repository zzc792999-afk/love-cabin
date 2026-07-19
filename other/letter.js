(function() {
    'use strict';

    /* ================================================================
     *  初始化入口
     * ================================================================ */
    // 立即执行初始化，无需等待图片/CDN等外部资源完全加载，防范网络阻塞导致无法点击
    initEnvelopeInteraction();
    initRoseCanvas();
    initGlobalInteraction();

    /* ================================================================
     *  信封拆信互动序列
     * ================================================================ */
    function initEnvelopeInteraction() {
        const envelopeWrapper = document.getElementById('envelope-wrapper');
        const letterPaper = document.getElementById('letter-paper');
        const backBtnContainer = document.getElementById('back-btn-container');
        const openTips = document.getElementById('open-tips');

        if (!envelopeWrapper || !letterPaper) return;

        // 1. 点击信封（或火漆印章）触发拆信序列
        envelopeWrapper.addEventListener('click', function(e) {
            if (this.classList.contains('open')) return;
            
            // 添加打开标志
            this.classList.add('open');
            if (openTips) openTips.style.display = 'none';

            // 延迟让信纸往上滑出信封，并把信封淡出或沉底
            setTimeout(() => {
                // 信纸自动进入展开阶段
                expandLetter();
            }, 1000);
        });

        // 2. 点击信纸展开/缩放
        letterPaper.addEventListener('click', function(e) {
            e.stopPropagation(); // 阻止冒泡到信封
            if (!envelopeWrapper.classList.contains('open')) return;
            expandLetter();
        });

        function expandLetter() {
            if (letterPaper.classList.contains('expanded')) return;

            letterPaper.classList.add('expanded');
            
            // 展现返回主页的按钮
            if (backBtnContainer) {
                setTimeout(() => {
                    backBtnContainer.style.display = 'block';
                }, 800);
            }

            // 触发一次密集的爱心喷发
            heartExplosion(window.innerWidth / 2, window.innerHeight / 2);
        }
    }

    /* ================================================================
     *  背景Canvas玫瑰花瓣飘落 (Rose Petals Physics animation)
     * ================================================================ */
    function initRoseCanvas() {
        const canvas = document.getElementById('rose-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let w = canvas.width = window.innerWidth;
        let h = canvas.height = window.innerHeight;

        let petals = [];
        const maxPetals = 35;

        window.addEventListener('resize', () => {
            w = canvas.width = window.innerWidth;
            h = canvas.height = window.innerHeight;
        });

        // 产生花瓣粒子
        function createPetal() {
            return {
                x: Math.random() * w,
                y: -20,
                size: Math.random() * 6 + 6,
                vx: (Math.random() - 0.3) * 1.2,
                vy: Math.random() * 1.5 + 0.8,
                rotation: Math.random() * Math.PI,
                rSpeed: (Math.random() - 0.5) * 0.03,
                opacity: Math.random() * 0.4 + 0.5
            };
        }

        // 预载花瓣
        for (let i = 0; i < maxPetals; i++) {
            petals.push(createPetal());
            petals[i].y = Math.random() * h; // 铺满屏幕
        }

        function animate() {
            ctx.clearRect(0, 0, w, h);

            if (petals.length < maxPetals && Math.random() < 0.08) {
                petals.push(createPetal());
            }

            petals = petals.filter(p => {
                p.x += p.vx + Math.sin(p.y / 30) * 0.15; // 带有一些波浪飘动
                p.y += p.vy;
                p.rotation += p.rSpeed;

                if (p.y > h + 20 || p.x > w + 20 || p.x < -20) {
                    return false;
                }

                // 绘制浪漫粉色玫瑰花瓣形状
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation);
                
                // 渐变玫瑰粉色
                const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size);
                grad.addColorStop(0, `rgba(255, 140, 160, ${p.opacity})`);
                grad.addColorStop(1, `rgba(230, 80, 110, ${p.opacity * 0.7})`);
                
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.moveTo(0, -p.size/2);
                ctx.bezierCurveTo(-p.size, -p.size/2, -p.size, p.size/2, 0, p.size);
                ctx.bezierCurveTo(p.size, p.size/2, p.size, -p.size/2, 0, -p.size/2);
                ctx.fill();
                ctx.restore();

                return true;
            });

            requestAnimationFrame(animate);
        }

        animate();
    }

    /* ================================================================
     *  点击屏幕洒落爱心微互动
     * ================================================================ */
    function initGlobalInteraction() {
        document.addEventListener('click', function(e) {
            // 排除信封、信纸内部和按钮点击
            if (e.target.closest('#envelope-wrapper') || e.target.closest('#back-btn-container')) {
                return;
            }

            const hearts = ['❤️', '💕', '💖', '💗', '🌸', '✨'];
            const h = document.createElement('div');
            h.style.position = 'fixed';
            h.textContent = hearts[Math.floor(Math.random() * hearts.length)];
            h.style.left = e.clientX - 10 + 'px';
            h.style.top = e.clientY - 10 + 'px';
            h.style.fontSize = Math.random() * 8 + 14 + 'px';
            h.style.pointerEvents = 'none';
            h.style.zIndex = '99999';

            h.animate([
                { transform: 'scale(0.3)', opacity: 1 },
                { transform: 'scale(1.2) translateY(-40px)', opacity: 0.8 },
                { transform: 'scale(0.5) translateY(-80px)', opacity: 0 }
            ], { duration: 750, fill: 'forwards' });

            document.body.appendChild(h);
            setTimeout(() => h.remove(), 800);
        });
    }

    // 爆发爱心云雾效果
    function heartExplosion(x, y) {
        const hearts = ['❤️', '💕', '💖', '💗', '🌸', '✨'];
        for (let i = 0; i < 20; i++) {
            const h = document.createElement('div');
            h.style.position = 'fixed';
            h.textContent = hearts[Math.floor(Math.random() * hearts.length)];
            h.style.left = x + 'px';
            h.style.top = y + 'px';
            h.style.fontSize = Math.random() * 10 + 16 + 'px';
            h.style.pointerEvents = 'none';
            h.style.zIndex = '99999';

            const angle = Math.random() * Math.PI * 2;
            const velocity = Math.random() * 180 + 70;
            const tx = Math.cos(angle) * velocity;
            const ty = Math.sin(angle) * velocity;

            h.animate([
                { transform: 'translate(0,0) scale(0.2)', opacity: 1 },
                { transform: `translate(${tx}px, ${ty}px) scale(1.3)`, opacity: 0.8 },
                { transform: `translate(${tx * 1.1}px, ${ty * 1.1}px) scale(0.4)`, opacity: 0 }
            ], {
                duration: 1000 + Math.random() * 500,
                easing: 'cubic-bezier(0.1, 0.8, 0.2, 1)',
                fill: 'forwards'
            });

            document.body.appendChild(h);
            setTimeout(() => h.remove(), 1600);
        }
    }

})();
