(function () {
    // Helper functions (keep all the existing helper functions)
    function getDepartmentIdFromUrl() {
        const params = new URLSearchParams(window.location.search);
        return params.get('departmentId') || params.get('id') || params.get('htmlId');
    }

    function getUserFromLocalStorage() {
        try {
            return JSON.parse(window.localStorage.getItem('rmc_user'));
        } catch (e) {
            console.error('Failed to parse rmc_user from localStorage:', e);
            return null;
        }
    }

    // All existing functions remain the same until the document.ready section
    // ... (copy all other functions as is)

    // Initialize the page
    $(document).ready(function () {
        $("#navbar-container").load("navbar.html");
        $("#footer-container").load("footer.html");

        // Star rating interaction (using the college rating pattern)
        $(document).on('click', '#teacherRatingModal .star', function (e) {
            e.preventDefault();
            const clickedRating = Number($(this).data('rating'));
            const starContainer = $(this).closest('.star-rating');

            let currentMax = 0;
            starContainer.find('label').each(function () {
                const r = Number($(this).data('rating'));
                if ($(this).hasClass('active')) currentMax = Math.max(currentMax, r);
            });

            const renderTo = (newMax) => {
                starContainer.find('label').each(function () {
                    const r = Number($(this).data('rating'));
                    if (r <= newMax) $(this).addClass('active');
                    else $(this).removeClass('active');
                });
                if (newMax > 0) starContainer.find(`input[value="${newMax}"]`).prop('checked', true);
                else starContainer.find('input[type="radio"]').prop('checked', false);
            };

            if (clickedRating === currentMax + 1) { renderTo(clickedRating); return; }
            if (clickedRating === currentMax) { renderTo(currentMax - 1); return; }
            // ignore non-consecutive
        });

        // Modal handlers
        $('.rate-teacher-btn').on('click', function () {
            $('#teacherRatingModal').show();
            // reset stars
            $('.star-rating label').removeClass('active');
            $('.star-rating input[type="radio"]').prop('checked', false);
        });

        $('#closeTeacherModal, #cancelTeacherRate').on('click', function () {
            $('#teacherRatingModal').fadeOut(200);
            // reset stars
            $('.star-rating label').removeClass('active');
            $('.star-rating input[type="radio"]').prop('checked', false);
        });

        // Close when clicking outside content
        $(window).on('click', function (e) {
            if (e.target.id === 'teacherRatingModal') {
                $('#teacherRatingModal').fadeOut(200);
                $('.star-rating label').removeClass('active');
                $('.star-rating input[type="radio"]').prop('checked', false);
            }
        });

        // Form submission
        $('#rateTeacherForm').on('submit', function (e) {
            e.preventDefault();

            const rating = $('input[name="rating"]:checked', this).val();
            const communication = $('input[name="communication"]:checked', this).val();
            const knowledge = $('input[name="knowledge"]:checked', this).val();

            if (!rating) return alert('Please select an overall rating');
            if (!communication) return alert('Please rate communication skills');
            if (!knowledge) return alert('Please rate subject knowledge');

            var teacherId = $('#teacherRatingModal').data('teacher-id') || window.__lastTeacherId;
            if (!teacherId) return alert('Unable to determine which teacher you are rating. Please re-open the rating dialog.');

            var baseUrl = window.localStorage.getItem('rmc_api_base') || 'http://localhost:8080';
            var user = getUserFromLocalStorage();

            if (!user || user.role !== 'student' || !user.enrollment) {
                return alert('Unable to submit rating: Student enrollment information not found.');
            }

            var enrollId = user.enrollment;

            $.ajax({
                url: baseUrl + '/api/teachers/' + teacherId + '/courses',
                method: 'GET'
            }).done(teacherCourses => {
                $.ajax({
                    url: baseUrl + '/api/students/enroll/' + enrollId,
                    method: 'GET'
                }).done(studentEnrollment => {
                    var courseId = null;
                    var coursesList = Array.isArray(teacherCourses) ? teacherCourses : (teacherCourses?.course || []);
                    for (let course of coursesList) {
                        if (course.courseId === studentEnrollment.courseId || course.cid === studentEnrollment.courseId || course.id === studentEnrollment.courseId) {
                            courseId = course.courseId || course.cid || course.id;
                            break;
                        }
                    }

                    if (!courseId) return alert('No matching course found between you and the teacher.');

                    // Get JWT token
                    const token = window.localStorage.getItem('rmc_token');
                    if (!token) {
                        return alert('Authentication required. Please log in again.');
                    }

                    // Submit both ratings in parallel
                    Promise.all([
                        // Submit overall rating
                        $.ajax({
                            url: baseUrl + '/api/rating-teachers',
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Accept': 'application/json',
                                'Authorization': 'Bearer ' + token
                            },
                            data: JSON.stringify({
                                score: Number(rating),
                                teacher: { tid: Number(teacherId) },
                                student: { sid: Number(studentEnrollment.sid) },
                                course: { c_id: Number(courseId) }
                            })
                        }),
                        // Submit detailed criteria ratings
                        $.ajax({
                            url: baseUrl + '/api/teacher-rating-criteria',
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Accept': 'application/json',
                                'Authorization': 'Bearer ' + token
                            },
                            data: JSON.stringify({
                                teacherId: Number(teacherId),
                                studentId: Number(studentEnrollment.sid),
                                subjectKnowledge: Number(knowledge),
                                communicationSkills: Number(communication)
                            })
                        })
                    ]).then(() => {
                        $('#teacherRatingModal').fadeOut(200);
                        this.reset();
                        $('.star-rating label').removeClass('active');
                        alert('Thank you for rating! Your feedback has been submitted.');
                        // Refresh faculty display
                        var departmentId = getDepartmentIdFromUrl();
                        fetchDepartmentFaculty(departmentId, $('.faculty-tab.active').data('course') || 'all');
                    }).catch(() => alert('Failed to submit one or more ratings.'));
                }).fail(() => alert('Failed to load enrollment.'));
            }).fail(() => alert('Failed to load teacher courses.'));
        });

        // Initialize page content
        var departmentId = getDepartmentIdFromUrl();
        if (departmentId) {
            fetchDepartmentDetail(departmentId)
                .done(department => renderDepartmentDetail(department))
                .fail(() => alert('Failed to load department details.'));
        } else {
            alert('No department ID provided.');
        }
    });
})();