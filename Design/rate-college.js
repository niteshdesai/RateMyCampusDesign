// rate-college.js
// Handles rating submission for college detail page

var BASE_URL = window.localStorage.getItem('rmc_api_base') || 'http://localhost:8080';
function getJwtToken() {
    try {
        var keys = ['rmc_jwt', 'rmc_token', 'jwt', 'token'];
        for (var i = 0; i < keys.length; i++) {
            var v = window.localStorage.getItem(keys[i]);
            if (v && String(v).trim() !== '') return v;
        }
        // Fallback: extract from stored user object if present
        var rawUser = window.localStorage.getItem('rmc_user');
        if (rawUser) {
            try {
                var u = JSON.parse(rawUser);
                var userToken = u?.token || u?.jwt || u?.accessToken || u?.access_token || u?.authorization;
                if (userToken && String(userToken).trim() !== '') return userToken;
            } catch (e2) { }
        }
    } catch (e) { }
    return null;

}
// Async function to fetch student by enrollment number
async function getStudentByEnrollment(enrollmentNumber) {
    try {
        const response = await $.ajax({
            url: BASE_URL + "/api/students/enroll/" + encodeURIComponent(enrollmentNumber),
            type: "GET"
        });

        return response;
    } catch (error) {
        console.error("Error fetching student:", error);
        return null;
    }
}
(function () {
    document.addEventListener('DOMContentLoaded', function () {
        var $rateBtn = $(".action-buttons .btn-primary");
        var $modal = $("#rateCollegeModal");
        var $form = $("#rateCollegeForm");
        var $cancelBtn = $("#cancelCollegeRate");

        // Open modal on Rate button click
        $rateBtn.on('click', function () {
            $modal.show();
        });

        // Close modal on cancel or close
        $cancelBtn.on('click', function () {
            $modal.hide();
            $form[0].reset();
        });
        $modal.find('.close').on('click', function () {
            $modal.hide();
            $form[0].reset();
        });

        // Submit rating
        // Submit rating
        $form.on('submit', function (e) {
            e.preventDefault();
            var rating = $form.find('input[name="rating"]:checked').val();
            var extrac = $form.find('input[name="extracurricular"]:checked').val();
            var sports = $form.find('input[name="sports"]:checked').val();
            var campus = $form.find('input[name="campus"]:checked').val();
            var $error = $modal.find('.rating-error');
            $error.remove();

            // All three new criteria are mandatory
            if (!extrac || !sports || !campus) {
                $form.prepend('<div class="rating-error" style="color:red;margin-bottom:8px;">Please rate all three criteria: Extracurricular, Sports, Campus Facilities.</div>');
                return;
            }

            // existing overall rating remains optional or as before
            if (!rating) {
                $form.prepend('<div class="rating-error" style="color:red;margin-bottom:8px;">Please select an overall rating.</div>');
                return;
            }

            var collegeId = new URLSearchParams(window.location.search).get('collegeId');
            var jwt = getJwtToken();

            var user = null;
            var studentId = null;
            try { user = JSON.parse(window.localStorage.getItem('rmc_user')); } catch (e) { }

            (async function () {
                if (user && user.enrollment) {
                    // Fetch student by enrollment number
                    var student = await getStudentByEnrollment(user.enrollment);
                    if (student && student.sid) {
                        studentId = student.sid;

                    } else {
                        $form.prepend('<div class="rating-error" style="color:red;margin-bottom:8px;">Could not determine student ID from enrollment number.</div>');
                        return;
                    }
                } else {
                    $form.prepend('<div class="rating-error" style="color:red;margin-bottom:8px;">Student ID not found. Please re-login.</div>');
                    return;
                }

                // Prepare headers
                var headers = {};
                if (jwt) {
                    headers['Authorization'] = 'Bearer ' + jwt;
                }

                // 1) Submit college rating (existing flow) - matches backend DTO structure
                var collegePayload = {
                    score: parseInt(rating, 10),
                    college: { cid: parseInt(collegeId, 10) },
                    student: { sid: parseInt(studentId, 10) }
                };

                // 2) Submit criteria ratings to new API (/api/college-rating-criteria)
                var criteriaPayload = {
                    collegeId: parseInt(collegeId, 10),
                    studentId: parseInt(studentId, 10),
                    extracurricularActivities: parseInt(extrac, 10),
                    sportsFacilities: parseInt(sports, 10),
                    campusFacilities: parseInt(campus, 10)
                };

                console.log('Submitting college rating and criteria:', collegePayload, criteriaPayload);

                // Execute both requests; keep existing success behavior for college rating
                // Submit criteria first so its validation happens before overall rating save


                $.ajax({
                    url: BASE_URL + '/api/ratings/addCollegeRating',
                    method: 'POST',
                    contentType: 'application/json',
                    headers: headers,
                    data: JSON.stringify(collegePayload),
                    success: function (response) {

                        $modal.hide();
                        $form[0].reset();

                        location.reload(); // Refresh to update rating

                    },
                    error: function (xhr) {
                        var msg = 'Failed to submit overall rating.';


                        // if (xhr.responseText && xhr.responseText.toLowerCase().includes('already')) {
                        //     msg = 'You have already rated this college.';
                        // } else if (xhr.responseText) {
                        //     msg = xhr.responseText;
                        // }
                        $form.prepend('<div class="rating-error" style="color:red;margin-bottom:8px;">' + msg + '</div>');
                    }
                });

                $.ajax({
                    url: BASE_URL + '/api/college-rating-criteria',
                    method: 'POST',
                    contentType: 'application/json',
                    headers: headers,
                    data: JSON.stringify(criteriaPayload),
                    success: function (criteriaResp) {

                        console.log('Criteria ratings submitted successfully:');
                    },
                    error: function (xhr) {
                        var msg = 'Failed to submit criteria ratings.';
                        if (xhr.responseText) msg = xhr.responseText;
                        $form.prepend('<div class="rating-error" style="color:red;margin-bottom:8px;">' + msg + '</div>');
                    }
                });
            })();
        });
    });
})();