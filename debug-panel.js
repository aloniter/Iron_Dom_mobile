// Iron Dome Game - Debug Tuning Panel
// Schema-driven HTML overlay panel for live visual tuning

(function () {
    'use strict';

    const PANEL_SCHEMA = [
        {
            section: 'World / Ground',
            controls: [
                { path: 'world.groundYFactor', label: 'Ground Y Factor', type: 'range', min: 0.5, max: 0.95, step: 0.01 },
                { path: 'world.baselineLiftMin', label: 'Baseline Lift Min', type: 'range', min: 0, max: 60, step: 1 },
                { path: 'world.baselineLiftMax', label: 'Baseline Lift Max', type: 'range', min: 0, max: 80, step: 1 },
                { path: 'world.baselineLiftFactor', label: 'Baseline Lift Factor', type: 'range', min: 0, max: 0.1, step: 0.005 },
                { path: 'world.safeAreaOffset', label: 'Safe Area Offset', type: 'range', min: -50, max: 50, step: 1 }
            ]
        },
        {
            section: 'Launcher',
            controls: [
                { path: 'launcher.xOffset', label: 'X Offset', type: 'range', min: -200, max: 200, step: 1 },
                { path: 'launcher.yOffset', label: 'Y Offset', type: 'range', min: -100, max: 100, step: 1 },
                { path: 'launcher.scaleMin', label: 'Min Height', type: 'range', min: 30, max: 150, step: 1 },
                { path: 'launcher.scaleFactor', label: 'Scale Factor', type: 'range', min: 0.05, max: 0.25, step: 0.005 },
                { path: 'launcher.scaleMaxMobile', label: 'Max Mobile', type: 'range', min: 50, max: 200, step: 1 },
                { path: 'launcher.scaleMaxDesktop', label: 'Max Desktop', type: 'range', min: 50, max: 200, step: 1 },
                { path: 'launcher.muzzleYFactor', label: 'Muzzle Y Factor', type: 'range', min: 0, max: 0.5, step: 0.01 },
                { path: 'launcher.visible', label: 'Visible', type: 'toggle' }
            ]
        },
        {
            section: 'People (NPCs)',
            controls: [
                { path: 'people.width', label: 'Width', type: 'range', min: 10, max: 80, step: 1 },
                { path: 'people.height', label: 'Height', type: 'range', min: 15, max: 100, step: 1 },
                { path: 'people.yOffset', label: 'Y Offset', type: 'range', min: -60, max: 60, step: 1 },
                { path: 'people.speedMin', label: 'Speed Min', type: 'range', min: 5, max: 100, step: 1 },
                { path: 'people.speedMax', label: 'Speed Max', type: 'range', min: 10, max: 150, step: 1 },
                { path: 'people.visible', label: 'Visible', type: 'toggle' }
            ]
        },
        {
            section: 'Enemy Missiles',
            controls: [
                { path: 'enemyMissile.width', label: 'Width', type: 'range', min: 10, max: 80, step: 1 },
                { path: 'enemyMissile.height', label: 'Height', type: 'range', min: 20, max: 120, step: 1 },
                { path: 'enemyMissile.collisionRadius', label: 'Collision Radius', type: 'range', min: 10, max: 100, step: 1 },
                { path: 'enemyMissile.spawnYOffset', label: 'Spawn Y Offset', type: 'range', min: -50, max: 100, step: 1 },
                { path: 'enemyMissile.trailVisible', label: 'Trail Visible', type: 'toggle' },
                { path: 'enemyMissile.visible', label: 'Visible', type: 'toggle' }
            ]
        },
        {
            section: 'Interceptors',
            controls: [
                { path: 'interceptor.width', label: 'Width', type: 'range', min: 10, max: 80, step: 1 },
                { path: 'interceptor.height', label: 'Height', type: 'range', min: 20, max: 120, step: 1 },
                { path: 'interceptor.speed', label: 'Speed', type: 'range', min: 1, max: 20, step: 0.5 },
                { path: 'interceptor.launchOffsetX', label: 'Launch Offset X', type: 'range', min: -50, max: 50, step: 1 },
                { path: 'interceptor.launchOffsetY', label: 'Launch Offset Y', type: 'range', min: -50, max: 50, step: 1 },
                { path: 'interceptor.trailVisible', label: 'Trail Visible', type: 'toggle' },
                { path: 'interceptor.davidStarsVisible', label: 'David Stars', type: 'toggle' },
                { path: 'interceptor.davidStarSize', label: 'Star Size', type: 'range', min: 2, max: 15, step: 0.5 },
                { path: 'interceptor.davidStarFade', label: 'Star Fade (ms)', type: 'range', min: 100, max: 2000, step: 50 },
                { path: 'interceptor.visible', label: 'Visible', type: 'toggle' }
            ]
        },
        {
            section: 'Effects',
            controls: [
                { path: 'effects.explosionGlowSize', label: 'Explosion Glow', type: 'range', min: 10, max: 150, step: 1 },
                { path: 'effects.shockwaveMaxRadius', label: 'Shockwave Max', type: 'range', min: 20, max: 200, step: 1 },
                { path: 'effects.shockwaveSpeed', label: 'Shockwave Speed', type: 'range', min: 50, max: 400, step: 10 },
                { path: 'effects.spriteExplosionRadius', label: 'Star Explosion R', type: 'range', min: 5, max: 60, step: 1 },
                { path: 'effects.spriteExplosionDuration', label: 'Star Duration (ms)', type: 'range', min: 50, max: 2000, step: 50 },
                { path: 'effects.screenShakeIntensity', label: 'Screen Shake', type: 'range', min: 0, max: 3, step: 0.1 },
                { path: 'effects.explosionsVisible', label: 'Explosions', type: 'toggle' },
                { path: 'effects.shockwavesVisible', label: 'Shockwaves', type: 'toggle' },
                { path: 'effects.spriteExplosionsVisible', label: 'Star Explosions', type: 'toggle' },
                { path: 'effects.smokeVisible', label: 'Smoke', type: 'toggle' },
                { path: 'effects.sparksVisible', label: 'Sparks', type: 'toggle' },
                { path: 'effects.debrisVisible', label: 'Debris', type: 'toggle' }
            ]
        },
        {
            section: 'Background',
            controls: [
                { path: 'background.yOffset', label: 'Y Offset', type: 'range', min: -100, max: 100, step: 1 },
                { path: 'background.visible', label: 'Visible', type: 'toggle' }
            ]
        },
        {
            section: 'HUD',
            controls: [
                { path: 'hud.score.xOffset', label: 'Score X Offset', type: 'range', min: -100, max: 100, step: 1 },
                { path: 'hud.score.yOffset', label: 'Score Y Offset', type: 'range', min: -100, max: 100, step: 1 },
                { path: 'hud.score.scale', label: 'Score Scale', type: 'range', min: 0.5, max: 2.0, step: 0.05 },
                { path: 'hud.score.visible', label: 'Score Visible', type: 'toggle' },
                { path: 'hud.combo.xOffset', label: 'Combo X Offset', type: 'range', min: -200, max: 200, step: 1 },
                { path: 'hud.combo.yOffset', label: 'Combo Y Offset', type: 'range', min: -100, max: 100, step: 1 },
                { path: 'hud.combo.scale', label: 'Combo Scale', type: 'range', min: 0.5, max: 2.0, step: 0.05 },
                { path: 'hud.combo.visible', label: 'Combo Visible', type: 'toggle' }
            ]
        },
        {
            section: 'Debug Overlays',
            controls: [
                { path: 'debug.showBaseline', label: 'Show Baseline', type: 'toggle' },
                { path: 'debug.showAnchors', label: 'Show Anchors', type: 'toggle' },
                { path: 'debug.showHitboxes', label: 'Show Hitboxes', type: 'toggle' },
                { path: 'debug.showSpawnPoints', label: 'Show Spawn Points', type: 'toggle' },
                { path: 'debug.showSafeArea', label: 'Show Safe Area', type: 'toggle' }
            ]
        }
    ];

    const cfg = window.GameConfig;
    if (!cfg) {
        console.warn('DebugPanel: GameConfig not found. Make sure config.js loads first.');
        return;
    }

    let panelEl = null;
    let pillEl = null;
    let toastEl = null;
    let importModal = null;
    let isOpen = false;
    const controlRefs = [];

    function init() {
        createPanel();
        createPill();
        createToast();
        createImportModal();
        bindGestures();
    }

    // ── Panel DOM ──

    function createPanel() {
        panelEl = document.createElement('div');
        panelEl.className = 'debug-panel';
        panelEl.addEventListener('touchstart', stopProp, { passive: true });
        panelEl.addEventListener('touchmove', stopProp, { passive: true });
        panelEl.addEventListener('mousedown', stopProp);

        // Header
        const header = document.createElement('div');
        header.className = 'debug-panel-header';
        header.innerHTML = '<span class="debug-panel-title">Debug Tuning</span>';
        const closeBtn = document.createElement('button');
        closeBtn.className = 'debug-panel-close';
        closeBtn.textContent = '\u2715';
        closeBtn.addEventListener('click', () => closePanel());
        header.appendChild(closeBtn);
        panelEl.appendChild(header);

        // Body
        const body = document.createElement('div');
        body.className = 'debug-panel-body';

        PANEL_SCHEMA.forEach(section => {
            const sectionEl = document.createElement('div');
            sectionEl.className = 'debug-section';

            const sectionHeader = document.createElement('div');
            sectionHeader.className = 'debug-section-header';
            sectionHeader.innerHTML = `<span class="debug-section-title">${section.section}</span><span class="debug-section-header-right"><button class="debug-section-reset" title="Reset this section">\u21BA</button><span class="debug-section-arrow">\u25B6</span></span>`;
            const resetBtn = sectionHeader.querySelector('.debug-section-reset');
            const sectionPaths = section.controls.map(c => c.path);
            resetBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                cfg.resetPaths(sectionPaths);
                refreshControlsForPaths(sectionPaths);
                showToast(`${section.section} reset`);
            });
            sectionHeader.addEventListener('click', (e) => {
                if (e.target.closest('.debug-section-reset')) return;
                sectionEl.classList.toggle('expanded');
            });
            sectionEl.appendChild(sectionHeader);

            const sectionBody = document.createElement('div');
            sectionBody.className = 'debug-section-body';
            const content = document.createElement('div');
            content.className = 'debug-section-content';

            section.controls.forEach(ctrl => {
                if (ctrl.type === 'range') {
                    content.appendChild(createRangeControl(ctrl));
                } else if (ctrl.type === 'toggle') {
                    content.appendChild(createToggleControl(ctrl));
                }
            });

            sectionBody.appendChild(content);
            sectionEl.appendChild(sectionBody);
            body.appendChild(sectionEl);
        });

        panelEl.appendChild(body);

        // Action bar
        const actions = document.createElement('div');
        actions.className = 'debug-actions';
        actions.innerHTML = `
            <button class="debug-action-btn save">Save</button>
            <button class="debug-action-btn reset">Reset All</button>
            <button class="debug-action-btn">Export</button>
            <button class="debug-action-btn">Import</button>
        `;
        const btns = actions.querySelectorAll('button');
        btns[0].addEventListener('click', handleSave);
        btns[1].addEventListener('click', handleReset);
        btns[2].addEventListener('click', handleExport);
        btns[3].addEventListener('click', handleImport);
        panelEl.appendChild(actions);

        document.body.appendChild(panelEl);
    }

    function createRangeControl(ctrl) {
        const wrapper = document.createElement('div');
        wrapper.className = 'debug-control';

        const currentValue = cfg.get(ctrl.path);
        const displayValue = formatValue(currentValue, ctrl.step);

        wrapper.innerHTML = `
            <div class="debug-control-label">
                <span class="debug-control-name">${ctrl.label}</span>
                <input type="number" class="debug-control-value" value="${displayValue}" step="${ctrl.step}" min="${ctrl.min}" max="${ctrl.max}">
            </div>
            <input type="range" class="debug-slider" min="${ctrl.min}" max="${ctrl.max}" step="${ctrl.step}" value="${currentValue}">
        `;

        const slider = wrapper.querySelector('.debug-slider');
        const numInput = wrapper.querySelector('.debug-control-value');

        slider.addEventListener('input', () => {
            const val = parseFloat(slider.value);
            cfg.set(ctrl.path, val);
            numInput.value = formatValue(val, ctrl.step);
        });

        numInput.addEventListener('change', () => {
            let val = parseFloat(numInput.value);
            if (!isFinite(val)) val = cfg.get(ctrl.path);
            val = Math.max(ctrl.min, Math.min(ctrl.max, val));
            cfg.set(ctrl.path, val);
            slider.value = val;
            numInput.value = formatValue(val, ctrl.step);
        });

        controlRefs.push({ path: ctrl.path, slider, numInput, ctrl });
        return wrapper;
    }

    function createToggleControl(ctrl) {
        const wrapper = document.createElement('div');
        wrapper.className = 'debug-toggle-row';

        const currentValue = cfg.get(ctrl.path);
        const id = 'dbg_' + ctrl.path.replace(/\./g, '_');

        wrapper.innerHTML = `
            <span class="debug-toggle-label">${ctrl.label}</span>
            <label class="debug-toggle">
                <input type="checkbox" id="${id}" ${currentValue ? 'checked' : ''}>
                <span class="debug-toggle-track"></span>
                <span class="debug-toggle-thumb"></span>
            </label>
        `;

        const checkbox = wrapper.querySelector('input');
        checkbox.addEventListener('change', () => {
            cfg.set(ctrl.path, checkbox.checked);
        });

        controlRefs.push({ path: ctrl.path, checkbox, ctrl });
        return wrapper;
    }

    function refreshControls() {
        controlRefs.forEach(ref => {
            const val = cfg.get(ref.path);
            if (ref.slider) {
                ref.slider.value = val;
                ref.numInput.value = formatValue(val, ref.ctrl.step);
            }
            if (ref.checkbox) {
                ref.checkbox.checked = !!val;
            }
        });
    }

    function refreshControlsForPaths(paths) {
        const pathSet = new Set(paths);
        controlRefs.forEach(ref => {
            if (!pathSet.has(ref.path)) return;
            const val = cfg.get(ref.path);
            if (ref.slider) {
                ref.slider.value = val;
                ref.numInput.value = formatValue(val, ref.ctrl.step);
            }
            if (ref.checkbox) {
                ref.checkbox.checked = !!val;
            }
        });
    }

    function formatValue(val, step) {
        if (step >= 1) return String(Math.round(val));
        const decimals = String(step).split('.')[1]?.length || 2;
        return val.toFixed(decimals);
    }

    // ── Pill ──

    function createPill() {
        pillEl = document.createElement('div');
        pillEl.className = 'debug-pill';
        pillEl.textContent = '\u2699';
        pillEl.addEventListener('click', (e) => {
            e.stopPropagation();
            openPanel();
        });
        document.body.appendChild(pillEl);
    }

    // ── Toast ──

    function createToast() {
        toastEl = document.createElement('div');
        toastEl.className = 'debug-toast';
        document.body.appendChild(toastEl);
    }

    function showToast(msg) {
        toastEl.textContent = msg;
        toastEl.classList.add('show');
        setTimeout(() => toastEl.classList.remove('show'), 1500);
    }

    // ── Import Modal ──

    function createImportModal() {
        importModal = document.createElement('div');
        importModal.className = 'debug-import-modal';
        importModal.innerHTML = `
            <div class="debug-import-content">
                <h3>Import Config JSON</h3>
                <textarea class="debug-import-textarea" placeholder="Paste config JSON here..."></textarea>
                <div class="debug-import-buttons">
                    <button class="import-cancel">Cancel</button>
                    <button class="import-confirm">Import</button>
                </div>
            </div>
        `;
        const textarea = importModal.querySelector('textarea');
        importModal.querySelector('.import-cancel').addEventListener('click', () => {
            importModal.classList.remove('open');
        });
        importModal.querySelector('.import-confirm').addEventListener('click', () => {
            const success = cfg.importJSON(textarea.value);
            if (success) {
                refreshControls();
                showToast('Config imported');
            } else {
                showToast('Invalid JSON');
            }
            importModal.classList.remove('open');
            textarea.value = '';
        });
        importModal.addEventListener('click', (e) => {
            if (e.target === importModal) importModal.classList.remove('open');
        });
        document.body.appendChild(importModal);
    }

    // ── Open / Close ──

    function openPanel() {
        isOpen = true;
        refreshControls();
        panelEl.classList.add('open');
        pillEl.classList.remove('visible');
    }

    function closePanel() {
        isOpen = false;
        panelEl.classList.remove('open');
        pillEl.classList.add('visible');
    }

    // ── Gestures ──

    function bindGestures() {
        // Triple-tap top-left corner (100x100px zone)
        let tapCount = 0;
        let tapTimer = null;
        const TAP_ZONE = 100;
        const TAP_TIMEOUT = 800;

        document.addEventListener('touchend', (e) => {
            if (isOpen) return;
            const touch = e.changedTouches[0];
            if (!touch || touch.clientX > TAP_ZONE || touch.clientY > TAP_ZONE) {
                tapCount = 0;
                return;
            }
            tapCount++;
            clearTimeout(tapTimer);
            if (tapCount >= 3) {
                tapCount = 0;
                openPanel();
                return;
            }
            tapTimer = setTimeout(() => { tapCount = 0; }, TAP_TIMEOUT);
        }, { passive: true });

        // Ctrl+D for desktop
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'd') {
                e.preventDefault();
                if (isOpen) closePanel(); else openPanel();
            }
        });
    }

    // ── Action handlers ──

    function handleSave() {
        cfg.save();
        showToast('Config saved');
    }

    function handleReset() {
        cfg.reset();
        refreshControls();
        showToast('Reset to defaults');
    }

    function handleExport() {
        const json = cfg.exportJSON();
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(json).then(() => {
                showToast('JSON copied to clipboard');
            }).catch(() => {
                fallbackCopy(json);
            });
        } else {
            fallbackCopy(json);
        }
    }

    function fallbackCopy(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.cssText = 'position:fixed;left:-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            showToast('JSON copied to clipboard');
        } catch (e) {
            showToast('Copy failed - use Export in console');
            console.log('Config JSON:', text);
        }
        document.body.removeChild(textarea);
    }

    function handleImport() {
        importModal.classList.add('open');
        importModal.querySelector('textarea').focus();
    }

    function stopProp(e) {
        e.stopPropagation();
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
