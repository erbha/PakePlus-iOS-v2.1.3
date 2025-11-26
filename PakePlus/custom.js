window.addEventListener("DOMContentLoaded",()=>{const t=document.createElement("script");t.src="https://www.googletagmanager.com/gtag/js?id=G-W5GKHM0893",t.async=!0,document.head.appendChild(t);const n=document.createElement("script");n.textContent="window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', 'G-W5GKHM0893');",document.body.appendChild(n)});/**
 * 安卓平台链接行为控制优化版
 * 保留核心功能，提升性能和兼容性
 * 新增手势识别功能：
 * - 左右滑动拉动进度条
 * - 右边屏幕上下滑动调整音量
 * - 左边屏幕上下滑动调整亮度
 */
(function() {
    'use strict';

    // 缓存base标签查询结果
    let baseTargetBlank = null;
    
    // 特性检测
    const supportsClosest = typeof Element.prototype.closest === 'function';
    const isAndroid = /android/i.test(navigator.userAgent);
    
    // 手势识别相关变量
    let gestureStartX = 0;
    let gestureStartY = 0;
    let gestureStartTime = 0;
    let isDragging = false;
    let gestureThreshold = 50; // 手势识别阈值（像素）
    let timeThreshold = 300; // 时间阈值（毫秒）
    
    // 进度条控制相关
    let progressBar = null;
    let progressContainer = null;
    
    // 初始化缓存
    function initCache() {
        if (!baseTargetBlank) {
            baseTargetBlank = document.querySelector('head base[target="_blank"]');
        }
    }

    /**
     * 获取最近的a标签（兼容处理）
     */
    function getClosestAnchor(element) {
        if (supportsClosest) {
            return element.closest('a');
        }
        
        // 兼容不支持closest的浏览器
        let el = element;
        while (el && el.nodeType === 1) {
            if (el.tagName === 'A') {
                return el;
            }
            el = el.parentNode;
        }
        return null;
    }

    /**
     * 点击事件处理函数
     */
    const hookClick = (e) => {
        // 性能优化：快速检查是否可能是链接点击
        if (e.target.tagName !== 'A' && !e.target.closest('a')) {
            return;
        }

        const origin = getClosestAnchor(e.target);
        
        // 初始化缓存（延迟加载）
        initCache();

        // 检查是否需要处理
        const shouldHandle = origin && origin.href && (
            origin.target === '_blank' || 
            (baseTargetBlank && !origin.target)
        );

        if (shouldHandle) {
            // 允许用户通过Ctrl/Command+点击在新窗口打开
            if (e.ctrlKey || e.metaKey) {
                return;
            }

            e.preventDefault();
            
            try {
                // 验证URL有效性
                const url = new URL(origin.href);
                
                // 安卓特殊处理：检查是否为下载链接
                if (isDownloadLink(url, origin)) {
                    return; // 下载链接不拦截
                }

                // 安卓WebView特殊处理
                if (isAndroid && window.Android) {
                    // 如果有原生交互接口，优先使用
                    if (typeof window.Android.openUrl === 'function') {
                        window.Android.openUrl(origin.href);
                        return;
                    }
                }

                // 正常跳转
                location.href = origin.href;
                
            } catch (error) {
                console.error('Invalid URL:', origin.href, error);
                // 错误处理：让浏览器默认处理
                return;
            }
        }
    };

    /**
     * 检查是否为下载链接
     */
    function isDownloadLink(url, anchor) {
        const downloadAttr = anchor ? anchor.getAttribute('download') : null;
        const fileExtensions = /\.(apk|zip|rar|exe|dmg|pdf|docx?|xlsx?|pptx?)$/i;
        
        return !!downloadAttr || 
               (url && fileExtensions.test(url.pathname)) ||
               (url && url.pathname.includes('/download/'));
    }

    /**
     * 重写window.open（安卓优化版）
     */
    const originalOpen = window.open;
    window.open = function(url, target, features) {
        console.log('window.open intercepted:', url, target, features);

        // 安卓WebView特殊处理
        if (isAndroid) {
            // 检查是否在用户手势上下文中
            if (isUserGestureContext()) {
                try {
                    const urlObj = new URL(url);
                    
                    // 下载链接不拦截
                    if (isDownloadLink(urlObj)) {
                        return originalOpen.apply(window, arguments);
                    }

                    // 同一域名链接在当前窗口打开
                    if (urlObj.origin === window.location.origin) {
                        location.href = url;
                        return { closed: false }; // 返回假的窗口对象
                    }
                } catch (e) {
                    console.error('window.open error:', e);
                }
            }
        }

        // 其他情况使用原始方法
        return originalOpen.apply(window, arguments);
    };

    /**
     * 检查是否在用户手势上下文中
     */
    function isUserGestureContext() {
        // 简单检测：检查事件是否由用户直接触发
        // 实际实现可能需要更复杂的检测
        return true;
    }

    /**
     * 初始化进度条
     */
    function initProgressBar() {
        // 检查是否已有进度条
        progressContainer = document.querySelector('.gesture-progress-container');
        if (progressContainer) {
            progressBar = progressContainer.querySelector('.gesture-progress-bar');
            return;
        }

        // 创建进度条容器
        progressContainer = document.createElement('div');
        progressContainer.className = 'gesture-progress-container';
        progressContainer.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            width: 80%;
            height: 6px;
            background-color: rgba(0, 0, 0, 0.3);
            border-radius: 3px;
            overflow: hidden;
            z-index: 999999;
            display: none;
        `;

        // 创建进度条
        progressBar = document.createElement('div');
        progressBar.className = 'gesture-progress-bar';
        progressBar.style.cssText = `
            width: 0%;
            height: 100%;
            background-color: #4CAF50;
            transition: width 0.2s ease;
        `;

        progressContainer.appendChild(progressBar);
        document.body.appendChild(progressContainer);
    }

    /**
     * 更新进度条显示
     */
    function updateProgressBar(percentage) {
        if (!progressBar || !progressContainer) return;
        
        const percent = Math.max(0, Math.min(100, percentage));
        progressBar.style.width = percent + '%';
        progressContainer.style.display = 'block';
        
        // 3秒后自动隐藏
        clearTimeout(window.progressBarTimeout);
        window.progressBarTimeout = setTimeout(() => {
            progressContainer.style.display = 'none';
        }, 3000);
    }

    /**
     * 调整音量
     */
    function adjustVolume(delta) {
        try {
            // 检查是否在视频或音频上下文中
            const video = document.querySelector('video');
            const audio = document.querySelector('audio');
            
            if (video && !video.muted) {
                video.volume = Math.max(0, Math.min(1, video.volume + delta));
                updateProgressBar(video.volume * 100);
                showGestureFeedback('音量: ' + Math.round(video.volume * 100) + '%');
            } else if (audio && !audio.muted) {
                audio.volume = Math.max(0, Math.min(1, audio.volume + delta));
                updateProgressBar(audio.volume * 100);
                showGestureFeedback('音量: ' + Math.round(audio.volume * 100) + '%');
            } else if (window.Android && typeof window.Android.adjustVolume === 'function') {
                // 安卓原生音量控制
                window.Android.adjustVolume(delta);
                showGestureFeedback('系统音量调整');
            }
        } catch (e) {
            console.error('音量调整失败:', e);
        }
    }

    /**
     * 调整亮度
     */
    function adjustBrightness(delta) {
        try {
            if (window.Android && typeof window.Android.adjustBrightness === 'function') {
                // 安卓原生亮度控制
                window.Android.adjustBrightness(delta);
                showGestureFeedback('亮度调整');
            } else {
                // Web页面亮度调整（CSS滤镜）
                const currentBrightness = parseFloat(document.documentElement.style.filter.replace('brightness(', '').replace(')', '')) || 1;
                const newBrightness = Math.max(0.1, Math.min(2, currentBrightness + delta));
                document.documentElement.style.filter = `brightness(${newBrightness})`;
                updateProgressBar(newBrightness * 100);
                showGestureFeedback('亮度: ' + Math.round(newBrightness * 100) + '%');
            }
        } catch (e) {
            console.error('亮度调整失败:', e);
        }
    }

    /**
     * 显示手势反馈
     */
    function showGestureFeedback(text) {
        // 创建反馈元素
        let feedback = document.querySelector('.gesture-feedback');
        if (!feedback) {
            feedback = document.createElement('div');
            feedback.className = 'gesture-feedback';
            feedback.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background-color: rgba(0, 0, 0, 0.7);
                color: white;
                padding: 12px 24px;
                border-radius: 24px;
                font-size: 16px;
                z-index: 999999;
                opacity: 0;
                transition: opacity 0.3s ease;
            `;
            document.body.appendChild(feedback);
        }

        feedback.textContent = text;
        feedback.style.opacity = '1';

        // 2秒后隐藏
        clearTimeout(window.gestureFeedbackTimeout);
        window.gestureFeedbackTimeout = setTimeout(() => {
            feedback.style.opacity = '0';
        }, 2000);
    }

    /**
     * 处理触摸开始事件
     */
    function handleTouchStart(e) {
        if (e.touches.length !== 1) return;
        
        gestureStartX = e.touches[0].clientX;
        gestureStartY = e.touches[0].clientY;
        gestureStartTime = Date.now();
        isDragging = false;
    }

    /**
     * 处理触摸移动事件
     */
    function handleTouchMove(e) {
        if (e.touches.length !== 1 || isDragging) return;
        
        const currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;
        const deltaX = currentX - gestureStartX;
        const deltaY = currentY - gestureStartY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const elapsedTime = Date.now() - gestureStartTime;

        // 检查是否超过阈值
        if (distance > gestureThreshold && elapsedTime < timeThreshold) {
            isDragging = true;
            const absDeltaX = Math.abs(deltaX);
            const absDeltaY = Math.abs(deltaY);
            
            // 区分左右滑动和上下滑动
            if (absDeltaX > absDeltaY) {
                // 左右滑动 - 进度条控制
                const screenWidth = window.innerWidth;
                const percentage = (currentX / screenWidth) * 100;
                
                // 检查是否有视频或音频元素
                const video = document.querySelector('video');
                const audio = document.querySelector('audio');
                
                if (video && video.duration) {
                    video.currentTime = (percentage / 100) * video.duration;
                    updateProgressBar(percentage);
                    showGestureFeedback('进度: ' + Math.round(percentage) + '%');
                } else if (audio && audio.duration) {
                    audio.currentTime = (percentage / 100) * audio.duration;
                    updateProgressBar(percentage);
                    showGestureFeedback('进度: ' + Math.round(percentage) + '%');
                }
                
            } else {
                // 上下滑动 - 音量/亮度控制
                const screenWidth = window.innerWidth;
                const touchX = e.touches[0].clientX;
                
                // 计算滑动距离比例
                const deltaRatio = deltaY / window.innerHeight;
                
                if (touchX > screenWidth * 0.7) {
                    // 右边屏幕 - 音量控制
                    adjustVolume(-deltaRatio * 0.5); // 负号因为向下滑动通常是减小
                } else if (touchX < screenWidth * 0.3) {
                    // 左边屏幕 - 亮度控制
                    adjustBrightness(-deltaRatio * 0.5);
                }
            }
            
            // 阻止默认行为防止页面滚动
            e.preventDefault();
        }
    }

    /**
     * 处理触摸结束事件
     */
    function handleTouchEnd(e) {
        isDragging = false;
    }

    /**
     * 初始化手势识别
     */
    function initGestureRecognition() {
        // 初始化进度条
        initProgressBar();
        
        // 添加触摸事件监听
        document.addEventListener('touchstart', handleTouchStart, { passive: true });
        document.addEventListener('touchmove', handleTouchMove, { passive: false }); // 非passive因为需要preventDefault
        document.addEventListener('touchend', handleTouchEnd, { passive: true });
        document.addEventListener('touchcancel', handleTouchEnd, { passive: true });
        
        console.log('Gesture recognition initialized');
    }

    /**
     * 初始化函数
     */
    function init() {
        // 性能优化：使用事件委托，只在body上监听
        document.body.addEventListener('click', hookClick, { 
            capture: false, // 安卓推荐使用冒泡阶段
            passive: true   // 提升滚动性能
        });

        // 监听base标签变化
        const observer = new MutationObserver(() => {
            baseTargetBlank = null; // 清除缓存
            initCache();
        });

        observer.observe(document.head, {
            childList: true,
            subtree: true
        });

        // 初始化手势识别
        initGestureRecognition();

        console.log('Link behavior control with gesture recognition initialized for Android');
    }

    // 页面加载完成后初始化
    if (document.readyState === 'complete') {
        init();
    } else {
        document.addEventListener('DOMContentLoaded', init);
    }

})();