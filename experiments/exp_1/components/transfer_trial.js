// phase 3: transfer trial — single progressive-reveal page
// sections appear below as participant clicks through; binary choice is final

function buildTransferTrials(opts, jsPsych) {
    var speciesArr  = opts.species;
    var behaviorArr = opts.behavior;
    var nameMap     = opts.nameMapping;
    var bLabels     = opts.behaviorLabels;

    // 4 concordant friends for each trial
    function sampleFriends(targetBehavior) {
        var concordant = [], other = [];
        for (var n = 0; n < 12; n++) {
            (behaviorArr[n] === targetBehavior ? concordant : other).push(n);
        }
        concordant = jsPsych.randomization.shuffle(concordant);
        other      = jsPsych.randomization.shuffle(other);
        var friends = concordant.slice(0, 4);
        if (friends.length < 4) friends = friends.concat(other.slice(0, 4 - friends.length));
        return friends.slice(0, TRANSFER_FRIENDS_REVEALED);
    }

    function groundTruth(novelSpecies, friendNodes) {
        if (opts.condition === 'homophily') {
            var counts = [0, 0];
            friendNodes.forEach(n => counts[behaviorArr[n]]++);
            return counts[1] > counts[0] ? 1 : 0;
        } else {
            return novelSpecies;
        }
    }

    var speciesAssignments = jsPsych.randomization.sampleWithoutReplacement([0,0,0,1,1], 5);
    var shuffledTransferNames = jsPsych.randomization.shuffle([...TRANSFER_NAMES]);

    return shuffledTransferNames.map(function(novelName, trialIdx) {
        var novelSpecies = speciesAssignments[trialIdx];
        var speciesLabel = novelSpecies === 0 ? 'blue gazorp' : 'red gazorp';
        var friendNodes  = sampleFriends(novelSpecies);
        var gt           = groundTruth(novelSpecies, friendNodes);
        var icon0        = behaviorIcon(0, bLabels);
        var icon1        = behaviorIcon(1, bLabels);

        var html = `
            <div class='transfer-box prevent-select'>
                <div class='trial-counter'>${trialIdx + 1} / ${TRANSFER_NAMES.length}</div>

                <!-- intro + cue choice: always visible -->
                <div style='text-align:center; margin-bottom:16px;'>
                    <img src='stimuli/aliens/blue_gazorp.png' style='width:100px; filter:grayscale(100%);'>
                    <div style='font-size:22px; font-weight:700; margin-top:8px;'>${novelName}</div>
                </div>
                <p class='transfer-prompt'>
                    ${novelName} has <b>${TRANSFER_FRIENDS_REVEALED} friends</b> among the gazorps you learned about.<br>
                    To predict what ${novelName} eats, you can learn <u>one thing</u>:
                </p>
                <div class='cue-choice-row' id='t-cue-choice'>
                    <button class='cue-btn' id='btn-species'>
                        Learn whether ${novelName} is a<br>blue or red gazorp
                    </button>
                    <button class='cue-btn' id='btn-friends'>
                        Learn who ${novelName}'s<br>friends are
                    </button>
                </div>

                <!-- cue reveal: hidden until choice -->
                <div id='t-cue-reveal' style='display:none; margin-top:28px;'></div>

                <!-- continue after reveal -->
                <div id='t-reveal-continue' style='display:none; text-align:center; margin-top:20px;'>
                    <button class='jspsych-btn' id='reveal-continue'>Continue</button>
                </div>

                <!-- prediction: hidden until continue -->
                <div id='t-prediction' style='display:none; margin-top:28px;'>
                    <p class='transfer-prompt'>What does <b>${novelName}</b> eat?</p>
                    <div class='prediction-row'>
                        <button class='pred-btn food-btn' id='pred-0'>
                            <img src='${icon0}' class='food-btn-icon'>${bLabels[0]}
                        </button>
                        <button class='pred-btn food-btn' id='pred-1'>
                            <img src='${icon1}' class='food-btn-icon'>${bLabels[1]}
                        </button>
                    </div>
                </div>

                <!-- confidence: hidden until prediction click -->
                <div id='t-confidence' style='display:none; margin-top:24px;'>
                    <div class='slider-question'>
                        <p class='question-text'>How confident are you?</p>
                        <input type='range' class='trial-slider' id='conf-slider'
                            min='0' max='100' step='1' value='50'>
                        <div class='slider-footer'>
                            <span class='slider-label-min'>Not at all confident</span>
                            <span class='slider-value-display' id='conf-val'>?</span>
                            <span class='slider-label-max'>Very confident</span>
                        </div>
                    </div>
                    <div style='text-align:center; margin-top:16px;'>
                        <button class='jspsych-btn' id='pred-submit' disabled>Submit</button>
                    </div>
                </div>
            </div>`;

        return {
            type: jsPsychHtmlButtonResponse,
            stimulus: html,
            choices: [],
            response_ends_trial: false,
            on_load: function() {
                var stageStart   = performance.now();
                var selectedPred = null;
                var sliderTouched = false;
                var cueChoiceRT = null, binaryRT = null, sliderRT = null;

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

                function show(id) {
                    var el = document.getElementById(id);
                    if (el) el.style.display = '';
                }

                // cue choice
                function handleCueChoice(cue) {
                    // lock buttons
                    document.getElementById('btn-species').disabled = true;
                    document.getElementById('btn-friends').disabled = true;
                    document.getElementById('btn-' + cue).classList.add('selected');

                    cueChoiceRT = Math.round(performance.now() - stageStart);
                    trialRecord.cue_choice    = cue;
                    trialRecord.cue_choice_RT = cueChoiceRT;

                    var revealEl = document.getElementById('t-cue-reveal');
                    if (cue === 'species') {
                        trialRecord.revealed_info_summary = speciesLabel;
                        revealEl.innerHTML = `
                            <div class='reveal-center'>
                                <p style='font-size:17px; color:#555;'>${novelName} is a:</p>
                                <div style='text-align:center;'>
                                    <img src='${speciesImg(novelSpecies)}' class='alien-img' style='width:120px;height:120px;'>
                                    <div style='font-size:17px; font-weight:600; margin-top:6px;'>${speciesLabel}</div>
                                </div>
                            </div>`;
                    } else {
                        trialRecord.revealed_info_summary = friendNodes.map(n => nameMap[n]).join(', ');
                        var friendCards = friendNodes.map(function(n) {
                            var fname  = nameMap[n];
                            var fimg   = speciesImg(speciesArr[n]);
                            var ficon  = behaviorIcon(behaviorArr[n], bLabels);
                            var flabel = bLabels[behaviorArr[n]];
                            return `
                                <div class='friend-card'>
                                    <img src='${fimg}' class='alien-img' style='width:80px;height:80px;'>
                                    <div class='friend-name'>${fname}</div>
                                    <div class='friend-info'>
                                        <img src='${ficon}' alt='${flabel}'>${flabel}
                                    </div>
                                </div>`;
                        }).join('');
                        revealEl.innerHTML = `
                            <div class='reveal-center'>
                                <p style='font-size:17px; color:#555; margin-bottom:4px;'>${novelName}'s friends:</p>
                                <div class='friends-grid'>${friendCards}</div>
                            </div>`;
                    }

                    show('t-cue-reveal');
                    show('t-reveal-continue');
                    stageStart = performance.now();

                    document.getElementById('reveal-continue').addEventListener('click', function() {
                        document.getElementById('t-reveal-continue').style.display = 'none';
                        show('t-prediction');
                        stageStart = performance.now();
                    });
                }

                document.getElementById('btn-species').addEventListener('click', () => handleCueChoice('species'));
                document.getElementById('btn-friends').addEventListener('click', () => handleCueChoice('friends'));

                // prediction
                function handleBinary(predInt) {
                    if (selectedPred !== null) return;
                    selectedPred = predInt;
                    binaryRT = Math.round(performance.now() - stageStart);
                    document.getElementById('pred-' + predInt).classList.add('selected');
                    document.getElementById('pred-' + (1 - predInt)).disabled = true;

                    show('t-confidence');
                    var slider = document.getElementById('conf-slider');
                    updateSliderGradient(slider, '#343633');
                    stageStart = performance.now();

                    slider.addEventListener('input', function() {
                        updateSliderGradient(slider, '#343633');
                        if (sliderTouched) {
                            document.getElementById('conf-val').textContent = slider.value;
                        }
                    });
                    function touchSlider() {
                        if (!sliderTouched) {
                            sliderTouched = true;
                            sliderRT = Math.round(performance.now() - stageStart);
                            document.getElementById('conf-val').textContent = slider.value;
                            document.getElementById('pred-submit').disabled = false;
                        }
                    }
                    slider.addEventListener('mousedown', touchSlider);
                    slider.addEventListener('touchstart', touchSlider);
                    slider.addEventListener('keydown',   touchSlider);
                }

                document.getElementById('pred-0').addEventListener('click', () => handleBinary(0));
                document.getElementById('pred-1').addEventListener('click', () => handleBinary(1));

                // submit
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
        };
    });
}
