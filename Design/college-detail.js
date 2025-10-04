// college-detail.js
// Fetch and display college details on college-detail.html

(function() {
    // Helper: get collegeId from URL query string
    function getCollegeIdFromUrl() {
        const params = new URLSearchParams(window.location.search);

      
        return params.get('collegeId');
    }

    // Fetch college details directly from backend (no dependency on api.js)
    function fetchCollegeDetail(collegeId) {
        if (!collegeId) return Promise.reject('No collegeId provided');
        var baseUrl = window.localStorage.getItem('rmc_api_base') || 'http://localhost:8080';
        var url = baseUrl + '/api/colleges/' + encodeURIComponent(collegeId);
        return $.ajax({
            url: url,
            method: 'GET'
        });
    }


    // Render college details into the static HTML design
    function renderCollegeDetail(college) {
        // Show/hide Rate College button based on student login and college match
        var user = null;
        try {
            user = JSON.parse(window.localStorage.getItem('rmc_user'));
             
        } catch (e) {}
        var showRate = false;
        if (user && user.role === 'student' && user.collegeId && String(user.collegeId) === String(college.cid)) {
           
            showRate = true;
        }
        if (showRate) {
            $(".action-buttons .btn-primary").show();
        } else {
            $(".action-buttons .btn-primary").hide();
        }
        // Departments & Programs section
        var $departmentsGrid = $(".departments-grid");
        $departmentsGrid.empty();
        var baseUrl = window.localStorage.getItem('rmc_api_base') || 'http://localhost:8080';
        // Fetch all departments for this college
        $.ajax({
            url: baseUrl + '/api/departments/college/' + encodeURIComponent(college.cid),
            method: 'GET'
        }).done(function(departments) {

           
            if (Array.isArray(departments) && departments.length > 0) {
                departments.forEach(function(dept) {

                    // For each department, fetch student and faculty count
                    var deptId = dept.deptId || dept.deptId;
                    
                    var deptName = dept.deptName || dept.deptName || 'Department';
                   
                    var deptDesc = dept.desc || dept.desc || '';
                    var deptIcon = 'fas fa-building';
                    // Optionally, map department name to icon
                    var iconMap = {
                        'computer': 'fas fa-laptop-code',
                        'engineering': 'fas fa-calculator',
                        'business': 'fas fa-chart-line',
                        'science': 'fas fa-microscope',
                        'arts': 'fas fa-palette',
                        'medicine': 'fas fa-stethoscope',
                        'law': 'fas fa-balance-scale',
                        'education': 'fas fa-chalkboard-teacher',
                        'management': 'fas fa-briefcase',
                        'commerce': 'fas fa-coins',
                        'pharmacy': 'fas fa-pills',
                        'agriculture': 'fas fa-seedling',
                        'architecture': 'fas fa-drafting-compass',
                        'media': 'fas fa-bullhorn',
                        'hotel': 'fas fa-hotel',
                        'design': 'fas fa-pencil-ruler',
                        'other': 'fas fa-building'
                    };
                    for (var k in iconMap) {
                        if (deptName.toLowerCase().includes(k)) {
                            deptIcon = iconMap[k];
                            break;
                        }
                    }
                    // Create card with loading stats
                    var $card = $('<a>', {
                        href: 'department-detail.html?id=' + encodeURIComponent(deptId),
                        class: 'department-card'
                    });
                    $card.append('<div class="department-icon"><i class="' + deptIcon + '"></i></div>');
                    $card.append('<h3>' + deptName + '</h3>');
                    $card.append('<p>' + deptDesc + '</p>');
                    var $stats = $('<div class="department-stats"><span class="stat students">Loading Students...</span><span class="stat faculty">Loading Faculty...</span></div>');
                    $card.append($stats);
                    $departmentsGrid.append($card);
                    // Fetch student count (use department count endpoint for accuracy)
                    $.ajax({
                        url: baseUrl + '/api/departments/' + encodeURIComponent(deptId) + '/students/count',
                        method: 'GET'
                    }).done(function(count) {
                        var studentCount = (typeof count === 'number') ? count : 0;
                        $stats.find('.students').text(studentCount + ' Students');
                    }).fail(function() {
                        $stats.find('.students').text('0 Students');
                    });
                    // Fetch faculty count (use department count endpoint for accuracy)
                    $.ajax({
                        url: baseUrl + '/api/departments/' + encodeURIComponent(deptId) + '/teachers/count',
                        method: 'GET'
                    }).done(function(count) {
                        var facultyCount = (typeof count === 'number') ? count : 0;
                        $stats.find('.faculty').text(facultyCount + ' Faculty');
                    }).fail(function() {
                        $stats.find('.faculty').text('0 Faculty');
                    });
                });
            } else {
                $departmentsGrid.append('<div>No departments found for this college.</div>');
            }
        });
       
        if (!college) {
            // Optionally show an error in the main content
            $(".college-name").text("College not found");
            return;
        }
        // Header image
        var heroImg = college.cimg && college.cimg.trim() !== ''
            ? window.API.getBaseUrl() + '/' + college.cimg.replace(/^\/+/,'')
            : 'https://ui-avatars.com/api/?name=' + encodeURIComponent(college.cname) + '&background=random';
        $(".college-hero-image").attr("src", heroImg).attr("alt", college.cname);
        // Name
        $(".college-name").text(college.cname || '');
        // Description
        $(".college-description").text(college.cdesc || '');
        // Contact info
        var address = college.address || '';
        var email = college.email || '';
        var phone = college.phone || '';
        var website = college.website || '';
        var contactItems = $(".contact-item");
        contactItems.eq(0).find('p').text(address);
        contactItems.eq(1).find('p').text(email);
        contactItems.eq(2).find('p').text(phone);
        if (website) {
            // Ensure the website has a protocol
            var href = website.match(/^https?:\/\//i) ? website : 'https://' + website;
            contactItems.eq(3).find('p').html('<a href="' + href + '" target="_blank" rel="noopener">' + website + '</a>');
        } else {
            contactItems.eq(3).find('p').text('');
        }

        // Campus Activities from cactivity (comma-separated string)
        var $activitiesGrid = $(".activities-grid");
        $activitiesGrid.empty();
        var cactivity = (college.cactivity || '').split(',').map(function(a) { return a.trim(); }).filter(Boolean);
        // Map activity keywords to Font Awesome icons
        var activityIcons = {
            'club': 'fas fa-users',
            'clubs': 'fas fa-users',
            'sports': 'fas fa-futbol',
            'fest': 'fas fa-theater-masks',
            'fests': 'fas fa-theater-masks',
            'music': 'fas fa-music',
            'dance': 'fas fa-music',
            'art': 'fas fa-paint-brush',
            'tech': 'fas fa-laptop-code',
            'coding': 'fas fa-code',
            'drama': 'fas fa-theater-masks',
            'literary': 'fas fa-book',
            'photography': 'fas fa-camera',
            'quiz': 'fas fa-question',
            'debate': 'fas fa-comments',
            'ncc': 'fas fa-flag',
            'nss': 'fas fa-hands-helping',
            'robotics': 'fas fa-robot',
            'film': 'fas fa-film',
            'fashion': 'fas fa-tshirt',
            'environment': 'fas fa-leaf',
            'volunteer': 'fas fa-hands-helping',
            'social': 'fas fa-users',
            'science': 'fas fa-atom',
            'math': 'fas fa-square-root-alt',
            'business': 'fas fa-briefcase',
            'finance': 'fas fa-coins',
            'entrepreneur': 'fas fa-lightbulb',
            'language': 'fas fa-language',
            'media': 'fas fa-bullhorn',
            'adventure': 'fas fa-hiking',
            'gaming': 'fas fa-gamepad',
            'spiritual': 'fas fa-praying-hands',
            'wellness': 'fas fa-heartbeat',
            'yoga': 'fas fa-child',
            'other': 'fas fa-star'
        };
        function getActivityIcon(act) {
            var key = act.toLowerCase();
            for (var k in activityIcons) {
                if (key.includes(k)) return activityIcons[k];
            }
            return 'fas fa-star';
        }
        if (cactivity.length > 0) {
            cactivity.forEach(function(act) {
                var iconClass = getActivityIcon(act);
                $activitiesGrid.append('<div class="activity-item"><i class="' + iconClass + '"></i><span>' + act + '</span></div>');
            });
        } else {
            $activitiesGrid.append('<div class="activity-item"><span>No activities listed.</span></div>');
        }
        // Optionally update page title
        document.title = `Rate My Campus - ${college.cname || ''}`;

        // Helper to render stars with halves
        function renderStarsWithHalf(ratingValue) {
            var full = Math.floor(ratingValue);
            var hasHalf = (ratingValue - full) >= 0.5 && full < 5;
            var html = '';
            for (var i = 1; i <= 5; i++) {
                if (i <= full) html += '<i class="fas fa-star"></i>';
                else if (hasHalf && i === full + 1) html += '<i class="fas fa-star-half-alt"></i>';
                else html += '<i class="far fa-star"></i>';
            }
            return html;
        }

        // Fetch and display rating and review count
        var baseUrl = window.localStorage.getItem('rmc_api_base') || 'http://localhost:8080';
        // Rating
        $.ajax({
            url: baseUrl + '/api/ratings/college/' + encodeURIComponent(college.cid),
            method: 'GET'
        }).done(function(rating) {
            var ratingValue = (typeof rating === 'number') ? rating : 0;
            var starsHtml = renderStarsWithHalf(ratingValue);
            $(".rating-stars").html(starsHtml);
            $(".rating-number").text(ratingValue.toFixed(1));
        });
        // Review count
        $.ajax({
            url: baseUrl + '/api/ratings/college/' + encodeURIComponent(college.cid) + '/student-count',
            method: 'GET'
        }).done(function(count) {
            var reviewCount = (typeof count === 'number') ? count : 0;
            $(".rating-count").text('(' + reviewCount + ' reviews)');
        });

        // Fetch and count students
        $.ajax({
            url: baseUrl + '/api/students?collegeId=' + encodeURIComponent(college.cid),
            method: 'GET'
        }).done(function(students) {
            var count = Array.isArray(students) ? students.length : 0;
            $(".stats-grid .stat-item").eq(0).find('.stat-number').text(count);
        });
        // Fetch and count teachers
        $.ajax({
            url: baseUrl + '/api/teachers?collegeId=' + encodeURIComponent(college.cid),
            method: 'GET'
        }).done(function(teachers) {
            var count = Array.isArray(teachers) ? teachers.length : 0;
            $(".stats-grid .stat-item").eq(1).find('.stat-number').text(count);
        });
        // Fetch and count departments
        $.ajax({
            url: baseUrl + '/api/departments/college/' + encodeURIComponent(college.cid),
            method: 'GET'
        }).done(function(departments) {
            var count = Array.isArray(departments) ? departments.length : 0;
            $(".stats-grid .stat-item").eq(2).find('.stat-number').text(count);
        });
    }

    // Main
    document.addEventListener('DOMContentLoaded', function() {
        var collegeId = getCollegeIdFromUrl();
        fetchCollegeDetail(collegeId)
            .then(function(college) {
                renderCollegeDetail(college);
            })
            .catch(function(err) {
                document.getElementById('college-detail').innerHTML = '<p>Error loading college details.</p>';
            });
    });
})();
