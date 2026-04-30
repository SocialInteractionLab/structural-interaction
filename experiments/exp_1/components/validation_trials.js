// phase 2: edge recognition, species recall, behavior recall

// 2a — edge recognition
// trials: array of {pair, true_edge} from graph JSON
function buildEdgeRecTrials(trials, nameMapping, species, jsPsych, sessionData) {
    var shuffled = jsPsych.randomization.shuffle([...trials]).slice(0, 5);
    return shuffled.map(function(t, i) {
        var nameA = nameMapping[t.pair[0]], nameB = nameMapping[t.pair[1]];
        var html = `
            <div class='validation-box prevent-select'>
                <div class='trial-counter'>${i + 1} / ${shuffled.length}</div>
                <p class='prompt'>Were these two aliens friends with each other?</p>
                <div class='validation-pair'>
                    <div class='validation-alien'>
                        <img src='${speciesImg(t.pair[0], species[t.pair[0]])}' class='neutral-img' alt=''>
                        <!-- <div class='validation-name'>${nameA}</div> -->
                    </div>
                    <div class='validation-alien'>
                        <img src='${speciesImg(t.pair[1], species[t.pair[1]])}' class='neutral-img' alt=''>
                        <!-- <div class='validation-name'>${nameB}</div> -->
                    </div>
                </div>
                <div class='btn-row'>
                    <button class='choice-btn' id='btn-yes'>Yes</button>
                    <button class='choice-btn' id='btn-no'>No</button>
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
                    var correct = (choice === 'yes') === t.true_edge;
                    sessionData.phase_2_validation.edge_recognition.push({
                        trial_idx: i,
                        pair:      t.pair,
                        true_edge: t.true_edge,
                        response:  choice,
                        correct:   correct,
                        RT:        Math.round(performance.now() - trialStart)
                    });
                    jsPsych.finishTrial();
                }
                document.getElementById('btn-yes').addEventListener('click', () => respond('yes'));
                document.getElementById('btn-no').addEventListener('click',  () => respond('no'));
            }
        };
    });
}

// 2b — species recall (node → blue or red)
// species: array[12], nameMapping: {node: name}
function buildSpeciesRecallTrials(species, nameMapping, jsPsych, sessionData) {
    var nodes = jsPsych.randomization.shuffle([...Array(species.length).keys()]);
    return nodes.map(function(node, i) {
        var name = nameMapping[node];
        var truth = species[node];
        var html = `
            <div class='validation-box prevent-select'>
                <div class='trial-counter'>${i + 1} / ${nodes.length}</div>
                <p class='prompt'>Is this alien <span style='color:#1fb092; font-weight:600;'>green</span> or <span style='color:#ee5e33; font-weight:600;'>orange</span>?</p>
                <div class='validation-pair'>
                    <div class='validation-alien'>
                        <img src='${speciesImg(node, truth)}' class='neutral-img' style='filter:grayscale(100%);' alt=''>
                        <!-- <div class='validation-name'>${name}</div> -->
                    </div>
                </div>
                <div class='btn-row'>
                    <button class='choice-btn food-btn' id='btn-green'>
                        <img src='stimuli/aliens/alien_1_green.png' class='food-btn-icon'>green
                    </button>
                    <button class='choice-btn food-btn' id='btn-orange'>
                        <img src='stimuli/aliens/alien_1_orange.png' class='food-btn-icon'>orange
                    </button>
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
                    sessionData.phase_2_validation.species_recall.push({
                        trial_idx: i,
                        node:      node,
                        truth:     truth,
                        response:  resp,
                        correct:   resp === truth,
                        RT:        Math.round(performance.now() - trialStart)
                    });
                    jsPsych.finishTrial();
                }
                document.getElementById('btn-green').addEventListener('click',  () => respond(0));
                document.getElementById('btn-orange').addEventListener('click', () => respond(1));
            }
        };
    });
}

// 2c — behavior recall (node → glorp or flim)
// behavior: array[12], behaviorLabels: {0: 'glorp'|'flim', 1: ...}
function buildBehaviorRecallTrials(behavior, nameMapping, behaviorLabels, species, jsPsych, sessionData) {
    var nodes = jsPsych.randomization.shuffle([...Array(behavior.length).keys()]);
    var label0 = behaviorLabels[0], label1 = behaviorLabels[1];
    return nodes.map(function(node, i) {
        var name  = nameMapping[node];
        var truth = behavior[node];
        var html  = `
            <div class='validation-box prevent-select'>
                <div class='trial-counter'>${i + 1} / ${nodes.length}</div>
                <p class='prompt'>What does this alien eat?</p>
                <div class='validation-pair'>
                    <div class='validation-alien'>
                        <img src='${speciesImg(node, species[node])}' class='neutral-img' alt=''>
                        <!-- <div class='validation-name'>${name}</div> -->
                    </div>
                </div>
                <div class='btn-row'>
                    <button class='choice-btn food-btn' id='btn-b0'>
                        <img src='${behaviorIcon(0, behaviorLabels)}' class='food-btn-icon'>${label0}
                    </button>
                    <button class='choice-btn food-btn' id='btn-b1'>
                        <img src='${behaviorIcon(1, behaviorLabels)}' class='food-btn-icon'>${label1}
                    </button>
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
                    sessionData.phase_2_validation.behavior_recall.push({
                        trial_idx: i,
                        node:      node,
                        truth:     truth,
                        response:  resp,
                        correct:   resp === truth,
                        RT:        Math.round(performance.now() - trialStart)
                    });
                    jsPsych.finishTrial();
                }
                document.getElementById('btn-b0').addEventListener('click', () => respond(0));
                document.getElementById('btn-b1').addEventListener('click', () => respond(1));
            }
        };
    });
}
