$(function () {
    const baseUrl = API.getBaseUrl();
    const user = JSON.parse(localStorage.getItem('rmc_college_admin_user') || '{}');
    const collegeId = user.collegeId || user.cid || new URLSearchParams(location.search).get('collegeId');
    const jwt = localStorage.getItem('rmc_college_admin_token') || '';
    var headers = {};
    if (jwt) {
        headers['Authorization'] = 'Bearer ' + jwt;
    }
    console.log('Using headers:', headers);
    console.log('College ID:', collegeId);

    $('.user-name').text(user.name || 'College Admin');
    if (user.caImg) {
        $('.avatar').attr('src', baseUrl + '/' + user.caImg);
    }

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
        if (section === 'departments') loadDepartments();
        if (section === 'hods') loadHods();
    });

    // Logout
    $('#logoutBtn').on('click', () => {
        localStorage.removeItem('rmc_college_admin_user');
        localStorage.removeItem('rmc_college_admin_token');
        location.href = 'login.html';
    });

    // Modal functionality
    const showModal = html => {
        $('#modalBody').html(html);
        $('#modalOverlay').fadeIn(200);
        $('.modal-close').off('click').on('click', hideModal);
    };
    const hideModal = () => {
        $('#modalOverlay').fadeOut(200);
        $('#modalBody').empty();
    };
    $('#modalOverlay').on('click', e => {
        if (e.target === e.currentTarget) hideModal();
    });

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
        if (!collegeId) return;

        // Load stats and college details
        Promise.all([
            tryAjax([{ url: `${baseUrl}/api/departments/college/${collegeId}` }], { headers }),
            tryAjax([{ url: `${baseUrl}/api/departmentadmins/college/${collegeId}` }], { headers }),
            tryAjax([{ url: `${baseUrl}/api/colleges/${collegeId}` }], { headers })
        ]).then(([departments, hods, college]) => {
            $('#stat-departments .value').text((Array.isArray(departments) ? departments : []).length);
            $('#stat-hods .value').text((Array.isArray(hods) ? hods : []).length);

            // College info
            $('#collegeNameDisplay').text(college.cname || college.name || '--');
            $('#collegeDescDisplay').text(college.shortDesc || college.desc || '--');
            $('#collegeAddressDisplay').text(college.fullAddress || '--');
            $('#collegeCityDisplay').text(college.city || '--');
            $('#collegeStateDisplay').text(college.state || '--');
            $('#collegePincodeDisplay').text(college.pincode || '--');

            // Count total students across all departments
            if (Array.isArray(departments) && departments.length > 0) {
                const studentRequests = departments.map(d => {
                    const deptId = d.deptId || d.id;
                    return $.ajax({
                        url: `${baseUrl}/api/students/department/${deptId}`,
                        method: 'GET',
                        headers: headers
                    }).catch(() => []);
                });
                Promise.all(studentRequests).then(results => {
                    const totalStudents = results.reduce((sum, students) => sum + (Array.isArray(students) ? students.length : 0), 0);
                    $('#stat-students .value').text(totalStudents);
                });
            } else {
                $('#stat-students .value').text(0);
            }
        }).catch(() => {
            $('#collegeNameDisplay').text('--');
            $('#collegeDescDisplay').text('--');
        });
    }

    // ---------- EDIT COLLEGE ----------
    $('#editCollegeBtn').on('click', () => {
        tryAjax([{ url: `${baseUrl}/api/colleges/${collegeId}` }], { headers }).then(college => {
            showModal(`
                <h3><i class="fas fa-university"></i> Edit College</h3>
                <form id="collegeForm" class="modal-form">
                    <div class="form-error" id="m_error" style="color:#b00020;margin-bottom:10px"></div>
                    
                    <label>College Name</label>
                    <input id="m_name" value="${college.cname || college.name || ''}" required>
                    
                    <label>Short Description</label>
                    <textarea id="m_desc" rows="3">${college.shortDesc || college.desc || ''}</textarea>
                    
                    <label>Full Address</label>
                    <input id="m_address" value="${college.fullAddress || ''}">
                    
                    <label>City</label>
                    <input id="m_city" value="${college.city || ''}">
                    
                    <label>State</label>
                    <input id="m_state" value="${college.state || ''}">
                    
                    <label>Pincode</label>
                    <input id="m_pincode" value="${college.pincode || ''}" pattern="[0-9]{6}" title="6 digits required">
                    
                    <div class="form-actions">
                        <button type="submit" class="btn-primary">Save</button>
                    </div>
                </form>
            `);
            $('#collegeForm').on('submit', e => {
                e.preventDefault();
                const payload = {
                    cname: $('#m_name').val().trim(),
                    shortDesc: $('#m_desc').val().trim(),
                    fullAddress: $('#m_address').val().trim(),
                    city: $('#m_city').val().trim(),
                    state: $('#m_state').val().trim(),
                    pincode: $('#m_pincode').val().trim()
                };

                $.ajax({
                    url: `${baseUrl}/api/colleges/${collegeId}`,
                    method: 'PUT',
                    data: JSON.stringify(payload),
                    contentType: 'application/json',
                    headers: headers
                }).done(() => {
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

    // ---------- DEPARTMENTS ----------
    function loadDepartments() {
        tryAjax([{ url: `${baseUrl}/api/departments/college/${collegeId}` }], { headers }).then(departments => {
            const rows = (Array.isArray(departments) ? departments : []).map(d => {
                const id = d.deptId || d.id || '';
                const logoField = d.logo || d.deptLogo || d.image || '';
                const logoUrl = logoField ? (baseUrl + '/' + logoField) : 'assets/logo1.png';
                return `<tr data-id="${id}">
                    <td>${id}</td>
                    <td class="photo-col">
                        <div class="photo-wrap" style="position:relative;display:inline-block;width:40px;height:40px">
                            <img src="${logoUrl}" alt="logo" 
                                 onerror="this.onerror=null;this.src='assets/logo1.png'" 
                                 style="width:40px;height:40px;object-fit:cover;border-radius:50%">
                            <span class="photo-edit photo-edit-dept" title="Edit logo" style="position:absolute;right:0;bottom:0;cursor:pointer;font-size:8px;background:#fff;padding:2px;border-radius:50%;box-shadow:0 1px 2px rgba(0,0,0,0.15);width:14px;height:14px;display:flex;align-items:center;justify-content:center"><i class="fas fa-camera" style="font-size:8px"></i></span>
                        </div>
                    </td>
                    <td>${d.deptName || d.name || ''}</td>
                    <td>${d.desc || d.shortDesc || ''}</td>
                    <td>
                        <i class="fas fa-edit action-icon edit-department" title="Edit department"></i>
                        <i class="fas fa-trash action-icon delete-department" title="Delete department"></i>
                    </td>
                </tr>`;
            }).join('');
            $('#departmentsTable tbody').html(rows || '<tr><td colspan="5">No departments found</td></tr>');
        }).catch(() => {
            $('#departmentsTable tbody').html('<tr><td colspan="5">Failed to load departments</td></tr>');
        });
    }

    $('#addDepartmentBtn').on('click', () => {
        showModal(`
            <h3><i class="fas fa-building"></i> Add Department</h3>
            <form id="addDepartmentForm" class="modal-form" enctype="multipart/form-data">
                <div class="form-error" id="m_error" style="color:#b00020;margin-bottom:10px"></div>
                
                <label>Department Name</label>
                <input id="m_name" required>
                
                <label>Description</label>
                <textarea id="m_desc" rows="3"></textarea>
                
                <label>Logo</label>
                <input type="file" id="m_logo" accept="image/*">
                
                <div class="form-actions"><button type="submit" class="btn-primary">Save</button></div>
            </form>
        `);

        $('#addDepartmentForm').off('submit').on('submit', function (e) {
            e.preventDefault();
            $('#m_error').empty();

            const fd = new FormData();
            const deptObj = {
                deptName: ($('#m_name').val() || '').trim() || null,
                desc: ($('#m_desc').val() || '').trim() || null,
                college: { cid: Number(collegeId) }
            };
            fd.append('department', new Blob([JSON.stringify(deptObj)], { type: 'application/json' }));

            const fileInput = document.getElementById('m_logo');
            if (fileInput && fileInput.files && fileInput.files[0]) {
                fd.append('image', fileInput.files[0]);
            }

            $.ajax({
                url: `${baseUrl}/api/departments`,
                method: 'POST',
                data: fd,
                processData: false,
                contentType: false,
                headers: headers
            }).done(() => { hideModal(); loadDepartments(); loadOverview(); })
                .fail((xhr) => {
                    let msg = 'Failed to add department';
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

    $('#departmentsTable').on('click', '.edit-department', function () {
        const id = $(this).closest('tr').data('id');
        $.ajax({
            url: `${baseUrl}/api/departments/${id}`,
            method: 'GET',
            headers: headers
        }).done(d => {
            showModal(`<h3>Edit Department</h3>
                <form id="editDepartmentForm" class="modal-form">
                    <div class="form-error" id="m_error" style="color:#b00020;margin-bottom:10px"></div>
                    
                    <label>Department Name</label>
                    <input id="m_name" value="${d.deptName || d.name || ''}" required>
                    
                    <label>Description</label>
                    <textarea id="m_desc" rows="3">${d.desc || d.shortDesc || ''}</textarea>
                    
                    <div class="form-actions"><button type="submit" class="btn-primary">Update</button></div>
                </form>`);

            $('#editDepartmentForm').off('submit').on('submit', function (ev) {
                ev.preventDefault();
                const payload = {
                    deptName: ($('#m_name').val() || '').trim() || null,
                    desc: ($('#m_desc').val() || '').trim() || null,
                    college: { cid: Number(collegeId) }
                };

                $.ajax({
                    url: `${baseUrl}/api/departments/${id}`,
                    method: 'PUT',
                    data: JSON.stringify(payload),
                    contentType: 'application/json',
                    headers: headers
                }).done(() => { hideModal(); loadDepartments(); })
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
        }).fail(() => alert('Failed to fetch department'));
    });

    $('#departmentsTable').on('click', '.delete-department', function () {
        const id = $(this).closest('tr').data('id');
        if (confirm('Delete this department? This will also affect related HODs and data.')) {
            $.ajax({
                url: `${baseUrl}/api/departments/${id}`,
                method: 'DELETE',
                headers: headers
            })
                .done(() => { loadDepartments(); loadOverview(); })
                .fail((xhr) => {
                    alert(xhr?.responseJSON?.message || 'Failed to delete');
                });
        }
    });

    // Department logo edit handler
    $('#departmentsTable').on('click', '.photo-edit-dept', function (e) {
        e.stopPropagation();
        const id = $(this).closest('tr').data('id');
        showModal(`
            <h3><i class="fas fa-camera"></i> Update Department Logo</h3>
            <form id="updateDeptLogoForm" class="modal-form" enctype="multipart/form-data">
                <div class="form-error" id="m_error" style="color:#b00020;margin-bottom:10px"></div>
                <label>Choose new logo</label>
                <input type="file" id="m_dept_logo_update" accept="image/*" required>
                <div class="form-actions"><button type="submit" class="btn-primary">Upload</button></div>
            </form>
        `);

        $('#updateDeptLogoForm').off('submit').on('submit', function (ev) {
            ev.preventDefault();
            $('#m_error').empty();
            const fileInput = document.getElementById('m_dept_logo_update');
            if (!fileInput || !fileInput.files || !fileInput.files[0]) {
                $('#m_error').text('Please select an image to upload.');
                return;
            }
            const fd = new FormData();
            fd.append('image', fileInput.files[0]);

            $.ajax({
                url: `${baseUrl}/api/departments/updateDepartmentLogo/${id}`,
                method: 'PUT',
                data: fd,
                processData: false,
                contentType: false,
                headers: headers
            }).done(() => {
                hideModal();
                loadDepartments();
            }).fail((xhr) => {
                let msg = 'Failed to upload logo';
                try {
                    if (xhr && xhr.responseJSON) {
                        msg = xhr.responseJSON.message || (xhr.responseJSON.errors || []).join('<br>');
                    } else if (xhr && xhr.responseText) {
                        msg = xhr.responseText;
                    }
                } catch (e) { }
                $('#m_error').html(`<div>${msg}</div>`);
            });
        });
    });

    // ---------- HODs ----------
    let allDepartments = {};

    // Preload departments for HOD forms
    tryAjax([{ url: `${baseUrl}/api/departments/college/${collegeId}` }], { headers }).then(departments => {
        allDepartments = {};
        (Array.isArray(departments) ? departments : []).forEach(d => {
            const id = d.deptId || d.id;
            const name = d.deptName || d.name || 'Unknown';
            if (id) allDepartments[id] = name;
        });
    });

    function loadHods() {
        tryAjax([{ url: `${baseUrl}/api/departmentadmins/college/${collegeId}` }], { headers }).then(hods => {
            const rows = (Array.isArray(hods) ? hods : []).map(h => {
                const id = h.daId || h.id || '';
                const imgField = h.daImg || h.image || h.photo || '';
                const photoUrl = imgField ? (baseUrl + '/' + imgField) : 'assets/logo1.png';
                const deptId = h.department?.deptId || h.deptId || h.departmentId;
                const deptName = allDepartments[deptId] || h.department?.deptName || '--';

                return `<tr data-id="${id}">
                    <td>${id}</td>
                    <td class="photo-col">
                        <div class="photo-wrap" style="position:relative;display:inline-block;width:40px;height:40px">
                            <img src="${photoUrl}" alt="photo" 
                                 onerror="this.onerror=null;this.src='assets/logo1.png'" 
                                 style="width:40px;height:40px;object-fit:cover;border-radius:50%">
                            <span class="photo-edit photo-edit-hod" title="Edit photo" style="position:absolute;right:0;bottom:0;cursor:pointer;font-size:8px;background:#fff;padding:2px;border-radius:50%;box-shadow:0 1px 2px rgba(0,0,0,0.15);width:14px;height:14px;display:flex;align-items:center;justify-content:center"><i class="fas fa-camera" style="font-size:8px"></i></span>
                        </div>
                    </td>
                    <td>${h.name || ''}</td>
                    <td>${h.email || ''}</td>
                    <td>${h.mobile || h.phoneNumber || ''}</td>
                    <td>${deptName}</td>
                    <td>
                        <i class="fas fa-edit action-icon edit-hod" title="Edit HOD"></i>
                        <i class="fas fa-trash action-icon delete-hod" title="Delete HOD"></i>
                    </td>
                </tr>`;
            }).join('');
            $('#hodsTable tbody').html(rows || '<tr><td colspan="7">No HODs found</td></tr>');
        }).catch(() => {
            $('#hodsTable tbody').html('<tr><td colspan="7">Failed to load HODs</td></tr>');
        });
    }

    $('#addHodBtn').on('click', () => {
        const deptOptions = Object.entries(allDepartments).map(([id, name]) => `<option value="${id}">${name}</option>`).join('');

        showModal(`
            <h3><i class="fas fa-user-tie"></i> Add HOD</h3>
            <form id="addHodForm" class="modal-form" enctype="multipart/form-data">
                <div class="form-error" id="m_error" style="color:#b00020;margin-bottom:10px"></div>
                
                <label>Name</label>
                <input id="m_name" required pattern="[A-Za-z ]+" title="Only letters and spaces allowed">
                
                <label>Email</label>
                <input id="m_email" type="email" required>
                
                <label>Password</label>
                <input id="m_password" type="password" required minlength="6">
                
                <label>Mobile</label>
                <input id="m_mobile" required pattern="[0-9]{10}" title="10 digits required">
                
                <label>Department</label>
                <select id="m_department" required>
                    <option value="">Select department</option>
                    ${deptOptions}
                </select>
                
                <label>Photo</label>
                <input type="file" id="m_hod_image" accept="image/*">
                
                <div class="form-actions"><button type="submit" class="btn-primary">Save</button></div>
            </form>
        `);

        $('#addHodForm').off('submit').on('submit', function (e) {
            e.preventDefault();
            $('#m_error').empty();

            const fd = new FormData();
            const hodObj = {
                name: ($('#m_name').val() || '').trim() || null,
                email: ($('#m_email').val() || '').trim() || null,
                password: ($('#m_password').val() || '').trim() || null,
                mobile: ($('#m_mobile').val() || '').trim() || null,
                college: { cid: Number(collegeId) },
                department: { deptId: Number($('#m_department').val()) }
            };
            fd.append('departmentAdmin', new Blob([JSON.stringify(hodObj)], { type: 'application/json' }));

            const fileInput = document.getElementById('m_hod_image');
            if (fileInput && fileInput.files && fileInput.files[0]) {
                fd.append('image', fileInput.files[0]);
            }

            $.ajax({
                url: `${baseUrl}/api/departmentadmins`,
                method: 'POST',
                data: fd,
                processData: false,
                contentType: false,
                headers: headers
            }).done(() => { hideModal(); loadHods(); loadOverview(); })
                .fail((xhr) => {
                    let msg = 'Failed to add HOD';
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

    $('#hodsTable').on('click', '.edit-hod', function () {
        const id = $(this).closest('tr').data('id');
        $.ajax({
            url: `${baseUrl}/api/departmentadmins/${id}`,
            method: 'GET',
            headers: headers
        }).done(h => {
            const deptOptions = Object.entries(allDepartments).map(([dId, dName]) => {
                const selected = (h.department?.deptId == dId || h.deptId == dId || h.departmentId == dId) ? 'selected' : '';
                return `<option value="${dId}" ${selected}>${dName}</option>`;
            }).join('');

            showModal(`<h3>Edit HOD</h3>
                <form id="editHodForm" class="modal-form">
                    <div class="form-error" id="m_error" style="color:#b00020;margin-bottom:10px"></div>
                    
                    <label>Name</label>
                    <input id="m_name" value="${h.name || ''}" required pattern="[A-Za-z ]+" title="Only letters and spaces allowed">
                    
                    <label>Email</label>
                    <input id="m_email" value="${h.email || ''}" type="email" required>
                    
                    <label>Mobile</label>
                    <input id="m_mobile" value="${h.mobile || h.phoneNumber || ''}" required pattern="[0-9]{10}" title="10 digits required">
                    
                    <label>Department</label>
                    <select id="m_department" required>
                        <option value="">Select department</option>
                        ${deptOptions}
                    </select>
                    
                    <div class="form-actions"><button type="submit" class="btn-primary">Update</button></div>
                </form>`);

            $('#editHodForm').off('submit').on('submit', function (ev) {
                ev.preventDefault();
                const payload = {
                    name: ($('#m_name').val() || '').trim() || null,
                    email: ($('#m_email').val() || '').trim() || null,
                    mobile: ($('#m_mobile').val() || '').trim() || null,
                    college: { cid: Number(collegeId) },
                    department: { deptId: Number($('#m_department').val()) }
                };

                $.ajax({
                    url: `${baseUrl}/api/departmentadmins/${id}`,
                    method: 'PUT',
                    data: JSON.stringify(payload),
                    contentType: 'application/json',
                    headers: headers
                }).done(() => { hideModal(); loadHods(); })
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
        }).fail(() => alert('Failed to fetch HOD'));
    });

    $('#hodsTable').on('click', '.delete-hod', function () {
        const id = $(this).closest('tr').data('id');
        if (confirm('Delete this HOD?')) {
            $.ajax({
                url: `${baseUrl}/api/departmentadmins/${id}`,
                method: 'DELETE',
                headers: headers
            })
                .done(() => { loadHods(); loadOverview(); })
                .fail((xhr) => {
                    alert(xhr?.responseJSON?.message || 'Failed to delete');
                });
        }
    });

    // HOD photo edit handler
    $('#hodsTable').on('click', '.photo-edit-hod', function (e) {
        e.stopPropagation();
        const id = $(this).closest('tr').data('id');
        showModal(`
            <h3><i class="fas fa-camera"></i> Update Photo</h3>
            <form id="updateHodImageForm" class="modal-form" enctype="multipart/form-data">
                <div class="form-error" id="m_error" style="color:#b00020;margin-bottom:10px"></div>
                <label>Choose new photo</label>
                <input type="file" id="m_hod_image_update" accept="image/*" required>
                <div class="form-actions"><button type="submit" class="btn-primary">Upload</button></div>
            </form>
        `);

        $('#updateHodImageForm').off('submit').on('submit', function (ev) {
            ev.preventDefault();
            $('#m_error').empty();
            const fileInput = document.getElementById('m_hod_image_update');
            if (!fileInput || !fileInput.files || !fileInput.files[0]) {
                $('#m_error').text('Please select an image to upload.');
                return;
            }
            const fd = new FormData();
            fd.append('image', fileInput.files[0]);

            $.ajax({
                url: `${baseUrl}/api/departmentadmins/updateDepartmentAdminImage/${id}`,
                method: 'PUT',
                data: fd,
                processData: false,
                contentType: false,
                headers: headers
            }).done(() => {
                hideModal();
                loadHods();
            }).fail((xhr) => {
                let msg = 'Failed to upload image';
                try {
                    if (xhr && xhr.responseJSON) {
                        msg = xhr.responseJSON.message || (xhr.responseJSON.errors || []).join('<br>');
                    } else if (xhr && xhr.responseText) {
                        msg = xhr.responseText;
                    }
                } catch (e) { }
                $('#m_error').html(`<div>${msg}</div>`);
            });
        });
    });

    // Initialize
    $('.nav-item[data-section="overview"]').trigger('click');
});
