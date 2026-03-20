class IronDomeGame {
    constructor() {
        this.gameContainer = document.querySelector('.game-container');
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gameMessage = document.getElementById('gameMessage');
        this.messageTitle = this.gameMessage.querySelector('h2');
        this.messageBody = document.getElementById('gameInstructions');
        this.startBtn = document.getElementById('startBtn');
        this.citySelector = document.getElementById('citySelector');
        this.cityOptionButtons = Array.from(document.querySelectorAll('.city-option-btn'));
        this.pauseBtn = document.getElementById('pauseBtn');
        this.restartBtn = document.getElementById('restartBtn');
        this.loadingScreen = document.getElementById('loadingScreen');
        this.touchFeedback = document.getElementById('touchFeedback');
        this.uiOverlay = document.querySelector('.ui-overlay');
        this.scorePanel = document.querySelector('.score-panel');
        this.controls = document.querySelector('.controls');

        // Game state
        this.gameState = 'loading'; // loading, menu, playing, paused, gameOver, victory
        this.selectedCity = 'tel_aviv';
        this.cityConfigs = this.createCityConfigs();
        const urlCity = new URLSearchParams(window.location.search).get('city');
        if (urlCity && this.cityConfigs[urlCity]) {
            this.selectedCity = urlCity;
        }
        this.activeCityConfig = this.cityConfigs[this.selectedCity];
        this.score = 0;
        this.hits = 0;
        this.intercepts = 0;
        this.maxHits = this.activeCityConfig.gameplay.maxHits;
        this.targetIntercepts = this.activeCityConfig.gameplay.targetIntercepts;
        this.baseSkyColors = this.cloneSkyColors(this.activeCityConfig.skyColors);
        this.skyColors = this.cloneSkyColors(this.baseSkyColors);
        this.syncUIMode();

        // Game objects
        this.enemyMissiles = [];
        this.interceptors = [];
        this.explosions = [];
        this.spriteExplosions = [];
        this.spriteExplosionPool = [];
        this.cityLights = [];
        this.stars = [];

        // Visual effects - NEW
        this.smokeParticles = [];
        this.sparks = [];
        this.debris = [];
        this.shockwaves = [];
        this.scorePopups = [];
        this.clouds = [];

        // Combo system - NEW
        this.combo = 0;
        this.lastInterceptTime = -Infinity;
        this.comboTimeout = 2000; // 2 seconds to maintain combo
        this.comboDisplay = { alpha: 0, scale: 1 };

        // Screen shake - NEW
        this.screenShake = { intensity: 0, duration: 0, x: 0, y: 0 };

        // Mobile/iOS performance settings
        this.isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        this.maxSmokeParticles = this.isMobile ? 50 : 100;
        this.maxSparks = this.isMobile ? 30 : 60;
        this.maxDebris = this.isMobile ? 20 : 40;

        // Touch handling
        this.lastTouchTime = 0;
        this.touchCooldown = 150; // ms between touches
        
        // UI auto-hide
        this.lastActivity = Date.now();
        this.autoHideDelay = 3000; // 3 seconds
        this.isUIHidden = false;
        
        // Mobile detection
        this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        this.isStandalone = window.navigator.standalone;
        
        // Timing
        this.maxFrameDelta = 100;
        this.fixedFrameDelta = 1000 / 60;
        this.internalClockMs = 0;
        this.lastTime = 0;
        this.enemySpawnTimer = 0;
        this.enemySpawnInterval = this.activeCityConfig.gameplay.enemySpawnStart;
        
        // Audio context for sound effects
        this.audioContext = null;
        this.soundEnabled = true;
        this.initAudio();
        
        // Trump animation
        this.trumpAnimation = {
            active: false,
            x: 0,
            y: 0,
            width: 100,
            height: 120,
            speed: 60, // Even slower for iPhone screens
            textAlpha: 0,
            textFadeIn: false,
            duration: 0,
            callback: null,
            stars: [] // American flag colored stars
        };
        
        // NPCs (Civilian photographers)
        this.canvasWidth = window.innerWidth;
        this.canvasHeight = window.innerHeight;
        this.npcs = [];
        this.cameraFlashes = [];
        this.initializeNPCs();
        
        // Load images
        this.images = {};
        this.processedImages = {};
        this.transparentSpriteNames = new Set();
        this.useImageSprites = true;
        this.imagesLoaded = false;
        this.totalImages = 0;
        this.loadedImages = 0;
        this.loadImages();
        
        this.init();
    }
    
    init() {
        this.showLoadingScreen();
        this.resizeCanvas();
        this.applyCityConfig(this.selectedCity);
        this.generateStars();
        this.generateCityLights();
        this.generateClouds();
        this.bindEvents();
        this.setupTestingHooks();
        this.gameLoop();
        this.startActivityTracking();
    }

    createCityConfigs() {
        return {
            tel_aviv: {
                name: 'תל אביב',
                background: {
                    focusX: 0.56,
                    focusY: 0.64,
                    mapAlpha: 0.72,
                    overlayTop: 0.1,
                    overlayBottom: 0.58,
                    vignetteAlpha: 0.2
                },
                skyColors: {
                    top: { r: 8, g: 18, b: 50 },
                    mid: { r: 20, g: 47, b: 91 },
                    bottom: { r: 22, g: 81, b: 128 }
                },
                skyline: {
                    numBuildings: 14,
                    minHeight: 28,
                    maxHeight: 110,
                    buildingColor: '#13253f',
                    windowColors: ['#ffd26a', '#ffb347', '#ffe08a']
                },
                gameplay: {
                    maxHits: 5,
                    targetIntercepts: 20,
                    enemySpawnStart: 1900,
                    enemySpawnMin: 900,
                    enemySpawnAcceleration: 35,
                    missileSpeedMin: 1.8,
                    missileSpeedMax: 3.3,
                    maxEnemyMissiles: 11
                }
            },
            jerusalem: {
                name: 'ירושלים',
                background: {
                    focusX: 0.52,
                    focusY: 0.6,
                    mapAlpha: 0.7,
                    overlayTop: 0.09,
                    overlayBottom: 0.54,
                    vignetteAlpha: 0.18
                },
                skyColors: {
                    top: { r: 22, g: 15, b: 42 },
                    mid: { r: 58, g: 37, b: 66 },
                    bottom: { r: 98, g: 71, b: 55 }
                },
                skyline: {
                    numBuildings: 11,
                    minHeight: 34,
                    maxHeight: 85,
                    buildingColor: '#4b3b2d',
                    windowColors: ['#f8d38b', '#f2be6b', '#ffdca8']
                },
                gameplay: {
                    maxHits: 5,
                    targetIntercepts: 22,
                    enemySpawnStart: 1800,
                    enemySpawnMin: 850,
                    enemySpawnAcceleration: 40,
                    missileSpeedMin: 1.9,
                    missileSpeedMax: 3.6,
                    maxEnemyMissiles: 12
                }
            },
            haifa: {
                name: 'חיפה',
                background: {
                    focusX: 0.5,
                    focusY: 0.66,
                    mapAlpha: 0.6,
                    overlayTop: 0.2,
                    overlayBottom: 0.68,
                    vignetteAlpha: 0.28
                },
                skyColors: {
                    top: { r: 9, g: 26, b: 58 },
                    mid: { r: 24, g: 65, b: 103 },
                    bottom: { r: 30, g: 92, b: 126 }
                },
                skyline: {
                    numBuildings: 13,
                    minHeight: 26,
                    maxHeight: 95,
                    buildingColor: '#183149',
                    windowColors: ['#ffd488', '#ffe19f', '#ffbb73']
                },
                gameplay: {
                    maxHits: 5,
                    targetIntercepts: 24,
                    enemySpawnStart: 1700,
                    enemySpawnMin: 800,
                    enemySpawnAcceleration: 45,
                    missileSpeedMin: 2.1,
                    missileSpeedMax: 3.8,
                    maxEnemyMissiles: 13
                }
            }
        };
    }

    cloneSkyColors(colors) {
        return {
            top: { ...colors.top },
            mid: { ...colors.mid },
            bottom: { ...colors.bottom }
        };
    }

    isRenderableImage(image) {
        if (!image) return false;
        if (typeof HTMLCanvasElement !== 'undefined' && image instanceof HTMLCanvasElement) {
            return image.width > 0 && image.height > 0;
        }
        if (typeof image.complete === 'boolean') {
            return image.complete && image.naturalWidth > 0 && image.naturalHeight > 0;
        }
        return Boolean(image.width > 0 && image.height > 0);
    }

    getImageAsset(name) {
        const processed = this.processedImages?.[name];
        if (this.isRenderableImage(processed)) {
            return processed;
        }
        const original = this.images?.[name];
        return this.isRenderableImage(original) ? original : null;
    }

    removeEdgeBackground(image) {
        if (!this.isRenderableImage(image)) {
            return image;
        }

        try {
            const canvas = document.createElement('canvas');
            canvas.width = image.naturalWidth || image.width;
            canvas.height = image.naturalHeight || image.height;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) {
                return image;
            }

            ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            for (let offset = 0; offset < data.length; offset += 4) {
                const alpha = data[offset + 3];
                if (alpha === 0) continue;

                const r = data[offset];
                const g = data[offset + 1];
                const b = data[offset + 2];
                const max = Math.max(r, g, b);
                const min = Math.min(r, g, b);
                const brightness = (r + g + b) / 3;
                const lowSaturation = (max - min) < 34;

                if (brightness > 236 && lowSaturation) {
                    data[offset + 3] = 0;
                } else if (brightness > 208 && lowSaturation) {
                    const fade = Math.max(0, Math.min(1, (236 - brightness) / 28));
                    data[offset + 3] = Math.round(alpha * fade);
                }
            }

            ctx.putImageData(imageData, 0, 0);
            return canvas;
        } catch (error) {
            console.warn('Sprite background cleanup skipped:', error);
            return image;
        }
    }

    getCityBackgroundImage() {
        if (this.selectedCity === 'jerusalem') {
            return this.getImageAsset('jerusalemMap');
        }
        if (this.selectedCity === 'haifa') {
            return this.getImageAsset('haifaMap');
        }
        return this.getImageAsset('telAvivMap');
    }

    getSelectedCityName() {
        return this.activeCityConfig?.name || 'עיר לא ידועה';
    }

    getUIMode() {
        if (this.gameState === 'loading') {
            return 'loading';
        }
        if (this.gameState === 'menu') {
            return 'menu';
        }
        if (this.gameState === 'paused') {
            return 'paused';
        }
        if (this.gameState === 'gameOver' || this.gameState === 'victory') {
            return 'result';
        }
        return 'playing';
    }

    syncUIMode() {
        if (!this.gameContainer) return;
        this.gameContainer.dataset.uiMode = this.getUIMode();
        this.gameContainer.dataset.city = this.selectedCity;
    }

    setGameState(nextState) {
        this.gameState = nextState;
        this.syncUIMode();
    }

    getImageDimensions(image) {
        return {
            width: image?.naturalWidth || image?.videoWidth || image?.width || 0,
            height: image?.naturalHeight || image?.videoHeight || image?.height || 0
        };
    }

    drawImageCover(image, focusX = 0.5, focusY = 0.5) {
        const { width: imageWidth, height: imageHeight } = this.getImageDimensions(image);
        if (!imageWidth || !imageHeight || !this.canvasWidth || !this.canvasHeight) {
            return;
        }

        const canvasAspect = this.canvasWidth / this.canvasHeight;
        const imageAspect = imageWidth / imageHeight;
        let sourceWidth = imageWidth;
        let sourceHeight = imageHeight;

        if (imageAspect > canvasAspect) {
            sourceWidth = imageHeight * canvasAspect;
        } else {
            sourceHeight = imageWidth / canvasAspect;
        }

        const desiredCenterX = imageWidth * focusX;
        const desiredCenterY = imageHeight * focusY;
        const maxSourceX = Math.max(0, imageWidth - sourceWidth);
        const maxSourceY = Math.max(0, imageHeight - sourceHeight);
        const sourceX = Math.min(Math.max(desiredCenterX - sourceWidth / 2, 0), maxSourceX);
        const sourceY = Math.min(Math.max(desiredCenterY - sourceHeight / 2, 0), maxSourceY);

        this.ctx.drawImage(
            image,
            sourceX,
            sourceY,
            sourceWidth,
            sourceHeight,
            0,
            0,
            this.canvasWidth,
            this.canvasHeight
        );
    }

    renderBackgroundGrade() {
        const background = this.activeCityConfig?.background || {};
        const topAlpha = background.overlayTop ?? 0.1;
        const bottomAlpha = background.overlayBottom ?? 0.56;
        const vignetteAlpha = background.vignetteAlpha ?? 0.2;

        const atmosphere = this.ctx.createLinearGradient(0, 0, 0, this.canvasHeight);
        atmosphere.addColorStop(0, `rgba(6, 17, 40, ${topAlpha})`);
        atmosphere.addColorStop(0.42, `rgba(6, 14, 34, ${topAlpha * 0.42})`);
        atmosphere.addColorStop(1, `rgba(4, 10, 24, ${bottomAlpha * 0.42})`);
        this.ctx.fillStyle = atmosphere;
        this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

        const lowerThird = this.ctx.createLinearGradient(0, this.canvasHeight * 0.48, 0, this.canvasHeight);
        lowerThird.addColorStop(0, 'rgba(4, 10, 24, 0)');
        lowerThird.addColorStop(0.55, `rgba(5, 12, 26, ${bottomAlpha * 0.58})`);
        lowerThird.addColorStop(1, `rgba(4, 10, 24, ${bottomAlpha})`);
        this.ctx.fillStyle = lowerThird;
        this.ctx.fillRect(0, this.canvasHeight * 0.48, this.canvasWidth, this.canvasHeight * 0.52);

        const vignette = this.ctx.createRadialGradient(
            this.canvasWidth / 2,
            this.canvasHeight * 0.38,
            Math.min(this.canvasWidth, this.canvasHeight) * 0.2,
            this.canvasWidth / 2,
            this.canvasHeight * 0.38,
            Math.max(this.canvasWidth, this.canvasHeight) * 0.82
        );
        vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
        vignette.addColorStop(0.72, `rgba(5, 12, 28, ${vignetteAlpha * 0.4})`);
        vignette.addColorStop(1, `rgba(5, 12, 28, ${vignetteAlpha})`);
        this.ctx.fillStyle = vignette;
        this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
    }

    getGroundY() {
        return this.canvasHeight - 80;
    }

    getLauncherPosition() {
        return {
            x: this.canvasWidth / 2,
            y: this.canvasHeight - 100
        };
    }

    getMenuTitle() {
        return 'כיפת ברזל<br><span class="game-title-subtitle">הגנה</span>';
    }

    getMenuInstructions() {
        const cityName = this.getSelectedCityName();
        return `בחרו מפת עיר והגנו עליה מפני טילים נכנסים.<br><strong>העיר הנוכחית:</strong> ${cityName}<br>הקישו בכל מקום כדי לשגר טילי יירוט.`;
    }

    getLoadingText(progress) {
        if (Number.isFinite(progress)) {
            return `טוען את קובצי המשחק... ${Math.round(progress)}%`;
        }

        return 'טוען את קובצי המשחק...';
    }

    getGameOverMessage() {
        return `${this.getSelectedCityName()} ספגה יותר מדי פגיעות.<br>ניקוד: ${this.score}<br>יירוטים: ${this.intercepts}/${this.targetIntercepts}`;
    }

    getVictoryMessage() {
        return `הגנתם על ${this.getSelectedCityName()}!<br>ניקוד: ${this.score}<br>יירוטים מושלמים: ${this.intercepts}/${this.targetIntercepts}`;
    }

    setCitySelectorVisibility(isVisible) {
        if (!this.citySelector) return;
        this.citySelector.classList.toggle('hidden', !isVisible);
    }

    showMenuMessage() {
        this.showMessage(this.getMenuTitle(), this.getMenuInstructions(), 'הגנו עכשיו', {
            showCitySelector: true,
            messageStyle: 'menu'
        });
    }

    setSelectedCity(cityKey) {
        if (!this.cityConfigs[cityKey]) return;
        this.selectedCity = cityKey;
        this.applyCityConfig(cityKey);
        this.cityOptionButtons.forEach((button) => {
            button.classList.toggle('selected', button.dataset.city === cityKey);
        });
        this.updateUI();
        this.syncUIMode();

        if (this.gameState === 'menu') {
            this.showMenuMessage();
        }
    }

    applyCityConfig(cityKey) {
        const config = this.cityConfigs[cityKey] || this.cityConfigs.tel_aviv;
        this.activeCityConfig = config;
        this.maxHits = config.gameplay.maxHits;
        this.targetIntercepts = config.gameplay.targetIntercepts;
        this.enemySpawnInterval = config.gameplay.enemySpawnStart;
        this.baseSkyColors = this.cloneSkyColors(config.skyColors);
        this.skyColors = this.cloneSkyColors(config.skyColors);
        this.generateCityLights();
    }

    resetRuntimeState({ resetStats = true } = {}) {
        if (resetStats) {
            this.score = 0;
            this.hits = 0;
            this.intercepts = 0;
            this.internalClockMs = 0;
        }

        this.enemyMissiles = [];
        this.interceptors = [];
        this.explosions = [];
        this.spriteExplosions = [];
        this.spriteExplosionPool = [];
        this.enemySpawnTimer = 0;
        this.enemySpawnInterval = this.activeCityConfig.gameplay.enemySpawnStart;
        this.smokeParticles = [];
        this.sparks = [];
        this.debris = [];
        this.shockwaves = [];
        this.scorePopups = [];
        this.combo = 0;
        this.lastInterceptTime = -Infinity;
        this.comboDisplay = { alpha: 0, scale: 1 };
        this.screenShake = { intensity: 0, duration: 0, x: 0, y: 0 };
        this.skyColors = this.cloneSkyColors(this.baseSkyColors);
        this.lastTouchTime = 0;
        this.trumpAnimation.active = false;
        this.trumpAnimation.textFadeIn = false;
        this.trumpAnimation.textAlpha = 0;
        this.trumpAnimation.stars = [];
        this.initializeNPCs();
        this.cameraFlashes = [];
        this.generateClouds();
    }

    setupTestingHooks() {
        window.advanceTime = (ms = this.fixedFrameDelta) => {
            const totalMs = Number.isFinite(ms) ? Math.max(0, ms) : this.fixedFrameDelta;
            if (totalMs === 0) {
                this.stepFrame(0);
                return this.renderGameToText();
            }

            let remaining = totalMs;
            while (remaining > 0) {
                const frame = Math.min(this.fixedFrameDelta, remaining, this.maxFrameDelta);
                this.stepFrame(frame);
                remaining -= frame;
            }
            return this.renderGameToText();
        };

        window.render_game_to_text = () => this.renderGameToText();
    }

    renderGameToText() {
        const launcher = this.getLauncherPosition();
        const payload = {
            coordinateSystem: 'origin=(0,0) top-left, +x right, +y down',
            mode: this.gameState,
            city: this.getSelectedCityName(),
            cityKey: this.selectedCity,
            score: this.score,
            hits: this.hits,
            intercepts: this.intercepts,
            objectives: {
                maxHits: this.maxHits,
                targetIntercepts: this.targetIntercepts
            },
            launcher: {
                x: Math.round(launcher.x),
                y: Math.round(launcher.y)
            },
            enemyMissiles: this.enemyMissiles.map((m) => ({
                x: Math.round(m.x),
                y: Math.round(m.y),
                vx: Number(m.vx.toFixed(2)),
                vy: Number(m.vy.toFixed(2))
            })),
            interceptors: this.interceptors.map((m) => ({
                x: Math.round(m.x),
                y: Math.round(m.y),
                targetX: Math.round(m.targetX),
                targetY: Math.round(m.targetY)
            })),
            explosions: this.explosions.length
        };

        return JSON.stringify(payload);
    }

    generateClouds() {
        this.clouds = [];
        const numClouds = this.isMobile ? 4 : 8; // Fewer clouds on mobile
        for (let i = 0; i < numClouds; i++) {
            this.clouds.push({
                x: Math.random() * this.canvasWidth,
                y: Math.random() * this.canvasHeight * 0.4,
                width: 80 + Math.random() * 120,
                height: 30 + Math.random() * 40,
                speed: 5 + Math.random() * 15, // Parallax speed
                alpha: 0.1 + Math.random() * 0.15,
                layer: Math.floor(Math.random() * 3) // 0, 1, or 2 for parallax depth
            });
        }
        // Sort by layer for proper rendering
        this.clouds.sort((a, b) => a.layer - b.layer);
    }
    
    initializeNPCs() {
        this.npcs = [];
        // Create 3-4 NPCs
        const npcCount = 3 + Math.floor(Math.random() * 2); // 3-4 NPCs
        
        for (let i = 0; i < npcCount; i++) {
            this.npcs.push({
                id: i,
                type: Math.random() > 0.5 ? 'npc1' : 'npc2',
                x: Math.random() * this.canvasWidth,
                y: this.canvasHeight - 40, // Ground level
                width: 30,
                height: 40,
                speed: 20 + Math.random() * 30, // 20-50 pixels per second
                direction: Math.random() > 0.5 ? 1 : -1, // 1 for right, -1 for left
                alive: true,
                photographing: false,
                photographTimer: 0,
                photographCooldown: 2000 + Math.random() * 3000, // 2-5 seconds between photos
                deathTimer: 0,
                deathDuration: 2000 // 2 seconds death animation
            });
        }
    }
    
    showLoadingScreen() {
        this.loadingScreen.classList.remove('hidden');
    }
    
    hideLoadingScreen() {
        this.loadingScreen.classList.add('hidden');
        this.setGameState('menu');
        this.setSelectedCity(this.selectedCity);
        
        // Show iOS home screen prompt if applicable
        this.showIOSPrompt();
    }
    
    showIOSPrompt() {
        if (this.isIOS && !this.isStandalone) {
            const prompt = document.createElement('div');
            prompt.className = 'ios-prompt';
            prompt.innerHTML = '📲 למסך מלא: הוסיפו למסך הבית<br><small>הקישו על שיתוף ואז על "הוספה למסך הבית"</small>';
            document.body.appendChild(prompt);
            
            // Auto-remove after 5 seconds
            setTimeout(() => {
                if (prompt.parentNode) {
                    prompt.parentNode.removeChild(prompt);
                }
            }, 5000);
        }
    }
    
    startActivityTracking() {
        setInterval(() => {
            if (this.gameState === 'playing') {
                const timeSinceActivity = Date.now() - this.lastActivity;
                
                if (timeSinceActivity > this.autoHideDelay && !this.isUIHidden) {
                    this.hideUI();
                } else if (timeSinceActivity <= this.autoHideDelay && this.isUIHidden) {
                    this.showUI();
                }
            }
        }, 500);
    }
    
    hideUI() {
        this.isUIHidden = true;
        this.scorePanel.classList.add('auto-hide');
        this.controls.classList.add('auto-hide');
    }
    
    showUI() {
        this.isUIHidden = false;
        this.scorePanel.classList.remove('auto-hide');
        this.controls.classList.remove('auto-hide');
        this.lastActivity = Date.now();
    }
    
    trackActivity() {
        this.lastActivity = Date.now();
        if (this.isUIHidden) {
            this.showUI();
        }
    }
    
    initAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('Audio not supported');
            this.soundEnabled = false;
        }
    }
    
    loadImages() {
        const imagesToLoad = [
            { name: 'israelRocket', src: 'photos/israel_rocket_game.png' },
            { name: 'ironDom', src: 'photos/iron_dom_clean.png' },
            { name: 'telAvivMap', src: 'photos/Tel_aviv.png' },
            { name: 'jerusalemMap', src: 'photos/jerusalem.png' },
            { name: 'haifaMap', src: 'photos/haifa.png' },
            { name: 'iranRocket', src: 'photos/iran_rocket_game.png' },
            { name: 'trump', src: 'photos/Trump.png' },
            { name: 'npc1', src: 'photos/npc1.png' },
            { name: 'npc2', src: 'photos/npc2.png' }
        ];
        
        this.totalImages = imagesToLoad.length;
        const completeOne = () => {
            this.loadedImages++;
            this.updateLoadingProgress();
            if (this.loadedImages === this.totalImages) {
                this.imagesLoaded = true;
                setTimeout(() => this.hideLoadingScreen(), 500);
            }
        };
        
        imagesToLoad.forEach(imageInfo => {
            const img = new Image();
            img.onload = () => {
                try {
                    if (this.useImageSprites && this.transparentSpriteNames.has(imageInfo.name)) {
                        this.processedImages[imageInfo.name] = this.removeEdgeBackground(img);
                    }
                } catch (error) {
                    console.warn(`Post-process failed for image: ${imageInfo.src}`, error);
                } finally {
                    completeOne();
                }
            };
            img.onerror = () => {
                console.warn(`Failed to load image: ${imageInfo.src}`);
                this.processedImages[imageInfo.name] = null;
                completeOne();
            };
            img.src = imageInfo.src;
            this.images[imageInfo.name] = img;
        });
    }
    
    updateLoadingProgress() {
        const progress = (this.loadedImages / this.totalImages) * 100;
        const loadingText = document.querySelector('.loading-content p');
        if (loadingText) {
            loadingText.textContent = this.getLoadingText(progress);
        }
    }
    
    playSound(frequency, duration, type = 'sine') {
        if (!this.audioContext || !this.soundEnabled) return;
        
        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.value = frequency;
            oscillator.type = type;
            
            gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + duration);
        } catch (e) {
            console.warn('Audio playback failed:', e);
        }
    }
    
    resizeCanvas() {
        // Use window.innerWidth and window.innerHeight for actual visible area
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        // Store dimensions for game logic
        this.canvasWidth = this.canvas.width;
        this.canvasHeight = this.canvas.height;
        
        // Force a repaint to ensure canvas is properly sized
        this.canvas.style.width = window.innerWidth + 'px';
        this.canvas.style.height = window.innerHeight + 'px';
    }
    
    generateStars() {
        this.stars = [];
        for (let i = 0; i < 40; i++) {
            this.stars.push({
                x: Math.random() * this.canvasWidth,
                y: Math.random() * this.canvasHeight * 0.7,
                size: Math.random() * 2 + 1,
                twinkle: Math.random() * 100
            });
        }
    }
    
    generateCityLights() {
        this.cityLights = [];
        const skyline = this.activeCityConfig?.skyline || this.cityConfigs.tel_aviv.skyline;
        const numBuildings = skyline.numBuildings;
        const buildingWidth = this.canvasWidth / numBuildings;
        
        for (let i = 0; i < numBuildings; i++) {
            const height = Math.random() * (skyline.maxHeight - skyline.minHeight) + skyline.minHeight;
            this.cityLights.push({
                x: i * buildingWidth,
                y: this.canvasHeight - height,
                width: buildingWidth - 2,
                height: height,
                color: skyline.buildingColor,
                lights: this.generateBuildingLights(buildingWidth - 2, height, skyline.windowColors)
            });
        }
    }
    
    generateBuildingLights(width, height, colorPool) {
        const lights = [];
        const rows = Math.floor(height / 15);
        const cols = Math.floor(width / 10);
        const palette = Array.isArray(colorPool) && colorPool.length > 0
            ? colorPool
            : ['#ffff00', '#ffa500'];
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                if (Math.random() > 0.4) {
                    lights.push({
                        x: col * 10 + 3,
                        y: row * 15 + 5,
                        color: palette[Math.floor(Math.random() * palette.length)]
                    });
                }
            }
        }
        return lights;
    }
    
    bindEvents() {
        this.startBtn.addEventListener('click', () => this.handleStartButton());
        this.pauseBtn.addEventListener('click', () => this.togglePause());
        this.restartBtn.addEventListener('click', () => this.restartGame());
        this.cityOptionButtons.forEach((button) => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                this.setSelectedCity(button.dataset.city);
            });
        });
        
        // Enhanced touch/mouse controls with preventDefault
        this.canvas.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleClick(e);
        });
        
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.handleTouchStart(e);
        }, { passive: false });
        
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
        }, { passive: false });
        
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
        }, { passive: false });
        
        // Prevent context menu on long press
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Handle orientation and resize with debouncing
        let resizeTimeout;
        const handleResize = () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => this.handleResize(), 100);
        };
        
        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', () => {
            setTimeout(handleResize, 500);
        });
        
        // Prevent all scrolling and zooming behaviors
        document.addEventListener('touchmove', (e) => {
            e.preventDefault();
        }, { passive: false });
        
        document.addEventListener('gesturestart', (e) => {
            e.preventDefault();
        }, { passive: false });
        
        document.addEventListener('gesturechange', (e) => {
            e.preventDefault();
        }, { passive: false });
        
        document.addEventListener('gestureend', (e) => {
            e.preventDefault();
        }, { passive: false });
        
        // Prevent double-tap zoom
        let lastTouchEnd = 0;
        document.addEventListener('touchend', (e) => {
            const now = (new Date()).getTime();
            if (now - lastTouchEnd <= 300) {
                e.preventDefault();
            }
            lastTouchEnd = now;
        }, { passive: false });
    }

    handleStartButton() {
        if (this.gameState === 'paused') {
            this.togglePause();
            return;
        }
        this.startGame();
    }
    
    handleResize() {
        this.resizeCanvas();
        this.generateStars();
        this.generateCityLights();
        this.generateClouds();
        this.initializeNPCs();
    }
    
    handleClick(e) {
        this.trackActivity();
        if (this.gameState !== 'playing') return;
        
        // Only allow launching if no interceptors are currently active
        if (this.interceptors.length > 0) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvasWidth / rect.width;
        const scaleY = this.canvasHeight / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        
        this.launchInterceptor(x, y);
        this.showTouchFeedback(x, y);
    }
    
    handleTouchStart(e) {
        this.trackActivity();
        if (this.gameState !== 'playing') return;
        
        // Only allow launching if no interceptors are currently active
        if (this.interceptors.length > 0) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvasWidth / rect.width;
        const scaleY = this.canvasHeight / rect.height;
        const touch = e.touches[0];
        const x = (touch.clientX - rect.left) * scaleX;
        const y = (touch.clientY - rect.top) * scaleY;
        
        // Check cooldown to prevent spam
        if (Date.now() - this.lastTouchTime > this.touchCooldown) {
            this.launchInterceptor(x, y);
            this.showTouchFeedback(x, y);
            this.lastTouchTime = Date.now();
        }
    }
    
    showTouchFeedback(x, y) {
        // Convert game coordinates to screen coordinates
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = rect.width / this.canvasWidth;
        const scaleY = rect.height / this.canvasHeight;
        const screenX = x * scaleX + rect.left;
        const screenY = y * scaleY + rect.top;
        
        this.touchFeedback.style.left = (screenX - 30) + 'px';
        this.touchFeedback.style.top = (screenY - 30) + 'px';
        this.touchFeedback.classList.add('active');
        
        setTimeout(() => {
            this.touchFeedback.classList.remove('active');
        }, 300);
    }
    
    launchInterceptor(targetX, targetY) {
        // Limit active interceptors
        if (this.interceptors.length >= 8) {
            this.interceptors.shift(); // Remove oldest
        }
        
        const launcher = this.getLauncherPosition();
        const startX = launcher.x;
        const startY = launcher.y;
        
        const dx = targetX - startX;
        const dy = targetY - startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (!Number.isFinite(distance) || distance < 1) {
            return;
        }
        const speed = 6;
        
        this.interceptors.push({
            x: startX,
            y: startY,
            targetX: targetX,
            targetY: targetY,
            vx: (dx / distance) * speed,
            vy: (dy / distance) * speed,
            trail: [],
            angle: Math.atan2(dy, dx) + Math.PI / 2,
            width: 30,
            height: 60
        });

        // Launch sound
        this.playSound(800, 0.2, 'square');
    }
    
    spawnEnemyMissile() {
        const config = this.activeCityConfig?.gameplay || this.cityConfigs.tel_aviv.gameplay;

        // Limit active enemy missiles
        if (this.enemyMissiles.length >= config.maxEnemyMissiles) return;
        
        const x = Math.random() * this.canvasWidth;
        const targetX = Math.random() * this.canvasWidth;
        const speed = Math.random() * (config.missileSpeedMax - config.missileSpeedMin) + config.missileSpeedMin;
        
        const dx = targetX - x;
        const dy = this.canvasHeight;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        this.enemyMissiles.push({
            x: x,
            y: 0,
            vx: (dx / distance) * speed,
            vy: (dy / distance) * speed,
            trail: [],
            width: 30,
            height: 60
        });
    }

    updateGame(deltaTime) {
        const safeDelta = Number.isFinite(deltaTime)
            ? Math.max(0, Math.min(deltaTime, this.maxFrameDelta))
            : this.fixedFrameDelta;

        if (this.gameState !== 'playing' && !this.trumpAnimation.active) return;

        // Update Trump animation if active
        if (this.trumpAnimation.active) {
            this.updateTrumpAnimation(safeDelta);
            return;
        }

        const config = this.activeCityConfig?.gameplay || this.cityConfigs.tel_aviv.gameplay;

        // Update screen shake
        this.updateScreenShake(safeDelta);

        // Update dynamic sky
        this.updateDynamicSky();

        // Update clouds (parallax)
        this.updateClouds(safeDelta);

        // Update interceptors
        this.updateInterceptors(safeDelta);

        // Spawn enemy missiles
        this.enemySpawnTimer += safeDelta;
        if (this.enemySpawnTimer >= this.enemySpawnInterval) {
            this.spawnEnemyMissile();
            this.enemySpawnTimer = 0;
            // Increase difficulty over time
            this.enemySpawnInterval = Math.max(config.enemySpawnMin, this.enemySpawnInterval - config.enemySpawnAcceleration);
        }

        // Update enemy missiles
        this.updateEnemyMissiles(safeDelta);

        // Update NPCs
        this.updateNPCs(safeDelta);

        // Update camera flashes
        this.updateCameraFlashes(safeDelta);

        // Update explosions
        this.updateExplosions(safeDelta);

        // Update visual effects
        this.updateSmokeParticles(safeDelta);
        this.updateSparks(safeDelta);
        this.updateDebris(safeDelta);
        this.updateShockwaves(safeDelta);
        this.updateScorePopups(safeDelta);
        this.updateComboDisplay(safeDelta);

        // Check collisions
        this.checkCollisions();

        // Check combo timeout
        if (this.combo > 0 && this.internalClockMs - this.lastInterceptTime > this.comboTimeout) {
            this.combo = 0;
        }

        // Check game over conditions
        if (this.hits >= this.maxHits) {
            this.gameOver();
        }
    }

    updateClouds(deltaTime) {
        this.clouds.forEach(cloud => {
            // Move based on layer (parallax effect)
            const speedMultiplier = 0.3 + cloud.layer * 0.3;
            cloud.x -= cloud.speed * speedMultiplier * deltaTime / 1000;

            // Wrap around
            if (cloud.x + cloud.width < 0) {
                cloud.x = this.canvasWidth + 50;
                cloud.y = Math.random() * this.canvasHeight * 0.4;
            }
        });
    }

    updateSmokeParticles(deltaTime) {
        const frameScale = deltaTime / this.fixedFrameDelta;
        for (let i = this.smokeParticles.length - 1; i >= 0; i--) {
            const smoke = this.smokeParticles[i];
            smoke.x += smoke.vx * frameScale;
            smoke.y += smoke.vy * frameScale;
            smoke.life -= deltaTime / 1000;
            smoke.alpha = smoke.life * 0.6;
            smoke.size += 0.1 * frameScale; // Expand over time

            if (smoke.life <= 0) {
                this.smokeParticles.splice(i, 1);
            }
        }
    }

    updateSparks(deltaTime) {
        const frameScale = deltaTime / this.fixedFrameDelta;
        for (let i = this.sparks.length - 1; i >= 0; i--) {
            const spark = this.sparks[i];
            spark.x += spark.vx * frameScale;
            spark.y += spark.vy * frameScale;
            spark.vy += 0.1 * frameScale; // Gravity
            spark.life -= deltaTime / 1000;
            spark.alpha = spark.life * 2;
            const drag = Math.pow(0.98, frameScale);
            spark.vx *= drag;
            spark.vy *= drag;

            if (spark.life <= 0) {
                this.sparks.splice(i, 1);
            }
        }
    }

    updateDebris(deltaTime) {
        const frameScale = deltaTime / this.fixedFrameDelta;
        for (let i = this.debris.length - 1; i >= 0; i--) {
            const d = this.debris[i];
            d.x += d.vx * frameScale;
            d.y += d.vy * frameScale;
            d.vy += d.gravity * frameScale; // Apply gravity
            d.rotation += d.rotationSpeed * frameScale;
            d.life -= deltaTime / 2000;
            d.alpha = d.life;

            if (d.life <= 0 || d.y > this.canvasHeight) {
                this.debris.splice(i, 1);
            }
        }
    }

    updateShockwaves(deltaTime) {
        for (let i = this.shockwaves.length - 1; i >= 0; i--) {
            const sw = this.shockwaves[i];
            sw.radius += sw.speed * deltaTime / 1000;
            sw.alpha = 1 - (sw.radius / sw.maxRadius);

            if (sw.radius >= sw.maxRadius) {
                this.shockwaves.splice(i, 1);
            }
        }
    }

    updateScorePopups(deltaTime) {
        const frameScale = deltaTime / this.fixedFrameDelta;
        for (let i = this.scorePopups.length - 1; i >= 0; i--) {
            const popup = this.scorePopups[i];
            popup.y += popup.vy * frameScale;
            popup.life -= deltaTime / 1000;
            popup.alpha = popup.life;
            popup.scale += 0.02 * frameScale;

            if (popup.life <= 0) {
                this.scorePopups.splice(i, 1);
            }
        }
    }

    updateComboDisplay(deltaTime) {
        if (this.combo > 1) {
            this.comboDisplay.alpha = Math.min(1, this.comboDisplay.alpha + deltaTime / 200);
            this.comboDisplay.scale = 1 + Math.sin(Date.now() / 100) * 0.1;
        } else {
            this.comboDisplay.alpha = Math.max(0, this.comboDisplay.alpha - deltaTime / 300);
        }
    }
    
    updateInterceptors(deltaTime) {
        const frameScale = deltaTime / this.fixedFrameDelta;
        for (let i = this.interceptors.length - 1; i >= 0; i--) {
            const interceptor = this.interceptors[i];

            // Update trail
            interceptor.trail.push({ x: interceptor.x, y: interceptor.y });
            if (interceptor.trail.length > 6) interceptor.trail.shift();

            // Create smoke trail (less frequent on mobile)
            if (Math.random() < (this.isMobile ? 0.3 : 0.6)) {
                this.createSmokeTrail(interceptor.x, interceptor.y, interceptor.vx, interceptor.vy, 'rgba(100, 200, 100, 0.5)');
            }

            // Update position
            interceptor.x += interceptor.vx * frameScale;
            interceptor.y += interceptor.vy * frameScale;

            // Check if interceptor reached target or went off screen
            const distToTarget = Math.sqrt(
                Math.pow(interceptor.x - interceptor.targetX, 2) +
                Math.pow(interceptor.y - interceptor.targetY, 2)
            );

            if (distToTarget < 20 || interceptor.x < 0 || interceptor.x > this.canvasWidth ||
                interceptor.y < 0 || interceptor.y > this.canvasHeight) {
                this.interceptors.splice(i, 1);
                this.createExplosion(interceptor.x, interceptor.y, '#4444ff');
            }
        }
    }
    
    updateEnemyMissiles(deltaTime) {
        const frameScale = deltaTime / this.fixedFrameDelta;
        for (let i = this.enemyMissiles.length - 1; i >= 0; i--) {
            const missile = this.enemyMissiles[i];

            // Update trail
            missile.trail.push({ x: missile.x, y: missile.y });
            if (missile.trail.length > 8) missile.trail.shift();

            // Create smoke trail for enemy missiles (less frequent on mobile)
            if (Math.random() < (this.isMobile ? 0.25 : 0.5)) {
                this.createSmokeTrail(missile.x, missile.y, missile.vx, missile.vy, 'rgba(200, 100, 100, 0.4)');
            }

            // Update position
            missile.x += missile.vx * frameScale;
            missile.y += missile.vy * frameScale;

            // Check if missile hit ground
            if (missile.y >= this.getGroundY()) {
                this.enemyMissiles.splice(i, 1);
                this.createExplosion(missile.x, missile.y, '#ff4444');
                this.killNearbyNPC(missile.x, missile.y, 60); // Kill NPCs within 60 pixels
                this.hits++;
                this.playSound(200, 0.5, 'sawtooth');
                this.updateUI();

                // Screen shake on city hit!
                this.triggerScreenShake(8, 300);

                // Reset combo on hit
                this.combo = 0;
            }
        }
    }
    
    updateNPCs(deltaTime) {
        this.npcs.forEach(npc => {
            if (!npc.alive) {
                // Handle death animation
                npc.deathTimer += deltaTime;
                return;
            }
            
            // Move NPC
            npc.x += npc.direction * npc.speed * deltaTime / 1000;
            
            // Wrap around screen
            if (npc.x > this.canvasWidth + npc.width) {
                npc.x = -npc.width;
            } else if (npc.x < -npc.width) {
                npc.x = this.canvasWidth + npc.width;
            }
            
            // Handle photography
            npc.photographTimer += deltaTime;
            
            // Take photo when missiles or explosions are visible
            const shouldPhotograph = (this.enemyMissiles.length > 0 || this.interceptors.length > 0 || this.explosions.length > 0);
            
            if (shouldPhotograph && npc.photographTimer >= npc.photographCooldown && !npc.photographing) {
                npc.photographing = true;
                npc.photographTimer = 0;
                npc.photographCooldown = 2000 + Math.random() * 3000; // Reset cooldown
                
                // Create camera flash
                this.createCameraFlash(npc.x + npc.width / 2, npc.y - 10);
                
                // Stop photographing after 200ms
                setTimeout(() => {
                    npc.photographing = false;
                }, 200);
            }
        });
    }
    
    updateCameraFlashes(deltaTime) {
        for (let i = this.cameraFlashes.length - 1; i >= 0; i--) {
            const flash = this.cameraFlashes[i];
            flash.life -= deltaTime / 1000;
            flash.intensity = Math.max(0, flash.life / flash.maxLife);
            
            if (flash.life <= 0) {
                this.cameraFlashes.splice(i, 1);
            }
        }
    }
    
    createCameraFlash(x, y) {
        this.cameraFlashes.push({
            x: x,
            y: y,
            life: 0.3, // 300ms flash
            maxLife: 0.3,
            intensity: 1,
            size: 20 + Math.random() * 10
        });
        
        // Play camera sound
        this.playSound(800, 0.1, 'square');
    }
    
    killNearbyNPC(x, y, radius = 50) {
        this.npcs.forEach(npc => {
            if (npc.alive) {
                const distance = Math.sqrt(Math.pow(npc.x - x, 2) + Math.pow(npc.y - y, 2));
                if (distance <= radius) {
                    npc.alive = false;
                    npc.deathTimer = 0;
                    // Play death sound
                    this.playSound(150, 0.5, 'sawtooth');
                }
            }
        });
    }

    updateExplosions(deltaTime) {
        const frameScale = deltaTime / this.fixedFrameDelta;
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            const explosion = this.explosions[i];
            explosion.life -= deltaTime / 1000;
            
            explosion.particles.forEach(particle => {
                particle.x += particle.vx * frameScale;
                particle.y += particle.vy * frameScale;
                particle.alpha = explosion.life;
                const drag = Math.pow(0.98, frameScale);
                particle.vx *= drag;
                particle.vy *= drag;
            });
            
            if (explosion.life <= 0) {
                this.explosions.splice(i, 1);
            }
        }
        
        // Limit explosions for performance
        if (this.explosions.length > 8) {
            this.explosions.splice(0, this.explosions.length - 8);
        }
    }
    
    checkCollisions() {
        // Check collisions between interceptors and enemy missiles
        for (let i = this.enemyMissiles.length - 1; i >= 0; i--) {
            const enemy = this.enemyMissiles[i];

            for (let j = this.interceptors.length - 1; j >= 0; j--) {
                const interceptor = this.interceptors[j];

                const distance = Math.sqrt(
                    Math.pow(enemy.x - interceptor.x, 2) +
                    Math.pow(enemy.y - interceptor.y, 2)
                );

                if (distance < 40) {
                    const explosionX = (enemy.x + interceptor.x) / 2;
                    const explosionY = (enemy.y + interceptor.y) / 2;

                    this.createExplosion(explosionX, explosionY, '#ffff44');
                    this.enemyMissiles.splice(i, 1);
                    this.interceptors.splice(j, 1);
                    this.intercepts++;

                    // Combo system
                    const now = this.internalClockMs;
                    if (now - this.lastInterceptTime < this.comboTimeout) {
                        this.combo++;
                    } else {
                        this.combo = 1;
                    }
                    this.lastInterceptTime = now;

                    // Calculate score with combo multiplier
                    const basePoints = 100;
                    const comboMultiplier = Math.min(this.combo, 5); // Max 5x
                    const points = basePoints * comboMultiplier;
                    this.score += points;

                    // Create score popup
                    this.createScorePopup(explosionX, explosionY, points, this.combo > 1);

                    // Small screen shake on successful intercept
                    this.triggerScreenShake(3, 100);

                    this.playSound(600, 0.3, 'triangle');
                    this.updateUI();

                    if (this.intercepts >= this.targetIntercepts && !this.trumpAnimation.active && this.gameState === 'playing') {
                        this.startTrumpAnimation(() => this.showVictoryWithShare());
                    }
                    break;
                }
            }
        }
    }
    
    createExplosion(x, y, color) {
        // Limit explosions for performance
        if (this.explosions.length >= 8) {
            this.explosions.shift();
        }

        const particles = [];
        const numParticles = 15; // More particles

        for (let i = 0; i < numParticles; i++) {
            const angle = (Math.PI * 2 * i) / numParticles + Math.random() * 0.3;
            const speed = Math.random() * 4 + 2;

            particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                alpha: 1,
                color: color,
                size: 2 + Math.random() * 3
            });
        }

        this.explosions.push({
            particles: particles,
            life: 1,
            x: x,
            y: y,
            color: color,
            glowSize: 50
        });

        // Add shockwave
        this.shockwaves.push({
            x: x,
            y: y,
            radius: 10,
            maxRadius: 80,
            alpha: 0.8,
            color: color,
            speed: 150
        });

        // Add debris particles
        this.createDebris(x, y, color);

        // Add sparks
        this.createSparks(x, y, color);
    }

    createDebris(x, y, color) {
        if (this.debris.length > this.maxDebris) return; // Limit for iOS performance
        const numDebris = this.isMobile ? 4 : 8;
        for (let i = 0; i < numDebris; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 3 + 1;
            this.debris.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 2, // Initial upward velocity
                gravity: 0.1,
                alpha: 1,
                life: 1,
                size: 2 + Math.random() * 4,
                color: color,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.3
            });
        }
    }

    createSparks(x, y, color) {
        if (this.sparks.length > this.maxSparks) return; // Limit for iOS performance
        const numSparks = this.isMobile ? 6 : 12;
        for (let i = 0; i < numSparks; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 6 + 3;
            this.sparks.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                alpha: 1,
                life: 0.5 + Math.random() * 0.3,
                size: 1 + Math.random() * 2,
                color: color === '#ffff44' ? '#ffffff' : color
            });
        }
    }

    createSmokeTrail(x, y, vx, vy, color) {
        if (this.smokeParticles.length > this.maxSmokeParticles) return; // Limit for performance

        this.smokeParticles.push({
            x: x + (Math.random() - 0.5) * 5,
            y: y + (Math.random() - 0.5) * 5,
            vx: -vx * 0.1 + (Math.random() - 0.5) * 0.5,
            vy: -vy * 0.1 + (Math.random() - 0.5) * 0.5 - 0.3,
            alpha: 0.6,
            life: 1,
            size: 3 + Math.random() * 5,
            color: color
        });
    }

    triggerScreenShake(intensity = 5, duration = 200) {
        this.screenShake.intensity = intensity;
        this.screenShake.duration = duration;
    }

    updateScreenShake(deltaTime) {
        if (this.screenShake.duration > 0) {
            this.screenShake.duration -= deltaTime;
            const intensity = this.screenShake.intensity * Math.max(0, this.screenShake.duration / 200);
            this.screenShake.x = (Math.random() - 0.5) * intensity * 2;
            this.screenShake.y = (Math.random() - 0.5) * intensity * 2;
        } else {
            this.screenShake.x = 0;
            this.screenShake.y = 0;
        }
    }

    createScorePopup(x, y, points, isCombo = false) {
        const comboText = isCombo ? `x${this.combo}!` : '';
        this.scorePopups.push({
            x: x,
            y: y,
            text: isCombo ? `+${points} ${comboText}` : `+${points}`,
            pointsText: `+${points}`,
            comboText,
            alpha: 1,
            life: 1,
            vy: -2,
            scale: isCombo ? 1.5 : 1,
            color: isCombo ? '#ffff00' : '#00ff88'
        });
    }

    updateDynamicSky() {
        // Sky gets more dramatic as score increases
        const progress = Math.min(this.score / 1500, 1); // Max effect at 1500 points
        const base = this.baseSkyColors || this.cityConfigs.tel_aviv.skyColors;
        const clamp = (value) => Math.max(0, Math.min(255, Math.round(value)));

        // Transition from calm night to a warmer combat sky
        this.skyColors.top = {
            r: clamp(base.top.r + progress * 38),
            g: clamp(base.top.g - progress * 6),
            b: clamp(base.top.b - progress * 22)
        };
        this.skyColors.mid = {
            r: clamp(base.mid.r + progress * 56),
            g: clamp(base.mid.g - progress * 9),
            b: clamp(base.mid.b - progress * 28)
        };
        this.skyColors.bottom = {
            r: clamp(base.bottom.r + progress * 72),
            g: clamp(base.bottom.g + progress * 18),
            b: clamp(base.bottom.b - progress * 42)
        };
    }
    
    startTrumpAnimation(callback) {
        this.trumpAnimation.active = true;
        this.trumpAnimation.x = this.canvasWidth + this.trumpAnimation.width;
        this.trumpAnimation.y = this.canvasHeight / 2 - this.trumpAnimation.height / 2;
        this.trumpAnimation.textAlpha = 0;
        this.trumpAnimation.textFadeIn = false;
        this.trumpAnimation.duration = 0;
        this.trumpAnimation.callback = callback;
        this.trumpAnimation.stars = []; // Clear any existing stars
        this.setGameState('trumpAnimation');
        
        // Play a funny sound effect
        this.playSound(220, 0.3, 'triangle');
        setTimeout(() => this.playSound(330, 0.3, 'triangle'), 200);
    }
    
    updateTrumpAnimation(deltaTime) {
        this.trumpAnimation.duration += deltaTime;
        
        // Move Trump from right to left
        this.trumpAnimation.x -= (this.trumpAnimation.speed * deltaTime) / 1000;
        
        // Create American flag stars trailing behind Trump
        if (Math.random() < 0.8) { // High chance of creating stars
            const colors = ['#FF0000', '#FFFFFF', '#0000FF']; // Red, White, Blue
            this.trumpAnimation.stars.push({
                x: this.trumpAnimation.x + this.trumpAnimation.width / 2,
                y: this.trumpAnimation.y + this.trumpAnimation.height / 2 + (Math.random() - 0.5) * 40,
                vx: (Math.random() - 0.5) * 100,
                vy: (Math.random() - 0.5) * 100,
                color: colors[Math.floor(Math.random() * colors.length)],
                life: 1.0,
                size: Math.random() * 4 + 2
            });
        }
        
        // Update stars
        for (let i = this.trumpAnimation.stars.length - 1; i >= 0; i--) {
            const star = this.trumpAnimation.stars[i];
            star.x += star.vx * deltaTime / 1000;
            star.y += star.vy * deltaTime / 1000;
            star.life -= deltaTime / 2000; // Stars last 2 seconds
            star.vx *= 0.98; // Slow down over time
            star.vy *= 0.98;
            
            if (star.life <= 0) {
                this.trumpAnimation.stars.splice(i, 1);
            }
        }
        
        // Start text fade in when Trump reaches 85% of the screen (even earlier for iPhone)
        if (this.trumpAnimation.x <= this.canvasWidth * 0.85 && !this.trumpAnimation.textFadeIn) {
            this.trumpAnimation.textFadeIn = true;
        }
        
        // Fade in text even slower for mobile
        if (this.trumpAnimation.textFadeIn && this.trumpAnimation.textAlpha < 1) {
            this.trumpAnimation.textAlpha += deltaTime / 1200; // Fade in over 1.2 seconds (even slower)
        }
        
        // End animation when Trump exits screen (removed time delay - immediate transition)
        if (this.trumpAnimation.x <= -this.trumpAnimation.width) {
            this.trumpAnimation.active = false;
            this.setGameState('victory');
            if (this.trumpAnimation.callback) {
                this.trumpAnimation.callback();
            }
        }
    }
    
    renderTrumpAnimation() {
        if (!this.trumpAnimation.active) return;
        
        // Draw American flag stars first (behind Trump)
        this.trumpAnimation.stars.forEach(star => {
            this.ctx.save();
            this.ctx.globalAlpha = star.life;
            this.ctx.fillStyle = star.color;
            this.ctx.beginPath();
            
            // Draw star shape
            const spikes = 5;
            const step = Math.PI / spikes;
            let rotation = 0;
            this.ctx.translate(star.x, star.y);
            this.ctx.beginPath();
            this.ctx.moveTo(0, -star.size);
            
            for (let i = 0; i < spikes; i++) {
                rotation = (i * step * 2) + Math.PI / 2;
                this.ctx.lineTo(Math.cos(rotation) * star.size, Math.sin(rotation) * star.size);
                rotation += step;
                this.ctx.lineTo(Math.cos(rotation) * (star.size * 0.5), Math.sin(rotation) * (star.size * 0.5));
            }
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.restore();
        });
        
        // Draw Trump image
        const trumpImage = this.getImageAsset('trump');
        if (this.imagesLoaded && trumpImage) {
            this.ctx.drawImage(trumpImage, 
                this.trumpAnimation.x, 
                this.trumpAnimation.y, 
                this.trumpAnimation.width, 
                this.trumpAnimation.height);
        }
        
        // Draw text with speech bubble
        if (this.trumpAnimation.textFadeIn && this.trumpAnimation.textAlpha > 0) {
            this.ctx.save();
            this.ctx.globalAlpha = this.trumpAnimation.textAlpha;
            
            // Draw speech bubble
            const bubbleX = this.trumpAnimation.x - 200;
            const bubbleY = this.trumpAnimation.y - 60;
            const bubbleWidth = 180;
            const bubbleHeight = 50;
            
            // Bubble background (using rect for compatibility)
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            this.ctx.strokeStyle = '#333';
            this.ctx.lineWidth = 2;
            this.ctx.fillRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight);
            this.ctx.strokeRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight);
            
            // Bubble tail
            this.ctx.beginPath();
            this.ctx.moveTo(bubbleX + bubbleWidth - 20, bubbleY + bubbleHeight);
            this.ctx.lineTo(bubbleX + bubbleWidth - 5, bubbleY + bubbleHeight + 15);
            this.ctx.lineTo(bubbleX + bubbleWidth - 35, bubbleY + bubbleHeight);
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();
            
            // Text (rotating between different funny phrases)
            this.ctx.fillStyle = '#333';
            this.ctx.font = 'bold 14px Arial';
            this.ctx.textAlign = 'center';
            
            const phrases = [
                ['Oh, you won already?', 'Tremendous!'],
                ['Wow, that was fast!', 'Believe me!'],
                ['You beat them bigly!', 'Fantastic!'],
                ['Iron Dome? More like', 'Iron WON! Huge!']
            ];
            const randomPhrase = phrases[Math.floor(this.score / 500) % phrases.length];
            
            this.ctx.fillText(randomPhrase[0], bubbleX + bubbleWidth / 2, bubbleY + 20);
            this.ctx.fillText(randomPhrase[1], bubbleX + bubbleWidth / 2, bubbleY + 35);
            
            this.ctx.restore();
        }
    }

    render() {
        // Apply screen shake
        this.ctx.save();
        this.ctx.translate(this.screenShake.x, this.screenShake.y);

        // Draw dynamic sky gradient
        this.renderDynamicSky();

        // Draw selected city map if loaded
        const mapImage = this.getCityBackgroundImage();
        if (this.imagesLoaded && this.isRenderableImage(mapImage)) {
            const background = this.activeCityConfig?.background || {};
            this.ctx.globalAlpha = background.mapAlpha ?? 0.68;
            this.drawImageCover(mapImage, background.focusX ?? 0.5, background.focusY ?? 0.5);
            this.ctx.globalAlpha = 1;
        } else {
            // Draw stars as fallback
            this.stars.forEach(star => {
                const alpha = 0.5 + 0.5 * Math.sin(star.twinkle / 100);
                this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                this.ctx.beginPath();
                this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
                this.ctx.fill();
                star.twinkle += 2;
            });

            // Draw city lights
            this.renderCityLights();
        }

        this.renderBackgroundGrade();

        // Render parallax clouds
        this.renderClouds();

        // Render smoke particles (behind missiles)
        this.renderSmokeParticles();

        // Render game objects
        this.renderEnemyMissiles();
        this.renderInterceptors();

        // Render shockwaves
        this.renderShockwaves();

        // Render explosions with glow
        this.renderExplosions();

        // Render sparks and debris
        this.renderSparks();
        this.renderDebris();

        this.renderLauncher();

        // Render NPCs and camera flashes
        this.renderNPCs();
        this.renderCameraFlashes();

        // Render score popups
        this.renderScorePopups();

        // Render combo counter
        this.renderComboCounter();

        // Render Trump animation if active
        this.renderTrumpAnimation();

        this.ctx.restore();
    }

    renderDynamicSky() {
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvasHeight);
        gradient.addColorStop(0, `rgb(${this.skyColors.top.r}, ${this.skyColors.top.g}, ${this.skyColors.top.b})`);
        gradient.addColorStop(0.5, `rgb(${this.skyColors.mid.r}, ${this.skyColors.mid.g}, ${this.skyColors.mid.b})`);
        gradient.addColorStop(1, `rgb(${this.skyColors.bottom.r}, ${this.skyColors.bottom.g}, ${this.skyColors.bottom.b})`);

        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
    }

    renderClouds() {
        this.clouds.forEach(cloud => {
            this.ctx.save();
            this.ctx.globalAlpha = cloud.alpha;
            this.ctx.fillStyle = '#ffffff';

            // Draw cloud as multiple overlapping circles (iOS compatible - no ellipse)
            const cx = cloud.x + cloud.width / 2;
            const cy = cloud.y + cloud.height / 2;
            const baseRadius = Math.min(cloud.width, cloud.height) / 2;

            // Main cloud body - multiple circles
            this.ctx.beginPath();
            this.ctx.arc(cx, cy, baseRadius, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.beginPath();
            this.ctx.arc(cx - baseRadius * 0.8, cy, baseRadius * 0.7, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.beginPath();
            this.ctx.arc(cx + baseRadius * 0.8, cy, baseRadius * 0.7, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.beginPath();
            this.ctx.arc(cx - baseRadius * 0.4, cy - baseRadius * 0.3, baseRadius * 0.5, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.beginPath();
            this.ctx.arc(cx + baseRadius * 0.4, cy - baseRadius * 0.3, baseRadius * 0.5, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.restore();
        });
    }

    renderSmokeParticles() {
        this.smokeParticles.forEach(smoke => {
            this.ctx.save();
            this.ctx.globalAlpha = smoke.alpha;
            this.ctx.fillStyle = smoke.color;
            this.ctx.beginPath();
            this.ctx.arc(smoke.x, smoke.y, smoke.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        });
    }

    renderShockwaves() {
        this.shockwaves.forEach(sw => {
            this.ctx.save();
            this.ctx.globalAlpha = sw.alpha;
            this.ctx.strokeStyle = sw.color;
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
            this.ctx.stroke();

            // Inner ring
            this.ctx.globalAlpha = sw.alpha * 0.5;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(sw.x, sw.y, sw.radius * 0.7, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.restore();
        });
    }

    renderSparks() {
        this.sparks.forEach(spark => {
            this.ctx.save();
            this.ctx.globalAlpha = spark.alpha;
            this.ctx.fillStyle = spark.color;
            this.ctx.beginPath();
            this.ctx.arc(spark.x, spark.y, spark.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        });
    }

    renderDebris() {
        this.debris.forEach(d => {
            this.ctx.save();
            this.ctx.globalAlpha = d.alpha;
            this.ctx.translate(d.x, d.y);
            this.ctx.rotate(d.rotation);
            this.ctx.fillStyle = d.color;
            this.ctx.fillRect(-d.size / 2, -d.size / 2, d.size, d.size);
            this.ctx.restore();
        });
    }

    renderScorePopups() {
        this.scorePopups.forEach(popup => {
            this.ctx.save();
            this.ctx.globalAlpha = popup.alpha;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';

            const fontSize = Math.round(18 * popup.scale);
            this.ctx.font = `900 ${fontSize}px -apple-system, Arial, sans-serif`;
            const drawPopupText = (text, x, y) => {
                if (popup.scale > 1) {
                    // Combo popup — layered glow + outline
                    this.ctx.shadowColor = popup.color;
                    this.ctx.shadowBlur = 18;
                    this.ctx.strokeStyle = 'rgba(0,0,0,0.85)';
                    this.ctx.lineWidth = fontSize * 0.18;
                    this.ctx.lineJoin = 'round';
                    this.ctx.strokeText(text, x, y);
                    this.ctx.fillStyle = popup.color;
                    this.ctx.fillText(text, x, y);
                    this.ctx.shadowBlur = 0;
                    this.ctx.fillStyle = 'rgba(255,255,255,0.35)';
                    this.ctx.fillText(text, x, y - fontSize * 0.04);
                } else {
                    this.ctx.shadowColor = popup.color;
                    this.ctx.shadowBlur = 8;
                    this.ctx.strokeStyle = 'rgba(0,0,0,0.7)';
                    this.ctx.lineWidth = fontSize * 0.14;
                    this.ctx.lineJoin = 'round';
                    this.ctx.strokeText(text, x, y);
                    this.ctx.fillStyle = popup.color;
                    this.ctx.fillText(text, x, y);
                }
            };

            if (popup.scale > 1 && popup.comboText) {
                const pointsWidth = this.ctx.measureText(popup.pointsText || '').width;
                const comboWidth = this.ctx.measureText(popup.comboText).width;
                const segmentGap = Math.max(fontSize * 0.3, popup.comboText.length > 4 ? fontSize * 0.42 : fontSize * 0.34);
                const totalWidth = pointsWidth + segmentGap + comboWidth;
                const leftEdge = popup.x - totalWidth / 2;
                const pointsX = leftEdge + pointsWidth / 2;
                const comboX = leftEdge + pointsWidth + segmentGap + comboWidth / 2;

                drawPopupText(popup.pointsText, pointsX, popup.y);
                drawPopupText(popup.comboText, comboX, popup.y);
            } else {
                drawPopupText(popup.text, popup.x, popup.y);
            }
            this.ctx.restore();
        });
    }

    renderComboCounter() {
        if (this.combo > 1 && this.comboDisplay.alpha > 0) {
            this.ctx.save();
            this.ctx.globalAlpha = this.comboDisplay.alpha;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';

            const cx = this.canvasWidth / 2;
            // Position below the top control bar, with a bit of breathing room
            const cy = Math.round(this.canvasHeight * 0.14);

            const baseFontSize = Math.round(Math.min(this.canvasWidth * 0.1, 42) * this.comboDisplay.scale);
            const labelFontSize = Math.round(baseFontSize * 0.52);
            const numText = `${this.combo}x`;
            const labelText = 'COMBO!';

            this.ctx.font = `900 ${baseFontSize}px -apple-system, Arial, sans-serif`;
            const numWidth = this.ctx.measureText(numText).width;
            this.ctx.font = `800 ${labelFontSize}px -apple-system, Arial, sans-serif`;
            const labelWidth = this.ctx.measureText(labelText).width;

            const segmentGap = this.combo >= 10
                ? Math.max(baseFontSize * 0.8, numWidth * 0.26)
                : Math.max(baseFontSize * 0.58, numWidth * 0.18);
            const sidePadding = Math.max(baseFontSize * 0.62, 22);
            const contentWidth = numWidth + segmentGap + labelWidth;

            // ── Background pill ──
            const pillW = Math.max(baseFontSize * 5.2, contentWidth + sidePadding * 2);
            const pillH = baseFontSize * 1.55;
            const pillR = pillH / 2;
            const pillX = cx - pillW / 2;
            const pillY = cy - pillH / 2;

            this.ctx.save();
            this.ctx.globalAlpha = this.comboDisplay.alpha * 0.6;
            this.ctx.beginPath();
            this.ctx.moveTo(pillX + pillR, pillY);
            this.ctx.lineTo(pillX + pillW - pillR, pillY);
            this.ctx.arcTo(pillX + pillW, pillY, pillX + pillW, pillY + pillR, pillR);
            this.ctx.lineTo(pillX + pillW, pillY + pillH - pillR);
            this.ctx.arcTo(pillX + pillW, pillY + pillH, pillX + pillW - pillR, pillY + pillH, pillR);
            this.ctx.lineTo(pillX + pillR, pillY + pillH);
            this.ctx.arcTo(pillX, pillY + pillH, pillX, pillY + pillH - pillR, pillR);
            this.ctx.lineTo(pillX, pillY + pillR);
            this.ctx.arcTo(pillX, pillY, pillX + pillR, pillY, pillR);
            this.ctx.closePath();
            const pillGrad = this.ctx.createLinearGradient(pillX, pillY, pillX, pillY + pillH);
            pillGrad.addColorStop(0, 'rgba(80, 30, 0, 0.82)');
            pillGrad.addColorStop(1, 'rgba(40, 10, 0, 0.82)');
            this.ctx.fillStyle = pillGrad;
            this.ctx.fill();
            this.ctx.strokeStyle = 'rgba(255, 180, 0, 0.55)';
            this.ctx.lineWidth = 1.5;
            this.ctx.stroke();
            this.ctx.restore();

            // ── Multiplier number (left side) ──
            const leftEdge = cx - contentWidth / 2;
            const numX = leftEdge + numWidth / 2;
            const labelX = leftEdge + numWidth + segmentGap + labelWidth / 2;

            this.ctx.save();
            this.ctx.globalAlpha = this.comboDisplay.alpha;
            this.ctx.font = `900 ${baseFontSize}px -apple-system, Arial, sans-serif`;

            // Deep glow layers
            this.ctx.shadowColor = '#ff8800';
            this.ctx.shadowBlur = 28;
            this.ctx.fillStyle = '#ff8800';
            this.ctx.fillText(numText, numX, cy);
            this.ctx.shadowBlur = 14;
            this.ctx.fillStyle = '#ffcc00';
            this.ctx.fillText(numText, numX, cy);
            // Bright white core
            this.ctx.shadowBlur = 0;
            this.ctx.fillStyle = '#fff9e0';
            this.ctx.fillText(numText, numX, cy - 1);
            this.ctx.restore();

            // ── "COMBO!" label (right side) ──
            this.ctx.save();
            this.ctx.globalAlpha = this.comboDisplay.alpha;
            this.ctx.font = `800 ${labelFontSize}px -apple-system, Arial, sans-serif`;
            this.ctx.shadowColor = '#ffdd00';
            this.ctx.shadowBlur = 14;
            this.ctx.fillStyle = '#ffee55';
            this.ctx.fillText(labelText, labelX, cy);
            this.ctx.restore();

            this.ctx.restore();
        }
    }
    
    renderCityLights() {
        this.cityLights.forEach(building => {
            this.ctx.fillStyle = building.color || '#1a1a2e';
            this.ctx.fillRect(building.x, building.y, building.width, building.height);
            
            building.lights.forEach(light => {
                this.ctx.fillStyle = light.color;
                this.ctx.fillRect(building.x + light.x, building.y + light.y, 4, 6);
            });
        });
    }
    
    renderEnemyMissiles() {
        this.enemyMissiles.forEach(missile => {
            // Draw trail
            if (missile.trail.length > 1) {
                this.ctx.strokeStyle = 'rgba(255, 68, 68, 0.8)';
                this.ctx.lineWidth = 3;
                this.ctx.beginPath();
                missile.trail.forEach((point, index) => {
                    const alpha = index / missile.trail.length;
                    this.ctx.globalAlpha = alpha;
                    if (index === 0) {
                        this.ctx.moveTo(point.x, point.y);
                    } else {
                        this.ctx.lineTo(point.x, point.y);
                    }
                });
                this.ctx.stroke();
                this.ctx.globalAlpha = 1;
            }
            
            // Draw missile
            const iranRocketImage = this.getImageAsset('iranRocket');
            if (this.useImageSprites && this.imagesLoaded && iranRocketImage) {
                const angle = Math.atan2(missile.vy, missile.vx) + Math.PI / 2;
                this.ctx.save();
                this.ctx.translate(missile.x, missile.y);
                this.ctx.rotate(angle);
                this.ctx.drawImage(iranRocketImage,
                    -missile.width / 2, -missile.height / 2,
                    missile.width, missile.height);
                this.ctx.restore();
            } else {
                const angle = Math.atan2(missile.vy, missile.vx) + Math.PI / 2;
                this.ctx.save();
                this.ctx.translate(missile.x, missile.y);
                this.ctx.rotate(angle);
                this.ctx.fillStyle = '#d6dde6';
                this.ctx.strokeStyle = '#8a97a8';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.moveTo(0, -22);
                this.ctx.lineTo(8, -8);
                this.ctx.lineTo(8, 14);
                this.ctx.lineTo(0, 22);
                this.ctx.lineTo(-8, 14);
                this.ctx.lineTo(-8, -8);
                this.ctx.closePath();
                this.ctx.fill();
                this.ctx.stroke();

                this.ctx.fillStyle = '#ff4040';
                this.ctx.beginPath();
                this.ctx.moveTo(0, -22);
                this.ctx.lineTo(5, -13);
                this.ctx.lineTo(-5, -13);
                this.ctx.closePath();
                this.ctx.fill();

                this.ctx.fillStyle = '#ff9b3d';
                this.ctx.beginPath();
                this.ctx.moveTo(-5, 22);
                this.ctx.lineTo(0, 33 + Math.random() * 3);
                this.ctx.lineTo(5, 22);
                this.ctx.closePath();
                this.ctx.fill();
                this.ctx.restore();
            }
        });
    }
    
    renderInterceptors() {
        this.interceptors.forEach(interceptor => {
            // Draw trail
            if (interceptor.trail.length > 1) {
                this.ctx.strokeStyle = 'rgba(68, 255, 68, 0.8)';
                this.ctx.lineWidth = 3;
                this.ctx.beginPath();
                interceptor.trail.forEach((point, index) => {
                    const alpha = index / interceptor.trail.length;
                    this.ctx.globalAlpha = alpha;
                    if (index === 0) {
                        this.ctx.moveTo(point.x, point.y);
                    } else {
                        this.ctx.lineTo(point.x, point.y);
                    }
                });
                this.ctx.stroke();
                this.ctx.globalAlpha = 1;
            }
            
            // Draw interceptor
            const interceptorImage = this.getImageAsset('israelRocket');
            if (this.useImageSprites && this.imagesLoaded && interceptorImage) {
                this.ctx.save();
                this.ctx.translate(interceptor.x, interceptor.y);
                this.ctx.rotate(interceptor.angle);
                this.ctx.drawImage(interceptorImage,
                    -interceptor.width / 2, -interceptor.height / 2,
                    interceptor.width, interceptor.height);
                this.ctx.restore();
            } else {
                this.ctx.save();
                this.ctx.translate(interceptor.x, interceptor.y);
                this.ctx.rotate(interceptor.angle);

                this.ctx.fillStyle = '#d9ecff';
                this.ctx.strokeStyle = '#3f71a8';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.moveTo(0, -20);
                this.ctx.lineTo(6, -5);
                this.ctx.lineTo(6, 13);
                this.ctx.lineTo(0, 20);
                this.ctx.lineTo(-6, 13);
                this.ctx.lineTo(-6, -5);
                this.ctx.closePath();
                this.ctx.fill();
                this.ctx.stroke();

                this.ctx.fillStyle = '#2f89ff';
                this.ctx.fillRect(-1.5, -15, 3, 25);

                this.ctx.fillStyle = '#7dffb2';
                this.ctx.beginPath();
                this.ctx.moveTo(-4, 20);
                this.ctx.lineTo(0, 30 + Math.random() * 2);
                this.ctx.lineTo(4, 20);
                this.ctx.closePath();
                this.ctx.fill();
                this.ctx.restore();
            }
        });
    }
    
    renderExplosions() {
        this.explosions.forEach(explosion => {
            // Draw glow effect first (behind particles)
            if (explosion.x && explosion.y) {
                this.ctx.save();
                this.ctx.globalAlpha = explosion.life * 0.6;

                // Outer glow
                const gradient = this.ctx.createRadialGradient(
                    explosion.x, explosion.y, 0,
                    explosion.x, explosion.y, explosion.glowSize * explosion.life
                );
                gradient.addColorStop(0, explosion.color);
                gradient.addColorStop(0.4, explosion.color + '88');
                gradient.addColorStop(1, 'transparent');

                this.ctx.fillStyle = gradient;
                this.ctx.beginPath();
                this.ctx.arc(explosion.x, explosion.y, explosion.glowSize * explosion.life, 0, Math.PI * 2);
                this.ctx.fill();

                // Inner bright core
                this.ctx.globalAlpha = explosion.life;
                this.ctx.fillStyle = '#ffffff';
                this.ctx.beginPath();
                this.ctx.arc(explosion.x, explosion.y, 8 * explosion.life, 0, Math.PI * 2);
                this.ctx.fill();

                this.ctx.restore();
            }

            // Draw particles
            explosion.particles.forEach(particle => {
                this.ctx.fillStyle = particle.color;
                this.ctx.globalAlpha = particle.alpha;
                this.ctx.beginPath();
                this.ctx.arc(particle.x, particle.y, particle.size || 2, 0, Math.PI * 2);
                this.ctx.fill();
            });
        });
        this.ctx.globalAlpha = 1;
    }
    
    renderLauncher() {
        const launcher = this.getLauncherPosition();
        const launcherX = launcher.x;
        const launcherY = launcher.y;
        const launcherWidth = 120;
        const launcherHeight = 80;
        
        const ironDomeImage = this.getImageAsset('ironDom');
        if (this.useImageSprites && this.imagesLoaded && ironDomeImage) {
            this.ctx.drawImage(ironDomeImage,
                launcherX - launcherWidth / 2, launcherY,
                launcherWidth, launcherHeight);
        } else {
            this.ctx.save();
            this.ctx.fillStyle = '#2a3b52';
            this.ctx.fillRect(launcherX - 48, launcherY + 26, 96, 24);
            this.ctx.fillStyle = '#3f5878';
            this.ctx.fillRect(launcherX - 30, launcherY + 12, 60, 18);
            this.ctx.fillStyle = '#6f88a5';
            this.ctx.fillRect(launcherX - 24, launcherY + 2, 48, 12);

            this.ctx.strokeStyle = '#9ec2e6';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.moveTo(launcherX, launcherY + 2);
            this.ctx.lineTo(launcherX, launcherY - 18);
            this.ctx.stroke();

            this.ctx.fillStyle = '#7ea0bf';
            this.ctx.fillRect(launcherX - 8, launcherY - 24, 16, 8);
            this.ctx.restore();
        }
    }
    
    renderNPCs() {
        this.npcs.forEach(npc => {
            this.ctx.save();
            
            if (!npc.alive) {
                // Death animation - rotate and fade
                const deathProgress = Math.min(npc.deathTimer / npc.deathDuration, 1);
                this.ctx.globalAlpha = 1 - deathProgress;
                this.ctx.translate(npc.x + npc.width / 2, npc.y + npc.height / 2);
                this.ctx.rotate(deathProgress * Math.PI / 2); // Rotate 90 degrees
                this.ctx.translate(-npc.width / 2, -npc.height / 2);
            }
            
            // Flip sprite based on direction
            if (npc.direction === -1) {
                this.ctx.scale(-1, 1);
                this.ctx.translate(-npc.x - npc.width, 0);
            }
            
            // Draw NPC image
            const npcImage = this.getImageAsset(npc.type);
            if (this.imagesLoaded && npcImage) {
                this.ctx.drawImage(npcImage, 
                    npc.direction === -1 ? 0 : npc.x, 
                    npc.y, 
                    npc.width, 
                    npc.height);
            } else {
                // Fallback
                this.ctx.fillStyle = npc.alive ? '#ffaa00' : '#660000';
                this.ctx.fillRect(
                    npc.direction === -1 ? 0 : npc.x, 
                    npc.y, 
                    npc.width, 
                    npc.height);
            }
            
            // Draw camera if photographing
            if (npc.alive && npc.photographing) {
                this.ctx.fillStyle = '#333';
                this.ctx.fillRect(
                    npc.direction === -1 ? 15 : npc.x + 15, 
                    npc.y + 10, 
                    8, 6);
            }
            
            this.ctx.restore();
        });
    }
    
    renderCameraFlashes() {
        this.cameraFlashes.forEach(flash => {
            this.ctx.save();
            this.ctx.globalAlpha = flash.intensity;
            
            // Draw bright white flash
            this.ctx.fillStyle = '#ffffff';
            this.ctx.beginPath();
            this.ctx.arc(flash.x, flash.y, flash.size * flash.intensity, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Draw outer glow
            this.ctx.fillStyle = '#ffffaa';
            this.ctx.beginPath();
            this.ctx.arc(flash.x, flash.y, flash.size * flash.intensity * 0.7, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.restore();
        });
    }
    
    stepFrame(deltaTime) {
        const safeDelta = Number.isFinite(deltaTime)
            ? Math.max(0, Math.min(deltaTime, this.maxFrameDelta))
            : this.fixedFrameDelta;

        this.internalClockMs += safeDelta;
        this.updateGame(safeDelta);
        this.render();
    }

    gameLoop() {
        const currentTime = performance.now();
        if (!this.lastTime) {
            this.lastTime = currentTime;
        }

        let deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        if (!Number.isFinite(deltaTime) || deltaTime < 0) {
            deltaTime = this.fixedFrameDelta;
        }

        this.stepFrame(deltaTime);
        requestAnimationFrame(() => this.gameLoop());
    }
    
    startGame() {
        this.applyCityConfig(this.selectedCity);
        this.resetRuntimeState({ resetStats: true });
        this.setGameState('playing');
        this.pauseBtn.textContent = '⏸️';
        this.gameMessage.classList.add('hidden');
        this.updateUI();
        this.showUI();
        this.lastTime = performance.now();

        // Initialize audio context on user interaction
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }
    
    togglePause() {
        if (this.gameState === 'playing') {
            this.setGameState('paused');
            this.pauseBtn.textContent = '▶️';
            this.showMessage('המשחק הושהה', 'הקישו על המשך כדי לחזור למשחק', 'המשך', {
                showCitySelector: false,
                messageStyle: 'status'
            });
            this.showUI();
        } else if (this.gameState === 'paused') {
            this.setGameState('playing');
            this.pauseBtn.textContent = '⏸️';
            this.gameMessage.classList.add('hidden');
            this.lastTime = performance.now();
        }
    }
    
    restartGame() {
        this.setGameState('menu');
        this.pauseBtn.textContent = '⏸️';
        this.resetRuntimeState({ resetStats: true });
        this.showMenuMessage();
        this.updateUI();
        this.showUI();
    }
    
    gameOver() {
        this.setGameState('gameOver');
        this.playSound(150, 1, 'sawtooth');
        this.showMessage('💥 המשחק נגמר!',
            this.getGameOverMessage(),
            'נסו שוב',
            { showCitySelector: true, messageStyle: 'status' });
        this.showUI();
    }
    
    victory() {
        this.setGameState('victory');
        this.playSound(440, 0.5, 'sine');
        this.playSound(550, 0.5, 'sine');
        this.showMessage('🎉 ניצחון!',
            this.getVictoryMessage(),
            'שחקו שוב',
            { showCitySelector: true, messageStyle: 'status' });
        this.showUI();
    }
    
    showVictoryWithShare() {
        this.setGameState('victory');
        this.playSound(440, 0.5, 'sine');
        this.playSound(550, 0.5, 'sine');
        this.showMessageWithShare('🎉 ניצחון!',
            this.getVictoryMessage(),
            'שחקו שוב',
            { showCitySelector: true, messageStyle: 'status' });
        this.showUI();
    }

    showMessage(title, message, buttonText = 'התחילו', options = {}) {
        const { showCitySelector = true, messageStyle = 'status' } = options;
        this.gameMessage.classList.remove('hidden');
        this.gameMessage.dataset.messageStyle = messageStyle;
        this.messageTitle.innerHTML = title;
        this.messageBody.innerHTML = message;
        this.startBtn.textContent = buttonText;
        this.setCitySelectorVisibility(showCitySelector);
        
        // Remove share button if it exists
        const existingShareBtn = this.gameMessage.querySelector('.share-button');
        if (existingShareBtn) {
            existingShareBtn.remove();
        }
    }
    
    showMessageWithShare(title, message, buttonText = 'התחילו', options = {}) {
        const { showCitySelector = true, messageStyle = 'status' } = options;
        this.gameMessage.classList.remove('hidden');
        this.gameMessage.dataset.messageStyle = messageStyle;
        this.messageTitle.innerHTML = title;
        this.messageBody.innerHTML = message;
        this.startBtn.textContent = buttonText;
        this.setCitySelectorVisibility(showCitySelector);
        
        // Remove existing share button if any
        const existingShareBtn = this.gameMessage.querySelector('.share-button');
        if (existingShareBtn) {
            existingShareBtn.remove();
        }
        
        // Add WhatsApp share button
        const shareBtn = document.createElement('button');
        shareBtn.className = 'share-button';
        shareBtn.textContent = 'שתפו ב-WhatsApp';
        shareBtn.onclick = () => this.shareToWhatsApp();
        
        // Insert share button before the play again button
        this.startBtn.parentNode.insertBefore(shareBtn, this.startBtn);
    }
    
    shareToWhatsApp() {
        const message = `🎮 ניצחתי עכשיו בכיפת ברזל! 🚀\n` +
                       `🎯 ניקוד: ${this.score}\n` +
                       `💥 יירוטים מושלמים: ${this.intercepts}/${this.targetIntercepts}\n` +
                       `🏆 הגנתי בהצלחה על ${this.getSelectedCityName()}!\n\n` +
                       `נסו לעקוף את הניקוד שלי! 🔥\n` +
                       `Play here: https://aloniter.github.io/Iron_Dom_mobile/`;
        
        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
        
        // Open WhatsApp in new window/tab
        window.open(whatsappUrl, '_blank');
    }
    
    updateUI() {
        const scoreEl = document.getElementById('score');
        const hitsEl = document.getElementById('hits');
        const maxHitsEl = document.getElementById('maxHits');
        const interceptsEl = document.getElementById('intercepts');
        const targetInterceptsEl = document.getElementById('targetIntercepts');
        const progressFill = document.getElementById('progressFill');
        if (!scoreEl || !hitsEl || !interceptsEl) return;

        // Animate score change
        const oldScore = parseInt(scoreEl.textContent) || 0;
        if (this.score > oldScore) {
            scoreEl.parentElement.classList.add('score-pop');
            setTimeout(() => scoreEl.parentElement.classList.remove('score-pop'), 300);
        }

        scoreEl.textContent = this.score;
        hitsEl.textContent = this.hits;
        if (maxHitsEl) {
            maxHitsEl.textContent = this.maxHits;
        }
        interceptsEl.textContent = this.intercepts;
        if (targetInterceptsEl) {
            targetInterceptsEl.textContent = this.targetIntercepts;
        }

        // Update progress bar
        const progress = this.targetIntercepts > 0 ? (this.intercepts / this.targetIntercepts) * 100 : 0;
        if (progressFill) {
            progressFill.style.width = `${progress}%`;

            // Change color based on progress
            if (progress >= 80) {
                progressFill.style.background = 'linear-gradient(90deg, #00ff88, #ffff00, #ff8800)';
            } else if (progress >= 50) {
                progressFill.style.background = 'linear-gradient(90deg, #00ff88, #00cc66, #ffff00)';
            } else {
                progressFill.style.background = 'linear-gradient(90deg, #4a90e2, #00ff88)';
            }
        }
    }
}

// Initialize game when page loads
window.addEventListener('load', () => {
    window.ironDomeGame = new IronDomeGame();
});
