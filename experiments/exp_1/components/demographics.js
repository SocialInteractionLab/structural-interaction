// demographics — redesigned w/ demo-grid layout

function getDemographicsHTML() {
    var raceOptions = [
        ['race_white',       'White'],
        ['race_black',       'Black or African American'],
        ['race_hispanic',    'Hispanic or Latino'],
        ['race_asian',       'Asian'],
        ['race_aian',        'American Indian or Alaska Native'],
        ['race_nhpi',        'Native Hawaiian or Pacific Islander'],
        ['race_multiracial', 'Multiracial'],
        ['race_pnts',        'Prefer not to say'],
        ['race_other',       'Other']
    ];

    var raceCheckboxes = raceOptions.map(function(pair) {
        return `<label class='checkbox-row'>
            <input type='checkbox' name='${pair[0]}' value='${pair[1]}'>
            <span>${pair[1]}</span>
        </label>`;
    }).join('');

    return `
        <div class='page-inner prevent-select'>
            <div class='card card-narrow'>
                <div class='eyebrow swing-in d-1'>Almost done</div>
                <h1 class='swing-in d-2' style='font-size:28px;'>A few quick questions about you.</h1>
                <p class='muted swing-in d-3' style='margin-bottom:24px;'>
                    We use this only to describe our sample in aggregate. None of your responses are tied to your name.
                </p>
                <div class='demo-grid'>
                    <div class='demo-field'>
                        <label for='age'>Age</label>
                        <input type='number' id='age' name='age' min='18' max='100' placeholder='e.g. 27'>
                    </div>
                    <div class='demo-field'>
                        <label for='gender'>Gender</label>
                        <select id='gender' name='gender'>
                            <option value='' disabled selected>Select…</option>
                            <option value='Male'>Male</option>
                            <option value='Female'>Female</option>
                            <option value='Non-binary'>Non-binary</option>
                            <option value='Prefer not to say'>Prefer not to say</option>
                        </select>
                    </div>
                    <div class='demo-field full'>
                        <label>Race / Ethnicity <span style='color:var(--ink-3); font-weight:400;'>(select all that apply)</span></label>
                        <div class='checkbox-grid'>${raceCheckboxes}</div>
                    </div>
                    <div class='demo-field full'>
                        <label for='education'>Education</label>
                        <select id='education' name='education'>
                            <option value='' disabled selected>Select…</option>
                            <option value='less_than_hs'>Less than high school</option>
                            <option value='high_school'>High school / GED</option>
                            <option value='some_college'>Some college</option>
                            <option value='bachelors'>Bachelor's degree</option>
                            <option value='masters'>Master's degree</option>
                            <option value='doctorate'>Doctorate (PhD, MD, JD, etc.)</option>
                            <option value='other'>Other</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>`;
}

function processDemographics(data, jsPsych) {
    var r = data.response;
    var raceKeys = ['race_white','race_black','race_hispanic','race_asian','race_aian','race_nhpi','race_multiracial','race_pnts','race_other'];
    jsPsych.data.dataProperties.sessionData.phase_5_demographics = {
        age:       r.age ? parseInt(r.age) : null,
        gender:    r.gender || null,
        race:      raceKeys.filter(function(k) { return r[k]; }).map(function(k) { return r[k]; }),
        education: r.education || null
    };
}
