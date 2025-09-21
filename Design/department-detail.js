// department-detail.js
// Fetch and display department details on department-detail.html

(function() {
    // Helper: get departmentId from URL query string
    function getDepartmentIdFromUrl() {
        const params = new URLSearchParams(window.location.search);
        // Check for 'departmentId', 'id', and 'htmlId' parameters for compatibility
        return params.get('departmentId') || params.get('id') || params.get('htmlId');
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
        // Update department header information
        $('.department-name').text(department.deptName || 'Department');
        $('.department-description').text(department.desc || 'No description available');
        
        // Update department stats
        fetchDepartmentStats(department.deptId);
        
        // Update about department section
        $('.department-full-description').text(department.fullDescription || department.desc || 'No detailed description available');
        
        // Update courses and generate faculty tabs based on available courses
        fetchDepartmentCourses(department.deptId);
        
        // Fetch department head (admin)
        fetchDepartmentHead(department.deptId);
        
        // Update facilities
        updateDepartmentFeatures(department);
        
        // Update college information
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
                console.log('Department head:', head);
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
        
        // Update head image
        var profileImg = head.da_img || 'https://placehold.co/60x60/3b82f6/FFFFFF?text=' + encodeURIComponent(head.name?.charAt(0) || 'H');
        $('.department-sidebar .faculty-image').attr('src', profileImg);
        
        // Update head info
        $headInfo.find('h4').text(head.name || 'Department Head');
    }
    
    // Fetch department statistics (students, faculty, courses count)
    function fetchDepartmentStats(departmentId) {
        var baseUrl = window.localStorage.getItem('rmc_api_base') || 'http://localhost:8080';

        // Fetch students count
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

        // Fetch faculty count
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

        // Fetch courses count
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
                
                // Update faculty tabs based on available courses
                updateFacultyTabs(courses, departmentId);
            } else {
                $coursesTableBody.append('<tr><td colspan="3">No courses available</td></tr>');
                // If no courses, just show all faculty
                fetchDepartmentFaculty(departmentId, 'all');
            }
        }).fail(function() {
            $('#coursesTableBody').html('<tr><td colspan="3">Failed to load courses</td></tr>');
            // If failed to load courses, just show all faculty
            fetchDepartmentFaculty(departmentId, 'all');
        });
    }
    
    // Update faculty tabs based on available courses
    function updateFacultyTabs(courses, departmentId) {
        var $facultyTabs = $('.faculty-tabs');
        $facultyTabs.empty();
        
        // Always add "All Faculty" tab
        $facultyTabs.append('<button class="faculty-tab active" data-course="all">All Faculty</button>');
        
        // Add tabs for each course directly from database
        if (Array.isArray(courses) && courses.length > 0) {
            courses.forEach(function(course) {
                // Use the course name directly from database
                if (course.cName) {
                    var courseName = course.cName + ' Teachers';
                    var courseCode = course.code || course.cName.toLowerCase().replace(/\s+/g, '');
                    
                    $facultyTabs.append('<button class="faculty-tab" data-course="' + courseCode + '">' + courseName + '</button>');
                }
            });
        }
        
        // Initialize faculty tabs
        initializeFacultyTabs(departmentId);
        
        // Load faculty for the active tab (all)
        fetchDepartmentFaculty(departmentId, 'all');
    }
    
    // Fetch department faculty
    function fetchDepartmentFaculty(departmentId, courseFilter = 'all') {
        var baseUrl = window.localStorage.getItem('rmc_api_base') || 'http://localhost:8080';
        var url = baseUrl + '/api/teachers/department/' + encodeURIComponent(departmentId);
        
        // Add course filter if not 'all'
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
                        'data-courses': (member.courses || []).join(',') // Add courses as data attribute
                    });
                    
                    var profileImg = member.tname || 'https://placehold.co/60x60/3b82f6/FFFFFF?text=' + encodeURIComponent(member.tname?.charAt(0) || 'F');
                    
                    $card.append('<div class="faculty-image"><img src="' + profileImg + '" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover;"></div>');
                    $card.append('<h3>' + (member.tname || 'Faculty Member') + '</h3>');
                    $card.append('<p class="faculty-title">' + (member.title || 'Professor') + '</p>');
                    
                    // Fetch teacher rating
                    fetchTeacherRating(member.tid, function(rating, reviewCount) {
                        var ratingHtml = '<div class="faculty-rating"><span class="rating-value">' + rating.toFixed(1) + '</span> <span class="rating-stars">';
                        
                        // Create filled and empty stars based on rating
                        var fullStars = Math.floor(rating);
                        var hasHalfStar = rating - fullStars >= 0.5;
                        
                        for (var i = 1; i <= 5; i++) {
                            if (i <= fullStars) {
                                ratingHtml += '<i class="fas fa-star"></i>'; // Full star
                            } else if (i === fullStars + 1 && hasHalfStar) {
                                ratingHtml += '<i class="fas fa-star-half-alt"></i>'; // Half star
                            } else {
                                ratingHtml += '<i class="far fa-star"></i>'; // Empty star
                            }
                        }
                        
                        ratingHtml += '</span> <span class="rating-count">(' + reviewCount + ' reviews)</span></div>';
                        $card.find('.faculty-rating').remove(); // Remove any existing rating
                        $card.append(ratingHtml);
                    });
                    
                    // Add courses taught if available
                    if (member.courses && member.courses.length > 0) {
                        var coursesList = '<p class="faculty-courses"><strong>Courses:</strong> ' + member.courses.join(', ') + '</p>';
                        $card.append(coursesList);
                    }
                    
                    // Add rate button if user is logged in and eligible
                    var user = null;
                    try {
                        user = JSON.parse(window.localStorage.getItem('rmc_user'));
                    } catch (e) {}
                    
                    // Check if student is logged in and belongs to the same college
                    if (user && user.role === 'student') {
                        var rateButton = $('<button>', {
                            class: 'btn btn-sm btn-primary rate-teacher-btn',
                            text: 'Rate Teacher',
                            'data-teacher-id': member.tid,
                            'data-teacher-name': member.tname || 'Faculty Member',
                            'data-teacher-title': member.title || 'Professor',
                            'data-teacher-image': profileImg,
                            'data-teacher-courses': (member.courses || []).join(',')
                        });
                        $card.append(rateButton);
                    }
                    
                    $facultyContainer.append($card);
                });
            } else {
                $facultyContainer.append('<p>No faculty information available for ' + (courseFilter === 'all' ? 'this department' : courseFilter.toUpperCase()) + '</p>');
            }
        }).fail(function() {
            $('#facultyContainer').html('<p>Failed to load faculty information</p>');
        });
    }
    
    // Update department features based on department data
    function updateDepartmentFeatures(department) {
        // If department has features property, use it
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
            
            // Set college link
            $('.college-link').attr('href', 'college-detail.html?collegeId=' + encodeURIComponent(collegeId));
        }).fail(function() {
            $('.college-info').hide();
        });
    }

    // Initialize faculty tabs functionality
    function initializeFacultyTabs(departmentId) {
        // Handle faculty tab clicks
        $('.faculty-tab').on('click', function() {
            // Update active tab
            $('.faculty-tab').removeClass('active');
            $(this).addClass('active');
            
            // Get selected course
            var courseFilter = $(this).data('course');
            
            // Fetch faculty for the selected course
            fetchDepartmentFaculty(departmentId, courseFilter);
        });
    }
    
    // Fetch teacher rating from API
    function fetchTeacherRating(teacherId, callback) {
        var baseUrl = window.localStorage.getItem('rmc_api_base') || 'http://localhost:8080';
        
        $.ajax({
            url: baseUrl + '/api/rating-teachers/teacher/' + teacherId,
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        }).done(function(response) {
            var rating = 0;
            var reviewCount = 0;
            if (response && response.score) {
                rating = parseFloat(response.score);
                reviewCount = response.reviewCount || 0;
            }
            callback(rating, reviewCount);
        }).fail(function() {
            callback(0, 0); // Default to 0 if rating fetch fails
        });
    }
    
    // Submit teacher rating to API
    function submitTeacherRating(teacherId, studentId, courseId, score, departmentId) {
        var baseUrl = window.localStorage.getItem('rmc_api_base') || 'http://localhost:8080';
        
        $.ajax({
            url: baseUrl + '/api/rating-teachers/teacher/' + teacherId,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                teacherId: teacherId,
                studentId: studentId,
                courseId: courseId,
                score: score
            })
        }).done(function(response) {
            // Hide modal
            $('#rateTeacherModal').hide();
            $('.star-rating label').removeClass('active');
            $('input[name="rating"]').prop('checked', false);
            
            // Show success message
            alert('Rating submitted successfully!');
            
            // Refresh faculty list to show updated ratings
            fetchDepartmentFaculty(departmentId, $('.faculty-tab.active').data('course') || 'all');
        }).fail(function(error) {
            alert('Failed to submit rating: ' + (error.responseJSON?.message || 'Unknown error'));
        });
    }

    // Initialize the page
    $(document).ready(function() {
        // Load navbar
        $("#navbar-container").load("navbar.html", function() {
            // Initialize navbar functionality if needed
        });
        
        // Load footer
        $("#footer-container").load("footer.html", function() {
            // Initialize footer functionality if needed
        });
        
        var departmentId = getDepartmentIdFromUrl();
        if (departmentId) {
            fetchDepartmentDetail(departmentId)
                .done(function(department) {
                    renderDepartmentDetail(department);
                    
                    // Initialize faculty tabs after department is loaded
                    initializeFacultyTabs(departmentId);
                })
                .fail(function(error) {
                    console.error('Failed to fetch department details:', error);
                    alert('Failed to load department details. Please try again later.');
                });
        } else {
            alert('No department ID provided. Please go back and select a department.');
        }

        // Rate teacher button click
        $(document).on('click', '.rate-teacher-btn', function() {
            var teacherId = $(this).data('teacher-id');
            var teacherName = $(this).data('teacher-name');
            var teacherTitle = $(this).data('teacher-title');
            var teacherImage = $(this).data('teacher-image');
            var teacherCourses = $(this).data('teacher-courses').split(',');
            
            // Set modal data
            $('#modalTeacherImage').attr('src', teacherImage);
            $('#modalTeacherName').text(teacherName);
            $('#modalTeacherTitle').text(teacherTitle);
            
            // Store teacher ID in the form
            $('#rateTeacherForm').data('teacher-id', teacherId);
            $('#rateTeacherForm').data('teacher-courses', teacherCourses);
            
            // Reset form
            $('#rateTeacherForm')[0].reset();
            $('.star-rating label').removeClass('active');
            
            // Show modal
            $('#rateTeacherModal').show();
        });

        // Close modal handlers
        $(document).on('click', '#cancelRate, #rateTeacherModal .close', function() {
            $('#rateTeacherModal').hide();
            $('.star-rating label').removeClass('active');
            $('.star-rating input[type="radio"]').prop('checked', false);
        });

        // Close when clicking outside content
        $(window).on('click', function(e) {
            if (e.target.id === 'rateTeacherModal') {
                $('#rateTeacherModal').hide();
                $('.star-rating label').removeClass('active');
                $('.star-rating input[type="radio"]').prop('checked', false);
            }
        });

        // Star rating interaction (fill on click only, matching college rating system)
        $(document).on('click', '#rateTeacherModal .star', function(e) {
            e.preventDefault();
            const clickedRating = Number($(this).data('rating'));
            const starContainer = $(this).closest('.star-rating');

            // Clear previous selection
            starContainer.find('label').removeClass('active');
            starContainer.find('input[type="radio"]').prop('checked', false);

            // Fill stars up to the clicked rating
            starContainer.find('label').each(function() {
                const r = Number($(this).data('rating'));
                if (r <= clickedRating) {
                    $(this).addClass('active');
                }
            });

            // Set the corresponding radio input
            starContainer.find(`input[value="${clickedRating}"]`).prop('checked', true);
        });

        // Submit rating
        $('#rateTeacherForm').on('submit', function(e) {
            e.preventDefault();
            
            var teacherId = $(this).data('teacher-id');
            var teacherCourses = $(this).data('teacher-courses');
            var rating = $('input[name="rating"]:checked').val();
            
            if (!rating) {
                alert('Please select a rating');
                return;
            }
            
            // Get user info
            var user = null;
            try {
                user = JSON.parse(window.localStorage.getItem('rmc_user'));
            } catch (e) {}
            
            if (!user || !user.id) {
                alert('You must be logged in to rate a teacher');
                return;
            }
            
            // Get department ID from URL
            var departmentId = getDepartmentIdFromUrl();
            if (!departmentId) {
                alert('Department ID is missing');
                return;
            }
            
            // Get course ID (use first course from teacher's courses)
            var courseId = teacherCourses[0] || '';
            
            // Submit rating
            submitTeacherRating(teacherId, user.id, courseId, rating, departmentId);
        });
    });
})();