// main experiment — receives graphData (JSON) and condition string
function initStudy(graphData, condition) {
    if (checkMobile()) return;

    // ── dev toolbar (testing mode only) ───────────────────────────
    if (TESTING_MODE) {
        window._devGraphData = graphData;
        window._devCondition  = condition;
    }
    var _devStart = (TESTING_MODE && window._devStartPhase != null) ? window._devStartPhase : 0;

    if (TESTING_MODE) {
        document.body.classList.add('dev-mode');
        var _toolbar = document.getElementById('dev-toolbar');
        if (!_toolbar) {
            _toolbar = document.createElement('div');
            _toolbar.id = 'dev-toolbar';
            document.body.appendChild(_toolbar);
        }
        _toolbar.innerHTML = `
            <div style='display:flex; align-items:center; gap:10px; padding:5px 12px;
                background:#1a1a1a; color:#eee; font-family:monospace; font-size:12px;
                border-bottom:2px solid #ee5e33;'>
                <span style='color:#ee5e33; font-weight:bold; letter-spacing:1px;'>DEV</span>
                <label style='color:#aaa;'>jump to:</label>
                <select id='dev-phase-select' style='background:#2d2d2d; color:#eee;
                    border:1px solid #555; padding:2px 6px; border-radius:3px; font-family:monospace; font-size:12px;'>
                    <option value='0'>Full run</option>
                    <option value='1'>Instructions</option>
                    <option value='2'>Phase 1 — Learning</option>
                    <option value='3'>Phase 2 — Validation</option>
                    <option value='4'>Phase 3 — Transfer</option>
                    <option value='5'>Phase 4 — Strategy</option>
                    <option value='6'>Phase 5 — Demographics</option>
                </select>
                <button id='dev-jump-btn' style='background:#333; color:#eee; border:1px solid #666;
                    padding:2px 10px; border-radius:3px; cursor:pointer; font-family:monospace; font-size:12px;'>
                    ↩ restart
                </button>
                <span style='color:#666; margin-left:6px;'>
                    cond: <span style='color:#1fb092;'>${condition}</span>
                    &nbsp;|&nbsp; graph: <span style='color:#1fb092;'>${graphData.graph_id}</span>
                </span>
            </div>`;
        document.getElementById('dev-phase-select').value = String(_devStart);
        document.getElementById('dev-jump-btn').addEventListener('click', function() {
            var target = parseInt(document.getElementById('dev-phase-select').value);
            window._devStartPhase = target;
            Array.from(document.body.children).forEach(function(c) {
                if (c.id !== 'dev-toolbar') c.remove();
            });
            document.body.classList.remove('dev-mode');
            initStudy(window._devGraphData, window._devCondition);
        });
        document.body.style.paddingTop = '32px';
    }

    // ── phase stepper (persistent fixed header) ───────────────────
    var PHASES = [
        { key: 'intro',    label: 'Intro' },
        { key: 'learning', label: 'Learning' },
        { key: 'memory',   label: 'Memory' },
        { key: 'transfer', label: 'New aliens' },
    ];

    var _frameTop = document.getElementById('frame-top');
    if (!_frameTop) {
        _frameTop = document.createElement('div');
        _frameTop.id = 'frame-top';
        _frameTop.className = 'frame-top';
        document.body.appendChild(_frameTop);
    }

    function renderStepper(activeKey, subInfo) {
        var existingFill = document.getElementById('progress-fill');
        var pct = existingFill ? parseFloat(existingFill.style.width) / 100 : 0;

        var stepsHtml = PHASES.map(function(p, i) {
            var activeIdx = PHASES.findIndex(function(x) { return x.key === activeKey; });
            var isActive  = i === activeIdx;
            var isDone    = i < activeIdx;
            var cls = (isActive ? ' active' : '') + (isDone ? ' done' : '');

            var subHtml = '';
            if (isActive && subInfo) {
                var pips = Array.from({ length: subInfo.total }, function(_, si) {
                    var pc = si < subInfo.activeIdx ? ' done' : si === subInfo.activeIdx ? ' now' : '';
                    return `<div class='sub-pip${pc}'></div>`;
                }).join('');
                subHtml = `<div class='sub-steps'>${pips}</div><span class='sub-label'>${subInfo.label}</span>`;
            }

            return (i > 0 ? "<div class='step-sep'></div>" : '') +
                `<div class='step${cls}'><span class='step-dot'></span><span>${p.label}</span>${subHtml}</div>`;
        }).join('');

        _frameTop.innerHTML = `
            <div class='stepper'>
                <div class='steps'>${stepsHtml}</div>
            </div>
            <div class='progress-track'>
                <div class='progress-fill' id='progress-fill' style='width:${pct * 100}%'></div>
            </div>`;
    }

    renderStepper('intro');

    function setPhase(key, subInfo) {
        renderStepper(key, subInfo || null);
    }

    // ── jsPsych init ──────────────────────────────────────────────
    var urlParams  = new URLSearchParams(window.location.search);
    var prolificID = urlParams.get('PROLIFIC_PID') || '';
    var studyID    = urlParams.get('STUDY_ID')     || '';
    var sessionID  = urlParams.get('SESSION_ID')   || '';

    var jsPsych = initJsPsych({
        show_progress_bar: false,
        auto_update_progress_bar: false
    });

    var subjectID = jsPsych.randomization.randomID(10);
    jsPsych.data.addProperties({ subjectID, prolificID, studyID, sessionID });
    jsPsych.data.addProperties({ startTime: Date.now() });

    var _now = new Date();
    var _ts = [_now.getFullYear(), String(_now.getMonth()+1).padStart(2,'0'), String(_now.getDate()).padStart(2,'0')].join('') +
              '_' + [String(_now.getHours()).padStart(2,'0'), String(_now.getMinutes()).padStart(2,'0'), String(_now.getSeconds()).padStart(2,'0')].join('');
    jsPsych.data.addProperties({ sessionTimestamp: _ts });

    applyFullscreenOverlay();
    if (!TESTING_MODE) applyProductionProtections(jsPsych);

    // tab visibility log
    jsPsych.data.addProperties({ visibilityChanges: [] });
    document.addEventListener('visibilitychange', function() {
        jsPsych.data.dataProperties.visibilityChanges.push({
            hidden: document.hidden, timestamp: Date.now()
        });
    });

    // ── participant-level randomization ───────────────────────────
    var condData = condition === 'homophily'
        ? graphData.homophily_condition
        : graphData.category_condition;
    var species  = condData.group;
    var behavior = condData.behavior;
    var edges    = graphData.edges;

    var shuffledNames = jsPsych.randomization.shuffle([...LEARNING_NAMES]);
    var nameMapping   = {};
    shuffledNames.forEach(function(name, i) { nameMapping[i] = name; });

    var behaviorSwap   = jsPsych.randomization.sampleWithoutReplacement([0, 1], 1)[0];
    var behaviorLabels = behaviorSwap === 0
        ? { 0: 'glorp', 1: 'flim' }
        : { 0: 'flim',  1: 'glorp' };

    var sessionData = {
        participant_id: prolificID || subjectID,
        session_id:     subjectID,
        condition:      condition,
        graph_id:       graphData.graph_id,
        start_time:     new Date().toISOString(),
        end_time:       null,
        config: {
            transfer_friends_revealed:  TRANSFER_FRIENDS_REVEALED,
            learning_trial_onset_ms:    LEARNING_ONSET_MS,
            learning_trial_reveal_ms:   LEARNING_REVEAL_MS,
            learning_runs:              LEARNING_RUNS,
            upside_down_rate:           UPSIDE_DOWN_RATE,
            use_per_individual_marker:  USE_PER_INDIVIDUAL_MARKER,
            num_graphs_available:       NUM_GRAPHS
        },
        stimuli: {
            graph_id:               graphData.graph_id,
            graph_seed:             graphData.seed,
            alien_image_mapping:    Object.fromEntries(Object.entries(nameMapping).map(
                function(_ref) { var node = _ref[0], name = _ref[1]; return [name, speciesImg(parseInt(node), species[node])]; }
            )),
            name_mapping:           Object.fromEntries(Object.entries(nameMapping).map(
                function(_ref) { var node = _ref[0], name = _ref[1]; return ['node_' + node, name]; }
            )),
            species_label_mapping:  { 0: 'green alien', 1: 'orange alien' },
            behavior_label_mapping: behaviorLabels
        },
        phase_1_learning: { trials: [], attention_check_hit_rate: 0 },
        phase_2_validation: { edge_recognition: [], species_recall: [], behavior_recall: [] },
        phase_3_transfer:   { trials: [] },
        phase_4_strategy:   { free_text: '', time_on_screen_ms: 0 },
        phase_5_demographics: {},
        attention_flags: {
            failed_comprehension_retries:       0,
            upside_down_hit_rate:               0,
            below_threshold_edge_recognition:   false,
            below_threshold_species:            false,
            below_threshold_behavior:           false
        }
    };
    jsPsych.data.addProperties({ sessionData });
    logToBrowser('session init', { condition, graphId: graphData.graph_id, nameMapping, behaviorLabels });

    console.log(
        '%c[structural-interaction]', 'font-weight:bold; color:#353633;',
        '\ncondition :', condition,
        '\ngraph     :', graphData.graph_id, '(seed', graphData.seed + ')',
        '\nρ(E→B)    :', condData.rho_EB,
        '\nρ(C→B)    :', condData.rho_CB,
        '\nbehavior labels: 0=' + behaviorLabels[0] + ', 1=' + behaviorLabels[1]
    );


    // ══════════════════════════════════════════════════════════════
    // CONSENT
    // ══════════════════════════════════════════════════════════════
    var consent = {
        type: jsPsychHtmlButtonResponse,
        stimulus: `
            <div class='page-inner'>
                <div class='card card-narrow' style='position:relative;'>
                    <div class='eyebrow'>Welcome!</div>
                    <p class='lead' style='color:var(--ink-2); margin-top:14px;'>
                        In today's study, you'll meet a small group of aliens and learn about their friendships,
                        species, and eating habits. The whole study takes about <strong>10 minutes</strong>.
                    </p>
                    <hr>
                    <p class='muted'>
                        Your participation is completely voluntary, and you may withdraw at any time without penalty.
                        You must be at least 18 years old to participate. There are no known risks associated with this research.
                        Your responses will be kept anonymous — no personally identifying information will be collected or associated with your data.
                    </p>
                    <p class='muted'>
                        If you have questions about this study, please contact us at
                        <a href='mailto:${CONTACT_EMAIL}' style='color:var(--ink);'>${CONTACT_EMAIL}</a>.
                        For questions about your rights as a research participant, please contact the Stanford University Institutional Review Board.
                    </p>
                    <hr>
                    <p class='muted' style='margin-top:4px;'>
                        By clicking below, I confirm that I am 18 or older, have read and understood the information above, and agree to participate.
                    </p>
                    <div style='margin-top:16px;'>
                        <button class='btn btn-lg' id='consent-btn'>I agree — start the study</button>
                    </div>
                </div>
            </div>`,
        choices: [],
        response_ends_trial: false,
        on_load: function() {
            document.getElementById('consent-btn').addEventListener('click', function() {
                document.documentElement.requestFullscreen().catch(function(err) {
                    console.error('fullscreen error:', err.message);
                });
                jsPsych.finishTrial();
            });
        }
    };


    // ══════════════════════════════════════════════════════════════
    // COMPREHENSION CHECK (with retry loop)
    // ══════════════════════════════════════════════════════════════
    var exA = edges[0][0], exB = edges[0][1];
    var exImgA  = speciesImg(exA, species[exA]),   exImgB   = speciesImg(exB, species[exB]);
    var exIconA = behaviorIcon(behavior[exA], behaviorLabels);
    var exIconB = behaviorIcon(behavior[exB], behaviorLabels);
    var exLabelA = behaviorLabels[behavior[exA]], exLabelB = behaviorLabels[behavior[exB]];

    // intro pages (3 pages, paginated w/ 5s read-lock)
    var _introPage = 0;
    var _introSecs = 5;
    var _introReveal = false;
    var _introTimer = null;
    var _introRevealTimer = null;

    function buildIntroHTML(page, secs, revealed) {
        var pages = [
            {
                eyebrow: '01',
                title:   'On an island called Dude, there are 8 aliens',
                body:    'Each alien is either <span style="color:var(--species-green); font-weight:600;">green</span> or <span style="color:var(--species-orange); font-weight:600;">orange</span>',
                figure:  `
                    <div class='intro-figure'>
                        <div class='intro-fig-item'>
                            <div class='alien-img-wrap' style='width:160px; height:160px;'>
                                <img src='stimuli/aliens/alien_1_green.png' class='alien-img' alt=''>
                            </div>
                            <div class='fig-label' style='color:var(--species-green);'>green</div>
                        </div>
                        <div class='intro-or'>or</div>
                        <div class='intro-fig-item'>
                            <div class='alien-img-wrap' style='width:160px; height:160px;'>
                                <img src='stimuli/aliens/alien_1_orange.png' class='alien-img' alt=''>
                            </div>
                            <div class='fig-label' style='color:var(--species-orange);'>orange</div>
                        </div>
                    </div>`
            },
            {
                eyebrow: '02',
                title:   'Each alien eats one of two foods',
                body:    "",
                figure:  `
                    <div class='intro-figure'>
                        <div class='intro-fig-item'>
                            <div style='width:130px; height:130px; display:flex; align-items:center; justify-content:center;'>
                                <img src='stimuli/food/glorp.svg' style='width:96px; height:96px; object-fit:contain;' alt=''>
                            </div>
                            <div class='fig-label'>glorp</div>
                        </div>
                        <div class='intro-or'>or</div>
                        <div class='intro-fig-item'>
                            <div style='width:130px; height:130px; display:flex; align-items:center; justify-content:center;'>
                                <img src='stimuli/food/flim.svg' style='width:96px; height:96px; object-fit:contain;' alt=''>
                            </div>
                            <div class='fig-label'>flim</div>
                        </div>
                    </div>`
            },
            {
                eyebrow: '03',
                title:   'Each trial shows two friends — and what each one eats',
                body:    'For example:',
                figure:  `
                    <div class='learn-stage' style='padding:8px 0 0;'>
                        <div class='learn-frame' style='box-shadow:none;'>
                            <div class='pair'>
                                <div class='alien-slot'>
                                    <div class='alien-img-wrap' style='width:160px; height:160px;'>
                                        <img src='${exImgA}' class='alien-img' alt=''>
                                    </div>
                                    <div class='behavior ${revealed ? 'revealed' : ''}' id='intro-bwrap-a'>
                                        <div class='behavior-plate'>
                                            <img src='${exIconA}' class='behavior-icon' alt='${exLabelA}'>
                                            <span class='behavior-name'>${exLabelA}</span>
                                        </div>
                                    </div>
                                </div>
                                <div class='bond'><div class='bond-line'></div></div>
                                <div class='alien-slot'>
                                    <div class='alien-img-wrap' style='width:160px; height:160px;'>
                                        <img src='${exImgB}' class='alien-img' alt=''>
                                    </div>
                                    <div class='behavior ${revealed ? 'revealed' : ''}' id='intro-bwrap-b'>
                                        <div class='behavior-plate'>
                                            <img src='${exIconB}' class='behavior-icon' alt='${exLabelB}'>
                                            <span class='behavior-name'>${exLabelB}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>`
            }
        ];
        var p = pages[page];
        var dots = pages.map(function(_, i) {
            return `<div class='intro-dot ${i === page ? 'active' : ''}'></div>`;
        }).join('');
        var nextLabel = page === pages.length - 1 ? "I'm ready" : 'Next';
        var lockSpan = secs > 0 ? `<span class='lock-count'>(${secs}s)</span>` : '';

        return `
            <div class='page-inner'>
                <div class='card card-narrow'>
                    <div class='eyebrow swing-in d-1'>${p.eyebrow}</div>
                    <h1 class='swing-in d-2'>${p.title}</h1>
                    <p class='lead swing-in d-3' style='color:var(--ink-2);'>${p.body}</p>
                    <div class='swing-in d-4'>${p.figure}</div>
                    <div class='intro-nav'>
                        <button class='btn btn-ghost' id='intro-back' ${page === 0 ? 'disabled' : ''}>← Back</button>
                        <div class='intro-dots'>${dots}</div>
                        <button class='btn' id='intro-next' ${secs > 0 ? 'disabled' : ''}>${nextLabel} ${lockSpan}</button>
                    </div>
                </div>
            </div>`;
    }

    var compRetries = 0;
    var reshowInstructions = false;

    var overviewInstructions = {
        type: jsPsychHtmlButtonResponse,
        stimulus: '',
        choices: [],
        response_ends_trial: false,
        on_load: function() {
            _introPage   = 0;
            _introSecs   = 5;
            _introReveal = false;

            function render() {
                var container = document.querySelector('.jspsych-html-button-response-stimulus');
                if (!container) container = document.querySelector('#jspsych-content');
                container.innerHTML = buildIntroHTML(_introPage, _introSecs, _introReveal);
                bindIntroNav();
            }

            function startCountdown() {
                clearInterval(_introTimer);
                clearTimeout(_introRevealTimer);
                _introSecs = 5;
                _introReveal = false;
                _introTimer = setInterval(function() {
                    _introSecs = Math.max(0, _introSecs - 1);
                    var btn = document.getElementById('intro-next');
                    if (btn) {
                        if (_introSecs > 0) {
                            btn.disabled = true;
                            btn.innerHTML = (_introPage === 2 ? "I'm ready" : 'Next') + ` <span class='lock-count'>(${_introSecs}s)</span>`;
                        } else {
                            clearInterval(_introTimer);
                            btn.disabled = false;
                            btn.innerHTML = _introPage === 2 ? "I'm ready" : 'Next';
                        }
                    }
                }, 1000);
                // page 3: reveal food after 1500ms
                if (_introPage === 2) {
                    _introRevealTimer = setTimeout(function() {
                        _introReveal = true;
                        var wa = document.getElementById('intro-bwrap-a');
                        var wb = document.getElementById('intro-bwrap-b');
                        if (wa) wa.classList.add('revealed');
                        if (wb) wb.classList.add('revealed');
                    }, 1500);
                }
            }

            function bindIntroNav() {
                var backBtn = document.getElementById('intro-back');
                var nextBtn = document.getElementById('intro-next');
                if (backBtn) backBtn.addEventListener('click', function() {
                    if (_introPage > 0) { _introPage--; render(); startCountdown(); }
                });
                if (nextBtn) nextBtn.addEventListener('click', function() {
                    if (_introPage < 2) { _introPage++; render(); startCountdown(); }
                    else { clearInterval(_introTimer); clearTimeout(_introRevealTimer); jsPsych.finishTrial(); }
                });
            }

            render();
            startCountdown();
        }
    };

    var comprehensionCheck = {
        type: jsPsychHtmlButtonResponse,
        stimulus: `
            <div class='page-inner'>
                <div class='card card-narrow'>
                    <div class='eyebrow swing-in d-1'>Quick check</div>
                    <h1 class='swing-in d-2' style='font-size:28px;'>A few quick questions before we start</h1>

                    <div class='q-block'>
                        <div class='q-label'>1. When two aliens appear together on screen, that means…</div>
                        <div class='choice-list' id='q1-list'>
                            <div class='choice' data-q='q1' data-v='friends'><div class='choice-radio'></div><div class='choice-text'>They are friends</div></div>
                            <div class='choice' data-q='q1' data-v='same_color'><div class='choice-radio'></div><div class='choice-text'>They are the same color</div></div>
                            <div class='choice' data-q='q1' data-v='same_food'><div class='choice-radio'></div><div class='choice-text'>They eat the same food</div></div>
                        </div>
                    </div>

                    <div class='q-block'>
                        <div class='q-label'>2. Which of the following is <em>not</em> a food the aliens eat?</div>
                        <div class='choice-list' id='q2-list'>
                            <div class='choice' data-q='q2' data-v='Bubba'><div class='choice-radio'></div><div class='choice-text'>Bubba</div></div>
                            <div class='choice' data-q='q2' data-v='Glorp'><div class='choice-radio'></div><div class='choice-text'>Glorp</div></div>
                            <div class='choice' data-q='q2' data-v='Flim'><div class='choice-radio'></div><div class='choice-text'>Flim</div></div>
                        </div>
                    </div>

                    <div class='q-block' style='margin-bottom:8px;'>
                        <div class='q-label'>3. How many aliens will you learn about?</div>
                        <div class='choice-list' id='q3-list'>
                            <div class='choice' data-q='q3' data-v='4'><div class='choice-radio'></div><div class='choice-text'>4</div></div>
                            <div class='choice' data-q='q3' data-v='8'><div class='choice-radio'></div><div class='choice-text'>8</div></div>
                            <div class='choice' data-q='q3' data-v='20'><div class='choice-radio'></div><div class='choice-text'>20</div></div>
                        </div>
                    </div>

                    <div class='comp-error' id='comp-error'></div>
                    <div class='btn-row' style='margin-top:24px;'>
                        <button class='btn' id='comp-submit' disabled>Submit</button>
                    </div>
                </div>
            </div>`,
        choices: [],
        response_ends_trial: false,
        on_load: function() {
            var answers = {};

            document.querySelectorAll('.choice').forEach(function(el) {
                el.addEventListener('click', function() {
                    var q = el.dataset.q, v = el.dataset.v;
                    // deselect siblings
                    document.querySelectorAll('.choice[data-q="' + q + '"]').forEach(function(s) {
                        s.classList.remove('selected');
                    });
                    el.classList.add('selected');
                    answers[q] = v;
                    document.getElementById('comp-submit').disabled = !(answers.q1 && answers.q2 && answers.q3);
                });
            });

            document.getElementById('comp-submit').addEventListener('click', function() {
                var correct = answers.q1 === 'friends' && answers.q2 === 'Bubba' && answers.q3 === '8';
                if (!correct) {
                    compRetries++;
                    sessionData.attention_flags.failed_comprehension_retries = compRetries;
                    var errEl = document.getElementById('comp-error');
                    errEl.style.display = 'block';
                    if (compRetries >= COMP_CHECK_MAX_RETRIES) {
                        errEl.textContent = 'Max retries reached. Proceeding to the study.';
                        reshowInstructions = false;
                        setTimeout(function() { jsPsych.finishTrial(); }, 1500);
                    } else {
                        errEl.textContent = `Some answers were incorrect. Please re-read the instructions and try again. (Attempt ${compRetries + 1} of ${COMP_CHECK_MAX_RETRIES})`;
                        reshowInstructions = true;
                        setTimeout(function() { jsPsych.finishTrial(); }, 1200);
                    }
                } else {
                    reshowInstructions = false;
                    jsPsych.finishTrial();
                }
            });
        }
    };

    var comprehensionLoop = {
        timeline: [overviewInstructions, comprehensionCheck],
        loop_function: function() { return reshowInstructions; }
    };


    // ══════════════════════════════════════════════════════════════
    // PHASE 1 — LEARNING
    // ══════════════════════════════════════════════════════════════
    var phase1Instructions = {
        type: jsPsychHtmlButtonResponse,
        stimulus: `
            <div class='page-inner'>
                <div class='card card-narrow' style='text-align:center;'>
                    <h1 class='swing-in d-2'>Sometimes an alien will appear upside-down</h1>
                    <p class='lead swing-in d-3' style='color:var(--ink-2);'>When that happens, press the
                        <kbd style='font-family:var(--font-mono,monospace); background:var(--bg-2);
                            border:1px solid var(--line); padding:2px 10px; border-radius:6px;
                            font-size:14px; font-weight:600;'>SPACE</kbd> bar right away
                    </p>
                    <div class='intro-figure' style='margin:24px 0 12px;'>
                        <div class='intro-fig-item'>
                            <div class='alien-img-wrap' style='width:160px; height:160px;'>
                                <img src='stimuli/aliens/alien_1_green.png' class='alien-img' alt=''>
                            </div>
                            <div class='fig-label' style='color:var(--ink-3);'>normal</div>
                        </div>
                        <div class='intro-or'>vs</div>
                        <div class='intro-fig-item'>
                            <div class='alien-img-wrap upside-down' style='width:160px; height:160px;'>
                                <img src='stimuli/aliens/alien_2_green.png' class='alien-img' alt=''>
                            </div>
                            <div class='fig-label' style='color:var(--ink);'>press SPACE</div>
                        </div>
                    </div>
                    <div class='btn-row' style='margin-top:16px;'>
                        <button class='btn' id='p1-start-btn' disabled>Start <span class='lock-count' id='p1-lock-count'>(5s)</span></button>
                    </div>
                </div>
            </div>`,
        choices: [],
        response_ends_trial: false,
        on_load: function() {
            setPhase('learning', { total: LEARNING_RUNS, activeIdx: 0, label: 'Run 1 of ' + LEARNING_RUNS });
            var secs = 5;
            var t = setInterval(function() {
                secs = Math.max(0, secs - 1);
                var lock = document.getElementById('p1-lock-count');
                var btn  = document.getElementById('p1-start-btn');
                if (!btn) { clearInterval(t); return; }
                if (secs > 0) {
                    lock.textContent = '(' + secs + 's)';
                } else {
                    clearInterval(t);
                    lock.textContent = '';
                    btn.disabled = false;
                }
            }, 1000);
            document.getElementById('p1-start-btn').addEventListener('click', function() {
                clearInterval(t);
                jsPsych.finishTrial();
            });
        }
    };

    var readyToStart = {
        type: jsPsychHtmlButtonResponse,
        stimulus: `
            <div class='page-inner'>
                <div class='card card-narrow' style='text-align:center;'>
                    <h1 style='font-size:26px;'>You're all set!</h1>
                    <p class='muted'>Click below when you're ready to start the experiment.</p>
                    <div class='btn-row' style='margin-top:20px;'>
                        <button class='btn btn-lg' id='ready-btn'>Start experiment</button>
                    </div>
                </div>
            </div>`,
        choices: [],
        response_ends_trial: false,
        on_load: function() {
            document.getElementById('ready-btn').addEventListener('click', function() {
                jsPsych.finishTrial();
            });
        }
    };

    // pre-build all learning trials
    var sessionTrialIdx = 0;
    var learningBlock = [];

    for (var run = 0; run < LEARNING_RUNS; run++) {
        var runEdges = jsPsych.randomization.shuffle([...edges]);
        runEdges.forEach(function(edge) {
            var isUD = Math.random() < UPSIDE_DOWN_RATE;
            var udNode = isUD ? edge[Math.floor(Math.random() * 2)] : null;

            learningBlock.push(buildLearningTrial({
                edge, run,
                sessionTrialIdx: sessionTrialIdx++,
                isUpsideDown: isUD,
                upsideDownNode: udNode,
                species, behavior, nameMapping, behaviorLabels, sessionData
            }, jsPsych));
        });
        if (run < LEARNING_RUNS - 1) {
            (function(r) {
                learningBlock.push(buildRunBreak(r + 1, LEARNING_RUNS, jsPsych, function() {
                    setPhase('learning', {
                        total: LEARNING_RUNS,
                        activeIdx: r + 1,
                        label: 'Run ' + (r + 2) + ' of ' + LEARNING_RUNS
                    });
                }));
            })(run);
        }
    }

    var phase1Done = {
        type: jsPsychHtmlButtonResponse,
        stimulus: `
            <div class='page-inner'>
                <div class='card card-narrow' style='text-align:center;'>
                    <h1 style='font-size:26px;'>Learning phase complete.</h1>
                    <p class='muted'>Next: a short memory check.</p>
                    <div class='btn-row' style='margin-top:20px;'>
                        <button class='btn' id='p1done-btn'>Continue</button>
                    </div>
                </div>
            </div>`,
        choices: [],
        response_ends_trial: false,
        on_load: function() {
            setPhase('memory');
            var p1trials = sessionData.phase_1_learning.trials;
            var udTrials = p1trials.filter(function(t) { return t.upside_down; });
            var hits = udTrials.filter(function(t) { return t.attention_response === 'space'; });
            var hitRate = udTrials.length > 0 ? hits.length / udTrials.length : 1;
            sessionData.phase_1_learning.attention_check_hit_rate = Math.round(hitRate * 100) / 100;
            sessionData.attention_flags.upside_down_hit_rate = hitRate;
            logToBrowser('attention hit rate', hitRate);
            document.getElementById('p1done-btn').addEventListener('click', function() {
                jsPsych.finishTrial();
            });
        }
    };


    // ══════════════════════════════════════════════════════════════
    // PHASE 2 — VALIDATION
    // ══════════════════════════════════════════════════════════════
    var phase2Instructions = {
        type: jsPsychHtmlButtonResponse,
        stimulus: `
            <div class='page-inner'>
                <div class='card card-narrow'>
                    <div class='eyebrow swing-in d-1'>Memory check</div>
                    <h1 class='swing-in d-2'>Now we'll see what you remember.</h1>
                    <p class='lead swing-in d-3' style='color:var(--ink-2);'>You'll answer three short sets of questions:</p>
                    <div style='display:flex; flex-direction:column; gap:12px; margin:20px 0 4px;'>
                        ${[['01','Which aliens were friends?'],['02','Is each alien green or orange?'],['03','What does each alien eat?']].map(function(item) {
                            return `<div style='display:flex; align-items:center; gap:16px; padding:14px 18px;
                                background:var(--bg-2); border-radius:var(--radius); border:1px solid var(--line);'>
                                <span style='font-family:var(--font-mono,monospace); font-size:12px;
                                    color:var(--ink-3); font-weight:700; letter-spacing:0.08em;'>${item[0]}</span>
                                <span style='font-size:16px; color:var(--ink);'>${item[1]}</span>
                            </div>`;
                        }).join('')}
                    </div>
                    <div class='btn-row' style='margin-top:24px;'>
                        <button class='btn' id='p2-start-btn' disabled>Begin <span class='lock-count' id='p2-lock'>(5s)</span></button>
                    </div>
                </div>
            </div>`,
        choices: [],
        response_ends_trial: false,
        on_load: function() {
            var secs = 5;
            var t = setInterval(function() {
                secs = Math.max(0, secs - 1);
                var lock = document.getElementById('p2-lock');
                var btn  = document.getElementById('p2-start-btn');
                if (!btn) { clearInterval(t); return; }
                if (secs > 0) {
                    lock.textContent = '(' + secs + 's)';
                } else {
                    clearInterval(t);
                    lock.textContent = '';
                    btn.disabled = false;
                }
            }, 1000);
            document.getElementById('p2-start-btn').addEventListener('click', function() {
                clearInterval(t);
                jsPsych.finishTrial();
            });
        }
    };

    var edgeRecTrials = buildEdgeRecTrials(
        graphData.edge_recognition_trials, nameMapping, species, jsPsych, sessionData
    );
    var speciesRecallTrials = buildSpeciesRecallTrials(species, nameMapping, jsPsych, sessionData);
    var behaviorRecallTrials = buildBehaviorRecallTrials(behavior, nameMapping, behaviorLabels, species, jsPsych, sessionData);


    // ══════════════════════════════════════════════════════════════
    // PHASE 3 — TRANSFER
    // ══════════════════════════════════════════════════════════════
    var phase3Instructions = {
        type: jsPsychHtmlButtonResponse,
        stimulus: `
            <div class='page-inner'>
                <div class='card card-narrow'>
                    <div class='eyebrow swing-in d-1'>New aliens</div>
                    <h1 class='swing-in d-2'>You'll now meet two new aliens</h1>
                    <p class='lead swing-in d-3' style='color:var(--ink-2);'>Your job will be to figure out what food each one likes to eat</p>
                    <p style='color:var(--ink-2);'>
                        For each new alien, you'll get to choose <strong>one thing</strong> to learn about them —
                        either their color or who their friends are — and use that to make your best guess
                    </p>
                    <div class='btn-row' style='margin-top:24px;'>
                        <button class='btn' id='p3-start-btn' disabled>Continue <span class='lock-count' id='p3-lock'>(5s)</span></button>
                    </div>
                </div>
            </div>`,
        choices: [],
        response_ends_trial: false,
        on_load: function() {
            setPhase('transfer', { total: 2, activeIdx: 0, label: 'Alien 1 of 2' });
            var secs = 5;
            var t = setInterval(function() {
                secs = Math.max(0, secs - 1);
                var lock = document.getElementById('p3-lock');
                var btn  = document.getElementById('p3-start-btn');
                if (!btn) { clearInterval(t); return; }
                if (secs > 0) {
                    lock.textContent = '(' + secs + 's)';
                } else {
                    clearInterval(t);
                    lock.textContent = '';
                    btn.disabled = false;
                }
            }, 1000);
            document.getElementById('p3-start-btn').addEventListener('click', function() {
                clearInterval(t);
                jsPsych.finishTrial();
            });
        }
    };

    var transferAlienIndices = jsPsych.randomization.sampleWithoutReplacement([0,1,2,3,4,5,6,7], 2);
    var transferTrials = buildTransferTrials({
        condition, species, behavior, nameMapping, behaviorLabels,
        graphData, sessionData, transferAlienIndices
    }, jsPsych);

    // substep tracking for transfer aliens
    if (transferTrials[0]) {
        var _origT0 = transferTrials[0].on_load;
        transferTrials[0].on_load = function() {
            setPhase('transfer', { total: 2, activeIdx: 0, label: 'Alien 1 of 2' });
            if (_origT0) _origT0();
        };
    }
    if (transferTrials[1]) {
        var _origT1 = transferTrials[1].on_load;
        transferTrials[1].on_load = function() {
            setPhase('transfer', { total: 2, activeIdx: 1, label: 'Alien 2 of 2' });
            if (_origT1) _origT1();
        };
    }


    // ══════════════════════════════════════════════════════════════
    // PHASE 4 — STRATEGY FREE RESPONSE
    // ══════════════════════════════════════════════════════════════
    var strategyTrial = {
        type: jsPsychSurveyHtmlForm,
        preamble: '',
        html: `
            <div class='page-inner prevent-select'>
                <div class='card card-narrow'>
                    <div class='eyebrow swing-in d-1'>In your own words</div>
                    <h1 class='swing-in d-2' style='font-size:28px;'>How did you decide what each new alien eats?</h1>
                    <p class='muted swing-in d-3'>
                        What information did you find most useful? There are no wrong answers — we're just curious about your reasoning.
                    </p>
                    <textarea name='strategy' class='strategy-textarea'
                        placeholder='e.g. "I looked at whether the new alien seemed similar to..."'
                        rows='6'></textarea>
                </div>
            </div>`,
        button_label: 'Continue',
        on_load: function() {
            var t0 = performance.now();
            document.querySelector('form').addEventListener('submit', function() {
                sessionData.phase_4_strategy.time_on_screen_ms = Math.round(performance.now() - t0);
            });
            // style jsPsych's submit button
            var submitBtn = document.querySelector('#jspsych-survey-html-form-next');
            if (submitBtn) {
                submitBtn.className = 'btn';
                submitBtn.style.marginTop = '18px';
            }
        },
        on_finish: function(data) {
            sessionData.phase_4_strategy.free_text = data.response.strategy || '';
        }
    };


    // ══════════════════════════════════════════════════════════════
    // PHASE 5 — DEMOGRAPHICS
    // ══════════════════════════════════════════════════════════════
    var demographicsTrial = {
        type: jsPsychSurveyHtmlForm,
        preamble: '',
        html: getDemographicsHTML(),
        button_label: 'Submit',
        on_load: function() {
            var submitBtn = document.querySelector('#jspsych-survey-html-form-next');
            if (submitBtn) {
                submitBtn.className = 'btn';
                submitBtn.style.marginTop = '28px';
                submitBtn.style.float = 'right';
            }
        },
        on_finish: function(data) { processDemographics(data, jsPsych); }
    };


    // ══════════════════════════════════════════════════════════════
    // DATAPIPE SAVE + COMPLETION
    // ══════════════════════════════════════════════════════════════
    function handleSaveResult(saveData, label) {
        if (saveData.success) return;
        console.error('DataPipe save failed', label, saveData.result);
        window.onbeforeunload = null;
        document.body.innerHTML = `
            <div style='font-family:var(--font-body,Helvetica Neue,Arial,sans-serif); text-align:center;
                margin:15vh auto; max-width:720px; color:var(--ink,#333);'>
                <p style='font-size:24px; font-weight:600;'>We couldn't save your data.</p>
                <p style='font-size:16px; color:#666; line-height:1.5;'>
                    The upload to DataPipe was rejected. Please don't close this page.
                    Open the browser console and send the error to the research team.
                </p>
                <p style='font-size:15px; color:#888;'>Failed: ${label}</p>
            </div>`;
        throw new Error('DataPipe save failed: ' + label);
    }

    var saveData = {
        type: jsPsychPipe,
        action: 'save',
        experiment_id: DATAPIPE_EXPERIMENT_ID,
        filename: function() { return getFilePrefix(jsPsych) + '.json'; },
        data_string: function() {
            sessionData.end_time = new Date().toISOString();
            return JSON.stringify(sessionData, null, 2);
        },
        wait_message: "<p style='text-align:center; color:var(--ink-2,#555); font-family:inherit;'>Saving your data — please don't close this page…</p>",
        on_finish: function(data) { handleSaveResult(data, 'final save'); }
    };

    var completion = {
        type: jsPsychHtmlButtonResponse,
        stimulus: `
            <div class='page-inner'>
                <div class='card card-narrow complete-card'>
                    <div class='check-circle'>
                        <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.5'
                            stroke-linecap='round' stroke-linejoin='round'>
                            <polyline points='20 6 9 17 4 12'/>
                        </svg>
                    </div>
                    <h1>Thank you!</h1>
                    <p class='lead' style='color:var(--ink-2); text-align:center;'>
                        Your responses have been saved and will help our research.
                    </p>
                    <p class='muted' style='text-align:center; margin-top:18px;'>
                        You'll be redirected back to Prolific automatically in a few seconds.<br>
                        If nothing happens, <a href='${PROLIFIC_COMPLETION_URL}' style='color:var(--ink);'>click here</a>.
                    </p>
                </div>
            </div>`,
        choices: [],
        response_ends_trial: false,
        on_load: function() {
            var fill = document.getElementById('progress-fill');
            if (fill) fill.style.width = '100%';
            renderStepper('transfer');
            window.onbeforeunload = null;
            if (PROLIFIC_COMPLETION_URL && !TESTING_MODE) {
                setTimeout(function() { window.location.href = PROLIFIC_COMPLETION_URL; }, 3000);
            }
        }
    };

    // ── progress bar (updates frame-top fill) ─────────────────────
    var totalTrials = 325;
    var trialCount  = 0;

    function advanceProgress() {
        trialCount++;
        var pct = Math.min(trialCount / totalTrials, 0.99);
        var fill = document.getElementById('progress-fill');
        if (fill) fill.style.width = (pct * 100) + '%';
    }

    learningBlock.forEach(function(t) {
        var orig = t.on_finish;
        t.on_finish = function(data) { advanceProgress(); if (orig) orig(data); };
    });
    [...edgeRecTrials, ...speciesRecallTrials, ...behaviorRecallTrials].forEach(function(t) {
        var orig = t.on_finish;
        t.on_finish = function(data) { advanceProgress(); if (orig) orig(data); };
    });


    // ── full timeline ─────────────────────────────────────────────
    var timeline = [
        {
            timeline: [consent],
            conditional_function: function() { return _devStart <= 0; }
        },
        {
            timeline: [comprehensionLoop],
            conditional_function: function() { return _devStart <= 1; }
        },
        {
            timeline: [phase1Instructions, readyToStart].concat(learningBlock).concat([phase1Done]),
            conditional_function: function() { return _devStart <= 2; }
        },
        {
            timeline: (function() {
                var blocks = jsPsych.randomization.shuffle([
                    [].concat(edgeRecTrials),
                    [].concat(speciesRecallTrials),
                    [].concat(behaviorRecallTrials)
                ]);
                blocks.forEach(function(block, i) {
                    var orig = block[0].on_load;
                    block[0].on_load = function() {
                        setPhase('memory', { total: 3, activeIdx: i, label: 'Section ' + (i + 1) + ' of 3' });
                        if (orig) orig();
                    };
                });
                return [phase2Instructions]
                    .concat(blocks[0]).concat(blocks[1]).concat(blocks[2]);
            })(),
            conditional_function: function() { return _devStart <= 3; }
        },
        {
            timeline: [phase3Instructions].concat(transferTrials),
            conditional_function: function() { return _devStart <= 4; }
        },
        {
            timeline: [strategyTrial],
            conditional_function: function() { return _devStart <= 5; }
        },
        {
            timeline: [demographicsTrial],
            conditional_function: function() { return _devStart <= 6; }
        },
        saveData,
        completion
    ];

    jsPsych.run(timeline);
}
