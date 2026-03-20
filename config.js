// Iron Dome Game - Centralized Config System
// All visual/layout values in one place. Debug panel reads/writes to this.

const defaultConfig = {
    world: {
        groundYFactor: 0.72,
        baselineLiftMin: 24,
        baselineLiftMax: 36,
        baselineLiftFactor: 0.04,
        safeAreaOffset: 0
    },
    launcher: {
        xOffset: 0,
        yOffset: 24,
        scaleMin: 74,
        scaleFactor: 0.11,
        scaleMaxMobile: 92,
        scaleMaxDesktop: 108,
        aspectRatio: 1.1,
        muzzleYFactor: 0.18,
        visible: true
    },
    people: {
        width: 30,
        height: 40,
        yOffset: 25,
        speedMin: 20,
        speedMax: 50,
        visible: true
    },
    enemyMissile: {
        width: 30,
        height: 60,
        collisionRadius: 40,
        spawnYOffset: 0,
        trailVisible: true,
        visible: true
    },
    interceptor: {
        width: 30,
        height: 60,
        speed: 6,
        launchOffsetX: 0,
        launchOffsetY: 0,
        trailVisible: true,
        davidStarsVisible: true,
        davidStarSize: 5,
        davidStarFade: 700,
        visible: true
    },
    effects: {
        explosionGlowSize: 50,
        shockwaveMaxRadius: 80,
        shockwaveSpeed: 150,
        spriteExplosionRadius: 18,
        spriteExplosionDuration: 500,
        screenShakeIntensity: 1.0,
        explosionsVisible: true,
        shockwavesVisible: true,
        spriteExplosionsVisible: true,
        smokeVisible: true,
        sparksVisible: true,
        debrisVisible: true
    },
    background: {
        yOffset: 0,
        visible: true
    },
    hud: {
        score: { xOffset: 0, yOffset: 0, scale: 1.0, visible: true },
        combo: { xOffset: 0, yOffset: 0, scale: 1.0, visible: false }
    },
    debug: {
        showBaseline: false,
        showAnchors: false,
        showHitboxes: false,
        showSpawnPoints: false,
        showSafeArea: false
    }
};

class ConfigManager {
    constructor() {
        this._config = this._deepClone(defaultConfig);
        this._loadFromStorage();
    }

    get(path) {
        return this._getByPath(this._config, path);
    }

    set(path, value) {
        this._setByPath(this._config, path, value);
    }

    reset() {
        this._config = this._deepClone(defaultConfig);
        this._removeStorage();
    }

    resetPaths(paths) {
        for (const path of paths) {
            const defaultVal = this._getByPath(defaultConfig, path);
            if (defaultVal !== undefined) {
                this._setByPath(this._config, path, JSON.parse(JSON.stringify(defaultVal)));
            }
        }
    }

    save() {
        try {
            localStorage.setItem('irondome_debug_config', JSON.stringify(this._config));
            return true;
        } catch (e) {
            console.warn('ConfigManager: Failed to save', e);
            return false;
        }
    }

    exportJSON() {
        return JSON.stringify(this._config, null, 2);
    }

    importJSON(str) {
        try {
            const parsed = JSON.parse(str);
            if (typeof parsed !== 'object' || parsed === null) {
                throw new Error('Invalid config: not an object');
            }
            this._deepMerge(this._config, parsed);
            return true;
        } catch (e) {
            console.warn('ConfigManager: Import failed', e);
            return false;
        }
    }

    getAll() {
        return this._deepClone(this._config);
    }

    _loadFromStorage() {
        try {
            const stored = localStorage.getItem('irondome_debug_config');
            if (stored) {
                const parsed = JSON.parse(stored);
                if (typeof parsed === 'object' && parsed !== null) {
                    this._deepMerge(this._config, parsed);
                }
            }
        } catch (e) {
            console.warn('ConfigManager: Failed to load from storage', e);
        }
    }

    _removeStorage() {
        try {
            localStorage.removeItem('irondome_debug_config');
        } catch (e) {
            // Ignore
        }
    }

    _getByPath(obj, path) {
        const parts = path.split('.');
        let current = obj;
        for (const part of parts) {
            if (current == null || typeof current !== 'object') return undefined;
            current = current[part];
        }
        return current;
    }

    _setByPath(obj, path, value) {
        const parts = path.split('.');
        let current = obj;
        for (let i = 0; i < parts.length - 1; i++) {
            if (current[parts[i]] == null || typeof current[parts[i]] !== 'object') {
                current[parts[i]] = {};
            }
            current = current[parts[i]];
        }
        current[parts[parts.length - 1]] = value;
    }

    _deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    _deepMerge(target, source) {
        for (const key of Object.keys(source)) {
            if (
                source[key] !== null &&
                typeof source[key] === 'object' &&
                !Array.isArray(source[key]) &&
                target[key] !== null &&
                typeof target[key] === 'object' &&
                !Array.isArray(target[key])
            ) {
                this._deepMerge(target[key], source[key]);
            } else {
                target[key] = source[key];
            }
        }
    }
}

window.GameConfig = new ConfigManager();
