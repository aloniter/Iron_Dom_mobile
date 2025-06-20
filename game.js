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
        this.uiOverlay = document.querySelector('.ui-overlay');
        this.scorePanel = document.querySelector('.score-panel');
        this.controls = document.querySelector('.controls');
        
        // Game state
        this.gameState = 'loading'; // loading, menu, playing, paused, gameOver, victory
        this.score = 0;
        this.hits = 0;
        this.intercepts = 0;
        this.maxHits = 5;
        this.targetIntercepts = 20;
        
        // Game objects
        this.enemyMissiles = [];
        this.interceptors = [];
        this.explosions = [];
        this.cityLights = [];
        this.stars = [];
        
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
        this.lastTime = 0;
        this.enemySpawnTimer = 0;
        this.enemySpawnInterval = 2000; // Start with 2 seconds
        
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
        this.startActivityTracking();
    }
    
    showLoadingScreen() {
        this.loadingScreen.classList.remove('hidden');
    }
    
    hideLoadingScreen() {
        this.loadingScreen.classList.add('hidden');
        this.gameState = 'menu';
        this.showMessage('Iron DOM', 'Tap anywhere to launch interceptor missiles!<br>Protect the cities by intercepting enemy missiles.', '🎯 TAP TO START');
        
        // Show iOS home screen prompt if applicable
        this.showIOSPrompt();
    }
    
    showIOSPrompt() {
        if (this.isIOS && !this.isStandalone) {
            const prompt = document.createElement('div');
            prompt.className = 'ios-prompt';
            prompt.innerHTML = '📲 For full screen: Add to Home Screen<br><small>Tap Share → Add to Home Screen</small>';
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
            { name: 'israelRocket', src: 'photos/israel_rocket.png' },
            { name: 'ironDom', src: 'photos/iron_dom.png' },
            { name: 'background', src: 'photos/bg.png' },
            { name: 'iranRocket', src: 'photos/iran_rocket.png' },
            { name: 'trump', src: 'photos/Trump.png' }
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
        const numBuildings = 12;
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
                if (Math.random() > 0.4) {
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
    
    handleResize() {
        this.resizeCanvas();
        this.generateStars();
        this.generateCityLights();
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
        
        const startX = this.canvasWidth / 2;
        const startY = this.canvasHeight - 100;
        
        const dx = targetX - startX;
        const dy = targetY - startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
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
        // Limit active enemy missiles
        if (this.enemyMissiles.length >= 10) return;
        
        const x = Math.random() * this.canvasWidth;
        const targetX = Math.random() * this.canvasWidth;
        const speed = Math.random() * 2 + 1.5;
        
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
        if (this.gameState !== 'playing' && !this.trumpAnimation.active) return;
        
        // Update Trump animation if active
        if (this.trumpAnimation.active) {
            this.updateTrumpAnimation(deltaTime);
            return;
        }
        
        // Update interceptors
        this.updateInterceptors(deltaTime);
        
        // Spawn enemy missiles
        this.enemySpawnTimer += deltaTime;
        if (this.enemySpawnTimer >= this.enemySpawnInterval) {
            this.spawnEnemyMissile();
            this.enemySpawnTimer = 0;
            // Increase difficulty over time
            this.enemySpawnInterval = Math.max(1000, this.enemySpawnInterval - 30);
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
    
    updateInterceptors(deltaTime) {
        for (let i = this.interceptors.length - 1; i >= 0; i--) {
            const interceptor = this.interceptors[i];
            
            // Update trail
            interceptor.trail.push({ x: interceptor.x, y: interceptor.y });
            if (interceptor.trail.length > 6) interceptor.trail.shift();
            
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
                this.interceptors.splice(i, 1);
                this.createExplosion(interceptor.x, interceptor.y, '#4444ff');
            }
        }
    }
    
    updateEnemyMissiles(deltaTime) {
        for (let i = this.enemyMissiles.length - 1; i >= 0; i--) {
            const missile = this.enemyMissiles[i];
            
            // Update trail
            missile.trail.push({ x: missile.x, y: missile.y });
            if (missile.trail.length > 8) missile.trail.shift();
            
            // Update position
            missile.x += missile.vx;
            missile.y += missile.vy;
            
            // Check if missile hit ground
            if (missile.y >= this.canvasHeight - 80) {
                this.enemyMissiles.splice(i, 1);
                this.createExplosion(missile.x, missile.y, '#ff4444');
                this.hits++;
                this.playSound(200, 0.5, 'sawtooth');
                this.updateUI();
            }
        }
    }
    
    updateExplosions(deltaTime) {
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            const explosion = this.explosions[i];
            explosion.life -= deltaTime / 1000;
            
            explosion.particles.forEach(particle => {
                particle.x += particle.vx;
                particle.y += particle.vy;
                particle.alpha = explosion.life;
                particle.vx *= 0.98;
                particle.vy *= 0.98;
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
                    this.createExplosion((enemy.x + interceptor.x) / 2, 
                                      (enemy.y + interceptor.y) / 2, '#ffff44');
                    this.enemyMissiles.splice(i, 1);
                    this.interceptors.splice(j, 1);
                    this.intercepts++;
                    this.score += 100;
                    this.playSound(600, 0.3, 'triangle');
                    this.updateUI();
                    
                    if (this.intercepts >= this.targetIntercepts) {
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
        const numParticles = 10;
        
        for (let i = 0; i < numParticles; i++) {
            const angle = (Math.PI * 2 * i) / numParticles;
            const speed = Math.random() * 3 + 1;
            
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
    
    startTrumpAnimation(callback) {
        this.trumpAnimation.active = true;
        this.trumpAnimation.x = this.canvasWidth + this.trumpAnimation.width;
        this.trumpAnimation.y = this.canvasHeight / 2 - this.trumpAnimation.height / 2;
        this.trumpAnimation.textAlpha = 0;
        this.trumpAnimation.textFadeIn = false;
        this.trumpAnimation.duration = 0;
        this.trumpAnimation.callback = callback;
        this.trumpAnimation.stars = []; // Clear any existing stars
        this.gameState = 'trumpAnimation';
        
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
            this.gameState = 'victory'; // Set to victory state
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
        if (this.imagesLoaded && this.images.trump && this.images.trump.complete) {
            this.ctx.drawImage(this.images.trump, 
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
        // Clear canvas
        this.ctx.fillStyle = 'rgba(10, 10, 46, 1)';
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
                star.twinkle += 2;
            });
            
            // Draw city lights
            this.renderCityLights();
        }
        
        // Render game objects
        this.renderEnemyMissiles();
        this.renderInterceptors();
        this.renderExplosions();
        this.renderLauncher();
        
        // Render Trump animation if active
        this.renderTrumpAnimation();
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
                this.ctx.arc(missile.x, missile.y, 12, 0, Math.PI * 2);
                this.ctx.fill();
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
                this.ctx.arc(interceptor.x, interceptor.y, 8, 0, Math.PI * 2);
                this.ctx.fill();
            }
        });
    }
    
    renderExplosions() {
        this.explosions.forEach(explosion => {
            explosion.particles.forEach(particle => {
                this.ctx.fillStyle = particle.color;
                this.ctx.globalAlpha = particle.alpha;
                this.ctx.beginPath();
                this.ctx.arc(particle.x, particle.y, 2, 0, Math.PI * 2);
                this.ctx.fill();
            });
        });
        this.ctx.globalAlpha = 1;
    }
    
    renderLauncher() {
        const launcherX = this.canvasWidth / 2;
        const launcherY = this.canvasHeight - 100;
        const launcherWidth = 120;
        const launcherHeight = 80;
        
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
        this.interceptors = [];
        this.explosions = [];
        this.enemySpawnTimer = 0;
        this.enemySpawnInterval = 2000;
        
        this.gameMessage.classList.add('hidden');
        this.updateUI();
        this.showUI(); // Ensure UI is visible when starting
        
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
            this.showUI(); // Show UI when paused
        } else if (this.gameState === 'paused') {
            this.gameState = 'playing';
            this.pauseBtn.textContent = '⏸️';
            this.gameMessage.classList.add('hidden');
        }
    }
    
    restartGame() {
        this.gameState = 'menu';
        this.pauseBtn.textContent = '⏸️';
        this.showMessage('Iron DOM', 'Tap anywhere to launch interceptor missiles!<br>Protect the cities by intercepting enemy missiles.', '🎯 TAP TO START');
        this.showUI(); // Show UI when restarting
    }
    
    gameOver() {
        this.gameState = 'gameOver';
        this.playSound(150, 1, 'sawtooth');
        this.showMessage('💥 Game Over!', 
            `Your cities were destroyed!<br>Score: ${this.score}<br>Intercepts: ${this.intercepts}`, 
            '🔄 Try Again');
        this.showUI(); // Show UI in game over
    }
    
    victory() {
        this.gameState = 'victory';
        this.playSound(440, 0.5, 'sine');
        this.playSound(550, 0.5, 'sine');
        this.showMessage('🎉 Victory!', 
            `You successfully defended the cities!<br>Score: ${this.score}<br>Perfect intercepts: ${this.intercepts}`, 
            '🎯 Play Again');
        this.showUI(); // Show UI in victory
    }
    
    showVictoryWithShare() {
        this.gameState = 'victory';
        this.playSound(440, 0.5, 'sine');
        this.playSound(550, 0.5, 'sine');
        this.showMessageWithShare('🎉 Victory!', 
            `You successfully defended the cities!<br>Score: ${this.score}<br>Perfect intercepts: ${this.intercepts}`, 
            '🎯 Play Again');
        this.showUI(); // Show UI in victory
    }
    
    showMessage(title, message, buttonText = '🎯 TAP TO START') {
        this.gameMessage.classList.remove('hidden');
        this.gameMessage.querySelector('h2').textContent = title;
        this.gameMessage.querySelector('#gameInstructions').innerHTML = message;
        this.startBtn.textContent = buttonText;
        
        // Remove share button if it exists
        const existingShareBtn = this.gameMessage.querySelector('.share-button');
        if (existingShareBtn) {
            existingShareBtn.remove();
        }
    }
    
    showMessageWithShare(title, message, buttonText = '🎯 TAP TO START') {
        this.gameMessage.classList.remove('hidden');
        this.gameMessage.querySelector('h2').textContent = title;
        this.gameMessage.querySelector('#gameInstructions').innerHTML = message;
        this.startBtn.textContent = buttonText;
        
        // Remove existing share button if any
        const existingShareBtn = this.gameMessage.querySelector('.share-button');
        if (existingShareBtn) {
            existingShareBtn.remove();
        }
        
        // Add WhatsApp share button
        const shareBtn = document.createElement('button');
        shareBtn.className = 'share-button';
        shareBtn.innerHTML = '📱 Share on WhatsApp';
        shareBtn.onclick = () => this.shareToWhatsApp();
        
        // Insert share button before the play again button
        this.startBtn.parentNode.insertBefore(shareBtn, this.startBtn);
    }
    
    shareToWhatsApp() {
        const message = `🎮 I just won Iron DOM! 🚀\n` +
                       `🎯 Score: ${this.score}\n` +
                       `💥 Perfect Intercepts: ${this.intercepts}/20\n` +
                       `🏆 Successfully defended all cities!\n\n` +
                       `Try to beat my score! 🔥\n` +
                       `Play here: https://aloniter.github.io/Iron_Dom_mobile/`;
        
        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
        
        // Open WhatsApp in new window/tab
        window.open(whatsappUrl, '_blank');
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