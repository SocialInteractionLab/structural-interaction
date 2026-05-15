// phase 1: timed paired-associates trial w/ delayed behavior reveal
// opts: {edge, run, sessionTrialIdx, isUpsideDown, upsideDownNode,
//        species, behavior, nameMapping, behaviorLabels, sessionData}
function buildLearningTrial(opts, jsPsych) {
    var nodeA = opts.edge[0], nodeB = opts.edge[1];
    var speciesA = opts.species[nodeA], speciesB = opts.species[nodeB];
    var behA    = opts.behavior[nodeA], behB    = opts.behavior[nodeB];
    var imgA    = speciesImg(nodeA, speciesA), imgB    = speciesImg(nodeB, speciesB);
    var iconA   = behaviorIcon(behA, opts.behaviorLabels);
    var iconB   = behaviorIcon(behB, opts.behaviorLabels);
    var labelA  = opts.behaviorLabels[behA], labelB = opts.behaviorLabels[behB];
    var rotA    = opts.isUpsideDown && opts.upsideDownNode === nodeA;
    var rotB    = opts.isUpsideDown && opts.upsideDownNode === nodeB;

    var html = `
        <div class='learn-stage prevent-select'>
            <div class='learn-frame'>
                <div class='pair'>
                    <div class='alien-slot'>
                        <div class='alien-img-wrap ${rotA ? 'upside-down' : ''}'>
                            <img src='${imgA}' class='alien-img' alt=''>
                        </div>
                        <div class='behavior' id='bwrap-a'>
                            <div class='behavior-plate'>
                                <img src='${iconA}' class='behavior-icon' alt='${labelA}'>
                                <span class='behavior-name'>${labelA}</span>
                            </div>
                        </div>
                    </div>
                    <div class='bond'><div class='bond-line'></div></div>
                    <div class='alien-slot'>
                        <div class='alien-img-wrap ${rotB ? 'upside-down' : ''}'>
                            <img src='${imgB}' class='alien-img' alt=''>
                        </div>
                        <div class='behavior' id='bwrap-b'>
                            <div class='behavior-plate'>
                                <img src='${iconB}' class='behavior-icon' alt='${labelB}'>
                                <span class='behavior-name'>${labelB}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;

    return {
        type: jsPsychHtmlButtonResponse,
        stimulus: html,
        choices: [],
        response_ends_trial: false,
        on_load: function() {
            var trialStart = performance.now();
            var attnDetected = false, attnRT = null;
            var inOnsetWindow = true;
            var timers = [];

            function handleSpace(e) {
                if (e.code === 'Space' && inOnsetWindow && !attnDetected) {
                    attnDetected = true;
                    attnRT = Math.round(performance.now() - trialStart);
                }
            }
            if (opts.isUpsideDown) document.addEventListener('keydown', handleSpace);

            // reveal behavior at LEARNING_ONSET_MS
            timers.push(setTimeout(function() {
                inOnsetWindow = false;
                var wa = document.getElementById('bwrap-a');
                var wb = document.getElementById('bwrap-b');
                if (wa) wa.classList.add('revealed');
                if (wb) wb.classList.add('revealed');
            }, LEARNING_ONSET_MS));

            // finish trial at onset + reveal
            timers.push(setTimeout(function() {
                document.removeEventListener('keydown', handleSpace);
                timers.forEach(clearTimeout);

                opts.sessionData.phase_1_learning.trials.push({
                    trial_idx:        opts.sessionTrialIdx,
                    run:              opts.run,
                    pair:             [nodeA, nodeB],
                    pair_species:     [speciesA, speciesB],
                    pair_behavior:    [behA, behB],
                    upside_down:      opts.isUpsideDown,
                    upside_down_node: opts.upsideDownNode,
                    attention_response: opts.isUpsideDown ? (attnDetected ? 'space' : null) : null,
                    attention_RT:       opts.isUpsideDown ? attnRT : null
                });

                jsPsych.finishTrial();
            }, LEARNING_ONSET_MS + LEARNING_REVEAL_MS));
        }
    };
}

// end-of-block test: show A–B pair, friend's food revealed, ask what target eats
// samples one edge from cumulativeEdges (all edges seen so far incl. current run)
// opts: {run, cumulativeEdges, species, behavior, nameMapping, behaviorLabels,
//        sessionData, earlyExit, minRuns, threshold}
function buildBlockTest(opts, jsPsych) {
    var allEdges   = opts.cumulativeEdges;
    var edge       = allEdges[Math.floor(Math.random() * allEdges.length)];
    var flip       = Math.random() < 0.5;
    var targetNode = flip ? edge[0] : edge[1];
    var friendNode = flip ? edge[1] : edge[0];

    var targetSpecies = opts.species[targetNode];
    var friendSpecies = opts.species[friendNode];
    var targetBeh     = opts.behavior[targetNode];
    var friendBeh     = opts.behavior[friendNode];

    var targetImg   = speciesImg(targetNode, targetSpecies);
    var friendImg   = speciesImg(friendNode, friendSpecies);
    var friendIcon  = behaviorIcon(friendBeh,  opts.behaviorLabels);
    var friendLabel = opts.behaviorLabels[friendBeh];
    var icon0  = behaviorIcon(0, opts.behaviorLabels);
    var icon1  = behaviorIcon(1, opts.behaviorLabels);
    var label0 = opts.behaviorLabels[0];
    var label1 = opts.behaviorLabels[1];

    var html = `
        <div class='learn-stage prevent-select'>
            <div class='learn-frame'>
                <div class='block-test-header'>
                    <span class='meta'>Quick check &nbsp;·&nbsp; after round ${opts.run + 1}</span>
                </div>
                <p class='block-test-prompt'>Their friend eats <strong>${friendLabel}</strong>. What does this alien eat?</p>
                <div class='pair'>
                    <div class='alien-slot'>
                        <div class='alien-img-wrap'>
                            <img src='${targetImg}' class='alien-img' alt=''>
                        </div>
                        <div class='behavior' id='btest-target-beh'>
                            <div class='behavior-plate'>
                                <span class='behavior-name' style='opacity:0.4; font-size:22px;'>?</span>
                            </div>
                        </div>
                    </div>
                    <div class='bond'><div class='bond-line'></div></div>
                    <div class='alien-slot'>
                        <div class='alien-img-wrap'>
                            <img src='${friendImg}' class='alien-img' alt=''>
                        </div>
                        <div class='behavior revealed'>
                            <div class='behavior-plate'>
                                <img src='${friendIcon}' class='behavior-icon' alt='${friendLabel}'>
                                <span class='behavior-name'>${friendLabel}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class='block-test-choices'>
                    <button class='predict-btn' id='btest-btn-0'>
                        <img src='${icon0}' alt=''>${label0}
                    </button>
                    <button class='predict-btn' id='btest-btn-1'>
                        <img src='${icon1}' alt=''>${label1}
                    </button>
                </div>
                <div class='block-test-feedback' id='btest-feedback' style='display:none;'></div>
            </div>
        </div>`;

    return {
        type: jsPsychHtmlButtonResponse,
        stimulus: html,
        choices: [],
        response_ends_trial: false,
        on_load: function() {
            var trialStart = performance.now();
            var responded  = false;

            function respond(respInt) {
                if (responded) return;
                responded = true;
                var correct = (respInt === targetBeh);
                var RT = Math.round(performance.now() - trialStart);

                opts.sessionData.phase_1_learning.block_tests.push({
                    run: opts.run, edge: edge,
                    target_node: targetNode, friend_node: friendNode,
                    target_behavior: targetBeh, response: respInt,
                    correct: correct, RT: RT
                });

                // check early-exit criteria
                var tests = opts.sessionData.phase_1_learning.block_tests;
                var total = tests.length;
                var nCorrect = tests.filter(function(t) { return t.correct; }).length;
                var accuracy = nCorrect / total;
                if (!opts.earlyExit.triggered && total >= opts.minRuns && accuracy >= opts.threshold) {
                    opts.earlyExit.triggered = true;
                    opts.sessionData.phase_1_learning.early_exit_run      = opts.run;
                    opts.sessionData.phase_1_learning.early_exit_accuracy = Math.round(accuracy * 100) / 100;
                }

                // disable buttons, mark selection
                document.getElementById('btest-btn-0').disabled = true;
                document.getElementById('btest-btn-1').disabled = true;
                document.getElementById('btest-btn-' + respInt).classList.add('selected');

                // reveal target food
                var correctIcon  = behaviorIcon(targetBeh, opts.behaviorLabels);
                var correctLabel = opts.behaviorLabels[targetBeh];
                var targetBehEl  = document.getElementById('btest-target-beh');
                targetBehEl.classList.add('revealed');
                targetBehEl.innerHTML = `
                    <div class='behavior-plate'>
                        <img src='${correctIcon}' class='behavior-icon' alt='${correctLabel}'>
                        <span class='behavior-name'>${correctLabel}</span>
                    </div>`;

                // feedback
                var feedbackEl = document.getElementById('btest-feedback');
                feedbackEl.style.display = '';
                feedbackEl.innerHTML = correct
                    ? `<span class='feedback-correct'>✓ Correct!</span>`
                    : `<span class='feedback-incorrect'>✗ The answer was ${correctLabel}</span>`;

                setTimeout(function() { jsPsych.finishTrial(); }, 1600);
            }

            document.getElementById('btest-btn-0').addEventListener('click', function() { respond(0); });
            document.getElementById('btest-btn-1').addEventListener('click', function() { respond(1); });
        }
    };
}

// short break between runs
function buildRunBreak(runNum, totalRuns, jsPsych, onLoadCallback) {
    var pct = Math.round((runNum / totalRuns) * 100);
    var pips = Array.from({ length: totalRuns }, function(_, i) {
        var cls = i < runNum ? 'done' : i === runNum ? 'now' : '';
        return `<div class='run-pip ${cls}'></div>`;
    }).join('');

    return {
        type: jsPsychHtmlButtonResponse,
        stimulus: `
            <div class='page-inner'>
                <div class='card card-narrow run-break'>
                    <div class='meta swing-in d-1'>${runNum} of ${totalRuns} runs complete</div>
                    <p class='muted swing-in d-3' style='text-align:center; max-width:480px; margin:0 auto;'>
                        You're ${pct}% of the way through this part
                    </p>
                    <div class='run-progress'>${pips}</div>
                    <div class='btn-row'>
                        <button class='btn btn-lg' id='rb-continue'>Continue</button>
                    </div>
                </div>
            </div>`,
        choices: [],
        response_ends_trial: false,
        on_load: function() {
            if (onLoadCallback) onLoadCallback();
            document.getElementById('rb-continue').addEventListener('click', function() {
                jsPsych.finishTrial();
            });
        }
    };
}
