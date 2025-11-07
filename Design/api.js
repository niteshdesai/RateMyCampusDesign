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


    // Helper to get the appropriate token based on endpoint
    function getAuthToken(url) {
        if (url.includes('/auth/student') || url.includes('/api/students')) {
            return localStorage.getItem('rmc_token'); // Keep student token as is
        } else if (url.includes('/auth/hod') || url.includes('/api/departments')) {
            return localStorage.getItem('rmc_hod_token');
        } else if (url.includes('/auth/admin') || url.includes('/api/colleges')) {
            return localStorage.getItem('rmc_college_admin_token');
        }
        // Try all tokens in order of precedence
        return localStorage.getItem('rmc_token') ||
            localStorage.getItem('rmc_hod_token') ||
            localStorage.getItem('rmc_college_admin_token');
    }


    function decodeJwtPayload(token) {
        try {
            const parts = token.split('.');
            if (parts.length < 2) return null;
            let payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
            while (payload.length % 4) payload += '=';
            const decoded = atob(payload);
            const json = decodeURIComponent(decoded.split('').map(function (c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            return JSON.parse(json);
        } catch (e) {
            return null;
        }
    }
    // Attach bearer token automatically for non-GET requests only
    // $.ajaxSetup({
    //     beforeSend: function (xhr, settings) {
    //         var method = (settings && (settings.type || settings.method) || 'GET').toUpperCase();
    //         if (method !== 'GET') {
    //             var token = getAuthToken(settings.url || '');
    //            console.log('Using token for ' + settings.type + ': ' + decodeJwtPayload(token));
    //             if (token) xhr.setRequestHeader('Authorization', 'Bearer ' + token);
    //         }
    //     }
    // });

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


