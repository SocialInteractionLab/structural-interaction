// phase 3: transfer trial — progressive reveal w/ section dimming
// sections dim when participant moves past them; binary choice is final

function buildTransferTrials(opts, jsPsych) {
    var speciesArr  = opts.species;
    var behaviorArr = opts.behavior;
    var nameMap     = opts.nameMapping;
    var bLabels     = opts.behaviorLabels;

    // sample TRANSFER_FRIENDS_REVEALED concordant friends for the transfer alien
    function sampleFriends(targetBehavior) {
        var concordant = [], other = [];
        for (var n = 0; n < 8; n++) {  // graph has 8 nodes
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
            friendNodes.forEach(function(n) { counts[behaviorArr[n]]++; });
            return counts[1] > counts[0] ? 1 : 0;
        } else {
            return novelSpecies;
        }
    }

    var speciesAssignments = jsPsych.randomization.shuffle([0, 1]);
    var shuffledTransferNames = jsPsych.randomization.shuffle([...TRANSFER_NAMES]);

    return shuffledTransferNames.map(function(novelName, trialIdx) {
        var novelSpecies   = speciesAssignments[trialIdx];
        var speciesLabel   = novelSpecies === 0 ? 'green' : 'orange';
        var alienDesignIdx = opts.transferAlienIndices[trialIdx];
        var alienColor     = novelSpecies === 0 ? 'green' : 'orange';
        var speciesColor   = novelSpecies === 0 ? 'var(--species-green)' : 'var(--species-orange)';
        var friendNodes    = sampleFriends(novelSpecies);
        var gt             = groundTruth(novelSpecies, friendNodes);
        var icon0          = behaviorIcon(0, bLabels);
        var icon1          = behaviorIcon(1, bLabels);

        // build friend cards HTML
        var friendCardsHtml = friendNodes.map(function(n, fi) {
            var fimg   = speciesImg(n, speciesArr[n]);
            var ficon  = behaviorIcon(behaviorArr[n], bLabels);
            var flabel = bLabels[behaviorArr[n]];
            return `
                <div class='friend-card' style='animation-delay:${fi * 80}ms'>
                    <div class='alien-img-wrap'>
                        <img src='${fimg}' class='alien-img' alt=''>
                    </div>
                    <div class='friend-pill'>
                        <img src='${ficon}' alt=''>${flabel}
                    </div>
                </div>`;
        }).join('');

        var html = `
            <div class='page-inner transfer-stage prevent-select'>
                <div class='transfer-card'>

                    <!-- section 1: cue choice (always visible) -->
                    <div class='transfer-section' id='ts-cue'>
                        <div class='novel-alien unknown'>
                            <div class='alien-img-wrap'>
                                <img src='stimuli/aliens/alien_${alienDesignIdx + 1}_green.png' class='alien-img' alt=''>
                            </div>
                            <div class='novel-tag'>a new alien &nbsp;·&nbsp; ${trialIdx + 1} of ${TRANSFER_NAMES.length}</div>
                        </div>
                        <p class='transfer-q'>What do you think this alien eats?</p>
                        <p class='transfer-sub'>
                            To help you decide, you can learn <strong>one thing</strong> about them:
                        </p>
                        <div class='cue-grid'>
                            <button class='cue-card' id='btn-species'>
                                <div class='cue-icon cue-icon-color'></div>
                                <div class='cue-title'>Their color</div>
                                <div class='cue-desc'>Find out if this alien is green or orange.</div>
                            </button>
                            <button class='cue-card' id='btn-friends'>
                                <div class='cue-icon'>
                                    <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'>
                                        <circle cx='9' cy='8' r='3'/><circle cx='17' cy='8' r='3'/>
                                        <path d='M3 20c0-3 3-5 6-5s6 2 6 5M13 20c0-2.5 2-4.2 4-4.2s4 1.7 4 4.2'/>
                                    </svg>
                                </div>
                                <div class='cue-title'>Their friends</div>
                                <div class='cue-desc'>See who this alien spends time with.</div>
                            </button>
                        </div>
                    </div>

                    <!-- section 2: cue reveal (hidden until choice) -->
                    <div class='transfer-section appearing' id='ts-reveal' style='display:none;'>
                        <div class='reveal-block' id='reveal-content'></div>
                        <div class='btn-row' style='margin-top:22px;' id='reveal-continue-row'>
                            <button class='btn btn-secondary' id='reveal-continue'>Continue</button>
                        </div>
                    </div>

                    <!-- section 3: prediction (hidden until continue) -->
                    <div class='transfer-section appearing' id='ts-predict' style='display:none;'>
                        <p class='transfer-q'>So… what does this alien eat?</p>
                        <div class='predict-row'>
                            <button class='predict-btn' id='pred-0'>
                                <img src='${icon0}' alt=''>${bLabels[0]}
                            </button>
                            <button class='predict-btn' id='pred-1'>
                                <img src='${icon1}' alt=''>${bLabels[1]}
                            </button>
                        </div>
                    </div>

                    <!-- section 4: confidence (hidden until prediction) -->
                    <div class='transfer-section appearing' id='ts-confidence' style='display:none;'>
                        <div class='slider-block'>
                            <p class='transfer-q' style='font-size:22px;'>How confident are you?</p>
                            <div class='slider-value' id='conf-val'>?</div>
                            <input type='range' class='slider' id='conf-slider' min='0' max='100' step='1' value='50'>
                            <div class='slider-row'>
                                <span>Not at all</span>
                                <span>Very confident</span>
                            </div>
                        </div>
                        <div class='btn-row' style='margin-top:22px;'>
                            <button class='btn' id='pred-submit' disabled>Submit</button>
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
                    friend_behaviors:    friendNodes.map(function(n) { return behaviorArr[n]; }),
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
                function dim(id) {
                    var el = document.getElementById(id);
                    if (el) el.classList.add('dimmed');
                }

                // cue choice
                function handleCueChoice(cue) {
                    document.getElementById('btn-species').disabled = true;
                    document.getElementById('btn-friends').disabled = true;
                    document.getElementById('btn-' + cue).classList.add('selected');
                    document.getElementById('btn-' + cue).classList.remove('locked');
                    document.getElementById(cue === 'species' ? 'btn-friends' : 'btn-species').classList.add('locked');

                    cueChoiceRT = Math.round(performance.now() - stageStart);
                    trialRecord.cue_choice    = cue;
                    trialRecord.cue_choice_RT = cueChoiceRT;

                    var revealEl = document.getElementById('reveal-content');
                    if (cue === 'species') {
                        trialRecord.revealed_info_summary = speciesLabel + ' alien';
                        revealEl.innerHTML = `
                            <div class='reveal-label'>This alien's color</div>
                            <div style='display:flex; flex-direction:column; align-items:center; gap:10px;'>
                                <div class='alien-img-wrap' style='width:160px; height:160px;'>
                                    <img src='stimuli/aliens/alien_${alienDesignIdx + 1}_${alienColor}.png' class='alien-img' alt=''>
                                </div>
                                <div style='color:${speciesColor}; font-weight:700; font-size:16px;'>${speciesLabel} alien</div>
                            </div>`;
                    } else {
                        trialRecord.revealed_info_summary = friendNodes.map(function(n) { return nameMap[n]; }).join(', ');
                        revealEl.innerHTML = `
                            <div class='reveal-label'>This alien's ${TRANSFER_FRIENDS_REVEALED} friends</div>
                            <div class='friends-row'>${friendCardsHtml}</div>`;
                    }

                    dim('ts-cue');
                    show('ts-reveal');
                    stageStart = performance.now();

                    document.getElementById('reveal-continue').addEventListener('click', function() {
                        show('ts-predict');
                        stageStart = performance.now();
                    });
                }

                document.getElementById('btn-species').addEventListener('click', function() { handleCueChoice('species'); });
                document.getElementById('btn-friends').addEventListener('click', function() { handleCueChoice('friends'); });

                // prediction
                function handleBinary(predInt) {
                    if (selectedPred !== null) return;
                    selectedPred = predInt;
                    binaryRT = Math.round(performance.now() - stageStart);
                    document.getElementById('pred-' + predInt).classList.add('selected');
                    document.getElementById('pred-' + (1 - predInt)).disabled = true;

                    dim('ts-predict');
                    show('ts-confidence');

                    var slider = document.getElementById('conf-slider');
                    updateSliderGradient(slider, 'var(--accent)');
                    stageStart = performance.now();

                    slider.addEventListener('input', function() {
                        updateSliderGradient(slider, 'var(--accent)');
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

                document.getElementById('pred-0').addEventListener('click', function() { handleBinary(0); });
                document.getElementById('pred-1').addEventListener('click', function() { handleBinary(1); });

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
