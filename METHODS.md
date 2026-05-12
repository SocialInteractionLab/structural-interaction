# Methods

## Participants

We will recruit *N* adult participants (≥ 18 years) through Prolific. The study is restricted to desktop computers; mobile devices are detected at load and returned to Prolific. Participants are compensated $*X* for an estimated 10-minute session. Pre-registered exclusion criteria are described below. All procedures were approved by the Stanford University Institutional Review Board.

## Materials

### Network stimuli

Each participant is randomly assigned one of five pre-generated synthetic social networks. Networks are sampled from a stochastic block model with *N* = 8 nodes ("aliens") and exactly 10 undirected edges ("friendships"), using within-block edge probability *p*<sub>in</sub> = 0.58 and between-block probability *p*<sub>out</sub> = 0.19. Blocks correspond to latent behavior communities (*M* = 2 communities, 4 nodes each). Networks are accepted only if they are connected, have minimum degree ≥ 2, and meet the correlation criteria specified below.

Each network supports two condition-specific attribute assignments over the same edge structure. We summarize each assignment with two correlation measures:

- **ρ(E→B)** = *P*(same behavior | edge) − *P*(same behavior | no edge) is the edge-based behavior signal. This quantity ranges over [−1, +1], with 0 indicating that edge presence carries no information about behavior agreement, +1 indicating that all connected pairs share a behavior and no disconnected pairs do, and −1 indicating the inverse.
- **ρ(C→B)** = *P*(behavior = group) − 0.5 is the categorical-based behavior signal. The 0.5 offset is the chance-level baseline for two balanced binary attributes (each value appears in 4 of 8 nodes), so ρ(C→B) ranges over [−0.5, +0.5], with 0 indicating that group membership agrees with behavior only at the rate expected by chance, +0.5 indicating perfect agreement, and −0.5 indicating perfect disagreement. For balanced binary attributes, this measure equals half the Pearson *φ* coefficient.

The two metrics therefore have different theoretical maxima (|ρ(E→B)|<sub>max</sub> = 1; |ρ(C→B)|<sub>max</sub> = 0.5), a point we return to below.

- **Relational condition.** Behavior is identified with the latent block structure, so connected pairs tend to share behavior: ρ(E→B) ≥ 0.40. Group ("color") labels are independently shuffled and remain orthogonal to behavior: |ρ(C→B)| ≤ 0.05.
- **Categorical condition.** Group labels are reshuffled, and behaviors are derived from group with flip probability *ε* = max(0, 0.5 − ρ(E→B)<sub>relational</sub>). The resulting network has group strongly predictive of behavior (ρ(C→B) ≥ 0.40) and edges uninformative about behavior (|ρ(E→B)| ≤ 0.05).

The two conditions are matched on the *absolute magnitude* of the diagnostic correlation (both ≥ 0.40) and on the absolute magnitude of the non-diagnostic correlation (both ≈ 0). Because the two metrics have different theoretical ranges, however, they are not matched in *relative* signal strength: a value of 0.40 is 40% of the maximum for ρ(E→B) but 80% of the maximum for ρ(C→B). In the pre-generated stimulus set used here (five networks), the relational condition shows ρ(E→B) ∈ [0.58, 0.73] (58–73% of maximum), while the categorical condition shows ρ(C→B) = 0.50 (100% of maximum) for all five networks. The search procedure drives *ε* to its lower clip of 0 whenever ρ(E→B)<sub>relational</sub> ≥ 0.50, making the categorical condition's color → behavior mapping deterministic in the current set. Any condition differences in transfer performance should therefore be interpreted in light of the fact that the categorical-condition signal is closer to its ceiling than the relational-condition signal.

### Visual stimuli

Ten unique cartoon alien designs are used, each rendered in two colors (green and orange). For each participant, eight designs are randomly sampled and assigned to the network nodes; the remaining two designs are held out as the novel agents in the transfer phase. An additional featureless silhouette stimulus is used to render friends in the transfer phase; it is presented with a grayscale CSS filter so that the friend cue conveys only food information, not species color.

Two icon-labeled food items, "glorp" and "flim," serve as behavior outcomes. The mapping between food labels and the underlying behavior integer is counterbalanced across participants. Twelve phonetically distinct alien names (e.g., Nep, Vor, Kil, Zan, …) are randomly assigned to the eight learning nodes for individuation, and two additional names (Vex, Jop) are reserved for the transfer aliens.

## Design

The experiment uses a between-subjects design with a single experimental factor: training condition (relational vs. categorical). Participants are randomly assigned to one condition at session start.

At transfer, the number of friends preferring "glorp" out of three is independently sampled from {0, 1, 2, 3} on each of the two transfer trials. This is a stimulus-level randomization rather than an additional experimental factor — with only two transfer trials per participant and independent sampling, the within-subject distribution is sparse, and the manipulation is intended to (a) prevent stereotyped stimulus configurations across participants and (b) enable exploratory aggregate analyses of cue weighting as a function of evidence strength, rather than to test a planned within-subject effect. Each transfer trial also independently randomizes the novel alien's species (counterbalanced so that each participant sees one green and one orange novel alien), the design–color assignment of the two held-out alien stimuli, and the order of the two trials.

