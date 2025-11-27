$(function () {
    const baseUrl = API.getBaseUrl();
    const user = JSON.parse(localStorage.getItem('rmc_college_admin_user') || '{}');
    const collegeId = user.collegeId || user.cid || new URLSearchParams(location.search).get('collegeId');
    const jwt = localStorage.getItem('rmc_college_admin_token') || '';
    var headers = {};
    if (jwt) {
        headers['Authorization'] = 'Bearer ' + jwt;
    }


    // Check if collegeId exists, if not show error
    if (!collegeId) {
        console.error('No collegeId found! User data:', user);
        alert('College ID not found. Please login again.');
        // Optionally redirect to login
        // location.href = 'login.html';
        // return;
    }

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

    // Ensure modal is hidden on page load
    $('#modalOverlay').hide();

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
        if (!collegeId) {

            console.warn('Cannot load overview: collegeId is missing');
            $('#stat-departments .value').text('--');
            $('#stat-hods .value').text('--');
            $('#stat-students .value').text('--');
            $('#collegeNameDisplay').text('--');
            $('#collegeTypeDisplay').text('--');
            $('#collegeDescDisplay').text('--');
            $('#collegeAddressDisplay').text('--');
            $('#collegeEmailDisplay').text('--');
            $('#collegePhoneDisplay').text('--');
            $('#collegeWebsiteDisplay').text('--');
            $('#collegeActivityDisplay').text('--');
            $('#collegeImageDisplay').hide();
            return;
        }

        // Load stats and college details
        Promise.all([
            tryAjax([{ url: `${baseUrl}/api/colleges/${collegeId}/departments` }]),
            tryAjax([{ url: `${baseUrl}/api/hod/college/${collegeId}` }]),
            tryAjax([{ url: `${baseUrl}/api/colleges/${collegeId}` }])
        ]).then(([departments, hods, college]) => {

            $('#stat-departments .value').text((Array.isArray(departments) ? departments : []).length);
            $('#stat-hods .value').text((Array.isArray(hods) ? hods : []).length);

            // College info
            $('#collegeNameDisplay').text(college.cname || college.name || '--');
            $('#collegeTypeDisplay').text(college.college_type || college.collegeType || '--');
            $('#collegeDescDisplay').text(college.cdesc || college.desc || college.shortDesc || '--');
            $('#collegeAddressDisplay').text(college.caddress || college.address || college.fullAddress || '--');
            $('#collegeEmailDisplay').text(college.cemail || college.email || '--');
            $('#collegePhoneDisplay').text(college.cphone || college.phone || '--');
            $('#collegeWebsiteDisplay').text(college.cwebsite || college.website || '--');
            $('#collegeActivityDisplay').text(college.cactivity || college.activity || '--');

            // Display college image if available
            if (college.cimg || college.image) {
                const imgUrl = baseUrl + '/' + (college.cimg || college.image);
                $('#collegeImageDisplay').attr('src', imgUrl).show();
                $('#editCollegeImageBtn').show();
            } else {
                $('#collegeImageDisplay').hide();
                $('#editCollegeImageBtn').hide();
            }

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
        }).catch((err) => {
            console.error('Failed to load overview:', err);
            $('#collegeNameDisplay').text('--');
            $('#collegeTypeDisplay').text('--');
            $('#collegeDescDisplay').text('--');
            $('#collegeAddressDisplay').text('--');
            $('#collegeEmailDisplay').text('--');
            $('#collegePhoneDisplay').text('--');
            $('#collegeWebsiteDisplay').text('--');
            $('#collegeActivityDisplay').text('--');
            $('#collegeImageDisplay').hide();
            $('#stat-departments .value').text('--');
            $('#stat-hods .value').text('--');
            $('#stat-students .value').text('--');
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
                    <input id="m_name" value="${college.cname || college.name || ''}" required placeholder="College name">
                    
                    <label>College Type</label>
                    <input id="m_type" value="${college.college_type || college.collegeType || ''}" required placeholder="e.g. Public/Private">
                    
                    <label>Description</label>
                    <textarea id="m_desc" rows="3" required placeholder="Short description">${college.cdesc || college.desc || college.shortDesc || ''}</textarea>
                    
                    <label>Address</label>
                    <input id="m_address" value="${college.caddress || college.address || college.fullAddress || ''}" required placeholder="Full address">
                    
                    <label>Email</label>
                    <input type="email" id="m_email" value="${college.cemail || college.email || ''}" required placeholder="admin@example.edu">
                    
                    <label>Phone</label>
                    <input id="m_phone" value="${college.cphone || college.phone || ''}" required placeholder="Contact number">
                    
                    <label>Website</label>
                    <input type="url" id="m_website" value="${college.cwebsite || college.website || ''}" required placeholder="https://example.edu">
                    
                    <label>Activity</label>
                    <input id="m_activity" value="${college.cactivity || college.activity || ''}" required placeholder="Active/Inactive">
                    
                    <div class="form-actions"><button type="submit" class="btn-primary">Save</button></div>
                </form>
            `);

            const parseServerError = (xhr) => {
                try {
                    if (!xhr) return 'Update failed';
                    if (xhr.responseJSON) {
                        const body = xhr.responseJSON;
                        if (body.message) return body.message;
                        if (Array.isArray(body.errors)) return body.errors.join('<br>');
                        if (typeof body.errors === 'object') {
                            return Object.entries(body.errors).map(([k, v]) => Array.isArray(v) ? v.join('<br>') : String(v)).join('<br>');
                        }
                        return JSON.stringify(body);
                    }
                    if (xhr.responseText) return xhr.responseText;
                } catch (e) { }
                return 'Update failed';
            };

            $('#collegeForm').off('submit').on('submit', e => {
                e.preventDefault();
                $('#m_error').empty();

                // Client-side validation
                const cname = ($('#m_name').val() || '').trim();
                const college_type = ($('#m_type').val() || '').trim();
                const cdesc = ($('#m_desc').val() || '').trim();
                const caddress = ($('#m_address').val() || '').trim();
                const cemail = ($('#m_email').val() || '').trim();
                const cphone = ($('#m_phone').val() || '').trim();
                const cwebsite = ($('#m_website').val() || '').trim();
                const cactivity = ($('#m_activity').val() || '').trim();

                if (!cname) { $('#m_error').html('<div>Please enter the college name</div>'); return; }
                if (!college_type) { $('#m_error').html('<div>Please enter the college type</div>'); return; }
                if (!cdesc) { $('#m_error').html('<div>Please enter the description</div>'); return; }
                if (!caddress) { $('#m_error').html('<div>Please enter the address</div>'); return; }
                if (!cemail || !/^\S+@\S+\.\S+$/.test(cemail)) { $('#m_error').html('<div>Please enter a valid email</div>'); return; }
                if (!cphone) { $('#m_error').html('<div>Please enter the phone number</div>'); return; }
                if (!cwebsite) { $('#m_error').html('<div>Please enter the website</div>'); return; }
                if (!cactivity) { $('#m_error').html('<div>Please enter the activity</div>'); return; }

                const collegeData = {
                    cname: cname,
                    collegeType: college_type,
                    cdesc: cdesc,
                    address: caddress,
                    email: cemail,
                    phone: cphone,
                    website: cwebsite,
                    cactivity: cactivity
                };

                const $form = $('#collegeForm');
                const $btn = $form.find('button[type=submit]');
                $btn.prop('disabled', true).data('orig-text', $btn.text()).text('Saving...');

                $.ajax({
                    url: `${baseUrl}/api/colleges/${collegeId}`,
                    method: 'PUT',
                    data: JSON.stringify(collegeData),
                    contentType: 'application/json',
                    headers: headers
                }).done(() => {
                    hideModal();
                    loadOverview();
                }).fail((xhr) => {
                    const msg = parseServerError(xhr);
                    $('#m_error').html(`<div>${msg}</div>`);
                }).always(() => {
                    $btn.prop('disabled', false).text($btn.data('orig-text'));
                });
            });
        });
    });

    // ---------- EDIT COLLEGE IMAGE ----------
    $('#editCollegeImageBtn').on('click', () => {
        // Get current image from the displayed image element
        const currentImageSrc = $('#collegeImageDisplay').attr('src') || '';

        showModal(`
            <h3><i class="fas fa-camera"></i> Change College Image</h3>
            <form id="collegeImageForm" class="modal-form" enctype="multipart/form-data">
                <div class="form-error" id="m_error" style="color:#b00020;margin-bottom:10px"></div>
                
                ${currentImageSrc ? `<div style="text-align:center;margin-bottom:1rem">
                    <img src="${currentImageSrc}" alt="Current College" class="current-image-preview">
                    <p style="margin-top:0.5rem;color:var(--gray-500);font-size:0.875rem">Current Image</p>
                </div>` : ''}
                
                <label>New College Image</label>
                <input type="file" id="m_image" accept="image/*" required>
                
                <div class="form-actions"><button type="submit" class="btn-primary">Upload Image</button></div>
            </form>
        `);

        $('#collegeImageForm').on('submit', e => {
            e.preventDefault();

            const imageFile = $('#m_image')[0].files[0];
            if (!imageFile) {
                $('#m_error').html('<div>Please select an image</div>');
                return;
            }

            const formData = new FormData();
            formData.append('image', imageFile);

            $.ajax({
                url: `${baseUrl}/api/colleges/updateCollegeImage/${collegeId}`,
                method: 'PUT',
                data: formData,
                processData: false,
                contentType: false,
                headers: headers
            }).done(() => {
                hideModal();
                loadOverview();
            }).fail((xhr) => {
                let msg = 'Image upload failed';
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

    // ---------- DEPARTMENTS ----------
    function loadDepartments() {
        tryAjax([{ url: `${baseUrl}/api/departments/college/${collegeId}` }], { headers }).then(departments => {
            const rows = (Array.isArray(departments) ? departments : []).map(d => {
                const id = d.deptId || d.id || '';


                return `<tr data-id="${id}">
                        <td>${id}</td>
                        <td>${d.deptName || d.name || ''}</td>
                        <td>${d.desc || d.shortDesc || ''}</td>
                        <td>
                        
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
            <form id="addDepartmentForm" class="modal-form">
                <div class="form-error" id="m_error" style="color:#b00020;margin-bottom:10px"></div>
                
                <label>Department Name</label>
                <input id="m_name" required>
                
                <label>Description</label>
                <textarea id="m_desc" rows="3"></textarea>
                
                <div class="form-actions"><button type="submit" class="btn-primary">Save</button></div>
            </form>
        `);

        $('#addDepartmentForm').off('submit').on('submit', function (e) {
            e.preventDefault();
            $('#m_error').empty();

            const deptObj = {
                deptName: ($('#m_name').val() || '').trim() || null,
                desc: ($('#m_desc').val() || '').trim() || null,
                college: { cid: Number(collegeId) }
            };



            $.ajax({
                url: `${baseUrl}/api/departments`,
                method: 'POST',
                data: JSON.stringify(deptObj),
                contentType: 'application/json',
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

    // Department logo functionality removed: departments in this dashboard do not carry images.

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
        tryAjax([{ url: `${baseUrl}/api/hod/college/${collegeId}` }], { headers }).then(hods => {
            console.log('Fetched HODs:', hods);
            const rows = (Array.isArray(hods) ? hods : []).map(h => {
                const id = h.hodId || h.id || '';
                const imgField = h.daImg || h.image || h.photo || '';
                const photoUrl = baseUrl + '/' + imgField;
                const deptId = h.departmentId?.deptId || h.deptId || h.departmentId;
                const deptName = allDepartments[deptId] || h.department?.deptName || '--';

                // attempt to show username and department id as well
                const username = h.username || h.userName || h.username || '';
                const deptIdVal = deptId || h.department_id || h.departmentId || '';

                return `<tr data-id="${id}">
                    <td>${id}</td>
                    <td>${username}</td>
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
                    <td>${h.password}</td>
                    <td>${deptName}</td>
                  
                    <td>
                        <i class="fas fa-edit action-icon edit-hod" title="Edit HOD"></i>
                        <i class="fas fa-trash action-icon delete-hod" title="Delete HOD"></i>
                    </td>
                </tr>`;
            }).join('');
            $('#hodsTable tbody').html(rows || '<tr><td colspan="8">No HODs found</td></tr>');
        }).catch(() => {
            $('#hodsTable tbody').html('<tr><td colspan="8">Failed to load HODs</td></tr>');
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

                <label>User Name</label>
                <input id="m_username" required pattern="[A-Za-z0-9_\-]+" title="Letters, numbers, underscores and hyphens allowed">
                
                <label>Email</label>
                <input id="m_email" type="email" required>
                
                <label>Password</label>
                <input id="m_password" type="password" required minlength="6"  placeholder="more than6 characters">
                
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
            const pwdVal = ($('#m_password').val() || '').trim();
            // Enforce minimum password length: at least 6 characters
            if (!pwdVal || pwdVal.length < 6) {
                $('#m_error').html('<div>Password must be at least 6 characters</div>');
                return;
            }
            const hodObj = {
                name: ($('#m_name').val() || '').trim() || null,
                username: ($('#m_username').val() || '').trim() || null,
                email: ($('#m_email').val() || '').trim() || null,
                password: pwdVal || null,
                mobile: ($('#m_mobile').val() || '').trim() || null,
                college: { cid: Number(collegeId) },
                department: { deptId: Number($('#m_department').val()) }
            };
            fd.append('admin', new Blob([JSON.stringify(hodObj)], { type: 'application/json' }));

            const fileInput = document.getElementById('m_hod_image');
            if (fileInput && fileInput.files && fileInput.files[0]) {
                fd.append('image', fileInput.files[0]);
            }
            console.log('Adding HOD with data:', hodObj);
            $.ajax({
                url: `${baseUrl}/api/hod`,
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
            url: `${baseUrl}/api/hod/${id}`,
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
                    <input id="m_name" value="${h.name || ''}" >
                    
                    <label>User Name</label>
                    <input id="m_username" value="${h.username || ''}" required pattern="[A-Za-z0-9_\-]+" title="Letters, numbers, underscores and hyphens allowed">
                    

                    <label>Email</label>
                    <input id="m_email" value="${h.email || ''}" type="email" required>
                    
                    <label>Password</label>
                    <input id="m_password" value="${h.password || ''}" type="password" required minlength="6" placeholder="At least 6 characters">
                   
                    <label>Department</label>
                    <select id="m_department" required>
                        <option value="">Select department</option>
                        ${deptOptions}
                    </select>
                    
                    <div class="form-actions"><button type="submit" class="btn-primary">Update</button></div>
                </form>`);

            $('#editHodForm').off('submit').on('submit', function (ev) {
                ev.preventDefault();
                const pwd = ($('#m_password').val() || '').trim();
                if (!pwd || pwd.length < 6) {
                    $('#m_error').html('<div>Password must be at least 6 characters</div>');
                    return;
                }
                const payload = {
                    email: ($('#m_email').val() || '').trim() || null,
                    name: ($('#m_name').val() || '').trim() || null,
                    password: pwd || null,
                    username: ($('#m_username').val() || '').trim() || null,
                    college: { cid: Number(collegeId) },
                    department: { deptId: Number($('#m_department').val()) }
                };

                $.ajax({
                    url: `${baseUrl}/api/hod/${id}`,
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
                url: `${baseUrl}/api/hod/${id}`,
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
                url: `${baseUrl}/api/hod/updateDeptAdminImage/${id}`,
                method: 'PUT',
                data: fd,
                processData: false,
                contentType: false,
                headers: headers,
                beforeSend: function (xhr) {
                    // Ensure Authorization is always set on the XHR (helps if headers object is missing)
                    if (jwt) {
                        xhr.setRequestHeader('Authorization', 'Bearer ' + jwt);

                    }
                }
            }).done(() => {
                hideModal();
                loadHods();
            }).fail((xhr, status, err) => {
                console.error('HOD image upload failed', { status: xhr?.status, statusText: xhr?.statusText || status, error: err, responseText: xhr?.responseText, responseJSON: xhr?.responseJSON });
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

    // Initialize - Load overview on page load
    loadOverview();
    $('.nav-item[data-section="overview"]').trigger('click');
});
