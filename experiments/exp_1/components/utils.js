// disables next btn w/ countdown — call in on_load and on_page_change
function lockInstructionsNext(secs) {
    var btn = document.getElementById('jspsych-instructions-next');
    if (!btn) return;
    btn.disabled = true;
    var remaining = secs;
    btn.textContent = `Next (${remaining}s)`;
    var timer = setInterval(function() {
        remaining--;
        if (remaining > 0) {
            btn.textContent = `Next (${remaining}s)`;
        } else {
            clearInterval(timer);
            btn.disabled = false;
            btn.textContent = 'Next';
        }
    }, 1000);
}

function logToBrowser(ctx, val) {
    if (VERBOSE) console.log('\t', ctx, ':', val);
}

// fills slider track up to current value
function updateSliderGradient(slider, color) {
    var c = color || 'var(--accent)';
    var pct = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
    slider.style.background =
        `linear-gradient(to right, ${c} 0%, ${c} ${pct}%, var(--line) ${pct}%, var(--line) 100%)`;
}

// prefix for datapipe filenames
function getFilePrefix(jsPsych) {
    var d = jsPsych.data.dataProperties;
    var id = d.prolificID || d.subjectID;
    var prefix = (TESTING_MODE ? 'DEBUG_' : '');
    return prefix + d.sessionTimestamp + '_' + id;
}

function checkMobile() {
    var mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
        || window.innerWidth < 768;
    if (mobile) {
        document.body.style.fontFamily = 'Helvetica Neue, Arial, sans-serif';
        document.body.innerHTML = `
            <div style='max-width:500px; margin:15vh auto; text-align:center; padding:32px;
                background:white; border-radius:10px; box-shadow:0 4px 16px rgba(0,0,0,0.1);'>
                <p style='font-size:20px; font-weight:600; color:#333;'>Desktop required</p>
                <p style='font-size:16px; color:#666;'>Please complete this study on a desktop or laptop.
                Return this study on Prolific and try again on a desktop.</p>
            </div>`;
        window.onbeforeunload = null;
        return true;
    }
    return false;
}

// always active — not gated by TESTING_MODE
function applyFullscreenOverlay() {
    var overlay = document.createElement('div');
    overlay.id = 'fullscreen-overlay';
    overlay.style.display = 'none';
    overlay.innerHTML = `
        <div class='fullscreen-overlay-box'>
            <p>Please return to fullscreen to continue.</p>
            <button class='btn' onclick="document.documentElement.requestFullscreen()">Return to fullscreen</button>
        </div>`;
    document.body.appendChild(overlay);
    document.addEventListener('fullscreenchange', function() {
        overlay.style.display = document.fullscreenElement ? 'none' : 'flex';
    });
}

function applyProductionProtections(jsPsych) {
    document.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('keydown', function(e) {
        if (e.key === 'F12') { e.preventDefault(); return; }
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && 'ijcIJC'.includes(e.key)) { e.preventDefault(); return; }
        if ((e.ctrlKey || e.metaKey) && 'uU'.includes(e.key)) { e.preventDefault(); return; }
    });
    ['copy', 'cut', 'paste'].forEach(evt =>
        document.addEventListener(evt, e => e.preventDefault()));

    // idle timeout
    var lastActivity = Date.now();
    ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'].forEach(evt =>
        document.addEventListener(evt, () => { lastActivity = Date.now(); }, { passive: true }));
    setInterval(function() {
        if (Date.now() - lastActivity > IDLE_TIMEOUT_MS) {
            window.onbeforeunload = null;
            document.body.innerHTML = `
                <div style='font-family:Helvetica Neue,Arial,sans-serif; text-align:center;
                    margin-top:15vh; color:#333;'>
                    <p style='font-size:22px; font-weight:600;'>Your session timed out.</p>
                    <p style='font-size:16px; color:#666;'>You were inactive for more than 5 minutes.
                    Please return this study on Prolific.</p>
                </div>`;
        }
    }, 30000);
}

// image path helpers
// designs are named alien_01..alien_10 (zero-padded). per participant, 8 of the 10
// learning designs are sampled and assigned to the 8 graph nodes via
// window.nodeDesignMap (built in experiment.js). the remaining 2 designs are
// held out for the transfer phase. alien_00_* is a featureless silhouette used
// for transfer-trial friends.
function alienImg(designNum, speciesInt) {
    var color = speciesInt === 0 ? 'green' : 'orange';
    return `stimuli/aliens/alien_${String(designNum).padStart(2, '0')}_${color}.png`;
}
function speciesImg(nodeIdx, speciesInt) {
    // route node index → design number via per-participant map
    var designNum = (window.nodeDesignMap && window.nodeDesignMap[nodeIdx] != null)
        ? window.nodeDesignMap[nodeIdx]
        : nodeIdx + 1;  // fallback for any legacy caller
    return alienImg(designNum, speciesInt);
}
// featureless friend silhouette — used in transfer trial so the friends cue
// conveys only food, not species color
var FEATURELESS_FRIEND_IMG = 'stimuli/aliens/alien_00_green.png';

function behaviorIcon(behaviorInt, behaviorLabels) {
    return behaviorLabels[behaviorInt] === 'glorp' ? 'stimuli/food/glorp.svg' : 'stimuli/food/flim.svg';
}
