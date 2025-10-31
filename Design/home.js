$(document).ready(function () {
    // Load common components
    $("#navbar-container").load("navbar.html");
    $("#footer-container").load("footer.html");

    const baseUrl = window.localStorage.getItem('rmc_api_base') || 'http://localhost:8080';

    const $input = $('#collegeSearchInput');
    const $result = $('#collegeSearchResult');

    // debounce timer for input events
    let searchTimer = null;

    // Call API on input change (debounced) and show matching college names
    $input.on('input', function () {
        const q = $(this).val().trim();
        clearTimeout(searchTimer);

        if (!q) {
            $result.hide();
            return;
        }

        searchTimer = setTimeout(function () {
            $result.html('<div style="color:#6b7280;">Searching...</div>').show();

            // send as POST form-data to match backend expectation
            const form = new FormData();
            form.append('name', q);

            $.ajax({
                url: `${baseUrl}/api/colleges/search`,
                method: 'GET',
                data: { name: q },
                headers: { 'Accept': 'application/json' }
            }).done(function (data) {
                if (!data || (Array.isArray(data) && data.length === 0)) {
                    $result.html('<div style="color:#6b7280;">No colleges found</div>').show();
                    return;
                }
                renderCollegeList(data);
            }).fail(function () {
                $result.html('<div style="color:#b91c1c;">Failed to search. Please try again later.</div>').show();
            });
        }, 300);
    });

    // Render list of matching colleges (no navigation). Clicking a name fills the input.
    function renderCollegeList(colleges) {
        if (!colleges || (Array.isArray(colleges) && colleges.length === 0)) return $result.html('<div style="color:#6b7280;">No colleges found</div>').show();

        let items = '';
        // normalize to array
        const list = Array.isArray(colleges) ? colleges : [colleges];


        // show up to 10 matches
        list.slice(0, 10).forEach(c => {
            const id = c.cid || c.collegeId || c._id || '';
            const name = c.cname || c.collegeName || c.college || 'Unnamed College';
            items += `<div class="college-line" data-id="${id}" data-name="${escapeHtml(name)}">${escapeHtml(name)}</div>`;
        });

        $result.html(items).show();
        $result.find('.college-line').css({ cursor: 'pointer', padding: '8px 12px', 'border-radius': '6px', marginBottom: '6px' });

        // clicking a result will navigate to the college detail page (use id when available)
        $result.find('.college-line').off('click').on('click', function () {
            const name = $(this).data('name') || $(this).text();
            const id = $(this).data('id');
            // store selected id on result container for later use if needed
            $result.data('selected-id', id);
            // prefer navigating by id; fall back to name query if id is missing
            if (id && String(id).trim() !== '') {
                window.location.href = 'college-detail.html?collegeId=' + encodeURIComponent(id);
            } else {
                // fallback: pass collegeName so the detail page can attempt a lookup by name
                window.location.href = 'college-detail.html?collegeName=' + encodeURIComponent(name);
            }
        });
    }

    // simple HTML escaper
    function escapeHtml(str) {
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    }

    // Note: button-click handler removed; search is triggered on input (debounced)

    // Hide result when clicking outside
    $(document).on('click', function (e) {
        if (!$(e.target).closest('#collegeSearchResult').length && !$(e.target).is($input)) {
            $result.hide();
        }
    });
});