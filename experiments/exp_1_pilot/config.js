// pilot config (no-category: homophily only, all same species)

const TESTING_MODE = true;

// datapipe / osf IDs — TODO: create separate OSF component for pilot data
const DATAPIPE_EXPERIMENT_ID = 'PILOT_TODO';
const OSF_PROJECT_ID         = '965at';
const OSF_DATA_COMPONENT     = 'PILOT_TODO';
const PROLIFIC_COMPLETION_URL = 'https://app.prolific.com/submissions/complete?cc=XXXXXXXX'; // TODO: fill before launch

// graph set — bump NUM_GRAPHS + re-run scripts/generate_graphs.py to add more
const NUM_GRAPHS = 5;

// timing (ms)
const LEARNING_ONSET_MS  = 2500;
const LEARNING_REVEAL_MS = 1500;
const LEARNING_ITI_MS    = 500;

// learning phase
const LEARNING_RUNS      = 10;
const UPSIDE_DOWN_RATE   = 0.125;

// transfer phase
const TRANSFER_FRIENDS_REVEALED = 4;

// per-individual marker toggle
const USE_PER_INDIVIDUAL_MARKER = false;

// 12 learning alien names
const LEARNING_NAMES = ['Nep', 'Vor', 'Kil', 'Zan', 'Plu', 'Mox', 'Tib', 'Rek', 'Gav', 'Sol', 'Qip', 'Wel'];

// 5 transfer alien names
const TRANSFER_NAMES = ['Vex', 'Jop', 'Har', 'Bim', 'Dox'];

// exclusion thresholds
const THRESHOLD_EDGE_REC = 0.65;
const THRESHOLD_SPECIES  = 0.75;
const THRESHOLD_BEHAVIOR = 0.75;

// attention check
const UPSIDE_DOWN_HIT_RATE_MIN = 0.80;

// comprehension check
const COMP_CHECK_MAX_RETRIES = 3;

// lab / consent copy
const LAB_NAME            = 'Social Interaction Lab';
const PI_NAME             = 'Robert Hawkins';
const CONTACT_EMAIL       = 'fangke@stanford.edu';
const INSTITUTION         = 'Stanford University';
const LAB_LOGO            = '🌱';
const ESTIMATED_DURATION_MIN = 10000;
const PAYMENT             = .001;
const STUDY_TITLE         = 'Structural Interaction — Pilot';

const IDLE_TIMEOUT_MS = 5 * 60 * 1000;
const VERBOSE = false;
