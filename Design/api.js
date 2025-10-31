// Simple API client config for frontend

window.API = (function () {
    // Get a single college by its ID
    var BASE_URL = window.localStorage.getItem('rmc_api_base') || 'http://localhost:8080';

    // Get average rating for a college by its ID
    function getCollegeRating(collegeId) {
        var url = getBaseUrl() + '/api/ratings/college/' + encodeURIComponent(collegeId);
        return $.ajax({
            url: url,
            method: 'GET'
        });
    }

    // Get review count for a college by its ID
    function getCollegeReviewCount(collegeId) {
        var url = getBaseUrl() + '/api/ratings/college/' + encodeURIComponent(collegeId) + '/student-count';
        return $.ajax({
            url: url,
            method: 'GET'
        });
    }


    // Attach bearer token automatically for non-GET requests only
    $.ajaxSetup({
        beforeSend: function (xhr, settings) {
            var method = (settings && (settings.type || settings.method) || 'GET').toUpperCase();
            if (method !== 'GET') {
                var token = localStorage.getItem('rmc_token');
                if (token) xhr.setRequestHeader('Authorization', 'Bearer ' + token);
            }
        }
    });

    function setBaseUrl(url) {
        BASE_URL = url;
        window.localStorage.setItem('rmc_api_base', url);
    }

    function getBaseUrl() {
        return BASE_URL;
    }

    function loginStudent(payload) {
        var url = getBaseUrl() + '/auth/student';
        // Ensure required parameters are included in the URL as query parameters
        var queryParams = [];
        if (payload && payload.enrollment) {
            queryParams.push('enrollment=' + encodeURIComponent(payload.enrollment));
        }
        if (payload && payload.semester) {
            queryParams.push('semester=' + encodeURIComponent(payload.semester));
        }
        if (payload && payload.collegeId) {
            queryParams.push('collegeId=' + encodeURIComponent(payload.collegeId));
            console.log('College ID for student login:', payload.collegeId);
        }
        if (payload && payload.role) {
            queryParams.push('role=' + encodeURIComponent(payload.role));
        }
        if (queryParams.length > 0) {
            url += '?' + queryParams.join('&');
        }

        return $.ajax({
            url: url,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(payload)
        });
    }

    function loginHod(payload) {
        var url = getBaseUrl() + '/auth/hod';
        // Ensure required parameters are included in the URL as query parameters
        var queryParams = [];
        if (payload && payload.email) {
            queryParams.push('email=' + encodeURIComponent(payload.email));
        }
        if (payload && payload.password) {
            queryParams.push('password=' + encodeURIComponent(payload.password));
        }
        if (payload && payload.role) {
            queryParams.push('role=' + encodeURIComponent(payload.role));
        }
        if (queryParams.length > 0) {
            url += '?' + queryParams.join('&');
        }

        return $.ajax({
            url: url,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(payload)
        });
    }

    function loginAdmin(payload) {
        var url = getBaseUrl() + '/auth/college-admin';
        // Ensure required parameters are included in the URL as query parameters
        var queryParams = [];
        if (payload && payload.email) {
            queryParams.push('email=' + encodeURIComponent(payload.email));
        }
        if (payload && payload.password) {
            queryParams.push('password=' + encodeURIComponent(payload.password));
        }
        if (payload && payload.role) {
            queryParams.push('role=' + encodeURIComponent(payload.role));
        }
        if (queryParams.length > 0) {
            url += '?' + queryParams.join('&');
        }

        return $.ajax({
            url: url,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(payload)
        });
    }

    function getColleges() {
        var url = getBaseUrl() + '/api/colleges';
        return $.ajax({
            url: url,
            method: 'GET'
        });
    }

    function getStudentProfile(enrollment) {
        var url = getBaseUrl() + '/api/students/enroll/' + encodeURIComponent(enrollment);

        return $.ajax({
            url: url,
            method: 'GET'
        }).then(function (student) {
            console.log('Fetched student profile from api:', student);
            if (!student) {
                return $.Deferred().reject('Student not found').promise();
            }
            // Map the API response fields to our expected format
            return {
                enrollment: student.enrollment,
                name: student.sname,
                semester: student.ssem,
                gender: student.sgender,
                city: student.scity,
                email: student.semail,
                mobile: student.smobile,
                image: student.simg
            };
        });
    }

    return {
        setBaseUrl: setBaseUrl,
        getBaseUrl: getBaseUrl,
        loginStudent: loginStudent,
        loginHod: loginHod,
        loginAdmin: loginAdmin,
        getColleges: getColleges,

        getStudentProfile: getStudentProfile,
        getCollegeRating: getCollegeRating,
        getCollegeReviewCount: getCollegeReviewCount
    };
})();


