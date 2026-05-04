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
