// phase 3: transfer trial — cue choice → reveal → prediction + confidence
// all 5 stages handled in a single jsPsych trial via DOM swapping

// build all 5 transfer trials; returns array of jsPsych trial objects
function buildTransferTrials(opts, jsPsych) {
    // opts: {condition, species, behavior, nameMapping, behaviorLabels,
    //        graphData, sessionData}
    var speciesArr   = opts.species;
    var behaviorArr  = opts.behavior;
    var nameMap      = opts.nameMapping;
    var bLabels      = opts.behaviorLabels;

    // sample 4 concordant friends for each trial:
    // pick friendNodes so majority (ideally all 4) share targetBehavior
    function sampleFriends(targetBehavior) {
        var concordant = [];
        var other = [];
        for (var n = 0; n < 12; n++) {
            (behaviorArr[n] === targetBehavior ? concordant : other).push(n);
        }
        concordant = jsPsych.randomization.shuffle(concordant);
        other      = jsPsych.randomization.shuffle(other);
        // aim for 4 concordant; if fewer than 4, fill from other
        var friends = concordant.slice(0, 4);
        if (friends.length < 4) friends = friends.concat(other.slice(0, 4 - friends.length));
        return friends.slice(0, TRANSFER_FRIENDS_REVEALED);
    }

    // ground truth behavior per condition
    function groundTruth(novelSpecies, friendNodes) {
        if (opts.condition === 'homophily') {
            // majority behavior of friends
            var counts = [0, 0];
            friendNodes.forEach(n => counts[behaviorArr[n]]++);
            return counts[1] > counts[0] ? 1 : 0;
        } else {
            // species predicts behavior in category condition
            return novelSpecies;
        }
    }

    // 5 novel agents: balanced species (3 of one, 2 of other)
    var speciesAssignments = jsPsych.randomization.sampleWithoutReplacement([0,0,0,1,1], 5);
    // if random first species should get 3 trials, keep as-is; already balanced

    var shuffledTransferNames = jsPsych.randomization.shuffle([...TRANSFER_NAMES]);

    return shuffledTransferNames.map(function(novelName, trialIdx) {
        var novelSpecies = speciesAssignments[trialIdx];
        var novelImg     = speciesImg(novelSpecies);
        var speciesLabel = novelSpecies === 0 ? 'blue gazorp' : 'red gazorp';
        var friendNodes  = sampleFriends(novelSpecies); // targetBehavior = species for balance
        var gt           = groundTruth(novelSpecies, friendNodes);

        return {
            type: jsPsychHtmlButtonResponse,
            // placeholder div — on_load swaps content per stage
            stimulus: '<div id="transfer-stage" style="min-height:400px;"></div>',
            choices: [],
            response_ends_trial: false,
            on_load: function() {
                var stage = function() { return document.getElementById('transfer-stage'); };
                var trialRecord = {
                    trial_idx:      trialIdx,
                    novel_agent_name:    novelName,
                    novel_agent_species: novelSpecies,
                    friend_count:        TRANSFER_FRIENDS_REVEALED,
                    friend_nodes_available: friendNodes,
                    friend_behaviors:    friendNodes.map(n => behaviorArr[n]),
                    cue_choice:          null,
                    cue_choice_RT:       null,
                    revealed_info_summary: null,
                    behavior_prediction: null,
                    confidence:          null,
                    ground_truth_behavior_under_condition: gt,
                    prediction_correct:  null,
                    RT_binary:           null,
                    RT_slider:           null
                };

                var stageStart = performance.now();
                var cueChoiceRT = null;
                var binaryRT = null, sliderRT = null;
                var selectedPred = null;
                var sliderTouched = false;

                // ── stage 1: introduction ────────────────────────────────
                function showIntro() {
                    stage().innerHTML = `
                        <div class='transfer-box prevent-select'>
                            <div class='trial-counter'>${trialIdx + 1} / ${TRANSFER_NAMES.length}</div>
                            <div style='text-align:center; margin-bottom:20px;'>
                                <img src='stimuli/aliens/neutral_gazorp.svg' style='width:100px; height:110px;'>
                                <div style='font-size:22px; font-weight:700; margin-top:8px;'>${novelName}</div>
                            </div>
                            <p class='transfer-prompt'>
                                Here is <b>${novelName}</b>.<br>
                                ${novelName} has <b>${TRANSFER_FRIENDS_REVEALED} friends</b> among the aliens you learned about.
                            </p>
                            <div style='text-align:center; margin-top:24px;'>
                                <button class='jspsych-btn' id='intro-continue'>Continue</button>
                            </div>
                        </div>`;
                    stageStart = performance.now();
                    document.getElementById('intro-continue').addEventListener('click', showCueChoice);
                }

                // ── stage 2: cue choice ──────────────────────────────────
                function showCueChoice() {
                    stageStart = performance.now();
                    stage().innerHTML = `
                        <div class='transfer-box prevent-select'>
                            <div class='trial-counter'>${trialIdx + 1} / ${TRANSFER_NAMES.length}</div>
                            <p class='transfer-prompt'>
                                To help predict what <b>${novelName}</b> eats,<br>
                                you can learn <u>ONE thing</u>:
                            </p>
                            <div class='cue-choice-row'>
                                <button class='cue-btn' id='btn-species'>
                                    Learn whether <b>${novelName}</b> is a<br>blue or red gazorp
                                </button>
                                <button class='cue-btn' id='btn-friends'>
                                    Learn who <b>${novelName}</b>'s<br>friends are
                                </button>
                            </div>
                        </div>`;
                    document.getElementById('btn-species').addEventListener('click', function() {
                        cueChoiceRT = Math.round(performance.now() - stageStart);
                        trialRecord.cue_choice = 'species';
                        trialRecord.cue_choice_RT = cueChoiceRT;
                        trialRecord.revealed_info_summary = speciesLabel;
                        showCueReveal('species');
                    });
                    document.getElementById('btn-friends').addEventListener('click', function() {
                        cueChoiceRT = Math.round(performance.now() - stageStart);
                        trialRecord.cue_choice = 'friends';
                        trialRecord.cue_choice_RT = cueChoiceRT;
                        trialRecord.revealed_info_summary = friendNodes.map(n => nameMap[n]).join(', ');
                        showCueReveal('friends');
                    });
                }

                // ── stage 3: cue reveal ──────────────────────────────────
                function showCueReveal(cue) {
                    var revealHTML;
                    if (cue === 'species') {
                        revealHTML = `
                            <div class='reveal-center'>
                                <p style='font-size:18px; color:#555;'>${novelName} is a:</p>
                                <div style='text-align:center;'>
                                    <img src='${novelImg}' class='alien-img' alt='${novelName}' style='width:120px;height:120px;'>
                                    <div class='alien-name'>${novelName}</div>
                                    <div style='font-size:17px; color:#028090; font-weight:600; margin-top:4px;'>${speciesLabel}</div>
                                </div>
                            </div>`;
                    } else {
                        var friendCards = friendNodes.map(function(n) {
                            var fname  = nameMap[n];
                            var fimg   = speciesImg(speciesArr[n]);
                            var ficon  = behaviorIcon(behaviorArr[n], bLabels);
                            var flabel = bLabels[behaviorArr[n]];
                            return `
                                <div class='friend-card'>
                                    <img src='${fimg}' class='alien-img' alt='${fname}' style='width:80px;height:80px;'>
                                    <div class='friend-name'>${fname}</div>
                                    <div class='friend-info'>
                                        <img src='${ficon}' alt='${flabel}'> ${flabel}
                                    </div>
                                </div>`;
                        }).join('');
                        revealHTML = `
                            <div class='reveal-center'>
                                <p style='font-size:18px; color:#555; margin-bottom:4px;'>${novelName}'s friends:</p>
                                <div class='friends-grid'>${friendCards}</div>
                            </div>`;
                    }

                    stage().innerHTML = `
                        <div class='transfer-box prevent-select'>
                            <div class='trial-counter'>${trialIdx + 1} / ${TRANSFER_NAMES.length}</div>
                            ${revealHTML}
                            <div style='text-align:center; margin-top:28px;'>
                                <button class='jspsych-btn' id='reveal-continue'>Continue</button>
                            </div>
                        </div>`;
                    document.getElementById('reveal-continue').addEventListener('click', showPrediction);
                }

                // ── stage 4: prediction + confidence ────────────────────
                function showPrediction() {
                    var bLabel0 = bLabels[0], bLabel1 = bLabels[1];
                    stageStart = performance.now();

                    stage().innerHTML = `
                        <div class='transfer-box prevent-select'>
                            <div class='trial-counter'>${trialIdx + 1} / ${TRANSFER_NAMES.length}</div>
                            <p class='transfer-prompt'>What does <b>${novelName}</b> eat?</p>
                            <div class='prediction-row'>
                                <button class='pred-btn' id='pred-0'>${bLabel0}</button>
                                <button class='pred-btn' id='pred-1'>${bLabel1}</button>
                            </div>
                            <div class='confidence-wrap' id='conf-wrap'>
                                <div class='slider-question'>
                                    <p class='question-text'>How confident are you?</p>
                                    <input type='range' class='trial-slider' id='conf-slider'
                                        min='0' max='100' step='1' value='50'>
                                    <div class='slider-footer'>
                                        <span class='slider-label-min'>Not confident at all</span>
                                        <span class='slider-value-display' id='conf-val'>?</span>
                                        <span class='slider-label-max'>Completely confident</span>
                                    </div>
                                </div>
                                <div style='text-align:center; margin-top:8px;'>
                                    <button class='jspsych-btn' id='pred-submit' disabled>Continue</button>
                                </div>
                            </div>
                        </div>`;

                    function handleBinary(predInt) {
                        if (selectedPred !== null) return;
                        selectedPred = predInt;
                        binaryRT = Math.round(performance.now() - stageStart);
                        document.getElementById('pred-' + predInt).classList.add('selected');
                        document.getElementById('pred-' + (1 - predInt)).disabled = true;

                        // reveal confidence slider
                        var confWrap = document.getElementById('conf-wrap');
                        confWrap.style.display = 'block';
                        var slider = document.getElementById('conf-slider');
                        updateSliderGradient(slider);
                        slider.addEventListener('mousedown', touchSlider);
                        slider.addEventListener('touchstart', touchSlider);
                        slider.addEventListener('keydown', touchSlider);
                        slider.addEventListener('input', function() {
                            updateSliderGradient(slider);
                            if (sliderTouched) {
                                document.getElementById('conf-val').textContent = slider.value;
                            }
                        });
                    }

                    function touchSlider() {
                        if (!sliderTouched) {
                            sliderTouched = true;
                            sliderRT = Math.round(performance.now() - stageStart);
                            var slider = document.getElementById('conf-slider');
                            document.getElementById('conf-val').textContent = slider.value;
                            document.getElementById('pred-submit').disabled = false;
                        }
                    }

                    document.getElementById('pred-0').addEventListener('click', () => handleBinary(0));
                    document.getElementById('pred-1').addEventListener('click', () => handleBinary(1));

                    document.getElementById('pred-submit').addEventListener('click', function() {
                        var confVal = parseInt(document.getElementById('conf-slider').value);
                        trialRecord.behavior_prediction = selectedPred;
                        trialRecord.confidence          = confVal;
                        trialRecord.prediction_correct  = selectedPred === gt;
                        trialRecord.RT_binary           = binaryRT;
                        trialRecord.RT_slider           = sliderRT;
                        opts.sessionData.phase_3_transfer.trials.push(trialRecord);
                        logToBrowser('transfer trial', trialRecord);
                        jsPsych.finishTrial();
                    });
                }

                showIntro();
            }
        };
    });
}
