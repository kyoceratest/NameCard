(function () {
    var form = document.getElementById('contact-form');
    var qrContainer = document.getElementById('qrcode');
    var qr;


    var autosaveStatus = document.getElementById('autosaveStatus');


    var autosaveTimer = null;
    var lastSavedPayload = '';
    var LOCAL_KEY_LAST = 'namecard_last';

    // Base URL for the NameCard backend API.
    // Always use the deployed Render backend so Database QR works without
    // requiring a local server.
    var NAMECARD_API_BASE = 'https://namecard-17wq.onrender.com';


    function escapeVCardValue(value) {
        if (!value) return '';
        return String(value)
            .replace(/\\/g, '\\\\')
            .replace(/\n/g, '\\n')
            .replace(/,/g, '\\,')
            .replace(/;/g, '\\;');
    }


    function buildVCard(data) {
        var firstName = escapeVCardValue(data.firstName);
        var lastName = escapeVCardValue(data.lastName);
        var mobile = (data.mobile || '').trim();
        var email = (data.email || '').trim();

        var lines = [];
        lines.push('BEGIN:VCARD');
        lines.push('VERSION:3.0');
        lines.push('N:' + lastName + ';' + firstName + ';;;');
        lines.push('FN:' + (firstName + ' ' + lastName).trim());

        if (mobile) {
            lines.push('TEL;TYPE=CELL,VOICE:' + mobile);
        }
        if (email) {
            lines.push('EMAIL;TYPE=INTERNET:' + email);
        }

        lines.push('END:VCARD');
        return lines.join('\n');
    }


    function renderQRCode(text) {
        qrContainer.innerHTML = '';
        try {
            qr = new QRCode(qrContainer, {
                text: text,
                width: 256,
                height: 256,
                // Use low error correction to reduce "code length overflow" for long vCards
                correctLevel: QRCode.CorrectLevel.L
            });
        } catch (e) {
            // If the QR library overflows, log it so the user can shorten the data
            console.error('Unable to generate QR code:', e && e.message ? e.message : e);
            qrContainer.innerHTML = '<p style="color:#b7695c;font-size:0.9rem;">QR too large. Try shortening address or removing optional fields.</p>';
        }
    }


    function setAutosaveStatus(text) {
        if (!autosaveStatus) return;
        autosaveStatus.innerText = text || '';
    }


    function collectFormData() {
        var streetInput = document.getElementById('addressStreet');
        var cityInput = document.getElementById('addressCity');
        var regionInput = document.getElementById('addressRegion');
        var zipCountryInput = document.getElementById('addressZipCountry');

        var streetVal = streetInput ? streetInput.value.trim() : '';
        var cityVal = cityInput ? cityInput.value.trim() : '';
        var regionVal = regionInput ? regionInput.value.trim() : '';
        var zipCountryVal = zipCountryInput ? zipCountryInput.value.trim() : '';

        var addrLine1 = streetVal;
        var addrLine2 = [cityVal, regionVal, zipCountryVal]
            .filter(function (s) { return s; })
            .join(', ');
        
        var addressCombined = [addrLine1, addrLine2]
            .filter(function (s) { return s; })
            .join('\n');

        return {
            firstName: document.getElementById('firstName').value.trim(),
            lastName: document.getElementById('lastName').value.trim(),
            mobile: document.getElementById('mobile').value.trim(),
            office: document.getElementById('office').value.trim(),
            company: (document.getElementById('company') || { value: '' }).value.trim(),
            position: (document.getElementById('position') || { value: '' }).value.trim(),
            email: document.getElementById('email').value.trim(),
            street: streetVal,
            city: cityVal,
            region: regionVal,
            zipCountry: zipCountryVal,
            address: addressCombined
        };
    }


    function autosaveNow() {
        var data = collectFormData()

        // nothing meaningful to save
        if (!data.firstName && !data.lastName && !data.mobile &&
            !data.office && !data.email && !data.address && !data.company && !data.position) {

            return;
        }


        var payload = JSON.stringify(data);


        // skip if unchanged
        if (payload === lastSavedPayload) {
            return;
        }


        lastSavedPayload = payload;


        setAutosaveStatus('Saving…');
        try {
            if (window.localStorage) {
                window.localStorage.setItem(LOCAL_KEY_LAST, payload);
            }
            setAutosaveStatus('All changes saved');
        } catch (e) {
            setAutosaveStatus('Save error');
        }
    }


    function scheduleAutosave() {
        if (autosaveTimer) {
            clearTimeout(autosaveTimer);
        }
        autosaveTimer = setTimeout(autosaveNow, 800);
    }


    function updatePreview() {
        var firstNameVal = document.getElementById('firstName').value.trim();
        var lastNameVal = document.getElementById('lastName').value.trim();
        var emailVal = document.getElementById('email').value.trim();

        var mobileVal = document.getElementById('mobile').value.trim();
        var officeVal = document.getElementById('office').value.trim();

        var streetInput = document.getElementById('addressStreet');
        var cityInput = document.getElementById('addressCity');
        var regionInput = document.getElementById('addressRegion');
        var zipCountryInput = document.getElementById('addressZipCountry');

        var streetVal = streetInput ? streetInput.value.trim() : '';
        var cityVal = cityInput ? cityInput.value.trim() : '';
        var regionVal = regionInput ? regionInput.value.trim() : '';
        var zipCountryVal = zipCountryInput ? zipCountryInput.value.trim() : '';

        // Address display for preview: two lines when possible
        var addrLine1 = streetVal;
        var addrLine2 = [cityVal, regionVal, zipCountryVal]
            .filter(function (s) { return s; })
            .join(', ');

        var addressVal;
        if (addrLine1 && addrLine2) {
            addressVal = addrLine1 + '\n' + addrLine2;
        } else if (addrLine1 || addrLine2) {
            addressVal = addrLine1 || addrLine2;
        } else {
            addressVal = '';
        }

        var companyVal = (document.getElementById('company') || { value: '' }).value.trim();
        var positionVal = (document.getElementById('position') || { value: '' }).value.trim();
        var websiteInput = document.getElementById('website');
        var websiteVal = websiteInput ? websiteInput.value.trim() : '';


        var fullName = (firstNameVal + ' ' + lastNameVal).trim()


        // design card (main layout)
        var designName = document.getElementById('designName');
        var designCompany = document.getElementById('designCompany');
        var designEmail = document.getElementById('designEmail');
        var designPhones = document.getElementById('designPhones');
        var designWebsite = document.getElementById('designWebsite');
        var designAddress = document.getElementById('designAddress');
        var designPosition = document.getElementById('designPosition');


        if (designName) {
            designName.innerText = fullName || 'Your Name';
        }
        if (designCompany) {
            designCompany.innerText = companyVal || 'Company';
        }

        if (designEmail) {
            designEmail.innerText = emailVal || 'name@example.com';
        }
        if (designPhones) {
            // Card shows only the mobile number; office is still kept in vCard/QR
            if (mobileVal) {
                designPhones.innerText = mobileVal;
            } else {
                designPhones.innerText = '+00 0000000000';
            }
        }

        if (designWebsite) {
            designWebsite.innerText = websiteVal || 'www.example.com';
        }

        if (designPosition) {
            designPosition.innerText = positionVal || '';
        }


        if (designAddress) {
            designAddress.innerText = addressVal || 'Address will appear here';
        }
    }

    function restoreFromLocal() {
        if (!window.localStorage) {
            return;
        }

        try {
            var raw = window.localStorage.getItem(LOCAL_KEY_LAST);
            if (!raw) {
                return;
            }

            var data = JSON.parse(raw);
            if (!data || typeof data !== 'object') {
                return;
            }

            if (data.firstName != null) document.getElementById('firstName').value = data.firstName;
            if (data.lastName != null) document.getElementById('lastName').value = data.lastName;
            if (data.mobile != null) document.getElementById('mobile').value = data.mobile;
            if (data.office != null) document.getElementById('office').value = data.office;
            if (data.company != null && document.getElementById('company')) document.getElementById('company').value = data.company;
            if (data.position != null && document.getElementById('position')) document.getElementById('position').value = data.position;

            if (data.email != null) document.getElementById('email').value = data.email;

            // Restore split address fields when present, or fall back to legacy 'address'
            var streetInput = document.getElementById('addressStreet');
            var cityInput = document.getElementById('addressCity');
            var regionInput = document.getElementById('addressRegion');
            var zipCountryInput = document.getElementById('addressZipCountry');

            if (streetInput) streetInput.value = data.street || '';
            if (cityInput) cityInput.value = data.city || '';
            if (regionInput) regionInput.value = data.region || '';
            if (zipCountryInput) zipCountryInput.value = data.zipCountry || '';

            if ((!data.street && !data.city && !data.region && !data.zipCountry) && data.address) {
                var legacyLines = String(data.address).split(/\r?\n/);
                if (streetInput && legacyLines[0] != null) streetInput.value = legacyLines[0];
                if (cityInput && legacyLines[1] != null) cityInput.value = legacyLines[1];
                if (regionInput && legacyLines[2] != null) regionInput.value = legacyLines[2];
                if (zipCountryInput && legacyLines[3] != null) zipCountryInput.value = legacyLines[3];
            }

            updatePreview();

            // regenerate QR if required fields are present
            if (data.firstName && data.lastName && data.mobile) {
                var vcardText = buildVCard({
                    firstName: data.firstName,
                    lastName: data.lastName,
                    mobile: data.mobile,
                    office: data.office,
                    company: data.company,
                    position: data.position,
                    email: data.email,
                    address: data.address,
                    street: data.street,
                    city: data.city,
                    region: data.region,
                    zipCountry: data.zipCountry
                });

                renderQRCode(vcardText);
            }

            lastSavedPayload = JSON.stringify(data);
            setAutosaveStatus('Restored last version');
        } catch (e) {
            // ignore parse errors
        }
    }

    form.addEventListener('submit', function (e) {
        e.preventDefault();

        var firstName = document.getElementById('firstName').value.trim();
        var lastName = document.getElementById('lastName').value.trim();
        var mobile = document.getElementById('mobile').value.trim();
        var office = document.getElementById('office').value.trim();
        var company = document.getElementById('company') ? document.getElementById('company').value.trim() : '';
        var position = document.getElementById('position') ? document.getElementById('position').value.trim() : '';

        var email = document.getElementById('email').value.trim();

        var streetInput = document.getElementById('addressStreet');
        var cityInput = document.getElementById('addressCity');
        var regionInput = document.getElementById('addressRegion');
        var zipCountryInput = document.getElementById('addressZipCountry');

        var streetVal = streetInput ? streetInput.value.trim() : '';
        var cityVal = cityInput ? cityInput.value.trim() : '';
        var regionVal = regionInput ? regionInput.value.trim() : '';
        var zipCountryVal = zipCountryInput ? zipCountryInput.value.trim() : '';

        var address = [streetVal, cityVal, regionVal, zipCountryVal]
            .filter(function (s) { return s; })
            .join('\n');

        if (!firstName || !lastName || !mobile) {
            alert('Please fill at least first name, last name and mobile number.');
            return;
        }

        // Determine QR mode (defaults to contact if not found)
        var qrModeInput = document.querySelector('input[name="qrMode"]:checked');
        var qrMode = qrModeInput ? qrModeInput.value : 'contact';

        var payload = {
            firstName: firstName,
            lastName: lastName,
            mobile: mobile,
            office: office,
            company: company,
            position: position,
            email: email,
            address: address,
            street: streetVal,
            city: cityVal,
            region: regionVal,
            zipCountry: zipCountryVal
        };

        if (qrMode === 'database') {
            // Database mode: call backend to create or update a card entry
            // and receive a scan URL that can be encoded as a QR.
            try {
                fetch(NAMECARD_API_BASE + '/api/cards', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                })
                    .then(function (res) { return res.json(); })
                    .then(function (data) {
                        if (!data || !data.success || !data.card || !data.card.scanUrl) {
                            alert((data && data.message) || 'Online QR creation failed. Please try again later.');
                            return;
                        }

                        renderQRCode(data.card.scanUrl);
                    })
                    .catch(function () {
                        alert('Network error while creating online QR. Please check the connection or backend server.');
                    });
            } catch (e) {
                alert('Unexpected error while creating online QR.');
            }
            return;
        }

        var vcardText = buildVCard(payload);
        renderQRCode(vcardText);
    });

    // Inputs: live preview + autosave
    ['firstName', 'lastName', 'email', 'addressStreet', 'addressCity', 'addressRegion', 'addressZipCountry', 'mobile', 'office', 'company', 'position'].forEach(function (id) {

        var el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', function () {
                updatePreview();
                scheduleAutosave();
            });
        }
    });

    updatePreview();
    restoreFromLocal();

    // Navigation toggle functionality
    var navToggle = document.querySelector('.nav-toggle');
    var mainNav = document.querySelector('.main-nav');
    if (navToggle && mainNav) {
        navToggle.addEventListener('click', function () {
            var isOpen = mainNav.classList.toggle('open');
            navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        });
    }

    // Export current company as CSV
    var exportCompanyBtn = document.getElementById('exportCompanyCsvBtn');
    if (exportCompanyBtn) {
        exportCompanyBtn.addEventListener('click', function () {
            var companyInput = document.getElementById('company');
            var companyVal = companyInput ? companyInput.value.trim() : '';
            if (!companyVal) {
                alert('Please enter a company name before exporting.');
                return;
            }

            var encoded = encodeURIComponent(companyVal);
            window.location.href = 'api/export_cards.php?company=' + encoded;
        });
    }
})();