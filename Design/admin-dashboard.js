$(function () {
    // ===== AUTHENTICATION =====
    const token = localStorage.getItem('rmc_admin_token');
    if (!token) {
        window.location.href = 'admin-login.html';
        return;
    }
    console.log('Admin Dashboard Loaded with Token:', token);

    function showModal(title, bodyHtml) {
        $('#modalBody').html('<h2>' + title + '</h2>' + bodyHtml);
        $('#modalOverlay').fadeIn(200);
    }

    function hideModal() {
        $('#modalOverlay').fadeOut(200);
    }

    // ===== NAVIGATION =====
    $('.nav-item').on('click', function () {
        $('.nav-item').removeClass('active');
        $(this).addClass('active');
        const section = $(this).data('section');
        $('.panel').hide();
        $('#section-' + section).show();

        if (section === 'overview') loadOverview();
        else if (section === 'colleges') loadColleges();
        else if (section === 'admins') loadAdmins();
    });

    $('#sidebarToggle').on('click', function () {
        $('#sidebar').toggleClass('collapsed');
    });

    $('#logoutBtn').on('click', function (e) {
        e.preventDefault();
        localStorage.removeItem('rmc_admin_token');
        localStorage.removeItem('rmc_admin_info');
        window.location.href = 'admin-login.html';
    });

    $('.modal-close').on('click', hideModal);
    $('#modalOverlay').on('click', function (e) {
        if (e.target.id === 'modalOverlay') hideModal();
    });

    // ===== OVERVIEW PANEL =====
    function loadOverview() {
        // Load colleges count
        $.ajax({
            url: API.getBaseUrl() + '/api/colleges',
            method: 'GET',
            headers: { 'Authorization': 'Bearer ' + token },
            success: function (data) {
                const colleges = Array.isArray(data) ? data : (data.colleges || []);
                $('#stat-colleges .value').text(colleges.length);
            }
        });

        // Load admins count
        $.ajax({
            url: API.getBaseUrl() + '/api/college-admin/all',
            method: 'GET',
            headers: { 'Authorization': 'Bearer ' + token },
            success: function (data) {
                const admins = Array.isArray(data) ? data : (data.admins || []);
                $('#stat-admins .value').text(admins.length);
            }
        });

        // Load students count (if endpoint exists)
        $.ajax({
            url: API.getBaseUrl() + '/api/students',
            method: 'GET',
            success: function (data) {
                const students = Array.isArray(data) ? data : (data.students || []);
                $('#stat-students .value').text(students.length);
            },
            error: function () {
                $('#stat-students .value').text('--');
            }
        });
    }

    // ===== COLLEGES PANEL =====
    function loadColleges() {
        $.ajax({
            url: API.getBaseUrl() + '/api/colleges',
            method: 'GET',
            headers: { 'Authorization': 'Bearer ' + token },
            success: function (data) {
                console.log('Colleges data loaded:', data);
                const colleges = Array.isArray(data) ? data : (data.colleges || []);
                const tbody = $('#collegesTable tbody');
                tbody.empty();

                if (colleges.length === 0) {
                    tbody.append('<tr><td colspan="11">No colleges found</td></tr>');
                    return;
                }

                colleges.forEach(function (college) {
                    const id = college.id || college.cid || '';
                    const name = college.name || college.cname || '';
                    const type = college.type || college.collegeType || '';
                    const email = college.email || '';
                    const phone = college.phone || '';
                    const address = college.address || '';
                    const website = college.website || '';
                    const activity = college.cactivity || '';
                    const fullDesc = (college.cdesc || college.description || '') + '';
                    const truncatedDesc = fullDesc.length > 80 ? fullDesc.substring(0, 77) + '…' : fullDesc; // 80 char cutoff
                    const imgSrc = college.logo || college.cimg || 'assets/logo-placeholder.png';
                    const websiteCell = website ? `<a href="${website}" target="_blank">Link</a>` : '';
                    const row = `
                        <tr>
                            <td>${id}</td>
                            <td>
                                <img src="${API.getBaseUrl() + '/' + imgSrc}" alt="${name}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;">
                            </td>
                            <td>${name}</td>
                            <td>${type}</td>
                            <td>${email}</td>
                            <td>${phone}</td>
                            <td>${address}</td>
                            <td>${websiteCell}</td>
                            <td>${activity}</td>
                            <td class="col-desc" title="${fullDesc.replace(/"/g, '&quot;')}" data-full="${fullDesc.replace(/"/g, '&quot;')}">${truncatedDesc}</td>
                            <td>
                                <button class="btn-sm btn-delete" data-id="${id}"><i class="fas fa-trash"></i></button>
                            </td>
                        </tr>
                    `;
                    tbody.append(row);
                });
            }
        });
    }

    $('#addCollegeBtn').on('click', function () {
        const formHtml = `
            <form id="addCollegeForm" class="modal-form">
                <div class="form-group">
                    <label>Name <span class="required">*</span></label>
                    <input type="text" name="cname" required>
                </div>
                <div class="form-group">
                    <label>Type <span class="required">*</span></label>
                    <select name="collegeType" required>
                        <option value="">Select Type</option>
                        <option value="Government">Government</option>
                        <option value="Private">Private</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Email <span class="required">*</span></label>
                    <input type="email" name="email" required>
                </div>
                <div class="form-group">
                    <label>Phone <span class="required">*</span></label>
                    <input type="tel" name="phone" pattern="[0-9]{10}" required>
                </div>
                <div class="form-group">
                    <label>Address</label>
                    <textarea name="address" rows="3"></textarea>
                </div>
                <div class="form-group">
                    <label>Description</label>
                    <textarea name="cdesc" rows="4" placeholder="Enter college description"></textarea>
                </div>
                <div class="form-group">
                    <label>Activities</label>
                    <textarea name="cactivity" rows="3" placeholder="Enter activities separated by commas (e.g., Sports, Music, Drama, Tech Clubs)"></textarea>
                    <small style="color:#666;">Separate multiple activities with commas</small>
                </div>
                <div class="form-group">
                    <label>Website</label>
                    <input type="url" name="website">
                </div>
                <div class="form-group">
                    <label>Logo</label>
                    <input type="file" name="image" accept="image/*">
                </div>
                <div class="form-actions">
                    <button type="button" class="btn-secondary" onclick="$(\'#modalOverlay\').fadeOut()">Cancel</button>
                    <button type="submit" class="btn-primary">Add College</button>
                </div>
            </form>
        `;
        showModal('Add College', formHtml);

        $('#addCollegeForm').on('submit', function (e) {
            e.preventDefault();
            const form = this;

            // Extract college data
            const collegeData = {
                cname: form.cname.value,
                collegeType: form.collegeType.value,
                email: form.email.value,
                phone: form.phone.value,
                address: form.address.value || '',
                cdesc: form.cdesc.value || '',
                cactivity: form.cactivity.value || '',
                website: form.website.value || ''
            };



            // Create FormData with correct structure
            const formData = new FormData();
            formData.append('college', new Blob([JSON.stringify(collegeData)], { type: 'application/json' }));
            if (form.image.files[0]) {
                formData.append('image', form.image.files[0]);
            }

            $.ajax({
                url: API.getBaseUrl() + '/api/colleges/addcollege',
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + token },
                data: formData,
                processData: false,
                contentType: false,
                success: function () {
                    alert('College added successfully');
                    hideModal();
                    loadColleges();
                    loadOverview();
                }
            });
        });
    });

    // Expand description on click
    $(document).on('click', '.col-desc', function () {
        const full = $(this).data('full');
        if (!full) return;
        showModal('College Description', `<div class="desc-full">${full.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`);
    });

    $(document).on('click', '#collegesTable .btn-delete', function () {
        const collegeId = $(this).data('id');
        if (!confirm('Are you sure you want to delete this college?')) return;

        $.ajax({
            url: API.getBaseUrl() + '/api/colleges/' + collegeId,
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + token },
            success: function () {
                alert('College deleted successfully');
                loadColleges();
                loadOverview();
            },
            error: function (xhr) {
                console.log('Failed to delete college: ' + (xhr.responseJSON?.message || xhr.statusText));
                alert('Failed to delete college Ensure all related data is removed first.');
            }
        });
    });

    // ===== COLLEGE ADMINS PANEL =====
    function loadAdmins() {
        $.ajax({
            url: API.getBaseUrl() + '/api/college-admin/all',
            method: 'GET',
            success: function (data) {
                console.log('College Admins data loaded:', data);
                const admins = Array.isArray(data) ? data : (data.admins || []);
                const tbody = $('#adminsTable tbody');
                tbody.empty();

                if (admins.length === 0) {
                    tbody.append('<tr><td colspan="8">No admins found</td></tr>');
                    return;
                }

                admins.forEach(function (admin) {
                    console.log('Admin data:', admin);
                    const imgPath = API.getBaseUrl() + '/' + (admin.image || admin.imagePath) || admin.photo || 'assets/logo-placeholder.png';
                    const mobile = admin.mobile || '';
                    const passwordDisplay = (admin.password && admin.password.length <= 20) ? admin.password : (admin.password ? admin.password.substring(0, 20) + '…' : '••••••');
                    const row = `
                                <tr>
                                    <td>${admin.id || ''}</td>
                                    <td><img src="${API.getBaseUrl() + '/' + imgPath}" alt="${admin.name || 'Admin'}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;"></td>
                                    <td>${admin.name || ''}</td>
                                    <td>${admin.email || ''}</td>
                                    <td>${passwordDisplay}</td>
                                    <td>${mobile}</td>
                                    <td>${admin.college.cname || admin.collegeName || ''}</td>
                                    <td>
                                        <button class="btn-sm btn-delete" data-id="${admin.id}"><i class="fas fa-trash"></i></button>
                                    </td>
                                </tr>
                            `;
                    tbody.append(row);
                });
            }
        });
    }

    $('#addAdminBtn').on('click', function () {
        // Load colleges for dropdown
        $.ajax({
            url: API.getBaseUrl() + '/api/colleges',
            method: 'GET',

            success: function (data) {
                console.log('Colleges data for admin form:', data);
                const colleges = Array.isArray(data) ? data : (data.colleges || []);
                let collegeOptions = '<option value="">Select College</option>';
                colleges.forEach(function (college) {

                    collegeOptions += `<option value="${college.cid}">${college.cname}</option>`;
                });

                const formHtml = `
                    <form id="addAdminForm" class="modal-form">
                        <!-- Hidden username (auto-generated from name/email) -->
                        <input type="hidden" name="username" value="">
                        <div class="form-group">
                            <label>Image</label>
                            <input type="file" name="image" accept="image/*">
                        </div>
                        <div class="form-group">
                            <label>Name <span class="required">*</span></label>
                            <input type="text" name="name" required>
                        </div>
                        <div class="form-group">
                            <label>Email <span class="required">*</span></label>
                            <input type="email" name="email" required>
                        </div>
                        <div class="form-group">
                            <label>Password <span class="required">*</span></label>
                            <input type="password" name="password" minlength="6" required>
                        </div>
                        <div class="form-group">
                            <label>Mobile <span class="required">*</span></label>
                            <input type="tel" name="mobile" pattern="[0-9]{10}" required placeholder="10-digit mobile number">
                        </div>
                        <div class="form-group">
                            <label>College <span class="required">*</span></label>
                            <select name="college_id" required>
                                ${collegeOptions}
                            </select>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn-secondary" onclick="$(\'#modalOverlay\').fadeOut()">Cancel</button>
                            <button type="submit" class="btn-primary">Add Admin</button>
                        </div>
                    </form>
                `;
                showModal('Add College Admin', formHtml);

                // Auto-generate username from name or email prefix
                const $form = $('#addAdminForm');
                function updateUsername() {
                    const nameVal = $form.find('[name="name"]').val().trim();
                    const emailVal = $form.find('[name="email"]').val().trim();
                    let base = '';
                    if (nameVal) {
                        base = nameVal.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').substring(0, 20);
                    } else if (emailVal) {
                        base = emailVal.split('@')[0].toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 20);
                    }
                    $form.find('[name="username"]').val(base || ('admin-' + Date.now()));
                }
                $form.on('input', '[name="name"], [name="email"]', updateUsername);
                updateUsername();

                $('#addAdminForm').on('submit', function (e) {
                    e.preventDefault();
                    const form = this;
                    const password = $(form).find('[name="password"]').val();
                    if (password.length < 6) {
                        alert('Password must be at least 6 characters long');
                        return;
                    }

                    // Build collegeAdmin JSON object
                    const collegeAdminData = {
                        name: form.name.value,
                        email: form.email.value,
                        password: form.password.value,
                        mobile: form.mobile.value,
                        college: { cid: parseInt(form.college_id.value) }
                    };

                    console.log('=== Add College Admin Payload ===');
                    console.log('College Admin JSON:', JSON.stringify(collegeAdminData, null, 2));
                    console.log('Image:', form.image.files[0] ? form.image.files[0].name : 'No image');
                    console.log('==========================');

                    // Create FormData with correct structure
                    const formData = new FormData();
                    formData.append('collegeAdmin', new Blob([JSON.stringify(collegeAdminData)], { type: 'application/json' }));
                    if (form.image.files[0]) {
                        formData.append('image', form.image.files[0]);
                    }

                    $.ajax({
                        url: API.getBaseUrl() + '/api/college-admin/addcollegeAdmin',
                        method: 'POST',
                        headers: { 'Authorization': 'Bearer ' + token },
                        data: formData,
                        processData: false,
                        contentType: false,
                        success: function () {
                            alert('Admin added successfully');
                            hideModal();
                            loadAdmins();
                            loadOverview();
                        }
                    });
                });
            }
        });
    });


    $(document).on('click', '#adminsTable .btn-delete', function () {
        const adminId = $(this).data('id');
        if (!confirm('Are you sure you want to delete this admin?')) return;

        $.ajax({
            url: API.getBaseUrl() + '/api/college-admin/delete/' + adminId,
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + token },
            success: function () {
                alert('Admin deleted successfully');
                loadAdmins();
                loadOverview();
            }
        });
    });

    // ===== INIT =====
    $('#section-overview').show();
    loadOverview();
});
