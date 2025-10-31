(function () {
    // Helper: get departmentId from URL query string
    function getDepartmentIdFromUrl() {
        const params = new URLSearchParams(window.location.search);
        return params.get('departmentId') || params.get('id') || params.get('htmlId');
    }

    // Helper: get user from localStorage
    function getUserFromLocalStorage() {
        try {
            return JSON.parse(window.localStorage.getItem('rmc_user'));
        } catch (e) {
            console.error('Failed to parse rmc_user from localStorage:', e);
            return null;
        }
    }

    // Fetch department details directly from backend
    function fetchDepartmentDetail(departmentId) {
        if (!departmentId) return Promise.reject('No departmentId provided');
        var baseUrl = window.localStorage.getItem('rmc_api_base') || 'http://localhost:8080';
        var url = baseUrl + '/api/departments/' + encodeURIComponent(departmentId);
        return $.ajax({
            url: url,
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
    }

    // Render department details into the static HTML design
    function renderDepartmentDetail(department) {
        $('.department-name').text(department.deptName || 'Department');
        $('.department-description').text(department.desc || 'No description available');
        fetchDepartmentStats(department.deptId);
        $('.department-full-description').text(department.fullDescription || department.desc || 'No detailed description available');
        fetchDepartmentCourses(department.deptId);
        fetchDepartmentHead(department.deptId);
        updateDepartmentFeatures(department);
        if (department.collegeId) {
            fetchCollegeInfo(department.collegeId);
        }
    }

    // Fetch department head
    function fetchDepartmentHead(departmentId) {
        var baseUrl = window.localStorage.getItem('rmc_api_base') || 'http://localhost:8080';
        $.ajax({
            url: baseUrl + '/api/hod/department/' + encodeURIComponent(departmentId),
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        }).done(function (head) {
            if (head) {
                updateDepartmentHead(head);
            }
        }).fail(function () {
            console.log('Failed to load department head information');
        });
    }

    // Update department head information
    function updateDepartmentHead(head) {
        var baseUrl = window.localStorage.getItem('rmc_api_base') || 'http://localhost:8080';
        var profileImg = baseUrl + '/' + head.daImg || 'https://placehold.co/80x80/3b82f6/FFFFFF?text=' + encodeURIComponent(head.name?.charAt(0) || 'H');
        $('.department-sidebar .faculty-image').attr('src', profileImg).attr('alt', head.name || 'Department Head');
        $('.department-sidebar .faculty-info h4').text(head.name || 'Department Head');
        $('.department-sidebar .faculty-info p').eq(0).text(head.title || 'Head of Department');
        $('.department-sidebar .faculty-info p').eq(1).text(head.email || 'Email not available');
    }

    // Fetch department statistics
    function fetchDepartmentStats(departmentId) {
        var baseUrl = window.localStorage.getItem('rmc_api_base') || 'http://localhost:8080';
        $.ajax({
            url: baseUrl + '/api/departments/' + encodeURIComponent(departmentId) + '/students/count',
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        }).done(count => $('.stat-item:nth-child(1) .stat-number').text(count))
            .fail(() => $('.stat-item:nth-child(1) .stat-number').text('N/A'));

        $.ajax({
            url: baseUrl + '/api/departments/' + encodeURIComponent(departmentId) + '/teachers/count',
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        }).done(count => $('.stat-item:nth-child(2) .stat-number').text(count))
            .fail(() => $('.stat-item:nth-child(2) .stat-number').text('N/A'));

        $.ajax({
            url: baseUrl + '/api/departments/' + encodeURIComponent(departmentId) + '/courses/count',
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        }).done(count => $('.stat-item:nth-child(3) .stat-number').text(count))
            .fail(() => $('.stat-item:nth-child(3) .stat-number').text('N/A'));
    }

    // Fetch department courses
    function fetchDepartmentCourses(departmentId) {
        var baseUrl = window.localStorage.getItem('rmc_api_base') || 'http://localhost:8080';
        $.ajax({
            url: baseUrl + '/api/courses/department/' + encodeURIComponent(departmentId),
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        }).done(function (courses) {
            var $coursesTableBody = $('#coursesTableBody');
            $coursesTableBody.empty();
            var coursesArray = Array.isArray(courses) ? courses : [];
            if (coursesArray.length > 0) {
                coursesArray.forEach(function (course) {
                    var $row = $('<tr>');
                    $row.append('<td>' + (course.cName || 'Unknown Course') + '</td>');
                    $row.append('<td>' + (course.cDuration || 'N/A') + '</td>');
                    $row.append('<td>' + (course.cSince || 'N/A') + '</td>');
                    $coursesTableBody.append($row);
                });
            } else {
                $coursesTableBody.append('<tr><td colspan="3">No courses available</td></tr>');
            }
            updateFacultyTabs(coursesArray, departmentId);
        }).fail(function () {
            $('#coursesTableBody').html('<tr><td colspan="3">Failed to load courses</td></tr>');
            updateFacultyTabs([], departmentId);
        });
    }

    // Update faculty tabs based on available courses
    function updateFacultyTabs(courses, departmentId) {
        var $facultyTabs = $('.faculty-tabs');
        $facultyTabs.empty();
        $facultyTabs.append('<button class="faculty-tab active" data-course="all">All Faculty</button>');

        var addedCourses = new Set();
        if (Array.isArray(courses) && courses.length > 0) {
            courses.forEach(function (course) {
                if (course.cName && !addedCourses.has(course.cName.toLowerCase())) {
                    var courseName = course.cName + ' Teachers';
                    var courseCode = course.cName.toLowerCase().replace(/\s+/g, '-');
                    addedCourses.add(course.cName.toLowerCase());
                    $facultyTabs.append('<button class="faculty-tab" data-course="' + courseCode + '">' + courseName + '</button>');
                }
            });
        }

        initializeFacultyTabs(departmentId);
        fetchDepartmentFaculty(departmentId, 'all');
    }

    // Helper: format course name for display
    function formatCourseName(code) {
        return code.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }

    // Fetch department faculty - Fetch all teachers → get their courses → filter by matching clicked course
    function fetchDepartmentFaculty(departmentId, courseFilter = 'all') {
        var baseUrl = window.localStorage.getItem('rmc_api_base') || 'http://localhost:8080';
        var url = baseUrl + '/api/teachers/department/' + encodeURIComponent(departmentId);

        $.ajax({
            url: url,
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        }).done(function (faculty) {
            var $facultyContainer = $('#facultyContainer');
            $facultyContainer.empty();

            if (!Array.isArray(faculty) || faculty.length === 0) {
                var msg = courseFilter === 'all'
                    ? '<p>No faculty information available for this department.</p>'
                    : `<p>No faculty members are currently teaching ${formatCourseName(courseFilter)}.</p>`;
                $facultyContainer.append(msg);
                return;
            }

            // Fetch courses for each teacher using /api/teachers/{tid}/courses
            var coursePromises = faculty.map(member =>
                $.ajax({
                    url: baseUrl + '/api/teachers/' + member.tid + '/courses',
                    method: 'GET',
                    headers: { 'Accept': 'application/json' }
                }).then(courses => {
                    member.courses = Array.isArray(courses)
                        ? courses.map(c => ({ name: c.cName || c.courseName || '', id: c.cid || c.id || '' })).filter(c => c.name)
                        : [];
                    return member;
                }).catch(err => {
                    console.error('Failed to load courses for teacher ' + member.tid, err);
                    member.courses = [];
                    return member;
                })
            );

            Promise.all(coursePromises).then(augmentedFaculty => {
                let filtered = courseFilter === 'all'
                    ? augmentedFaculty
                    : augmentedFaculty.filter(member =>
                        member.courses.some(course =>
                            course.name.toLowerCase().replace(/\s+/g, '-') === courseFilter.toLowerCase()
                        )
                    );

                if (filtered.length === 0) {
                    $facultyContainer.append(`<p>No faculty members are currently teaching ${formatCourseName(courseFilter)}.</p>`);
                    return;
                }

                filtered.forEach(member => {
                    var baseUrl = window.localStorage.getItem('rmc_api_base') || 'http://localhost:8080';
                    var $card = $('<div>', {
                        class: 'faculty-card',
                        'data-courses': member.courses.map(c => c.name).join(',')
                    });

                    var profileImg = baseUrl + '/' + member.timg || `https://placehold.co/80x80/3b82f6/FFFFFF?text=${encodeURIComponent(member.tname?.[0] || 'F')}`;
                    $card.append(`
                        <div class="faculty-image">
                            <img src="${profileImg}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;">
                        </div>
                    `);
                    $card.append('<h4>' + (member.tname || 'Faculty Member') + '</h4>');
                    $card.append('<p class="faculty-title">' + (member.title || 'Professor') + '</p>');

                    if (member.courses.length > 0) {
                        $card.append('<p class="faculty-courses"><strong>Courses:</strong> ' + member.courses.map(c => c.name).join(', ') + '</p>');
                    }

                    var ratingsSummary = $('<div>', { class: 'faculty-ratings' });
                    var ratingRow = $('<div>', { class: 'rating-summary' });
                    var starsDiv = $('<div>', { class: 'rating-stars', id: `teacher-stars-${member.tid}` });
                    var infoDiv = $('<div>', { class: 'rating-info' });
                    var ratingNumber = $('<span>', { class: 'rating-number', id: `teacher-rating-${member.tid}`, text: '-' });
                    var ratingCount = $('<span>', { class: 'rating-count', id: `teacher-count-${member.tid}` });

                    infoDiv.append(ratingNumber, ratingCount);

                    var detailsButton = $('<button>', {
                        class: 'view-details-btn',
                        html: '<i class="fas fa-info"></i>',
                        click: function () {
                            $.ajax({
                                url: baseUrl + '/api/teacher-rating-criteria/teacher/' + member.tid,
                                method: 'GET'
                            }).done(criteria => {
                                var teacherRatings = {
                                    teacherName: member.tname,
                                    overallRating: parseFloat($(`#teacher-rating-${member.tid}`).text()) || 0,
                                    totalRatings: parseInt($(`#teacher-count-${member.tid}`).text().replace(/[()]/g, '')) || 0,
                                    teachingQuality: criteria?.subject_knowledge || 0,
                                    communication: criteria?.communication_skills || 0
                                };
                                showRatingDetails(teacherRatings);
                            });
                        }
                    });

                    ratingRow.append(starsDiv, infoDiv, detailsButton);
                    ratingsSummary.append(ratingRow);
                    $card.append(ratingsSummary);

                    var user = getUserFromLocalStorage();
                    if (user && user.role === 'student' && user.collegeId && String(user.collegeId) === String(member.collegeId)) {
                        $card.append(`<button class="rate-teacher-btn btn-primary" data-teacher-id="${member.tid}">Rate Teacher</button>`);
                    }

                    $facultyContainer.append($card);

                    // Function to generate stars HTML
                    function generateStars(rating) {
                        let stars = '';
                        for (let i = 1; i <= 5; i++) {
                            if (i <= Math.floor(rating)) stars += '<i class="fas fa-star"></i>';
                            else if (i === Math.floor(rating) + 1 && rating % 1 >= 0.5) stars += '<i class="fas fa-star-half-alt"></i>';
                            else stars += '<i class="far fa-star"></i>';
                        }
                        return stars;
                    }

                    // Load overall rating
                    $.ajax({
                        url: baseUrl + '/api/rating-teachers/teacher/' + member.tid,
                        method: 'GET'
                    }).done(data => {
                        let total = 0, count = Array.isArray(data) ? data.length : 0;
                        data?.forEach(r => total += Number(r.score));
                        let avg = count > 0 ? total / count : 0;
                        $(`#teacher-stars-${member.tid}`).html(generateStars(avg));
                        $(`#teacher-rating-${member.tid}`).text(avg.toFixed(1));
                        $(`#teacher-count-${member.tid}`).text(`(${count})`);
                    });

                    // Load criteria ratings
                    $.ajax({
                        url: baseUrl + '/api/teacher-rating-criteria/teacher/' + member.tid,
                        method: 'GET'
                    }).done(criteria => {
                        if (criteria) {
                            const commRating = criteria.communication_skills || 0;
                            const knowRating = criteria.subject_knowledge || 0;

                            $(`#teacher-comm-stars-${member.tid}`).html(generateStars(commRating));
                            $(`#teacher-comm-rating-${member.tid}`).text(commRating.toFixed(1));

                            $(`#teacher-know-stars-${member.tid}`).html(generateStars(knowRating));
                            $(`#teacher-know-rating-${member.tid}`).text(knowRating.toFixed(1));
                        }
                    });
                });

                // Rebind rate buttons
                $('.rate-teacher-btn').off('click').on('click', function () {
                    var teacherId = $(this).data('teacher-id');
                    // store last clicked teacher id as fallback
                    window.__lastTeacherId = teacherId;
                    $('#teacherRatingModal').fadeIn(200).data('teacher-id', teacherId);
                    $('#teacherModalStars label').removeClass('active').html('&#9734;');
                    $('#teacherModalSelectedStars').val(0);
                });
            });
        }).fail(() => {
            $('#facultyContainer').html('<p>Failed to load faculty information</p>');
        });
    }

    // Helper function to generate star rating HTML
    function generateStarRating(rating) {
        let stars = '';
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

        for (let i = 0; i < fullStars; i++) {
            stars += '<i class="fas fa-star"></i>';
        }
        if (hasHalfStar) {
            stars += '<i class="fas fa-star-half-alt"></i>';
        }
        for (let i = 0; i < emptyStars; i++) {
            stars += '<i class="far fa-star"></i>';
        }
        return stars;
    }

    // Function to show rating details in modal
    function showRatingDetails(rating) {
        const modalContent = `
            <div class="teacher-name">${rating.teacherName}</div>
            <div class="rating-details">
                <div class="overall-section">
                    <h4>Overall Rating</h4>
                    <div class="big-rating">
                        <div class="big-stars">${generateStarRating(rating.overallRating)}</div>
                        <div class="big-number">${rating.overallRating.toFixed(1)}</div>
                        <div class="rating-total">${rating.totalRatings} total ratings</div>
                    </div>
                </div>
                <div class="criteria-section">
                    <div class="criteria-card">
                        <div class="criteria-icon">
                            <i class="fas fa-graduation-cap"></i>
                        </div>
                        <div class="criteria-content">
                            <h5>Subject Knowledge</h5>
                            <div class="criteria-rating">${generateStarRating(rating.teachingQuality)}</div>
                            <div class="criteria-score">${rating.teachingQuality.toFixed(1)}</div>
                        </div>
                    </div>
                    <div class="criteria-card">
                        <div class="criteria-icon">
                            <i class="fas fa-comments"></i>
                        </div>
                        <div class="criteria-content">
                            <h5>Communication Skills</h5>
                            <div class="criteria-rating">${generateStarRating(rating.communication)}</div>
                            <div class="criteria-score">${rating.communication.toFixed(1)}</div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const $modal = $('#ratingDetailsModal');
        $modal.find('.modal-content').html(modalContent);
        $modal.fadeIn(200);
    }

    // Update department features
    function updateDepartmentFeatures(department) {
        if (department.features && Array.isArray(department.features)) {
            var $featuresContainer = $('.department-features');
            $featuresContainer.empty();
            department.features.forEach(function (feature) {
                var icon = feature.icon || 'fas fa-check-circle';
                var $featureItem = $('<div>', { class: 'feature-item' });
                $featureItem.append('<i class="' + icon + '"></i>');
                $featureItem.append('<span>' + feature.name + '</span>');
                $featuresContainer.append($featureItem);
            });
        }
    }

    // Fetch college information
    function fetchCollegeInfo(collegeId) {
        var baseUrl = window.localStorage.getItem('rmc_api_base') || 'http://localhost:8080';
        $.ajax({
            url: baseUrl + '/api/colleges/' + encodeURIComponent(collegeId),
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        }).done(function (college) {
            $('.college-name').text(college.name || 'College');
            $('.college-location').text(college.location || 'Location not available');
            $('.college-link').attr('href', 'college-detail.html?collegeId=' + encodeURIComponent(collegeId));
        }).fail(() => $('.college-info').hide());
    }

    // Initialize faculty tabs functionality
    function initializeFacultyTabs(departmentId) {
        $('.faculty-tabs').on('click', '.faculty-tab', function () {
            $('.faculty-tab').removeClass('active');
            $(this).addClass('active');
            var courseFilter = $(this).data('course');
            fetchDepartmentFaculty(departmentId, courseFilter);
        });
    }

    // Initialize the page
    $(document).ready(function () {
        $("#navbar-container").load("navbar.html");
        $("#footer-container").load("footer.html");

        // Rating details modal close on click outside or close button
        $(window).on('click', function (e) {
            if (e.target.id === 'ratingDetailsModal') {
                $('#ratingDetailsModal').fadeOut(200);
            }
        });

        // Close button for rating details modal
        $(document).on('click', '.modal-content .close-button', function () {
            $('#ratingDetailsModal').fadeOut(200);
        });

        // Star rating interaction (left-to-right sequential)
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
            const teacherId = $(this).data('teacher-id');
            $('#teacherRatingModal').show().data('teacher-id', teacherId);
            // Reset form and stars
            $('#rateTeacherForm')[0].reset();
            $('.star-rating label').removeClass('active');
        });

        // Close modal handlers
        $('#closeTeacherModal, #cancelTeacherRate').on('click', function () {
            $('#teacherRatingModal').hide();
            $('#rateTeacherForm')[0].reset();
            $('.star-rating label').removeClass('active');
        });

        // Close when clicking outside content
        $(window).on('click', function (e) {
            if (e.target.id === 'teacherRatingModal') {
                $('#teacherRatingModal').hide();
                $('#rateTeacherForm')[0].reset();
                $('.star-rating label').removeClass('active');
            }
        });

        // Submit rating form
        $('#rateTeacherForm').on('submit', function (e) {
            e.preventDefault();

            const rating = $('input[name="rating"]:checked', this).val();
            const communication = $('input[name="communication"]:checked', this).val();
            const knowledge = $('input[name="knowledge"]:checked', this).val();

            if (!rating) return alert('Please select an overall rating');
            if (!communication) return alert('Please rate communication skills');
            if (!knowledge) return alert('Please rate subject knowledge');

            const teacherId = $('#teacherRatingModal').data('teacher-id');
            if (!teacherId) return alert('Unable to determine which teacher you are rating. Please try again.');

            const departmentId = getDepartmentIdFromUrl();
            const baseUrl = window.localStorage.getItem('rmc_api_base') || 'http://localhost:8080';
            const user = getUserFromLocalStorage();

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

                    // Get JWT token from localStorage
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
                        $('#teacherRatingModal').hide();
                        this.reset();
                        $('.star-rating label').removeClass('active');
                        alert('Thank you for rating! Your feedback has been submitted.');
                        // Refresh faculty display
                        fetchDepartmentFaculty(departmentId, $('.faculty-tab.active').data('course') || 'all');
                    }).catch(() => alert('Failed to submit one or more ratings.'));
                }).fail(() => alert('Failed to load enrollment.'));
            }).fail(() => alert('Failed to load teacher courses.'));

            $('#teacherRatingModal').fadeOut(200);
            setTimeout(() => {
                // Reset all rating sections
                ['teacherModalStars', 'communicationSkillsStars', 'subjectKnowledgeStars'].forEach(id => {
                    $(`#${id} label`).removeClass('active').html('&#9734;');
                    $(`#${id}-value`).val(0);
                });
            }, 300);
        });

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