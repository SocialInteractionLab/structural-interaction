// experiment config — flip TESTING_MODE to false for production

const TESTING_MODE = true;

// theme: 'playful' | 'botanical' | 'bauhaus'
window.EXPERIMENT_THEME = 'playful';

// datapipe / osf IDs
const DATAPIPE_EXPERIMENT_ID = 'JYEBdZJ7ca6L';
const OSF_PROJECT_ID         = '965at';
const OSF_DATA_COMPONENT     = 'evby7';
const PROLIFIC_COMPLETION_URL = 'https://app.prolific.com/submissions/complete?cc=XXXXXXXX'; // TODO: fill before launch

// graph set — bump NUM_GRAPHS + re-run generate_graphs.py to add more
const NUM_GRAPHS = 5;

// timing (ms)
const LEARNING_ONSET_MS  = 2400;  // pair visible before behavior reveal
const LEARNING_REVEAL_MS = 3100;  // behavior visible before next trial (total 5500ms)
const LEARNING_ITI_MS    = 500;

// learning phase
const LEARNING_RUNS      = 10;
const UPSIDE_DOWN_RATE   = 0.125;  // 12.5% of trials have one upside-down alien

// transfer phase
const TRANSFER_FRIENDS_REVEALED = 3;

// per-individual marker toggle — default off; names only for individuation
const USE_PER_INDIVIDUAL_MARKER = false;

// 12 learning alien names (distinct, phonetically separated)
const LEARNING_NAMES = ['Nep', 'Vor', 'Kil', 'Zan', 'Plu', 'Mox', 'Tib', 'Rek', 'Gav', 'Sol', 'Qip', 'Wel'];

// 2 transfer alien names (one per species)
const TRANSFER_NAMES = ['Vex', 'Jop'];

// exclusion thresholds (proportion correct)
const THRESHOLD_EDGE_REC = 0.65;
const THRESHOLD_SPECIES  = 0.75;
const THRESHOLD_BEHAVIOR = 0.75;

// attention check
const UPSIDE_DOWN_HIT_RATE_MIN = 0.80;

// comprehension check: max retries before flagging + proceeding
const COMP_CHECK_MAX_RETRIES = 3;

// lab / consent copy
const LAB_NAME            = 'Social Interaction Lab';
const PI_NAME             = 'Robert Hawkins';
const CONTACT_EMAIL       = 'fangke@stanford.edu';
const INSTITUTION         = 'Stanford University';
const LAB_LOGO            = '🌱';
const ESTIMATED_DURATION_MIN = 10000;
const PAYMENT             = .001;
const STUDY_TITLE         = 'Structural Interaction';

const IDLE_TIMEOUT_MS = 5 * 60 * 1000;
const VERBOSE = false;
