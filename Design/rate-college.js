// rate-college.js
// Handles rating submission for college detail page

var BASE_URL = window.localStorage.getItem('rmc_api_base') || 'http://127.0.0.1:8080';
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
(function() {
    document.addEventListener('DOMContentLoaded', function() {
        var $rateBtn = $(".action-buttons .btn-primary");
        var $modal = $("#rateCollegeModal");
        var $form = $("#rateCollegeForm");
        var $cancelBtn = $("#cancelCollegeRate");

        // Open modal on Rate button click
        $rateBtn.on('click', function() {
            $modal.show();
        });

        // Close modal on cancel or close
        $cancelBtn.on('click', function() {
            $modal.hide();
            $form[0].reset();
        });
        $modal.find('.close').on('click', function() {
            $modal.hide();
            $form[0].reset();
        });

        // Submit rating
        $form.on('submit', function(e) {
            e.preventDefault();
            var rating = $form.find('input[name="rating"]:checked').val();
            var $error = $modal.find('.rating-error');
            $error.remove();
            if (!rating) {
                $form.prepend('<div class="rating-error" style="color:red;margin-bottom:8px;">Please select a rating.</div>');
                return;
            }
            var collegeId = new URLSearchParams(window.location.search).get('collegeId');
            var jwt = window.localStorage.getItem('rmc_jwt');
            var user = null;
            var studentId = null;
            try { user = JSON.parse(window.localStorage.getItem('rmc_user')); } catch (e) {}
           
            (async function() {
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

                console.log(JSON.stringify({ score: parseInt(rating, 10), collegeId: collegeId, studentId: studentId }));
                $.ajax({
                    url: BASE_URL +'/api/ratings/addCollegeRating',
                    method: 'POST',
                    contentType: 'application/json',
                    data: JSON.stringify({ score: parseInt(rating, 10), collegeId: collegeId, studentId: studentId }),
                    headers: { 'Authorization': 'Bearer ' + jwt },
                    success: function() {
                        $modal.hide();
                        $form[0].reset();
                        location.reload(); // Refresh to update rating
                    },
                    error: function(xhr) {
                        var msg = 'Failed to submit rating.';
                        if (xhr.responseText && xhr.responseText.toLowerCase().includes('already')) {
                            msg = 'You have already rated this college.';
                        } else if (xhr.responseText) {
                            msg = xhr.responseText;
                        }
                        $form.prepend('<div class="rating-error" style="color:red;margin-bottom:8px;">' + msg + '</div>');
                    }
                });
            })();
        });
    });
})();