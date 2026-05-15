// phase 3: transfer trial — progressive reveal w/ section dimming
// sections dim when participant moves past them; binary choice is final

function buildTransferTrials(opts, jsPsych) {
    // friends in this trial are synthetic (not graph-derived), so the only
    // participant-level state we need is the food-label mapping.
    var bLabels = opts.behaviorLabels;

    // resolve which behavior int corresponds to each food label for this
    // participant (behaviorSwap in experiment.js randomizes the assignment)
    var glorpBehavior = bLabels[0] === 'glorp' ? 0 : 1;
    var flimBehavior  = 1 - glorpBehavior;

    // generate the friend display for one trial. friends are synthetic
    // (not drawn from the learning graph): we pick a glorp-count uniformly
    // from {0,1,2,3}, build the corresponding behavior array, and shuffle
    // the order. friends are rendered featurelessly (color masked) so the
    // friends cue carries food-distribution information only.
    function generateFriendBehaviors() {
        var glorpCount = jsPsych.randomization.sampleWithoutReplacement([0, 1, 2, 3], 1)[0];
        var behaviors  = [];
        for (var k = 0; k < glorpCount;             k++) behaviors.push(glorpBehavior);
        for (var k = 0; k < TRANSFER_FRIENDS_REVEALED - glorpCount; k++) behaviors.push(flimBehavior);
        return {
            behaviors:        jsPsych.randomization.shuffle(behaviors),
            glorpCount:       glorpCount,
            majorityBehavior: glorpCount > TRANSFER_FRIENDS_REVEALED / 2 ? glorpBehavior : flimBehavior
        };
    }

    var speciesAssignments = jsPsych.randomization.shuffle([0, 1]);
    var shuffledTransferNames = jsPsych.randomization.shuffle([...TRANSFER_NAMES]);

    return shuffledTransferNames.map(function(novelName, trialIdx) {
        var novelSpecies   = speciesAssignments[trialIdx];
        var speciesLabel   = novelSpecies === 0 ? 'green' : 'orange';
        // design number for this transfer alien — drawn from the 2 designs held
        // out from learning (passed in as opts.transferDesignNums)
        var novelDesignNum = opts.transferDesignNums[trialIdx];  // logged for reference
        var alienColor     = novelSpecies === 0 ? 'green' : 'orange';
        // always use alien_00 for transfer — greyscale applied via .novel-alien.unknown
        var speciesColor   = novelSpecies === 0 ? 'var(--species-green)' : 'var(--species-orange)';
        var icon0          = behaviorIcon(0, bLabels);
        var icon1          = behaviorIcon(1, bLabels);

        // generate this trial's friend display — 3 featureless friends with a
        // randomly-sampled glorp-count distribution. friend identity, species,
        // and graph-membership are not conveyed; only the food labels are.
        var friendsInfo            = generateFriendBehaviors();
        var friendBehaviors        = friendsInfo.behaviors;       // length 3, behavior ints
        var friendGlorpCount       = friendsInfo.glorpCount;      // 0..3
        var friendMajorityBehavior = friendsInfo.majorityBehavior;

        // build friend cards HTML — featureless silhouettes with food labels
        var friendCardsHtml = friendBehaviors.map(function(behInt, fi) {
            var ficon  = behaviorIcon(behInt, bLabels);
            var flabel = bLabels[behInt];
            return `
                <div class='friend-card' style='animation-delay:${fi * 80}ms'>
                    <div class='alien-img-wrap'>
                        <img src='${FEATURELESS_FRIEND_IMG}' class='alien-img' alt=''>
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
                                <img src='stimuli/aliens/alien_00_green.png' class='alien-img' alt=''>
                            </div>
                            <div class='novel-tag'>new alien &nbsp;·&nbsp; ${trialIdx + 1} of ${TRANSFER_NAMES.length}</div>
                            <div class='novel-grey-note'>This alien's color is hidden. Choose a clue below to learn more.</div>
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
                    novel_agent_name:        novelName,
                    novel_agent_species:     novelSpecies,
                    novel_design_num:        novelDesignNum,
                    friend_count:            TRANSFER_FRIENDS_REVEALED,
                    friend_glorp_count:      friendGlorpCount,           // 0..3
                    friend_behaviors_shown:  friendBehaviors,            // array, in display order
                    friend_majority_behavior: friendMajorityBehavior,    // behavior int the majority eats
                    cue_choice:              null,
                    cue_choice_RT:           null,
                    revealed_info_summary:   null,
                    behavior_prediction:     null,
                    confidence:              null,
                    prediction_matches_friend_majority: null,
                    RT_binary:               null,
                    RT_slider:               null
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
                                    <img src='stimuli/aliens/alien_00_${alienColor}.png' class='alien-img' alt=''>
                                </div>
                                <div style='color:${speciesColor}; font-weight:700; font-size:16px;'>${speciesLabel} alien</div>
                            </div>`;
                    } else {
                        // summarize the food distribution shown (e.g. "2 glorp, 1 flim")
                        trialRecord.revealed_info_summary =
                            friendGlorpCount + ' ' + bLabels[glorpBehavior] + ', ' +
                            (TRANSFER_FRIENDS_REVEALED - friendGlorpCount) + ' ' + bLabels[flimBehavior];
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
                    trialRecord.behavior_prediction              = selectedPred;
                    trialRecord.confidence                       = confVal;
                    trialRecord.prediction_matches_friend_majority = selectedPred === friendMajorityBehavior;
                    trialRecord.RT_binary                        = binaryRT;
                    trialRecord.RT_slider                        = sliderRT;
                    opts.sessionData.phase_3_transfer.trials.push(trialRecord);
                    logToBrowser('transfer trial', trialRecord);
                    jsPsych.finishTrial();
                });
            }
        };
    });
}
