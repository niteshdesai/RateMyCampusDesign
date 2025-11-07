$(function () {
    const baseUrl = API.getBaseUrl();
    const user = JSON.parse(localStorage.getItem('rmc_hod_user') || '{}');
    const deptId = user.deptId || user.departmentId || new URLSearchParams(location.search).get('deptId');
    const jwt = localStorage.getItem('rmc_hod_token') || '';
    var headers = {};
    if (jwt) {
        headers['Authorization'] = 'Bearer ' + jwt;
    }


    $('.user-name').text(user.name || '--');
    $('.avatar').attr('src', baseUrl + '/' + user.daImg);
    // Toggle Sidebar
    $('#sidebarToggle').on('click', () => $('#sidebar').toggleClass('collapsed'));

    // Navigation
    $('.nav').on('click', '.nav-item', function () {
        $('.nav-item').removeClass('active');
        $(this).addClass('active');
        const section = $(this).data('section');
        $('.panel').hide();
        $(`#section-${section}`).show();
        if (section === 'overview') loadOverview();
        if (section === 'students') loadStudents();
        if (section === 'courses') loadCourses();
        if (section === 'teachers') loadTeachers();
    });

    // Logout
    $('#logoutBtn').on('click', () => { localStorage.removeItem('rmc_user'); location.href = 'login.html'; });

    // Modal functionality
    const showModal = html => {
        $('#modalBody').html(html);
        $('#modalOverlay').fadeIn(200);
        // Re-attach close handler after modal content is updated
        $('.modal-close').off('click').on('click', hideModal);
    };
    const hideModal = () => {
        $('#modalOverlay').fadeOut(200);
        $('#modalBody').empty();
    };
    // Close on backdrop click
    $('#modalOverlay').on('click', e => {
        if (e.target === e.currentTarget) hideModal();
    });

    // Update Department Function
    function updateDepartment(deptData) {

        return $.ajax({
            url: baseUrl + '/api/departments/' + deptId,
            method: 'PUT',
            headers: {
                ...headers,
                'Content-Type': 'application/json'
            },
            data: JSON.stringify({
                deptName: deptData.deptName,
                desc: deptData.desc,
                college: { cid: deptData.collegeId }
            })
        });
    }

    // AJAX Helper
    const tryAjax = (paths, opts) => new Promise((resolve, reject) => {
        let i = 0;
        const attempt = () => {
            if (i >= paths.length) return reject();
            const p = paths[i++];
            $.ajax({ url: p.url, method: p.method || 'GET', ...opts }).done(resolve).fail(attempt);
        };
        attempt();
    });

    // ---------- OVERVIEW ----------
    function loadOverview() {
        if (!deptId) return;

        // Load stats
        Promise.all([
            tryAjax([{ url: `${baseUrl}/api/students/department/${deptId}` }]),
            tryAjax([{ url: `${baseUrl}/api/courses/department/${deptId}` }]),
            tryAjax([{ url: `${baseUrl}/api/teachers/department/${deptId}` }]),
            tryAjax([
                { url: `${baseUrl}/api/departments/${deptId}` },

            ])
        ]).then(([students, courses, teachers, dept]) => {
            $('#stat-students .value').text(students.length);
            $('#stat-courses .value').text(courses.length);
            $('#stat-teachers .value').text(teachers.length);

            // Department info
            $('#deptNameDisplay').text(dept.deptName || dept.name || '--');
            $('#deptDescDisplay').text(dept.desc || dept.shortDesc || '--');
        }).catch(() => {
            $('#deptNameDisplay').text('--');
            $('#deptDescDisplay').text('--');
        });
    }

    // ---------- EDIT DEPARTMENT ----------
    $('#editDeptBtn').on('click', () => {
        tryAjax([
            { url: `${baseUrl}/api/departments/${deptId}` },

        ]).then(dept => {
            showModal(`
                <h3><i class="fas fa-building"></i> Edit Department</h3>
                <form id="deptForm" class="modal-form">
                    <div class="form-error" id="m_error" style="color:#b00020;margin-bottom:10px"></div>
                    
                    <label>Name</label>
                    <input id="m_name" value="${dept.deptName || dept.name || ''}" required pattern="[A-Za-z ]+" title="Only letters and spaces allowed">
                    <div class="field-error" id="m_err_name" style="color:#b00020;font-size:12px;margin-top:-8px"></div>
                    
                    <label>Description</label>
                    <input id="m_desc" value="${dept.desc || dept.shortDesc || ''}">
                    <div class="field-error" id="m_err_desc" style="color:#b00020;font-size:12px;margin-top:-8px"></div>
                    
                    <div class="form-actions">
                        <button type="submit" class="btn-primary">Save</button>
                    </div>
                </form>
            `);
            $('#deptForm').on('submit', e => {
                e.preventDefault();

                // Clear previous errors
                clearDepartmentFieldErrors();

                // Get and validate form values
                const vals = getDepartmentFormValues();
                const errs = validateDepartmentValues(vals);

                if (errs.length) {
                    showDepartmentFieldErrors(errs);
                    return;
                }

                const payload = {
                    deptName: vals.deptName,
                    desc: vals.desc,
                    collegeId: user.collegeId
                };

                updateDepartment(payload).then(() => {
                    hideModal();
                    loadOverview();
                }).fail((xhr) => {
                    let msg = 'Update failed';
                    try {
                        if (xhr && xhr.responseJSON) {
                            msg = xhr.responseJSON.message || JSON.stringify(xhr.responseJSON.errors || xhr.responseJSON);
                        } else if (xhr && xhr.responseText) {
                            msg = xhr.responseText;
                        }
                    } catch (e) { }
                    $('#m_error').html(`<div>${msg}</div>`);
                });
            });
        });
    });

    // ---------- STUDENTS ----------
    let allCourses = {};

    tryAjax([
        { url: `${baseUrl}/api/courses/department/${deptId}` }
    ]).then(courses => {


        // Build course map: { courseId: courseName }
        allCourses = {};
        (Array.isArray(courses) ? courses : []).forEach(c => {
            const id = c.c_id;
            const name = c.cName || c.courseName || 'Unknown';
            if (id) allCourses[id] = name;
        })
    });

    // Validation helpers for student form
    function getStudentFormValues() {
        return {
            enrollment: ($('#m_enroll').val() || '').trim(),
            sname: ($('#m_name').val() || '').trim(),
            ssem: ($('#m_sem').val() || '').trim(),
            ssection: ($('#m_section').val() || '').trim(),
            semail: ($('#m_email').val() || '').trim(),
            smobile: ($('#m_mobile').val() || '').trim(),
            scity: ($('#m_city').val() || '').trim(),
            sgender: ($('#m_gender').val() || '').trim(),
            courseId: ($('#m_course').val() || '').trim()
        };
    }

    function clearFieldErrors() {
        $('.field-error').empty();
        $('#m_error').empty();
    }

    function showFieldErrors(errors) {
        clearFieldErrors();

        errors.forEach(err => {
            // Map error messages to specific fields
            if (err.includes('Enrollment')) $('#m_err_enroll').text(err);
            else if (err.includes('Name')) $('#m_err_name').text(err);
            else if (err.includes('Semester')) $('#m_err_sem').text(err);
            else if (err.includes('Section')) $('#m_err_section').text(err);
            else if (err.includes('Email')) $('#m_err_email').text(err);
            else if (err.includes('Mobile')) $('#m_err_mobile').text(err);
            else if (err.includes('City')) $('#m_err_city').text(err);
            else if (err.includes('Gender')) $('#m_err_gender').text(err);
            else if (err.includes('Course')) $('#m_err_course').text(err);
            // If no specific field match, show in general error area
            else $('#m_error').append(`<div>${err}</div>`);
        });
    }

    function validateStudentValues(vals, skipCourse) {
        const errors = [];
        // required checks
        if (!vals.enrollment) errors.push('Enrollment is required.');
        if (!vals.sname) errors.push('Name is required.');
        if (!vals.ssem) errors.push('Semester is required.');
        if (!vals.ssection) errors.push('Section is required.');
        if (!vals.semail) errors.push('Email is required.');
        if (!vals.smobile) errors.push('Mobile number is required.');
        if (!vals.scity) errors.push('City is required.');
        if (!vals.sgender) errors.push('Gender is required.');
        if (!skipCourse && !vals.courseId) errors.push('Course selection is required.');

        // name: only letters and spaces
        if (vals.sname && !/^[A-Za-z\s]+$/.test(vals.sname)) errors.push('Name must contain only letters and spaces.');

        // mobile: exactly 10 digits
        if (vals.smobile && !/^\d{10}$/.test(vals.smobile)) errors.push('Mobile number must be exactly 10 digits.');

        // email basic validation
        if (vals.semail && !/^\S+@\S+\.\S+$/.test(vals.semail)) errors.push('Email address is not valid.');

        // semester numeric positive
        if (vals.ssem && !/^\d+$/.test(vals.ssem)) errors.push('Semester must be a positive integer.');

        return errors;
    }

    // ========== TEACHER VALIDATION ==========
    function getTeacherFormValues() {
        return {
            tname: ($('#m_name').val() || '').trim(),
            temail: ($('#m_email').val() || '').trim(),
            tmobile: ($('#m_mobile').val() || '').trim(),
            tsem: ($('#m_sem').val() || '').trim(),
            role: ($('#m_role').val() || '').trim()
        };
    }

    function clearTeacherFieldErrors() {
        $('.field-error').empty();
        $('#m_error').empty();
    }

    function showTeacherFieldErrors(errors) {
        clearTeacherFieldErrors();
        errors.forEach(err => {
            if (err.includes('Name')) $('#m_err_name').text(err);
            else if (err.includes('Email')) $('#m_err_email').text(err);
            else if (err.includes('Mobile')) $('#m_err_mobile').text(err);
            else if (err.includes('Semester')) $('#m_err_sem').text(err);
            else if (err.includes('Role')) $('#m_err_role').text(err);
            else $('#m_error').append(`<div>${err}</div>`);
        });
    }

    function validateTeacherValues(vals) {
        const errors = [];
        if (!vals.tname) errors.push('Name is required.');
        if (!vals.temail) errors.push('Email is required.');
        if (!vals.tmobile) errors.push('Mobile number is required.');
        if (!vals.tsem) errors.push('Semester is required.');
        if (!vals.role) errors.push('Role is required.');

        if (vals.tname && !/^[A-Za-z\s]+$/.test(vals.tname)) errors.push('Name must contain only letters and spaces.');
        if (vals.tmobile && !/^\d{10}$/.test(vals.tmobile)) errors.push('Mobile number must be exactly 10 digits.');
        if (vals.temail && !/^\S+@\S+\.\S+$/.test(vals.temail)) errors.push('Email address is not valid.');
        if (vals.tsem && !/^\d+$/.test(vals.tsem)) errors.push('Semester must be a positive integer.');

        return errors;
    }

    // ========== DEPARTMENT VALIDATION ==========
    function getDepartmentFormValues() {
        return {
            deptName: ($('#m_name').val() || '').trim(),
            desc: ($('#m_desc').val() || '').trim()
        };
    }

    function clearDepartmentFieldErrors() {
        $('.field-error').empty();
        $('#m_error').empty();
    }

    function showDepartmentFieldErrors(errors) {
        clearDepartmentFieldErrors();
        errors.forEach(err => {
            if (err.includes('Name') || err.includes('Department')) $('#m_err_name').text(err);
            else if (err.includes('Description')) $('#m_err_desc').text(err);
            else $('#m_error').append(`<div>${err}</div>`);
        });
    }

    function validateDepartmentValues(vals) {
        const errors = [];
        if (!vals.deptName) errors.push('Department Name is required.');
        if (vals.deptName && !/^[A-Za-z\s]+$/.test(vals.deptName)) errors.push('Department Name must contain only letters and spaces.');
        return errors;
    }

    // ========== COURSE VALIDATION ==========
    function getCourseFormValues() {
        return {
            cName: ($('#m_name').val() || '').trim(),
            cDuration: ($('#m_duration').val() || '').trim(),
            cSince: ($('#m_since').val() || '').trim()
        };
    }

    function clearCourseFieldErrors() {
        $('.field-error').empty();
        $('#m_error').empty();
    }

    function showCourseFieldErrors(errors) {
        clearCourseFieldErrors();
        errors.forEach(err => {
            if (err.includes('Name') || err.includes('Course')) $('#m_err_name').text(err);
            else if (err.includes('Duration')) $('#m_err_duration').text(err);
            else if (err.includes('Since') || err.includes('Year')) $('#m_err_since').text(err);
            else $('#m_error').append(`<div>${err}</div>`);
        });
    }

    function validateCourseValues(vals) {
        const errors = [];
        if (!vals.cName) errors.push('Course Name is required.');
        if (vals.cName && !/^[A-Za-z\s]+$/.test(vals.cName)) errors.push('Course Name must contain only letters and spaces.');
        if (vals.cDuration && !/^\d+$/.test(vals.cDuration)) errors.push('Duration must be a positive number (years).');
        if (vals.cSince && !/^\d{4}$/.test(vals.cSince)) errors.push('Since Year must be a 4-digit year.');
        return errors;
    }




    function loadStudents() {
        tryAjax([
            { url: `${baseUrl}/api/students/department/${deptId}` }

        ]).then(students => {
            // Update table headers first (ensure header uses same table id)
            const tableHeaders = `
                <tr>
                    <th>Student ID</th>
                    <th>Enrollment</th>
                    <th>Photo</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Mobile Number</th>
                    <th>City</th>
                    <th>Gender</th>
                    <th>Semester</th>
                    <th>Section</th>
                    <th>Course</th>
                    <th>Actions</th>
                </tr>
            `;
            // Use the same table id as in the HTML
            $('#studentsTable thead').html(tableHeaders);


            const rows = (Array.isArray(students) ? students : []).map(s => {
                const id = s.sid || s._id || s.id || '';
                const courseId = s.courseId || s.course_id;
                const courseName = allCourses[courseId] || 'N/A';
                // Try multiple possible image fields returned by the API
                const imgField = s.simg || s.image || s.photo || s.sphoto || s.profileImage || '';
                const photoUrl = imgField ? (baseUrl + '/' + imgField) : 'assets/logo1.png';
                return `<tr data-id="${id}">
                    <td>${id}</td>
                    <td>${s.enrollment || ''}</td>
                    <td class="photo-col"><div class="photo-wrap"><img class="student-photo" src="${photoUrl}" alt="photo" onerror="this.onerror=null;this.src='assets/logo1.png'"><span class="photo-edit" title="Edit photo"><i class="fas fa-camera"></i></span></div></td>
                    <td>${s.sname || s.name || ''}</td>
                    <td>${s.semail || s.email || ''}</td>
                    <td>${s.smobile || s.phoneNumber || ''}</td>
                    <td>${s.scity || ''}</td>
                    <td>${s.sgender || ''}</td>
                    <td>${s.ssem || s.semester || ''}</td>
                    <td>${s.ssection || ''}</td>
                    <td>${courseName}</td>
                    <td>
                        <i class="fas fa-edit action-icon edit-student"></i>
                        <i class="fas fa-trash action-icon delete-student"></i>
                    </td>
                </tr>`;
            }).join('');
            $('#studentsTable tbody').html(rows || '<tr><td colspan="5">No students</td></tr>');
        }).catch(() => {
            $('#studentsTable tbody').html('<tr><td colspan="5">Failed to load students</td></tr>');
        });
    }

    $('#addStudentBtn').on('click', () => {
        // build course options from allCourses map
        const courseOptions = Object.entries(allCourses).map(([cid, cname]) => `<option value="${cid}">${cname}</option>`).join('');
        showModal(`
            <h3><i class="fas fa-user-graduate"></i> Add Student</h3>
            <form id="addStudentForm" class="modal-form" enctype="multipart/form-data">
                <div class="form-error" id="m_error" style="color:#b00020;margin-bottom:10px"></div>
                <label>Enrollment</label>
                <input id="m_enroll" required>
                <div class="field-error" id="m_err_enroll" style="color:#b00020;font-size:12px;margin-top:-8px"></div>
                
                <label>Name</label>
                <input id="m_name" required pattern="[A-Za-z ]+" title="Only letters and spaces allowed">
                <div class="field-error" id="m_err_name" style="color:#b00020;font-size:12px;margin-top:-8px"></div>
                
                <label>Semester</label>
                <input id="m_sem" required type="number" min="1">
                <div class="field-error" id="m_err_sem" style="color:#b00020;font-size:12px;margin-top:-8px"></div>
                
                <label>Section</label>
                <input id="m_section" required>
                <div class="field-error" id="m_err_section" style="color:#b00020;font-size:12px;margin-top:-8px"></div>
                
                <label>Email</label>
                <input id="m_email" required type="email">
                <div class="field-error" id="m_err_email" style="color:#b00020;font-size:12px;margin-top:-8px"></div>
                
                <label>Mobile</label>
                <input id="m_mobile" required pattern="[0-9]{10}" title="10 digits required">
                <div class="field-error" id="m_err_mobile" style="color:#b00020;font-size:12px;margin-top:-8px"></div>
                
                <label>City</label>
                <input id="m_city" required>
                <div class="field-error" id="m_err_city" style="color:#b00020;font-size:12px;margin-top:-8px"></div>
                
                <label>Gender</label>
                <select id="m_gender">
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                </select>
                <div class="field-error" id="m_err_gender" style="color:#b00020;font-size:12px;margin-top:-8px"></div>
                
                <label>Course</label>
                <select id="m_course">
                    <option value="">Select course</option>
                    ${courseOptions}
                </select>
                <div class="field-error" id="m_err_course" style="color:#b00020;font-size:12px;margin-top:-8px"></div>
                
                <label>Photo</label>
                <input type="file" id="m_image" accept="image/*">
                <div class="form-actions"><button type="submit" class="btn-primary">Save</button></div>
            </form>
        `);

        // bind submit to send multipart form-data with a single 'student' JSON field + image (Postman format)
        $('#addStudentForm').off('submit').on('submit', function (e) {
            e.preventDefault();

            // Clear any previous errors
            clearFieldErrors();

            // client-side validation
            const vals = getStudentFormValues();
            const errs = validateStudentValues(vals);
            if (errs.length) {
                showFieldErrors(errs);
                return;
            }

            const fd = new FormData();

            // Build student object to match Postman payload (use validated vals)
            const studentObj = {
                enrollment: vals.enrollment || null,
                sname: vals.sname || null,
                ssem: vals.ssem ? Number(vals.ssem) : null,
                ssection: vals.ssection || null,
                sgender: vals.sgender || null,
                smobile: vals.smobile || null,
                scity: vals.scity || null,
                semail: vals.semail || null,
                college: { cid: user.collegeId ? Number(user.collegeId) : null },
                department: { deptId: (typeof deptId !== 'undefined' && deptId !== null) ? Number(deptId) : null }
            };
            if (vals.courseId) studentObj.course = { c_id: Number(vals.courseId) };

            fd.append('student', new Blob([JSON.stringify(studentObj)], { type: "application/json" }));
            // Also append explicit id fields expected by some backend handlers
            if (typeof deptId !== 'undefined' && deptId !== null) fd.append('departmentId', String(deptId));
            if (user && user.collegeId) fd.append('collegeId', String(user.collegeId));
            if (vals.courseId) fd.append('courseId', String(vals.courseId));

            // Attach image file as 'image' if present
            const fileInput = document.getElementById('m_image');
            if (fileInput && fileInput.files && fileInput.files[0]) {
                fd.append('image', fileInput.files[0]);
            }


            $.ajax({
                url: `${baseUrl}/api/students/addStudent`,
                method: 'POST',
                data: fd,
                processData: false,
                contentType: false,
                headers: headers
            }).done(() => { hideModal(); loadStudents(); })
                .fail((xhr) => {
                    console.error('Failed to add student', xhr && xhr.responseText);
                    // show server-side errors in form
                    let msg = 'Failed to add student';
                    try {
                        if (xhr && xhr.responseJSON) {
                            if (xhr.responseJSON.message) msg = xhr.responseJSON.message;
                            else if (xhr.responseJSON.errors) msg = (xhr.responseJSON.errors || []).join('<br>');
                        } else if (xhr && xhr.responseText) {
                            msg = xhr.responseText;
                        }
                    } catch (e) { /* ignore parse errors */ }
                    $('#m_error').html(`<div>${msg}</div>`);
                });
        });
    });

    $('#studentsTable').on('click', '.edit-student', function () {
        const id = $(this).closest('tr').data('id');
        $.get(`${baseUrl}/api/students/${id}`).done(s => {
            // Store original course id for the update payload
            const originalCourseId = s.course?.c_id || s.courseId || s.course_id;

            showModal(`<h3>Edit Student</h3><form id="editStudentForm" class="modal-form" enctype="multipart/form-data">
                <div class="form-error" id="m_error" style="color:#b00020;margin-bottom:10px"></div>
                
                <label>Enrollment</label>
                <input id="m_enroll" value="${s.enrollment || ''}" required>
                <div class="field-error" id="m_err_enroll" style="color:#b00020;font-size:12px;margin-top:-8px"></div>
                
                <label>Name</label>
                <input id="m_name" value="${s.sname || s.name || ''}" required pattern="[A-Za-z ]+" title="Only letters and spaces allowed">
                <div class="field-error" id="m_err_name" style="color:#b00020;font-size:12px;margin-top:-8px"></div>
                
                <label>Semester</label>
                <input id="m_sem" value="${s.ssem || s.semester || ''}" required type="number" min="1">
                <div class="field-error" id="m_err_sem" style="color:#b00020;font-size:12px;margin-top:-8px"></div>
                
                <label>Section</label>
                <input id="m_section" value="${s.ssection || ''}" required>
                <div class="field-error" id="m_err_section" style="color:#b00020;font-size:12px;margin-top:-8px"></div>
                
                <label>Email</label>
                <input id="m_email" value="${s.semail || s.email || ''}" required type="email">
                <div class="field-error" id="m_err_email" style="color:#b00020;font-size:12px;margin-top:-8px"></div>
                
                <label>Mobile</label>
                    <input id="m_mobile" value="${s.smobile || s.mobile || ''}" required pattern="[0-9]{10}" title="10 digits required">
                <div class="field-error" id="m_err_mobile" style="color:#b00020;font-size:12px;margin-top:-8px"></div>
                
                <label>City</label>
                <input id="m_city" value="${s.scity || ''}" required>
                <div class="field-error" id="m_err_city" style="color:#b00020;font-size:12px;margin-top:-8px"></div>
                
                <label>Gender</label>
                <select id="m_gender">
                    <option value="">Select gender</option>
                    <option value="Male" ${s.sgender === 'Male' ? 'selected' : ''}>Male</option>
                    <option value="Female" ${s.sgender === 'Female' ? 'selected' : ''}>Female</option>
                    <option value="Other" ${s.sgender === 'Other' ? 'selected' : ''}>Other</option>
                </select>
                <div class="form-actions"><button type="submit" id="updStd" class="btn-primary">Update</button></div>
            </form>`);

            $('#editStudentForm').off('submit').on('submit', function (e) {
                e.preventDefault();

                // Clear any previous errors
                clearFieldErrors();

                // client-side validation
                const vals = getStudentFormValues();
                const errs = validateStudentValues(vals, true); // true = skip course validation
                if (errs.length) {
                    showFieldErrors(errs);
                    return;
                }

                // Build student object exactly matching required format
                const ssemValEdit = parseInt($('#m_sem').val(), 10);
                const studentObj = {
                    enrollment: $('#m_enroll').val().trim() || null,
                    sname: $('#m_name').val().trim() || null,
                    ssem: Number.isNaN(ssemValEdit) ? null : ssemValEdit,
                    ssection: $('#m_section').val().trim() || null,
                    sgender: $('#m_gender').val() || null,
                    smobile: $('#m_mobile').val().trim() || null,
                    scity: $('#m_city').val().trim() || null,
                    semail: $('#m_email').val().trim() || null,
                    department: {
                        deptId: Number(deptId)
                    },
                    college: {
                        cid: Number(user.collegeId)
                    },
                    course: {
                        c_id: Number(originalCourseId)
                    }
                };

                $.ajax({
                    url: `${baseUrl}/api/students/${id}`,
                    method: 'PUT',
                    data: JSON.stringify(studentObj),
                    contentType: 'application/json',
                    headers: headers
                }).done(() => { hideModal(); loadStudents(); })
                    .fail((xhr) => {
                        console.error('Failed to update student', xhr && xhr.responseText);
                        alert('Failed to update');
                    });
            });
        }).fail(() => alert('Failed to fetch student'));
    });

    $('#studentsTable').on('click', '.delete-student', function () {
        const id = $(this).closest('tr').data('id');
        if (confirm('Delete this student?')) {
            $.ajax({
                url: `${baseUrl}/api/students/${id}`, method: 'DELETE', headers: headers
            })
                .done(loadStudents)
                .fail(() => alert('Failed to delete'));
        }
    });

    // Click handler for photo edit overlay
    $('#studentsTable').on('click', '.photo-edit', function (e) {
        e.stopPropagation(); // prevent row click handlers
        const id = $(this).closest('tr').data('id');
        showModal(`
            <h3><i class="fas fa-camera"></i> Update Photo</h3>
            <form id="updateImageForm" class="modal-form" enctype="multipart/form-data">
                <div class="form-error" id="m_error" style="color:#b00020;margin-bottom:10px"></div>
                <label>Choose new photo</label>
                <input type="file" id="m_image_update" accept="image/*" required>
                <div class="form-actions"><button type="submit" class="btn-primary">Upload</button></div>
            </form>
        `);

        $('#updateImageForm').off('submit').on('submit', function (ev) {
            ev.preventDefault();
            $('#m_error').empty();
            const fileInput = document.getElementById('m_image_update');
            if (!fileInput || !fileInput.files || !fileInput.files[0]) {
                $('#m_error').text('Please select an image to upload.');
                return;
            }
            const fd = new FormData();
            fd.append('image', fileInput.files[0]);


            $.ajax({
                url: `${baseUrl}/api/students/updateStudentImage/${id}`,
                method: 'PUT',
                data: fd,
                processData: false,
                contentType: false,
                headers: headers
            }).done(() => {
                hideModal();
                loadStudents();
            }).fail((xhr) => {
                let msg = 'Failed to upload image';
                try {
                    if (xhr && xhr.responseJSON) {
                        if (xhr.responseJSON.message) msg = xhr.responseJSON.message;
                        else if (xhr.responseJSON.errors) msg = (xhr.responseJSON.errors || []).join('<br>');
                    } else if (xhr && xhr.responseText) {
                        msg = xhr.responseText;
                    }
                } catch (e) { /* ignore */ }
                $('#m_error').html(`<div>${msg}</div>`);
            });
        });
    });

    // ---------- COURSES ----------
    function loadCourses() {
        tryAjax([
            { url: `${baseUrl}/api/courses/department/${deptId}` },

        ]).then(courses => {


            const rows = (Array.isArray(courses) ? courses : []).map(c => {
                const id = c.c_id || c._id || c.c_id || '';
                return `<tr data-id="${id}">
                    <td>${c.cName || c.courseName || ''}</td>
                    <td>${c.cDuration || ''}</td>
                    <td>${c.cSince || c.startYear || ''}</td>
                    <td>
                        <i class="fas fa-edit action-icon edit-course"></i>
                        <i class="fas fa-trash action-icon delete-course"></i>
                    </td>
                </tr>`;
            }).join('');
            $('#coursesTable tbody').html(rows || '<tr><td colspan="4">No courses</td></tr>');
        }).catch(() => {
            $('#coursesTable tbody').html('<tr><td colspan="4">Failed to load courses</td></tr>');
        });
    }

    $('#addCourseBtn').on('click', () => {
        showModal(`
            <h3><i class="fas fa-book"></i> Add Course</h3>
            <div class="modal-form">
                <div class="form-error" id="m_error" style="color:#b00020;margin-bottom:10px"></div>
                
                <label>Name</label>
                <input id="m_name" required>
                <div class="field-error" id="m_err_name" style="color:#b00020;font-size:12px;margin-top:-8px"></div>
                
                <label>Duration (Years)</label>
                <input id="m_duration" type="number" min="1">
                <div class="field-error" id="m_err_duration" style="color:#b00020;font-size:12px;margin-top:-8px"></div>
                
                <label>Since (Year)</label>
                <input id="m_since" type="number" min="1900" max="2100" placeholder="e.g., 2020">
                <div class="field-error" id="m_err_since" style="color:#b00020;font-size:12px;margin-top:-8px"></div>
                
                <div class="form-actions"><button id="saveCourse" class="btn-primary">Save</button></div>
            </div>
        `);


        $('#saveCourse').on('click', () => {
            // Clear previous errors
            clearCourseFieldErrors();

            // Get and validate form values
            const vals = getCourseFormValues();
            const errs = validateCourseValues(vals);

            if (errs.length) {
                showCourseFieldErrors(errs);
                return;
            }

            // Match server-side Course entity property names: cName, cDuration, cSince
            const data = {
                cName: vals.cName,
                cDuration: vals.cDuration ? Number(vals.cDuration) : null,
                cSince: vals.cSince ? Number(vals.cSince) : null,
                department: {
                    deptId: Number(deptId)
                },
                college: {
                    cid: Number(user.collegeId)
                }
            };
            $.ajax({
                url: `${baseUrl}/api/courses`,
                method: 'POST',
                data: JSON.stringify(data),
                contentType: 'application/json',
                headers: headers
            }).done(() => { hideModal(); loadCourses(); })
                .fail((xhr) => {
                    let msg = 'Failed to add course';
                    try {
                        if (xhr && xhr.responseJSON) {
                            msg = xhr.responseJSON.message || JSON.stringify(xhr.responseJSON.errors || xhr.responseJSON);
                        } else if (xhr && xhr.responseText) {
                            msg = xhr.responseText;
                        }
                    } catch (e) { }
                    $('#m_error').html(`<div>${msg}</div>`);
                });
        });
    });

    $('#coursesTable').on('click', '.edit-course', function () {
        const id = $(this).closest('tr').data('id');
        $.get(`${baseUrl}/api/courses/${id}`).done(c => {
            // Render modal with inputs, then populate values with jQuery to avoid template interpolation issues
            showModal(`<h3>Edit Course</h3><div class="modal-form">
                <div class="form-error" id="m_error" style="color:#b00020;margin-bottom:10px"></div>
                
                <label>Name</label>
                <input id="m_name" required>
                <div class="field-error" id="m_err_name" style="color:#b00020;font-size:12px;margin-top:-8px"></div>
                
                <label>Duration (Years)</label>
                <input id="m_duration" type="number" min="1">
                <div class="field-error" id="m_err_duration" style="color:#b00020;font-size:12px;margin-top:-8px"></div>
                
                <label>Since (Year)</label>
                <input id="m_since" type="number" min="1900" max="2100">
                <div class="field-error" id="m_err_since" style="color:#b00020;font-size:12px;margin-top:-8px"></div>
                
                <div class="form-actions"><button id="updCourse" class="btn-primary">Update</button></div>
            </div>`);

            // Populate fields safely
            try {
                $('#m_name').val(c && (c.cName || c.courseName || c.cname || c.name) || '');
                $('#m_duration').val(c && (c.cDuration || c.duration || '') || '');
                $('#m_since').val(c && (c.cSince || c.since || '') || '');
            } catch (e) {
                console.warn('Failed to populate course edit fields', e, c);
            }

            $('#updCourse').off('click').on('click', () => {
                // Clear previous errors
                clearCourseFieldErrors();

                // Get and validate form values
                const vals = getCourseFormValues();
                const errs = validateCourseValues(vals);

                if (errs.length) {
                    showCourseFieldErrors(errs);
                    return;
                }

                const payload = {
                    cName: vals.cName,
                    cDuration: vals.cDuration ? Number(vals.cDuration) : null,
                    cSince: vals.cSince ? Number(vals.cSince) : null,
                    // keep department/college unchanged on update; backend will validate ownership
                    department: { deptId: Number(deptId) },
                    college: { cid: Number(user.collegeId) }
                };
                $.ajax({ url: `${baseUrl}/api/courses/${id}`, method: 'PUT', data: JSON.stringify(payload), contentType: 'application/json', headers: headers })
                    .done(() => { hideModal(); loadCourses(); })
                    .fail((xhr) => {
                        let msg = 'Failed to update';
                        try {
                            if (xhr && xhr.responseJSON) {
                                msg = xhr.responseJSON.message || JSON.stringify(xhr.responseJSON.errors || xhr.responseJSON);
                            } else if (xhr && xhr.responseText) {
                                msg = xhr.responseText;
                            }
                        } catch (e) { }
                        $('#m_error').html(`<div>${msg}</div>`);
                    });
            });
        }).fail(() => alert('Failed to fetch course'));
    });

    $('#coursesTable').on('click', '.delete-course', function () {
        const id = $(this).closest('tr').data('id');
        if (confirm('Delete this course?')) {
            $.ajax({ url: `${baseUrl}/api/courses/${id}`, method: 'DELETE', headers: headers })
                .done(loadCourses)
                .fail(() => alert('Failed to delete'));
        }
    });

    // ---------- TEACHERS ----------
    function loadTeachers() {
        tryAjax([
            { url: `${baseUrl}/api/teachers/department/${deptId}` }
        ], { headers: headers }).then(teachers => {
            // Update table headers first
            const tableHeaders = `
                <tr>
                    <th>Teacher ID</th>
                    <th>Photo</th>
                    <th>Name</th>
                    <th>Semester</th>
                    <th>Role</th>
                    <th>Courses</th>
                    <th>Add Courses</th>
                    <th>Actions</th>
                </tr>
            `;
            $('#teachersTable thead').html(tableHeaders);

            // Then create rows
            const rows = (Array.isArray(teachers) ? teachers : []).map(t => {
                const id = t.tid || t._id || t.id || '';
                const imgField = t.timg || t.image || t.photo || t.profileImage || '';
                const photoUrl = imgField ? (baseUrl + '/' + imgField) : 'assets/logo1.png';
                return `<tr data-id="${id}">
                    <td>${id}</td>
                    <td class="photo-col">
                        <div class="photo-wrap" style="position:relative;display:inline-block;width:40px;height:40px">
                            <img class="teacher-photo" src="${photoUrl}" alt="photo" 
                                 onerror="this.onerror=null;this.src='assets/logo1.png'" 
                                 style="width:40px;height:40px;object-fit:cover;border-radius:50%">
                            <span class="photo-edit photo-edit-teacher" title="Edit photo" style="position:absolute;right:0;bottom:0;cursor:pointer;font-size:8px;background:#fff;padding:2px;border-radius:50%;box-shadow:0 1px 2px rgba(0,0,0,0.15);width:14px;height:14px;display:flex;align-items:center;justify-content:center"><i class="fas fa-camera" style="font-size:8px"></i></span>
                        </div>
                    </td>
                    <td>${t.tname || t.name || ''}</td>
                    <td>${t.tsem || t.semester || ''}</td>
                    <td>${t.role || t.roleName || ''}</td>
                    <td class="teacher-courses-cell">
                        <div class="teacher-courses" data-teacher-id="${id}">Loading...</div>
                    </td>
                    <td>
                        <button class="btn-secondary btn-sm add-teacher-courses-btn add-teacher-courses">Add Courses</button>
                    </td>
                    <td>
                        <i class="fas fa-edit action-icon edit-teacher" title="Edit teacher"></i>
                        <i class="fas fa-trash action-icon delete-teacher" title="Delete teacher"></i>
                    </td>
                </tr>`;
            }).join('');
            $('#teachersTable tbody').html(rows || '<tr><td colspan="8">No teachers found</td></tr>');

            // After rows are rendered, fetch each teacher's courses and render them
            (Array.isArray(teachers) ? teachers : []).forEach(t => {
                const id = t.tid || t._id || t.id || '';
                if (!id) return;
                $.ajax({
                    url: `${baseUrl}/api/teachers/${id}/courses`,
                    method: 'GET',
                    headers: headers
                }).done(courses => {

                    const $cell = $(`#teachersTable tbody tr[data-id="${id}"] .teacher-courses`);
                    if (!$cell || $cell.length === 0) return;
                    if (Array.isArray(courses) && courses.length > 0) {
                        const html = courses.map(c => {
                            const courseName = c.courseName || c.cName || c.name || c;
                            const courseId = c.courseId || c.c_id || c.id || '';
                            return `
                            <span class="course-badge" data-course-name="${courseName}" data-course-id="${courseId}" style="display:inline-block;background:#eef;padding:4px 8px;border-radius:12px;margin:2px;font-size:12px">
                                ${courseName}
                                <i class="fas fa-times remove-course" title="Remove course" style="margin-left:6px;cursor:pointer;color:#900;font-size:11px"></i>
                            </span>`;
                        }).join(' ');
                        $cell.html(html);
                    } else {
                        $cell.html('<span class="no-courses" style="color:#666;font-size:12px">—</span>');
                    }
                }).fail(() => {
                    const $cell = $(`#teachersTable tbody tr[data-id="${id}"] .teacher-courses`);
                    if ($cell && $cell.length) $cell.html('<span style="color:#b00020;font-size:12px">Failed</span>');
                });
            });
        }).catch(() => {
            $('#teachersTable tbody').html('<tr><td colspan="8">Failed to load teachers</td></tr>');
        });
    }

    $('#addTeacherBtn').on('click', () => {
        showModal(`
            <h3><i class="fas fa-chalkboard-teacher"></i> Add Teacher</h3>
            <form id="addTeacherForm" class="modal-form" enctype="multipart/form-data">
                <div class="form-error" id="m_error" style="color:#b00020;margin-bottom:10px"></div>
                
                <label>Name</label>
                <input id="m_name" required pattern="[A-Za-z ]+" title="Only letters and spaces allowed">
                <div class="field-error" id="m_err_name" style="color:#b00020;font-size:12px;margin-top:-8px"></div>
                
                <label>Email</label>
                <input id="m_email" type="email" required>
                <div class="field-error" id="m_err_email" style="color:#b00020;font-size:12px;margin-top:-8px"></div>
                
                <label>Mobile</label>
                <input id="m_mobile" required pattern="[0-9]{10}" title="10 digits required">
                <div class="field-error" id="m_err_mobile" style="color:#b00020;font-size:12px;margin-top:-8px"></div>
                
                <label>Semester</label>
                <input id="m_sem" type="number" min="1" required>
                <div class="field-error" id="m_err_sem" style="color:#b00020;font-size:12px;margin-top:-8px"></div>
                
                <label>Role</label>
                <select id="m_role" required>
                    <option value="">Select role</option>
                    <option value="Teacher">Teacher</option>
                    <option value="Professor">Professor</option>
                    <option value="Assistant">Assistant</option>
                    <option value="Other">Other</option>
                </select>
                <div class="field-error" id="m_err_role" style="color:#b00020;font-size:12px;margin-top:-8px"></div>
                
                <div id="m_role_other_wrap" style="display:none;margin-top:6px">
                    <label>Specify role</label>
                    <input id="m_role_other" placeholder="Enter custom role" pattern="[A-Za-z ]+" title="Only letters and spaces allowed">
                </div>
                
                <label>Photo</label>
                <input type="file" id="m_t_image" accept="image/*">
                <div class="field-error" id="m_err_image" style="color:#b00020;font-size:12px;margin-top:-8px"></div>
                
                <div style="font-size:12px;color:blue;margin:8px 0">Note: Courses can be added separately — a teacher may be involved in multiple courses.</div>
                <div class="form-actions"><button type="submit" id="saveTeacher" class="btn-primary">Save</button></div>
            </form>
        `);

        // Toggle custom role input when 'Other' selected
        $('#m_role').off('change').on('change', function () {
            const v = $(this).val();
            if (v === 'Other') $('#m_role_other_wrap').show(); else $('#m_role_other_wrap').hide();
        });

        $('#addTeacherForm').off('submit').on('submit', function (e) {
            e.preventDefault();

            // Clear previous errors
            clearTeacherFieldErrors();

            // pick role: custom if Other
            let roleVal = $('#m_role').val() || '';
            if (roleVal === 'Other') {
                const custom = ($('#m_role_other').val() || '').trim();
                if (custom) {
                    roleVal = custom;
                } else {
                    // User selected "Other" but didn't provide custom role
                    roleVal = ''; // Make it empty so validation catches it
                }
            }

            // Get and validate form values
            const vals = getTeacherFormValues();
            vals.role = roleVal; // override with processed role
            const errs = validateTeacherValues(vals);

            if (errs.length) {
                showTeacherFieldErrors(errs);
                return;
            }

            const teacherObj = {
                tname: vals.tname || null,
                temail: vals.temail || null,
                tmobile: vals.tmobile || null,
                tsem: Number(vals.tsem) || null,
                role: vals.role || null,
                college: { cid: Number(user.collegeId) },
                department: { deptId: Number(deptId) }
            };

            const fd = new FormData();
            fd.append('teacher', new Blob([JSON.stringify(teacherObj)], { type: 'application/json' }));
            const fileInput = document.getElementById('m_t_image');
            if (fileInput && fileInput.files && fileInput.files[0]) {
                fd.append('image', fileInput.files[0]);
            }

            $.ajax({
                url: `${baseUrl}/api/teachers`,
                method: 'POST',
                data: fd,
                processData: false,
                contentType: false,
                headers: headers
            }).done(() => { hideModal(); loadTeachers(); })
                .fail((xhr) => {
                    let msg = 'Failed to add teacher';
                    try {
                        if (xhr && xhr.responseJSON) {
                            if (xhr.responseJSON.message) msg = xhr.responseJSON.message;
                            else if (xhr.responseJSON.errors) msg = JSON.stringify(xhr.responseJSON.errors);
                        } else if (xhr && xhr.responseText) {
                            msg = xhr.responseText;
                        }
                    } catch (e) { }
                    $('#m_error').html(`<div>${msg}</div>`);
                });
        });
    });

    $('#teachersTable').on('click', '.edit-teacher', function () {
        const id = $(this).closest('tr').data('id');
        $.ajax({
            url: `${baseUrl}/api/teachers/${id}`,
            method: 'GET',
            headers: headers
        }).done(t => {
            showModal(`<h3>Edit Teacher</h3>
                <form id="editTeacherForm" class="modal-form">
                    <div class="form-error" id="m_error" style="color:#b00020;margin-bottom:10px"></div>
                    
                    <label>Name</label>
                    <input id="m_name" value="${t.tname || t.name || ''}" required pattern="[A-Za-z ]+" title="Only letters and spaces allowed">
                    <div class="field-error" id="m_err_name" style="color:#b00020;font-size:12px;margin-top:-8px"></div>
                    
                    <label>Semester</label>
                    <input id="m_sem" value="${t.tsem || t.semester || ''}" type="number" min="1" required>
                    <div class="field-error" id="m_err_sem" style="color:#b00020;font-size:12px;margin-top:-8px"></div>
                    
                    <label>Role</label>
                    <select id="m_role" required>
                        <option value="">Select role</option>
                        <option value="Teacher">Teacher</option>
                        <option value="Professor">Professor</option>
                        <option value="Assistant">Assistant</option>
                        <option value="Other">Other</option>
                    </select>
                    <div class="field-error" id="m_err_role" style="color:#b00020;font-size:12px;margin-top:-8px"></div>
                    
                    <div id="m_role_other_wrap" style="display:none;margin-top:6px">
                        <label>Specify role</label>
                        <input id="m_role_other" placeholder="Enter custom role" pattern="[A-Za-z ]+" title="Only letters and spaces allowed">
                    </div>
                    
                    <div style="font-size:12px;color:blue;margin:8px 0">Note: Courses can be added separately — a teacher may be involved in multiple courses.</div>
                    <div class="form-actions"><button type="submit" class="btn-primary">Update</button></div>
                </form>`);

            // initialize role select / custom input based on value from server
            try {
                const existingRole = (t.role || t.roleName || '').trim();
                if (existingRole) {
                    if (['Teacher', 'Professor', 'Assistant'].indexOf(existingRole) >= 0) {
                        $('#m_role').val(existingRole);
                        $('#m_role_other_wrap').hide();
                    } else {
                        $('#m_role').val('Other');
                        $('#m_role_other').val(existingRole);
                        $('#m_role_other_wrap').show();
                    }
                } else {
                    $('#m_role').val('');
                    $('#m_role_other_wrap').hide();
                }
            } catch (e) { console.warn('role init error', e); }

            $('#m_role').off('change').on('change', function () {
                if ($(this).val() === 'Other') $('#m_role_other_wrap').show(); else $('#m_role_other_wrap').hide();
            });

            // handle edit teacher form submit (no image in edit form)
            $('#editTeacherForm').off('submit').on('submit', function (ev) {
                ev.preventDefault();

                // Clear previous errors
                clearTeacherFieldErrors();

                // determine role value
                let roleVal = $('#m_role').val() || '';
                if (roleVal === 'Other') {
                    const custom = ($('#m_role_other').val() || '').trim();
                    if (custom) {
                        roleVal = custom;
                    } else {
                        // User selected "Other" but didn't provide custom role
                        roleVal = ''; // Make it empty so validation catches it
                    }
                }

                // Get and validate form values
                const vals = getTeacherFormValues();
                vals.role = roleVal; // override with processed role
                const errs = validateTeacherValues(vals);

                if (errs.length) {
                    showTeacherFieldErrors(errs);
                    return;
                }

                const teacherObj = {
                    tname: vals.tname || null,
                    temail: vals.temail || null,
                    tmobile: vals.tmobile || null,
                    tsem: Number(vals.tsem) || null,
                    role: vals.role || null,
                    college: { cid: Number(user.collegeId) },
                    department: { deptId: Number(deptId) }
                };

                $.ajax({
                    url: `${baseUrl}/api/teachers/${id}`,
                    method: 'PUT',
                    data: JSON.stringify(teacherObj),
                    contentType: 'application/json',
                    headers: headers
                }).done(() => { hideModal(); loadTeachers(); })
                    .fail((xhr) => {
                        let msg = 'Failed to update';
                        try {
                            if (xhr && xhr.responseJSON) {
                                msg = xhr.responseJSON.message || JSON.stringify(xhr.responseJSON.errors || xhr.responseJSON);
                            } else if (xhr && xhr.responseText) {
                                msg = xhr.responseText;
                            }
                        } catch (e) { }
                        $('#m_error').html(`<div>${msg}</div>`);
                    });
            });
        }).fail(() => alert('Failed to fetch teacher'));
    });

    // Add courses to teacher
    $('#teachersTable').on('click', '.add-teacher-courses', function () {
        const id = $(this).closest('tr').data('id');
        const teacherName = $(this).closest('tr').find('td:eq(2)').text(); // 3rd column has name

        // First get department courses
        $.ajax({
            url: `${baseUrl}/api/courses/department/${deptId}`,
            method: 'GET',
            headers: headers
        }).done(courses => {
            // Create checkboxes for courses
            const courseOptions = (Array.isArray(courses) ? courses : [])
                .map(c => `
                    <div class="course-option">
                        <input type="checkbox" id="course_${c.c_id}" value="${c.c_id}">
                        <label for="course_${c.c_id}">${c.cName || c.courseName || 'Unknown'}</label>
                    </div>
                `).join('');

            showModal(`
                <h3><i class="fas fa-book"></i> Add Courses for ${teacherName}</h3>
                <form id="addTeacherCoursesForm" class="modal-form">
                    <div class="form-error" id="m_error" style="color:#b00020;margin-bottom:10px"></div>
                    <div class="course-options" style="max-height:300px;overflow-y:auto">
                        ${courseOptions || '<p>No courses available</p>'}
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn-primary">Save Courses</button>
                    </div>
                </form>
            `);

            $('#addTeacherCoursesForm').off('submit').on('submit', function (e) {
                e.preventDefault();

                // Get selected course IDs
                const courseIds = [];
                $('.course-option input:checked').each(function () {
                    courseIds.push(Number($(this).val()));
                });

                if (courseIds.length === 0) {
                    $('#m_error').html('<div>Please select at least one course</div>');
                    return;
                }

                // Send to API
                $.ajax({
                    url: `${baseUrl}/api/teachers/${id}/courses`,
                    method: 'POST',
                    contentType: 'application/json',
                    data: JSON.stringify({ courseIds }),
                    headers: headers
                }).done(() => {
                    hideModal();
                    loadTeachers();
                }).fail((xhr) => {
                    let msg = 'Failed to add courses';
                    try {
                        if (xhr && xhr.responseJSON) {
                            if (xhr.responseJSON.message) msg = xhr.responseJSON.message;
                            else if (xhr.responseJSON.errors) msg = JSON.stringify(xhr.responseJSON.errors);
                        } else if (xhr && xhr.responseText) {
                            msg = xhr.responseText;
                        }
                    } catch (e) { }
                    $('#m_error').html(`<div>${msg}</div>`);
                });
            });
        }).fail(() => {
            alert('Failed to load courses');
        });
    });

    $('#teachersTable').on('click', '.delete-teacher', function () {
        const id = $(this).closest('tr').data('id');
        if (confirm('Delete this teacher?')) {
            $.ajax({
                url: `${baseUrl}/api/teachers/${id}`,
                method: 'DELETE',
                headers: headers
            })
                .done(loadTeachers)
                .fail((xhr) => {
                    console.error('Failed to delete teacher', xhr && xhr.responseText);
                    alert(xhr?.responseJSON?.message || 'Failed to delete');
                });
        }
    });

    // Remove a course from a teacher (delegated handler)
    $('#teachersTable').on('click', '.remove-course', function (e) {
        e.stopPropagation(); // avoid triggering row clicks
        const $btn = $(this);
        const $badge = $btn.closest('.course-badge');
        const courseName = ($badge.data('course-name') || '').toString().trim();
        const courseId = $badge.data('course-id');
        const $tr = $btn.closest('tr');
        const teacherId = $tr.data('id');

        if (!teacherId) {
            alert('Unable to determine teacher id');
            return;
        }

        if (!courseId) {
            alert('Unable to determine course id for "' + courseName + '"');
            return;
        }

        if (!confirm('Remove course "' + courseName + '" from this teacher?')) return;



        $.ajax({
            url: `${baseUrl}/api/teachers/${teacherId}/courses`,
            method: 'DELETE',
            contentType: 'application/json',
            data: JSON.stringify({ c_id: Number(courseId) }),
            headers: headers
        }).done(() => {
            // remove badge from UI
            $badge.remove();
        }).fail((xhr) => {
            console.error('DELETE course failed:', xhr.status, xhr.responseText);
            const msg = xhr?.responseJSON?.message || xhr?.responseText || 'Failed to remove course';
            alert(msg);
        });
    });

    // Click handler for teacher photo edit overlay
    $('#teachersTable').on('click', '.photo-edit-teacher', function (e) {
        e.stopPropagation(); // prevent row click handlers
        const id = $(this).closest('tr').data('id');
        showModal(`
            <h3><i class="fas fa-camera"></i> Update Photo</h3>
            <form id="updateTeacherImageForm" class="modal-form" enctype="multipart/form-data">
                <div class="form-error" id="m_error" style="color:#b00020;margin-bottom:10px"></div>
                <label>Choose new photo</label>
                <input type="file" id="m_teacher_image_update" accept="image/*" required>
                <div class="form-actions"><button type="submit" class="btn-primary">Upload</button></div>
            </form>
        `);

        $('#updateTeacherImageForm').off('submit').on('submit', function (ev) {
            ev.preventDefault();
            $('#m_error').empty();
            const fileInput = document.getElementById('m_teacher_image_update');
            if (!fileInput || !fileInput.files || !fileInput.files[0]) {
                $('#m_error').text('Please select an image to upload.');
                return;
            }
            const fd = new FormData();
            fd.append('image', fileInput.files[0]);

            // NOTE: Assuming backend endpoint for teacher image update follows /api/teachers/updateTeacherImage/{id}
            $.ajax({
                url: `${baseUrl}/api/teachers/updateTeacherImage/${id}`,
                method: 'PUT',
                data: fd,
                processData: false,
                contentType: false,
                headers: headers
            }).done(() => {
                hideModal();
                loadTeachers();
            }).fail((xhr) => {
                let msg = 'Failed to upload image';
                try {
                    if (xhr && xhr.responseJSON) {
                        if (xhr.responseJSON.message) msg = xhr.responseJSON.message;
                        else if (xhr.responseJSON.errors) msg = (xhr.responseJSON.errors || []).join('<br>');
                    } else if (xhr && xhr.responseText) {
                        msg = xhr.responseText;
                    }
                } catch (e) { /* ignore */ }
                $('#m_error').html(`<div>${msg}</div>`);
            });
        });
    });

    // Initialize
    $('.nav-item[data-section="overview"]').trigger('click');
});