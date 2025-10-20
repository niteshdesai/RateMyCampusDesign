(function() {
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
        }).done(function(head) {
            if (head) {
              
                updateDepartmentHead(head);
            }
        }).fail(function() {
            console.log('Failed to load department head information');
        });
    }

    // Update department head information
    function updateDepartmentHead(head) {
        var $headCard = $('.department-sidebar .faculty-card');
        var $headInfo = $('.department-sidebar .faculty-info');
        var profileImg = head.da_img || 'https://placehold.co/80x80/3b82f6/FFFFFF?text=' + encodeURIComponent(head.name?.charAt(0) || 'H');
        $('.department-sidebar .faculty-image').attr('src', profileImg).attr('alt', head.name || 'Department Head');
        $headInfo.find('h4').text(head.name || 'Department Head');
        $headInfo.find('p').eq(0).text(head.title || 'Head of Department');
        $headInfo.find('p').eq(1).text(head.email || 'Email not available');
    }

    // Fetch department statistics
    function fetchDepartmentStats(departmentId) {
        var baseUrl = window.localStorage.getItem('rmc_api_base') || 'http://localhost:8080';
        $.ajax({
            url: baseUrl + '/api/departments/' + encodeURIComponent(departmentId) + '/students/count',
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        }).done(function(count) {
            $('.stat-item:nth-child(1) .stat-number').text(count);
        }).fail(function() {
            $('.stat-item:nth-child(1) .stat-number').text('N/A');
        });

        $.ajax({
            url: baseUrl + '/api/departments/' + encodeURIComponent(departmentId) + '/teachers/count',
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        }).done(function(count) {
            $('.stat-item:nth-child(2) .stat-number').text(count);
        }).fail(function() {
            $('.stat-item:nth-child(2) .stat-number').text('N/A');
        });

        $.ajax({
            url: baseUrl + '/api/departments/' + encodeURIComponent(departmentId) + '/courses/count',
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        }).done(function(count) {
            $('.stat-item:nth-child(3) .stat-number').text(count);
        }).fail(function() {
            $('.stat-item:nth-child(3) .stat-number').text('N/A');
        });
    }

    // Fetch department courses
    function fetchDepartmentCourses(departmentId) {
        var baseUrl = window.localStorage.getItem('rmc_api_base') || 'http://localhost:8080';
        $.ajax({
            url: baseUrl + '/api/courses/department/' + encodeURIComponent(departmentId),
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        }).done(function(courses) {
            var $coursesTableBody = $('#coursesTableBody');
            $coursesTableBody.empty();
            if (Array.isArray(courses) && courses.length > 0) {
                courses.forEach(function(course) {
                    var $row = $('<tr>');
                    $row.append('<td>' + (course.cName || 'Unknown Course') + '</td>');
                    $row.append('<td>' + (course.cDuration || 'N/A') + '</td>');
                    $row.append('<td>' + (course.cSince || 'N/A') + '</td>');
                    $coursesTableBody.append($row);
                });
                updateFacultyTabs(courses, departmentId);
            } else {
                $coursesTableBody.append('<tr><td colspan="3">No courses available</td></tr>');
                fetchDepartmentFaculty(departmentId, 'all');
            }
        }).fail(function() {
            $('#coursesTableBody').html('<tr><td colspan="3">Failed to load courses</td></tr>');
            fetchDepartmentFaculty(departmentId, 'all');
        });
    }

    // Update faculty tabs based on available courses
    function updateFacultyTabs(courses, departmentId) {
        var $facultyTabs = $('.faculty-tabs');
        $facultyTabs.empty();
        $facultyTabs.append('<button class="faculty-tab active" data-course="all">All Faculty</button>');
        if (Array.isArray(courses) && courses.length > 0) {
            courses.forEach(function(course) {
                if (course.cName) {
                    var courseName = course.cName + ' Teachers';
                    var courseCode = course.code || course.cName.toLowerCase().replace(/\s+/g, '');
                    $facultyTabs.append('<button class="faculty-tab" data-course="' + courseCode + '">' + courseName + '</button>');
                }
            });
        }
        initializeFacultyTabs(departmentId);
        fetchDepartmentFaculty(departmentId, 'all');
    }

    // Fetch department faculty
    function fetchDepartmentFaculty(departmentId, courseFilter = 'all') {
        var baseUrl = window.localStorage.getItem('rmc_api_base') || 'http://localhost:8080';
        var url = baseUrl + '/api/teachers/department/' + encodeURIComponent(departmentId);
        if (courseFilter !== 'all') {
            url += '?courseId=' + encodeURIComponent(courseFilter);
        }
        $.ajax({
            url: url,
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        }).done(function(faculty) {
            var $facultyContainer = $('#facultyContainer');
            $facultyContainer.empty();
            if (Array.isArray(faculty) && faculty.length > 0) {
                faculty.forEach(function(member) {
                    var $card = $('<div>', {
                        class: 'faculty-card',
                        'data-courses': (member.courses || []).join(',')
                    });


                    var profileImg = member.timg || 'https://placehold.co/80x80/3b82f6/FFFFFF?text=' + encodeURIComponent(member.tname?.charAt(0) || 'F');
                    $card.append('<div class="faculty-image"><img src="' + profileImg + '" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover;"></div>');
                    $card.append('<h4>' + (member.tname || 'Faculty Member') + '</h4>');
                    $card.append('<p class="faculty-title">' + (member.title || 'Professor') + '</p>');
                    if (member.courses && member.courses.length > 0) {
                        var coursesList = '<p class="faculty-courses"><strong>Courses:</strong> ' + member.courses.join(', ') + '</p>';
                        $card.append(coursesList);
                    }
                    var ratingStars = '<span class="rating-stars" id="teacher-stars-' + member.tid + '"></span>';
                    var ratingNumber = '<span class="rating-number" id="teacher-rating-' + member.tid + '">-</span>';
                    var ratingCount = '<span class="rating-count" id="teacher-count-' + member.tid + '"></span>';
                    var ratingDiv = '<div class="faculty-rating">' + ratingStars + ' ' + ratingNumber + ' ' + ratingCount + '</div>';
                    $card.append(ratingDiv);
                    var user = getUserFromLocalStorage();
                    var showRate = user && user.role === 'student' && user.collegeId && String(user.collegeId) === String(member.collegeId);
                    if (showRate) {
                        $card.append('<button class="rate-teacher-btn btn-primary" data-teacher-id="' + member.tid + '">Rate Teacher</button>');
                    }
                    setTimeout(function() {
                        $('.rate-teacher-btn').off('click').on('click', function() {
                            var teacherId = $(this).data('teacher-id');
                            $('#teacherRatingModal').fadeIn(200);
                            $('#teacherRatingModal').data('teacher-id', teacherId);
                            $('#teacherModalStars label').removeClass('active').html('&#9734;');
                            $('#teacherModalSelectedStars').val(0);
                        });
                    }, 100);
                    $facultyContainer.append($card);
                    var baseUrl = window.localStorage.getItem('rmc_api_base') || 'http://localhost:8080';
                    $.ajax({
                        url: baseUrl + '/api/rating-teachers/teacher/' + encodeURIComponent(member.tid),
                        method: 'GET'
                    }).done(function(data) {
                        var totalScore = 0;
                        var count = Array.isArray(data) ? data.length : 0;
                        if (count > 0) {
                            for (var i = 0; i < count; i++) {
                                totalScore += Number(data[i].score);
                            }
                        }
                        var avg = count > 0 ? totalScore / count : 0;
                        var starsHtml = (function(ratingValue){
                            var full = Math.floor(ratingValue);
                            var hasHalf = (ratingValue - full) >= 0.5 && full < 5;
                            var html = '';
                            for (var i = 1; i <= 5; i++) {
                                if (i <= full) html += '<i class="fas fa-star"></i>';
                                else if (hasHalf && i === full + 1) html += '<i class="fas fa-star-half-alt"></i>';
                                else html += '<i class="far fa-star"></i>';
                            }
                            return html;
                        })(avg);
                        $('#teacher-stars-' + member.tid).html(starsHtml);
                        $('#teacher-rating-' + member.tid).text(avg.toFixed(1));
                        $('#teacher-count-' + member.tid).text('(' + count + ' reviews)');
                    });
                });
            } else {
                $facultyContainer.append('<p>No faculty information available for ' + (courseFilter === 'all' ? 'this department' : courseFilter.toUpperCase()) + '</p>');
            }
        }).fail(function() {
            $('#facultyContainer').html('<p>Failed to load faculty information</p>');
        });
    }

    // Update department features
    function updateDepartmentFeatures(department) {
        if (department.features && Array.isArray(department.features)) {
            var $featuresContainer = $('.department-features');
            $featuresContainer.empty();
            department.features.forEach(function(feature) {
                var icon = feature.icon || 'fas fa-check-circle';
                var $featureItem = $('<div>', {
                    class: 'feature-item'
                });
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
            headers: {
                'Accept': 'application/json'
            }
        }).done(function(college) {
            $('.college-name').text(college.name || 'College');
            $('.college-location').text(college.location || 'Location not available');
            $('.college-link').attr('href', 'college-detail.html?collegeId=' + encodeURIComponent(collegeId));
        }).fail(function() {
            $('.college-info').hide();
        });
    }

    // Initialize faculty tabs functionality
    function initializeFacultyTabs(departmentId) {
        $('.faculty-tab').on('click', function() {
            $('.faculty-tab').removeClass('active');
            $(this).addClass('active');
            var courseFilter = $(this).data('course');
            fetchDepartmentFaculty(departmentId, courseFilter);
        });
    }

    // Find matching course ID between teacher and student
    function findMatchingCourse(teacherCourses, studentCourses) {
        for (let tCourse of teacherCourses) {
            for (let sCourse of studentCourses) {
                if (tCourse.cid === sCourse.cid || tCourse.id === sCourse.id || tCourse.code === sCourse.code) {
                    return tCourse.cid || tCourse.id || tCourse.code;
                }
            }
        }
        return null;
    }

    // Initialize the page
    $(document).ready(function() {
        $("#navbar-container").load("navbar.html", function() {});
        $("#footer-container").load("footer.html", function() {});
        
        $('#teacherModalStars label').off('mouseenter mouseleave click').on('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            var star = parseInt($(this).data('star'));
            var currentRating = parseInt($('#teacherModalSelectedStars').val()) || 0;
            var $labels = $('#teacherModalStars label');
            var newRating = (star === currentRating) ? Math.max(0, currentRating - 1) : star;
            $labels.each(function(idx) {
                if (idx < newRating) {
                    $(this).addClass('active').html('&#9733;');
                } else {
                    $(this).removeClass('active').html('&#9734;');
                }
            });
            $('#teacherModalSelectedStars').val(newRating);
            $('#teacherModalStars')[0].offsetHeight;
        });

        $('#teacherModalStars label').on('mouseenter', function() {
            var star = parseInt($(this).data('star'));
            $('#teacherModalStars label').each(function(idx) {
                if (idx < star) {
                    $(this).addClass('hover').html('&#9733;');
                } else {
                    $(this).removeClass('hover').html('&#9734;');
                }
            });
        }).on('mouseleave', function() {
            var selectedStar = parseInt($('#teacherModalSelectedStars').val()) || 0;
            $('#teacherModalStars label').each(function(idx) {
                if (idx < selectedStar) {
                    $(this).addClass('active').html('&#9733;');
                } else {
                    $(this).removeClass('active hover').html('&#9734;');
                }
            });
        });

        $('#closeTeacherModal').on('click', function() {
            $('#teacherRatingModal').fadeOut(200);
        });

        $('#submitTeacherRating').on('click', function() {
            var score = $('#teacherModalSelectedStars').val();
            if (score > 0) {
                var teacherId = $('#teacherRatingModal').data('teacher-id');
                var departmentId = getDepartmentIdFromUrl();
                var baseUrl = window.localStorage.getItem('rmc_api_base') || 'http://localhost:8080';
                
                // Get user from localStorage to retrieve enrollment number
                var user = getUserFromLocalStorage();
                if (!user || user.role !== 'student' || !user.enrollment) {
                    alert('Unable to submit rating: Student enrollment information not found.');
                    return;
                }
                  
              

                var enrollId = user.enrollment; // Assuming 'enrollmentNumber' key in rmc_user object; adjust if different

                // Step 1: Fetch teacher's courses
                $.ajax({
                    url: baseUrl + '/api/teachers/' + encodeURIComponent(teacherId) + '/courses',
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json'
                        // Add 'Authorization': 'Bearer ' + window.localStorage.getItem('rmc_jwt') if JWT is required for auth
                    }
                }).done(function(teacherCourses) {
                  
                    
                    // Step 2: Fetch student's enrolled courses
                    $.ajax({
                        url: baseUrl + '/api/students/enroll/' + encodeURIComponent(enrollId),
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json'
                            // Add 'Authorization': 'Bearer ' + window.localStorage.getItem('rmc_jwt') if JWT is required for auth
                        }
                    }).done(function(studentEnrollment) {
                        var courseId = null;
                        for (let course of (Array.isArray(teacherCourses) ? teacherCourses : (teacherCourses?.course || []))) {
                            if (course.courseId === studentEnrollment.courseId || course.cid === studentEnrollment.courseId || course.id === studentEnrollment.courseId) {
                                courseId = course.courseId || course.cid || course.id;
                                break;
                            }
                        }

                      
                        if (!courseId) {
                            alert('Unable to submit rating: No matching course found between you and the teacher.');
                            return;
                        }

                        var studentId = studentEnrollment.sid;
                        // Step 3: Submit the rating
                        $.ajax({
                            url: baseUrl + '/api/rating-teachers',
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Accept': 'application/json'
                                // Add 'Authorization': 'Bearer ' + window.localStorage.getItem('rmc_jwt') if JWT is required for auth
                            },
                            data: JSON.stringify({
                                score: Number(score),
                                teacher: { tid: Number(teacherId) },
                                student: { sid: Number(studentId) },
                                course: { c_id: Number(courseId) }
                            })
                           
                        }).done(function(response) {
                            alert('Thank you for rating! You gave ' + score + ' star(s).');
                            fetchDepartmentFaculty(departmentId, $('.faculty-tab.active').data('course') || 'all');
                        }).fail(function(error) {
                            console.error('Failed to submit rating:', error);
                            alert('Failed to submit rating. Please try again later.');
                        });
                    }).fail(function(error) {
                        console.error('Failed to fetch student enrollment:', error);
                        alert('Failed to load your enrollment information.');
                    });
                }).fail(function(error) {
                    console.error('Failed to fetch teacher courses:', error);
                    alert('Failed to load teacher courses.');
                });

                $('#teacherRatingModal').fadeOut(200);
                setTimeout(function() {
                    $('#teacherModalStars label').removeClass('active').html('&#9734;');
                    $('#teacherModalSelectedStars').val(0);
                }, 300);
            } else {
                alert('Please select a star rating.');
            }
        });

        var departmentId = getDepartmentIdFromUrl();
        if (departmentId) {
            fetchDepartmentDetail(departmentId)
                .done(function(department) {
                    renderDepartmentDetail(department);
                    initializeFacultyTabs(departmentId);
                })
                .fail(function(error) {
                    console.error('Failed to fetch department details:', error);
                    alert('Failed to load department details. Please try again later.');
                });
        } else {
            alert('No department ID provided. Please go back and select a department.');
        }
    });
})();