The primary dependent measures collected at transfer are (i) cue choice (color vs. friends), (ii) binary food prediction, and (iii) stated confidence (continuous, 0–100). Secondary measures include validation-phase accuracy for edges, species, and behavior; response latencies; and a free-response strategy report.

## Procedure

The experiment is implemented in JavaScript using jsPsych (v8.1.0) and saves data through DataPipe to the Open Science Framework. Participants are required to enter fullscreen on consent and to remain in fullscreen throughout; departures trigger a return-to-fullscreen overlay. Page-visibility changes and idle intervals are logged. A session proceeds through five phases, all preceded by consent, onboarding, and a comprehension check.

### Onboarding and comprehension check

Three paginated introduction screens establish the cover story: an island called Dude is inhabited by eight aliens that come in two colors (green or orange) and eat one of two foods (glorp or flim); each pair of friends will be shown together with their food preferences. Each page enforces a 5-second read-lock before advancing. A three-item comprehension check follows, querying (1) the meaning of pair co-occurrence on screen, (2) the food vocabulary, and (3) the number of aliens to be learned. Incorrect responses return the participant to the introduction; participants who fail three consecutive attempts are flagged but allowed to continue.

### Phase 1: Learning

Participants complete 10 runs of the learning task. Each run consists of all 10 network edges presented in a freshly randomized order, yielding 100 paired-observation trials in total. On each trial, two friend aliens appear side by side with their food preferences hidden behind an opaque plate for 2,400 ms; the food labels then become visible for an additional 3,100 ms (total trial duration 5,500 ms). Non-edges are never presented, so the network structure must be inferred from co-occurrence over the course of training.

To monitor sustained attention, 12.5% of learning trials are randomly designated as attention-check trials, in which one of the two aliens is rendered upside-down. Participants are instructed to press the spacebar as soon as they detect an inverted alien. Brief progress screens are presented between runs.

### Phase 2: Validation

Three short blocks measure memory for the structural information learned in Phase 1. Block order is randomized within participant.

In the *edge-recognition* block, five trials are sampled from a pre-generated balanced pool of 10 edges and 10 non-edges. Each trial presents a pair of aliens and asks whether the two were friends (yes / no).

In the *species-recall* block, each of the eight aliens is presented in turn (order randomized) with its color desaturated, and the participant identifies the alien's color (green or orange).

In the *behavior-recall* block, each of the eight aliens is presented in turn with its color intact, and the participant identifies which of the two foods that alien ate.

### Phase 3: Transfer

Participants complete two transfer trials. Each trial introduces a previously unseen alien drawn from the two held-out designs, with the design–color assignment randomized so that one trial features a green novel agent and the other an orange novel agent. Trial order is also randomized.

On each trial, the novel alien is shown initially in grayscale so that its species color is hidden. Before predicting the alien's food, the participant must choose exactly one of two cues to reveal:

- **Color cue.** The novel alien's species (green or orange) is revealed. The friend display is not shown.
- **Friends cue.** Three "friends" of the novel alien are displayed, each rendered as the featureless silhouette under a grayscale filter so that only the friend's food preference is conveyed (no species color, no individual identity). The number of friends preferring "glorp" — and consequently the number preferring "flim" — is sampled uniformly at random from {0, 1, 2, 3} on each trial. Friend order within the row is shuffled.

After the chosen cue is revealed, the participant makes a forced-choice binary prediction of the novel alien's food, then reports their confidence on a 0–100 continuous slider. The unchosen cue is never revealed within the trial. Cue choice, prediction, confidence, and stage-level response latencies are recorded.

### Phase 4: Strategy

A free-response text field asks participants, in their own words, how they decided what each new alien ate and which information they found most useful in making their decisions. Time on screen is recorded.

### Phase 5: Demographics

Participants report age, gender, race/ethnicity (multi-select), and education level. The session ends with a completion screen, after which participants are automatically redirected to Prolific.

## Exclusion criteria

Pre-registered exclusion criteria are applied at the participant level. A participant is excluded from the primary analyses if any of the following hold:

- Attention-check (upside-down detection) hit rate below 80% in Phase 1.
- Edge-recognition accuracy below 65% in Phase 2.
- Species-recall accuracy below 75% in Phase 2.
- Behavior-recall accuracy below 75% in Phase 2.

Participants who fail three consecutive comprehension-check attempts at onboarding are flagged in the data but are not automatically excluded; their inclusion is determined by the standard validation thresholds above.

## Data and code availability

Experimental code (jsPsych client and Python stimulus-generation script) and pre-registered analysis materials are deposited at the Open Science Framework (project ID `965at`). Raw response data are saved to the same project's data component (`evby7`) via DataPipe in JSON format, one file per participant, with all internal node indices, condition assignments, network parameters, and item-level responses preserved for analysis.
