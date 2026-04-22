// phase 2: edge recognition, species recall, behavior recall

// 2a — edge recognition
// trials: array of {pair, true_edge} from graph JSON
function buildEdgeRecTrials(trials, nameMapping, jsPsych, sessionData) {
    var shuffled = jsPsych.randomization.shuffle([...trials]);
    return shuffled.map(function(t, i) {
        var nameA = nameMapping[t.pair[0]], nameB = nameMapping[t.pair[1]];
        var html = `
            <div class='validation-box prevent-select'>
                <div class='trial-counter'>${i + 1} / ${shuffled.length}</div>
                <p class='prompt'>Were <b>${nameA}</b> and <b>${nameB}</b> friends?</p>
                <div class='validation-pair'>
                    <div class='validation-alien'>
                        <img src='stimuli/aliens/neutral_gazorp.svg' class='neutral-img' alt='${nameA}'>
                        <div class='validation-name'>${nameA}</div>
                    </div>
                    <div class='validation-alien'>
                        <img src='stimuli/aliens/neutral_gazorp.svg' class='neutral-img' alt='${nameB}'>
                        <div class='validation-name'>${nameB}</div>
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
    var nodes = jsPsych.randomization.shuffle([...Array(12).keys()]);
    return nodes.map(function(node, i) {
        var name = nameMapping[node];
        var truth = species[node];
        var html = `
            <div class='validation-box prevent-select'>
                <div class='trial-counter'>${i + 1} / 12</div>
                <p class='prompt'>Is <b>${name}</b> a blue gazorp or a red gazorp?</p>
                <div class='validation-pair'>
                    <div class='validation-alien'>
                        <img src='stimuli/aliens/neutral_gazorp.svg' class='neutral-img' alt='${name}'>
                        <div class='validation-name'>${name}</div>
                    </div>
                </div>
                <div class='btn-row'>
                    <button class='choice-btn' id='btn-blue'>blue gazorp</button>
                    <button class='choice-btn' id='btn-red'>red gazorp</button>
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
                document.getElementById('btn-blue').addEventListener('click', () => respond(0));
                document.getElementById('btn-red').addEventListener('click',  () => respond(1));
            }
        };
    });
}

// 2c — behavior recall (node → glorp or flim)
// behavior: array[12], behaviorLabels: {0: 'glorp'|'flim', 1: ...}
function buildBehaviorRecallTrials(behavior, nameMapping, behaviorLabels, jsPsych, sessionData) {
    var nodes = jsPsych.randomization.shuffle([...Array(12).keys()]);
    var label0 = behaviorLabels[0], label1 = behaviorLabels[1];
    return nodes.map(function(node, i) {
        var name  = nameMapping[node];
        var truth = behavior[node];
        var html  = `
            <div class='validation-box prevent-select'>
                <div class='trial-counter'>${i + 1} / 12</div>
                <p class='prompt'>What does <b>${name}</b> eat?</p>
                <div class='validation-pair'>
                    <div class='validation-alien'>
                        <img src='stimuli/aliens/neutral_gazorp.svg' class='neutral-img' alt='${name}'>
                        <div class='validation-name'>${name}</div>
                    </div>
                </div>
                <div class='btn-row'>
                    <button class='choice-btn' id='btn-b0'>${label0}</button>
                    <button class='choice-btn' id='btn-b1'>${label1}</button>
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
