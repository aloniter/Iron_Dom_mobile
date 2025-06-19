class IronDOMGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gameMessage = document.getElementById('gameMessage');
        this.startBtn = document.getElementById('startBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.restartBtn = document.getElementById('restartBtn');
        this.loadingScreen = document.getElementById('loadingScreen');
        this.touchFeedback = document.getElementById('touchFeedback');
        
        // Mobile detection
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                        ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        
        // Game state
        this.gameState = 'loading'; // loading, menu, playing, paused, gameOver, victory
        this.score = 0;
        this.hits = 0;
        this.intercepts = 0;
        this.maxHits = 5;
        this.targetIntercepts = 20;
        
        // Game objects - optimized limits for mobile
        this.enemyMissiles = [];
        this.playerMissile = null;
        this.interceptors = []; // For touch mode
        this.explosions = [];
        this.cityLights = [];
        this.stars = [];
        this.maxEnemyMissiles = this.isMobile ? 8 : 12;
        this.maxInterceptors = this.isMobile ? 6 : 10;
        this.maxExplosions = this.isMobile ? 5 : 8;
        
        // Control mode - default to touch on mobile
        this.controlMode = this.isMobile ? 'touch' : 'arrows';
        
        // Player controls
        this.keys = {
            ArrowUp: false,
            ArrowDown: false,
            ArrowLeft: false,
            ArrowRight: false
        };
        
        // Touch handling
        this.touchStartTime = 0;
        this.lastTouchTime = 0;
        this.touchCooldown = 200; // ms between touches
        
        // Timing
        this.lastTime = 0;
        this.enemySpawnTimer = 0;
        this.enemySpawnInterval = this.isMobile ? 2500 : 2000; // Slower on mobile
        
        // Performance optimization
        this.frameCount = 0;
        this.lastFPSTime = 0;
        this.fps = 60;
        this.targetFPS = this.isMobile ? 45 : 60;
        
        // Audio context for sound effects
        this.audioContext = null;
        this.soundEnabled = true;
        this.initAudio();
        
        // Load images
        this.images = {};
        this.imagesLoaded = false;
        this.totalImages = 0;
        this.loadedImages = 0;
        this.loadImages();
        
        this.init();
    }
    
    init() {
        this.showLoadingScreen();
        this.resizeCanvas();
        this.generateStars();
        this.generateCityLights();
        this.bindEvents();
        this.gameLoop();
        
        // Initialize control buttons
        setTimeout(() => {
            this.updateControlButtons();
            this.updateInstructions();
        }, 100);
    }
    
    showLoadingScreen() {
        this.loadingScreen.classList.remove('hidden');
    }
    
    hideLoadingScreen() {
        this.loadingScreen.classList.add('hidden');
        this.gameState = 'menu';
        this.showMessage('Iron DOM', 'Tap anywhere to launch interceptor missiles!<br>Protect the cities by intercepting enemy missiles.', '🎯 TAP TO START');
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
            { name: 'israelRocket', src: 'photos/israel_rocket.png' },
            { name: 'ironDom', src: 'photos/iron_dom.png' },
            { name: 'background', src: 'photos/bg.png' },
            { name: 'iranRocket', src: 'photos/iran_rocket.png' }
        ];
        
        this.totalImages = imagesToLoad.length;
        
        imagesToLoad.forEach(imageInfo => {
            const img = new Image();
            img.onload = () => {
                this.loadedImages++;
                this.updateLoadingProgress();
                if (this.loadedImages === this.totalImages) {
                    this.imagesLoaded = true;
                    setTimeout(() => this.hideLoadingScreen(), 500);
                }
            };
            img.onerror = () => {
                console.warn(`Failed to load image: ${imageInfo.src}`);
                this.loadedImages++;
                this.updateLoadingProgress();
                if (this.loadedImages === this.totalImages) {
                    this.imagesLoaded = true;
                    setTimeout(() => this.hideLoadingScreen(), 500);
                }
            };
            img.src = imageInfo.src;
            this.images[imageInfo.name] = img;
        });
    }
    
    updateLoadingProgress() {
        const progress = (this.loadedImages / this.totalImages) * 100;
        const loadingText = document.querySelector('.loading-content p');
        if (loadingText) {
            loadingText.textContent = `Loading assets... ${Math.round(progress)}%`;
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
        // Full viewport dimensions
        const devicePixelRatio = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        
        // Set display size (CSS pixels)
        this.canvas.style.width = '100vw';
        this.canvas.style.height = '100vh';
        
        // Set actual size in memory (scaled up for high DPI)
        this.canvas.width = window.innerWidth * devicePixelRatio;
        this.canvas.height = window.innerHeight * devicePixelRatio;
        
        // Scale context to match device pixel ratio
        this.ctx.scale(devicePixelRatio, devicePixelRatio);
        
        // Store logical dimensions for game logic
        this.canvasWidth = window.innerWidth;
        this.canvasHeight = window.innerHeight;
        
        // Performance optimization for mobile
        if (this.isMobile && devicePixelRatio > 2) {
            this.canvas.width = window.innerWidth * 2;
            this.canvas.height = window.innerHeight * 2;
            this.ctx.scale(2, 2);
        }
    }
    
    generateStars() {
        this.stars = [];
        const starCount = this.isMobile ? 30 : 50;
        for (let i = 0; i < starCount; i++) {
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
        const numBuildings = this.isMobile ? 10 : 15;
        const buildingWidth = this.canvasWidth / numBuildings;
        
        for (let i = 0; i < numBuildings; i++) {
            const height = Math.random() * 60 + 20;
            this.cityLights.push({
                x: i * buildingWidth,
                y: this.canvasHeight - height,
                width: buildingWidth - 2,
                height: height,
                lights: this.generateBuildingLights(buildingWidth - 2, height)
            });
        }
    }
    
    generateBuildingLights(width, height) {
        const lights = [];
        const rows = Math.floor(height / 15);
        const cols = Math.floor(width / 10);
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                if (Math.random() > 0.4) { // Fewer lights on mobile
                    lights.push({
                        x: col * 10 + 3,
                        y: row * 15 + 5,
                        color: Math.random() > 0.8 ? '#ffff00' : '#ffa500'
                    });
                }
            }
        }
        return lights;
    }
    
    bindEvents() {
        this.startBtn.addEventListener('click', () => this.startGame());
        this.pauseBtn.addEventListener('click', () => this.togglePause());
        this.restartBtn.addEventListener('click', () => this.restartGame());
        
        // Control mode buttons
        document.getElementById('arrowsBtn').addEventListener('click', () => this.setControlMode('arrows'));
        document.getElementById('touchBtn').addEventListener('click', () => this.setControlMode('touch'));
        
        // Keyboard controls for player missile (arrows mode)
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
        window.addEventListener('keyup', (e) => this.handleKeyUp(e));
        
        // Enhanced touch/mouse controls
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e));
        
        // Prevent context menu on long press
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Handle orientation and resize
        window.addEventListener('resize', () => this.handleResize());
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.handleResize(), 500);
        });
        
        // Prevent scrolling and zooming
        document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
        document.addEventListener('gesturestart', (e) => e.preventDefault());
        document.addEventListener('gesturechange', (e) => e.preventDefault());
        document.addEventListener('gestureend', (e) => e.preventDefault());
    }
    
    handleResize() {
        this.resizeCanvas();
        this.generateStars();
        this.generateCityLights();
    }
    
    setControlMode(mode) {
        this.controlMode = mode;
        this.updateControlButtons();
        this.updateInstructions();
    }
    
    updateControlButtons() {
        const arrowsBtn = document.getElementById('arrowsBtn');
        const touchBtn = document.getElementById('touchBtn');
        
        if (this.controlMode === 'arrows') {
            arrowsBtn.classList.add('active');
            touchBtn.classList.remove('active');
        } else {
            arrowsBtn.classList.remove('active');
            touchBtn.classList.add('active');
        }
    }
    
    updateInstructions() {
        const instructions = document.getElementById('gameInstructions');
        if (this.controlMode === 'arrows') {
            instructions.innerHTML = 'Use arrow keys to control your interceptor missile!<br>Crash into enemy missiles to destroy them and protect the cities below.<br><strong>Controls:</strong> ↑↓←→ Arrow Keys';
        } else {
            instructions.innerHTML = 'Tap anywhere on the screen to launch interceptor missiles!<br>Protect the cities by intercepting enemy missiles.<br><strong>Controls:</strong> Touch/Tap';
        }
    }
    
    handleKeyDown(e) {
        if (this.gameState !== 'playing' || this.controlMode !== 'arrows') return;
        
        if (e.code in this.keys) {
            e.preventDefault();
            this.keys[e.code] = true;
        }
    }
    
    handleKeyUp(e) {
        if (this.controlMode !== 'arrows') return;
        
        if (e.code in this.keys) {
            e.preventDefault();
            this.keys[e.code] = false;
        }
    }
    
    handleClick(e) {
        if (this.gameState !== 'playing' || this.controlMode !== 'touch') return;
        
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvasWidth / rect.width;
        const scaleY = this.canvasHeight / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        
        this.launchInterceptor(x, y);
        this.showTouchFeedback(x, y);
    }
    
    handleTouchStart(e) {
        e.preventDefault();
        if (this.gameState !== 'playing' || this.controlMode !== 'touch') return;
        
        this.touchStartTime = Date.now();
        
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
    
    handleTouchMove(e) {
        e.preventDefault();
    }
    
    handleTouchEnd(e) {
        e.preventDefault();
    }
    
    showTouchFeedback(x, y) {
        // Convert game coordinates to screen coordinates
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = rect.width / this.canvasWidth;
        const scaleY = rect.height / this.canvasHeight;
        const screenX = x * scaleX + rect.left;
        const screenY = y * scaleY + rect.top;
        
        this.touchFeedback.style.left = (screenX - 25) + 'px';
        this.touchFeedback.style.top = (screenY - 25) + 'px';
        this.touchFeedback.classList.add('active');
        
        setTimeout(() => {
            this.touchFeedback.classList.remove('active');
        }, 300);
    }
    
    launchInterceptor(targetX, targetY) {
        // Limit active interceptors for performance
        if (this.interceptors.length >= this.maxInterceptors) {
            this.interceptors.shift(); // Remove oldest
        }
        
        const startX = this.canvasWidth / 2;
        const startY = this.canvasHeight - 100;
        
        const dx = targetX - startX;
        const dy = targetY - startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const speed = this.isMobile ? 5 : 6; // Slightly slower on mobile
        
        this.interceptors.push({
            x: startX,
            y: startY,
            targetX: targetX,
            targetY: targetY,
            vx: (dx / distance) * speed,
            vy: (dy / distance) * speed,
            trail: [],
            angle: Math.atan2(dy, dx) + Math.PI / 2,
            width: this.isMobile ? 25 : 35,
            height: this.isMobile ? 50 : 70
        });
        
        // Launch sound
        this.playSound(800, 0.2, 'square');
    }
    
    createPlayerMissile() {
        if (this.playerMissile || this.controlMode !== 'arrows') return;
        
        this.playerMissile = {
            x: this.canvasWidth / 2,
            y: this.canvasHeight - 100,
            vx: 0,
            vy: 0,
            speed: this.isMobile ? 4 : 5,
            trail: [],
            angle: 0,
            width: this.isMobile ? 35 : 50,
            height: this.isMobile ? 70 : 100
        };
        
        this.playSound(800, 0.2, 'square');
    }
    
    spawnEnemyMissile() {
        // Limit active enemy missiles for performance
        if (this.enemyMissiles.length >= this.maxEnemyMissiles) return;
        
        const x = Math.random() * this.canvasWidth;
        const targetX = Math.random() * this.canvasWidth;
        const speed = Math.random() * 1.5 + 1; // Slightly slower for mobile
        
        const dx = targetX - x;
        const dy = this.canvasHeight;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        this.enemyMissiles.push({
            x: x,
            y: 0,
            vx: (dx / distance) * speed,
            vy: (dy / distance) * speed,
            trail: [],
            width: this.isMobile ? 25 : 35,
            height: this.isMobile ? 50 : 70
        });
    }
    
    updateGame(deltaTime) {
        if (this.gameState !== 'playing') return;
        
        // Performance monitoring
        this.frameCount++;
        if (Date.now() - this.lastFPSTime > 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastFPSTime = Date.now();
            
            // Adjust quality based on performance
            if (this.fps < this.targetFPS * 0.8) {
                this.adjustPerformance();
            }
        }
        
        // Create player missile if it doesn't exist (arrows mode only)
        if (this.controlMode === 'arrows' && !this.playerMissile) {
            this.createPlayerMissile();
        }
        
        // Update player missile movement based on key presses (arrows mode)
        if (this.playerMissile && this.controlMode === 'arrows') {
            this.updatePlayerMissile(deltaTime);
        }
        
        // Update interceptors (touch mode)
        if (this.controlMode === 'touch') {
            this.updateInterceptors(deltaTime);
        }
        
        // Spawn enemy missiles
        this.enemySpawnTimer += deltaTime;
        if (this.enemySpawnTimer >= this.enemySpawnInterval) {
            this.spawnEnemyMissile();
            this.enemySpawnTimer = 0;
            // Increase difficulty over time
            this.enemySpawnInterval = Math.max(this.isMobile ? 1500 : 800, this.enemySpawnInterval - 50);
        }
        
        // Update enemy missiles
        this.updateEnemyMissiles(deltaTime);
        
        // Update explosions
        this.updateExplosions(deltaTime);
        
        // Check collisions
        this.checkCollisions();
        
        // Check game over conditions
        if (this.hits >= this.maxHits) {
            this.gameOver();
        }
    }
    
    updatePlayerMissile(deltaTime) {
        // Reset velocity
        this.playerMissile.vx = 0;
        this.playerMissile.vy = 0;
        
        // Apply movement based on pressed keys
        if (this.keys.ArrowLeft) {
            this.playerMissile.vx = -this.playerMissile.speed;
        }
        if (this.keys.ArrowRight) {
            this.playerMissile.vx = this.playerMissile.speed;
        }
        if (this.keys.ArrowUp) {
            this.playerMissile.vy = -this.playerMissile.speed;
        }
        if (this.keys.ArrowDown) {
            this.playerMissile.vy = this.playerMissile.speed;
        }
        
        // Diagonal movement normalization
        if ((this.keys.ArrowLeft || this.keys.ArrowRight) && 
            (this.keys.ArrowUp || this.keys.ArrowDown)) {
            this.playerMissile.vx *= 0.707;
            this.playerMissile.vy *= 0.707;
        }
        
        // Calculate rotation angle
        if (this.playerMissile.vx !== 0 || this.playerMissile.vy !== 0) {
            this.playerMissile.angle = Math.atan2(this.playerMissile.vy, this.playerMissile.vx) + Math.PI / 2;
        }
        
        // Update position
        this.playerMissile.x += this.playerMissile.vx;
        this.playerMissile.y += this.playerMissile.vy;
        
        // Keep within bounds
        this.playerMissile.x = Math.max(this.playerMissile.width/2, 
            Math.min(this.canvasWidth - this.playerMissile.width/2, this.playerMissile.x));
        this.playerMissile.y = Math.max(this.playerMissile.height/2, 
            Math.min(this.canvasHeight - this.playerMissile.height/2, this.playerMissile.y));
        
        // Update trail (shorter on mobile)
        this.playerMissile.trail.push({ x: this.playerMissile.x, y: this.playerMissile.y });
        const maxTrailLength = this.isMobile ? 6 : 12;
        if (this.playerMissile.trail.length > maxTrailLength) this.playerMissile.trail.shift();
    }
    
    updateInterceptors(deltaTime) {
        this.interceptors.forEach((interceptor, index) => {
            // Update trail
            interceptor.trail.push({ x: interceptor.x, y: interceptor.y });
            const maxTrailLength = this.isMobile ? 4 : 8;
            if (interceptor.trail.length > maxTrailLength) interceptor.trail.shift();
            
            // Update position
            interceptor.x += interceptor.vx;
            interceptor.y += interceptor.vy;
            
            // Check if interceptor reached target or went off screen
            const distToTarget = Math.sqrt(
                Math.pow(interceptor.x - interceptor.targetX, 2) + 
                Math.pow(interceptor.y - interceptor.targetY, 2)
            );
            
            if (distToTarget < 20 || interceptor.x < 0 || interceptor.x > this.canvasWidth || 
                interceptor.y < 0 || interceptor.y > this.canvasHeight) {
                this.interceptors.splice(index, 1);
                this.createExplosion(interceptor.x, interceptor.y, '#4444ff');
            }
        });
    }
    
    updateEnemyMissiles(deltaTime) {
        this.enemyMissiles.forEach((missile, index) => {
            // Update trail
            missile.trail.push({ x: missile.x, y: missile.y });
            const maxTrailLength = this.isMobile ? 5 : 10;
            if (missile.trail.length > maxTrailLength) missile.trail.shift();
            
            // Update position
            missile.x += missile.vx;
            missile.y += missile.vy;
            
            // Check if missile hit ground
            if (missile.y >= this.canvasHeight - 80) {
                this.enemyMissiles.splice(index, 1);
                this.createExplosion(missile.x, missile.y, '#ff4444');
                this.hits++;
                this.playSound(200, 0.5, 'sawtooth');
                this.updateUI();
            }
        });
    }
    
    updateExplosions(deltaTime) {
        this.explosions.forEach((explosion, index) => {
            explosion.life -= deltaTime / 1000;
            
            explosion.particles.forEach(particle => {
                particle.x += particle.vx;
                particle.y += particle.vy;
                particle.alpha = explosion.life;
                particle.vx *= 0.98; // Friction
                particle.vy *= 0.98;
            });
            
            if (explosion.life <= 0) {
                this.explosions.splice(index, 1);
            }
        });
        
        // Limit explosions for performance
        if (this.explosions.length > this.maxExplosions) {
            this.explosions.splice(0, this.explosions.length - this.maxExplosions);
        }
    }
    
    adjustPerformance() {
        // Reduce visual quality for better performance
        this.maxEnemyMissiles = Math.max(4, Math.floor(this.maxEnemyMissiles * 0.8));
        this.maxInterceptors = Math.max(3, Math.floor(this.maxInterceptors * 0.8));
        this.maxExplosions = Math.max(3, Math.floor(this.maxExplosions * 0.8));
        
        // Reduce particle count in explosions
        this.explosions.forEach(explosion => {
            if (explosion.particles.length > 8) {
                explosion.particles.splice(8);
            }
        });
    }
    
    checkCollisions() {
        // Check collisions for arrows mode (player missile)
        if (this.playerMissile && this.controlMode === 'arrows') {
            for (let i = this.enemyMissiles.length - 1; i >= 0; i--) {
                const enemy = this.enemyMissiles[i];
                const distance = Math.sqrt(
                    Math.pow(enemy.x - this.playerMissile.x, 2) + 
                    Math.pow(enemy.y - this.playerMissile.y, 2)
                );
                
                if (distance < 35) {
                    this.createExplosion((enemy.x + this.playerMissile.x) / 2, 
                                      (enemy.y + this.playerMissile.y) / 2, '#ffff44');
                    this.enemyMissiles.splice(i, 1);
                    this.playerMissile = null;
                    
                    this.intercepts++;
                    this.score += 100;
                    this.playSound(600, 0.3, 'triangle');
                    this.updateUI();
                    
                    if (this.intercepts >= this.targetIntercepts) {
                        this.victory();
                    }
                    break;
                }
            }
        }
        
        // Check collisions for touch mode (interceptors)
        if (this.controlMode === 'touch') {
            for (let i = this.enemyMissiles.length - 1; i >= 0; i--) {
                const enemy = this.enemyMissiles[i];
                
                for (let j = this.interceptors.length - 1; j >= 0; j--) {
                    const interceptor = this.interceptors[j];
                    
                    const distance = Math.sqrt(
                        Math.pow(enemy.x - interceptor.x, 2) + 
                        Math.pow(enemy.y - interceptor.y, 2)
                    );
                    
                    if (distance < 35) {
                        this.createExplosion((enemy.x + interceptor.x) / 2, 
                                          (enemy.y + interceptor.y) / 2, '#ffff44');
                        this.enemyMissiles.splice(i, 1);
                        this.interceptors.splice(j, 1);
                        this.intercepts++;
                        this.score += 100;
                        this.playSound(600, 0.3, 'triangle');
                        this.updateUI();
                        
                        if (this.intercepts >= this.targetIntercepts) {
                            this.victory();
                        }
                        break;
                    }
                }
            }
        }
    }
    
    createExplosion(x, y, color) {
        // Limit explosions for performance
        if (this.explosions.length >= this.maxExplosions) {
            this.explosions.shift();
        }
        
        const particles = [];
        const numParticles = this.isMobile ? 8 : 15;
        
        for (let i = 0; i < numParticles; i++) {
            const angle = (Math.PI * 2 * i) / numParticles;
            const speed = Math.random() * 2 + 1;
            
            particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                alpha: 1,
                color: color
            });
        }
        
        this.explosions.push({
            particles: particles,
            life: 1
        });
    }
    
    render() {
        // Clear with performance optimization
        this.ctx.fillStyle = 'rgba(10, 10, 46, 0.1)';
        this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
        
        // Draw background image if loaded
        if (this.imagesLoaded && this.images.background && this.images.background.complete) {
            this.ctx.drawImage(this.images.background, 0, 0, this.canvasWidth, this.canvasHeight);
        } else {
            // Draw stars as fallback
            this.stars.forEach(star => {
                const alpha = 0.5 + 0.5 * Math.sin(star.twinkle / 100);
                this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                this.ctx.beginPath();
                this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
                this.ctx.fill();
            });
        }
        
        // Draw city lights only if no background
        if (!this.imagesLoaded || !this.images.background || !this.images.background.complete) {
            this.renderCityLights();
        }
        
        // Render game objects
        this.renderEnemyMissiles();
        this.renderInterceptors();
        this.renderPlayerMissile();
        this.renderExplosions();
        this.renderLauncher();
        
        // Performance indicator (debug)
        if (this.fps < this.targetFPS * 0.8) {
            this.ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
            this.ctx.fillRect(this.canvasWidth - 100, 10, 90, 20);
            this.ctx.fillStyle = 'white';
            this.ctx.font = '12px Arial';
            this.ctx.fillText(`FPS: ${this.fps}`, this.canvasWidth - 95, 25);
        }
    }
    
    renderCityLights() {
        this.cityLights.forEach(building => {
            this.ctx.fillStyle = '#1a1a2e';
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
                this.ctx.lineWidth = this.isMobile ? 2 : 4;
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
            if (this.imagesLoaded && this.images.iranRocket && this.images.iranRocket.complete) {
                const angle = Math.atan2(missile.vy, missile.vx) + Math.PI / 2;
                this.ctx.save();
                this.ctx.translate(missile.x, missile.y);
                this.ctx.rotate(angle);
                this.ctx.drawImage(this.images.iranRocket, 
                    -missile.width / 2, -missile.height / 2, 
                    missile.width, missile.height);
                this.ctx.restore();
            } else {
                // Fallback
                this.ctx.fillStyle = '#ff4444';
                this.ctx.beginPath();
                this.ctx.arc(missile.x, missile.y, this.isMobile ? 8 : 15, 0, Math.PI * 2);
                this.ctx.fill();
            }
        });
    }
    
    renderInterceptors() {
        if (this.controlMode !== 'touch') return;
        
        this.interceptors.forEach(interceptor => {
            // Draw trail
            if (interceptor.trail.length > 1) {
                this.ctx.strokeStyle = 'rgba(68, 255, 68, 0.8)';
                this.ctx.lineWidth = this.isMobile ? 2 : 4;
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
            if (this.imagesLoaded && this.images.israelRocket && this.images.israelRocket.complete) {
                this.ctx.save();
                this.ctx.translate(interceptor.x, interceptor.y);
                this.ctx.rotate(interceptor.angle);
                this.ctx.drawImage(this.images.israelRocket,
                    -interceptor.width / 2, -interceptor.height / 2,
                    interceptor.width, interceptor.height);
                this.ctx.restore();
            } else {
                // Fallback
                this.ctx.fillStyle = '#44ff44';
                this.ctx.beginPath();
                this.ctx.arc(interceptor.x, interceptor.y, this.isMobile ? 6 : 8, 0, Math.PI * 2);
                this.ctx.fill();
            }
        });
    }
    
    renderPlayerMissile() {
        if (!this.playerMissile || this.controlMode !== 'arrows') return;
        
        // Draw trail
        if (this.playerMissile.trail.length > 1) {
            this.ctx.strokeStyle = 'rgba(68, 255, 68, 0.9)';
            this.ctx.lineWidth = this.isMobile ? 3 : 6;
            this.ctx.beginPath();
            this.playerMissile.trail.forEach((point, index) => {
                const alpha = index / this.playerMissile.trail.length;
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
        if (this.imagesLoaded && this.images.israelRocket && this.images.israelRocket.complete) {
            this.ctx.save();
            this.ctx.translate(this.playerMissile.x, this.playerMissile.y);
            this.ctx.rotate(this.playerMissile.angle);
            this.ctx.drawImage(this.images.israelRocket,
                -this.playerMissile.width / 2, -this.playerMissile.height / 2,
                this.playerMissile.width, this.playerMissile.height);
            this.ctx.restore();
        } else {
            // Fallback
            this.ctx.fillStyle = '#44ff44';
            this.ctx.beginPath();
            this.ctx.arc(this.playerMissile.x, this.playerMissile.y, this.isMobile ? 8 : 10, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    renderExplosions() {
        this.explosions.forEach(explosion => {
            explosion.particles.forEach(particle => {
                this.ctx.fillStyle = particle.color;
                this.ctx.globalAlpha = particle.alpha;
                this.ctx.beginPath();
                this.ctx.arc(particle.x, particle.y, this.isMobile ? 1.5 : 2, 0, Math.PI * 2);
                this.ctx.fill();
            });
        });
        this.ctx.globalAlpha = 1;
    }
    
    renderLauncher() {
        const launcherX = this.canvasWidth / 2;
        const launcherY = this.canvasHeight - 100;
        const launcherWidth = this.isMobile ? 100 : 150;
        const launcherHeight = this.isMobile ? 60 : 90;
        
        if (this.imagesLoaded && this.images.ironDom && this.images.ironDom.complete) {
            this.ctx.drawImage(this.images.ironDom,
                launcherX - launcherWidth / 2, launcherY,
                launcherWidth, launcherHeight);
        } else {
            // Fallback
            this.ctx.fillStyle = '#4a90e2';
            this.ctx.fillRect(launcherX - 15, launcherY, 30, 20);
            this.ctx.fillStyle = '#357abd';
            this.ctx.fillRect(launcherX - 3, launcherY - 10, 6, 10);
        }
    }
    
    gameLoop() {
        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        // Limit frame rate on mobile for better performance
        if (this.isMobile && deltaTime < (1000 / this.targetFPS)) {
            requestAnimationFrame(() => this.gameLoop());
            return;
        }
        
        this.updateGame(deltaTime);
        this.render();
        
        requestAnimationFrame(() => this.gameLoop());
    }
    
    startGame() {
        this.gameState = 'playing';
        this.score = 0;
        this.hits = 0;
        this.intercepts = 0;
        this.enemyMissiles = [];
        this.playerMissile = null;
        this.interceptors = [];
        this.explosions = [];
        this.enemySpawnTimer = 0;
        this.enemySpawnInterval = this.isMobile ? 2500 : 2000;
        
        this.gameMessage.classList.add('hidden');
        this.updateUI();
        this.updateControlButtons();
        this.updateInstructions();
        
        // Initialize audio context on user interaction
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }
    
    togglePause() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            this.pauseBtn.textContent = '▶️';
            this.showMessage('Game Paused', 'Tap Resume to continue', 'Resume');
        } else if (this.gameState === 'paused') {
            this.gameState = 'playing';
            this.pauseBtn.textContent = '⏸️';
            this.gameMessage.classList.add('hidden');
        }
    }
    
    restartGame() {
        this.gameState = 'menu';
        this.pauseBtn.textContent = '⏸️';
        const controlText = this.controlMode === 'arrows' ? 
            'Use arrow keys to control your interceptor missile!' :
            'Tap anywhere to launch interceptor missiles!';
        this.showMessage('Iron DOM', controlText + '<br>Protect the cities by intercepting enemy missiles.', '🎯 TAP TO START');
    }
    
    gameOver() {
        this.gameState = 'gameOver';
        this.playSound(150, 1, 'sawtooth');
        this.showMessage('💥 Game Over!', 
            `Your cities were destroyed!<br>Score: ${this.score}<br>Intercepts: ${this.intercepts}`, 
            '🔄 Try Again');
    }
    
    victory() {
        this.gameState = 'victory';
        this.playSound(440, 0.5, 'sine');
        this.playSound(550, 0.5, 'sine');
        this.showMessage('🎉 Victory!', 
            `You successfully defended the cities!<br>Score: ${this.score}<br>Perfect intercepts: ${this.intercepts}`, 
            '🎯 Play Again');
    }
    
    showMessage(title, message, buttonText = '🎯 TAP TO START') {
        this.gameMessage.classList.remove('hidden');
        this.gameMessage.querySelector('h2').textContent = title;
        this.gameMessage.querySelector('#gameInstructions').innerHTML = message;
        this.startBtn.textContent = buttonText;
    }
    
    updateUI() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('hits').textContent = this.hits;
        document.getElementById('intercepts').textContent = this.intercepts;
    }
}

// Initialize game when page loads
window.addEventListener('load', () => {
    new IronDOMGame();
}); 