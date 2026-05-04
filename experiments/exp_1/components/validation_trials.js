// phase 2: edge recognition, species recall, behavior recall

// helpers for val-counter pips
function valPips(current, total) {
    return Array.from({ length: total }, function(_, i) {
        var cls = i < current ? 'done' : i === current ? 'now' : '';
        return `<div class='val-counter-pip ${cls}'></div>`;
    }).join('');
}

// 2a — edge recognition
function buildEdgeRecTrials(trials, nameMapping, species, jsPsych, sessionData) {
    var shuffled = jsPsych.randomization.shuffle([...trials]).slice(0, 5);
    return shuffled.map(function(t, i) {
        var html = `
            <div class='page-inner val-stage prevent-select'>
                <div class='val-card'>
                    <div class='val-counter'>
                        <span>Friendship &nbsp;·&nbsp; ${i + 1} of ${shuffled.length}</span>
                        <div class='val-counter-pips'>${valPips(i, shuffled.length)}</div>
                    </div>
                    <p class='val-prompt'>Were these two aliens friends?</p>
                    <div class='val-subjects'>
                        <div class='val-subject'>
                            <div class='alien-img-wrap'>
                                <img src='${speciesImg(t.pair[0], species[t.pair[0]])}' class='alien-img' alt=''>
                            </div>
                        </div>
                        <div class='val-subject'>
                            <div class='alien-img-wrap'>
                                <img src='${speciesImg(t.pair[1], species[t.pair[1]])}' class='alien-img' alt=''>
                            </div>
                        </div>
                    </div>
                    <div class='val-options'>
                        <button class='option' id='btn-yes'>Yes</button>
                        <button class='option' id='btn-no'>No</button>
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
                function respond(choice) {
                    document.getElementById('btn-' + choice).classList.add('selected');
                    var correct = (choice === 'yes') === t.true_edge;
                    sessionData.phase_2_validation.edge_recognition.push({
                        trial_idx: i, pair: t.pair, true_edge: t.true_edge,
                        response: choice, correct: correct,
                        RT: Math.round(performance.now() - trialStart)
                    });
                    setTimeout(function() { jsPsych.finishTrial(); }, 200);
                }
                document.getElementById('btn-yes').addEventListener('click', () => respond('yes'));
                document.getElementById('btn-no').addEventListener('click',  () => respond('no'));
            }
        };
    });
}

// 2b — species recall (node → green or orange)
function buildSpeciesRecallTrials(species, nameMapping, jsPsych, sessionData) {
    var nodes = jsPsych.randomization.shuffle([...Array(species.length).keys()]);
    return nodes.map(function(node, i) {
        var truth = species[node];
        var html = `
            <div class='page-inner val-stage prevent-select'>
                <div class='val-card'>
                    <div class='val-counter'>
                        <span>Species &nbsp;·&nbsp; ${i + 1} of ${nodes.length}</span>
                        <div class='val-counter-pips'>${valPips(i, nodes.length)}</div>
                    </div>
                    <p class='val-prompt'>Is this alien <span style='color:var(--species-green); font-weight:600;'>green</span> or <span style='color:var(--species-orange); font-weight:600;'>orange</span>?</p>
                    <div class='val-subjects'>
                        <div class='val-subject'>
                            <div class='alien-img-wrap'>
                                <img src='${speciesImg(node, truth)}' class='alien-img' style='filter:grayscale(100%);' alt=''>
                            </div>
                        </div>
                    </div>
                    <div class='val-options'>
                        <button class='option' id='btn-green'>
                            <div class='option-swatch swatch-green'></div>green
                        </button>
                        <button class='option' id='btn-orange'>
                            <div class='option-swatch swatch-orange'></div>orange
                        </button>
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
                function respond(resp) {
                    document.getElementById(resp === 0 ? 'btn-green' : 'btn-orange').classList.add('selected');
                    sessionData.phase_2_validation.species_recall.push({
                        trial_idx: i, node: node, truth: truth, response: resp,
                        correct: resp === truth, RT: Math.round(performance.now() - trialStart)
                    });
                    setTimeout(function() { jsPsych.finishTrial(); }, 200);
                }
                document.getElementById('btn-green').addEventListener('click',  () => respond(0));
                document.getElementById('btn-orange').addEventListener('click', () => respond(1));
            }
        };
    });
}

// 2c — behavior recall (node → glorp or flim)
function buildBehaviorRecallTrials(behavior, nameMapping, behaviorLabels, species, jsPsych, sessionData) {
    var nodes = jsPsych.randomization.shuffle([...Array(behavior.length).keys()]);
    var label0 = behaviorLabels[0], label1 = behaviorLabels[1];
    return nodes.map(function(node, i) {
        var truth = behavior[node];
        var html = `
            <div class='page-inner val-stage prevent-select'>
                <div class='val-card'>
                    <div class='val-counter'>
                        <span>Eating habits &nbsp;·&nbsp; ${i + 1} of ${nodes.length}</span>
                        <div class='val-counter-pips'>${valPips(i, nodes.length)}</div>
                    </div>
                    <p class='val-prompt'>What does this alien eat?</p>
                    <div class='val-subjects'>
                        <div class='val-subject'>
                            <div class='alien-img-wrap'>
                                <img src='${speciesImg(node, species[node])}' class='alien-img' alt=''>
                            </div>
                        </div>
                    </div>
                    <div class='val-options'>
                        <button class='option' id='btn-b0'>
                            <img src='${behaviorIcon(0, behaviorLabels)}' class='option-icon' alt=''>${label0}
                        </button>
                        <button class='option' id='btn-b1'>
                            <img src='${behaviorIcon(1, behaviorLabels)}' class='option-icon' alt=''>${label1}
                        </button>
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
                function respond(resp) {
                    document.getElementById(resp === 0 ? 'btn-b0' : 'btn-b1').classList.add('selected');
                    sessionData.phase_2_validation.behavior_recall.push({
                        trial_idx: i, node: node, truth: truth, response: resp,
                        correct: resp === truth, RT: Math.round(performance.now() - trialStart)
                    });
                    setTimeout(function() { jsPsych.finishTrial(); }, 200);
                }
                document.getElementById('btn-b0').addEventListener('click', () => respond(0));
                document.getElementById('btn-b1').addEventListener('click', () => respond(1));
            }
        };
    });
}
