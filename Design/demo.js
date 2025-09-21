var baseUrl = window.localStorage.getItem('rmc_api_base') || 'http://localhost:8080';
function getStudentByEnrollment(enrollmentNumber) {
        let studentData = null;

        $.ajax({
            url: baseUrl+"/api/students/enroll/" + enrollmentNumber,
            type: "GET",
            success: function(response) {
                studentData = response;
            },
            error: function(xhr, status, error) {
                console.error("Error fetching student:", error);
            }
        });

        return studentData;
    }


    console.log('Base URL for API requests:', getStudentByEnrollment(ENR20250001));