// phase 1: timed paired-associates trial w/ delayed behavior reveal
// opts: {edge, run, sessionTrialIdx, isUpsideDown, upsideDownNode,
//        species, behavior, nameMapping, behaviorLabels, sessionData}
function buildLearningTrial(opts, jsPsych) {
    var nodeA = opts.edge[0], nodeB = opts.edge[1];
    var nameA = opts.nameMapping[nodeA], nameB = opts.nameMapping[nodeB];
    var speciesA = opts.species[nodeA], speciesB = opts.species[nodeB];
    var behA    = opts.behavior[nodeA], behB    = opts.behavior[nodeB];
    var imgA    = speciesImg(speciesA), imgB    = speciesImg(speciesB);
    var iconA   = behaviorIcon(behA, opts.behaviorLabels);
    var iconB   = behaviorIcon(behB, opts.behaviorLabels);
    var labelA  = opts.behaviorLabels[behA], labelB = opts.behaviorLabels[behB];
    var rotA    = opts.isUpsideDown && opts.upsideDownNode === nodeA;
    var rotB    = opts.isUpsideDown && opts.upsideDownNode === nodeB;

    var html = `
        <div class='learning-box'>
            <div class='alien-pair'>
                <div class='alien-card'>
                    <div class='alien-name'>${nameA}</div>
                    <div class='alien-img-wrap ${rotA ? 'upside-down' : ''}'>
                        <img src='${imgA}' class='alien-img' alt='${nameA}'>
                    </div>
                    <div class='behavior-wrap' id='bwrap-a'>
                        <img src='${iconA}' class='behavior-icon' alt='${labelA}'>
                        <span class='behavior-label'>${labelA}</span>
                    </div>
                </div>
                <div class='pair-connector'><div class='pair-line'></div></div>
                <div class='alien-card'>
                    <div class='alien-name'>${nameB}</div>
                    <div class='alien-img-wrap ${rotB ? 'upside-down' : ''}'>
                        <img src='${imgB}' class='alien-img' alt='${nameB}'>
                    </div>
                    <div class='behavior-wrap' id='bwrap-b'>
                        <img src='${iconB}' class='behavior-icon' alt='${labelB}'>
                        <span class='behavior-label'>${labelB}</span>
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
function buildRunBreak(runNum, totalRuns, jsPsych) {
    return {
        type: jsPsychHtmlButtonResponse,
        stimulus: `
            <div class='run-break-box'>
                <p style='font-size:17px; color:#888; margin-bottom:6px;'>
                    Run ${runNum - 1} of ${totalRuns} complete
                </p>
                <p style='font-size:22px; font-weight:600; color:#333;'>Take a breath.</p>
                <p style='font-size:17px; color:#555;'>
                    Press <b>Continue</b> when you're ready for the next round.
                </p>
            </div>`,
        choices: ['Continue']
    };
}
