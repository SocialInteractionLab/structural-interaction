// demographics + strategy — adapted from norming_study

function getDemographicsHTML() {
    var html = "<div class='prevent-select content-box' style='text-align:left;'>";
    html += "<p><b>A few quick questions about yourself:</b></p>";

    html += "<p>Age: &emsp;<input name='age' type='number' min='18' max='100' /></p>";

    html += "<p><label for='gender'>Gender: &emsp;</label><select id='gender' name='gender'>";
    html += "<option disabled selected></option>";
    html += "<option value='Male'>Male</option>";
    html += "<option value='Female'>Female</option>";
    html += "<option value='Non-binary'>Non-binary</option>";
    html += "<option value='Prefer Not to Say'>Prefer Not to Say</option>";
    html += "</select></p>";

    html += "<p><b>Race/Ethnicity</b> (select all that apply):</p><div style='margin-left:20px;'>";
    [
        ['race_white',       'White'],
        ['race_black',       'Black or African American'],
        ['race_hispanic',    'Hispanic or Latino'],
        ['race_asian',       'Asian'],
        ['race_aian',        'American Indian or Alaska Native'],
        ['race_nhpi',        'Native Hawaiian or Pacific Islander'],
        ['race_multiracial', 'Multiracial'],
        ['race_pnts',        'Prefer Not to Say'],
        ['race_other',       'Other']
    ].forEach(function(pair) {
        html += `<label><input type='checkbox' name='${pair[0]}' value='${pair[1]}' /> ${pair[1]}</label><br>`;
    });
    html += "</div>";

    html += "<p><label for='education'>Education: &emsp;</label><select id='education' name='education'>";
    html += "<option disabled selected></option>";
    html += "<option value='less_than_hs'>Less than high school</option>";
    html += "<option value='high_school'>High school / GED</option>";
    html += "<option value='some_college'>Some college</option>";
    html += "<option value='bachelors'>Bachelor's degree</option>";
    html += "<option value='masters'>Master's degree</option>";
    html += "<option value='doctorate'>Doctorate (PhD, MD, JD, etc.)</option>";
    html += "<option value='other'>Other</option>";
    html += "</select></p>";

    html += "</div>";
    return html;
}

function processDemographics(data, jsPsych) {
    var r = data.response;
    var raceKeys = ['race_white','race_black','race_hispanic','race_asian','race_aian','race_nhpi','race_multiracial','race_pnts','race_other'];
    jsPsych.data.dataProperties.sessionData.phase_5_demographics = {
        age:       r.age ? parseInt(r.age) : null,
        gender:    r.gender || null,
        race:      raceKeys.filter(k => r[k]).map(k => r[k]),
        education: r.education || null
    };
}
