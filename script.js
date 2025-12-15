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
            // Mark email as WORK so phone contact apps show a company/work label instead of generic Internet
            lines.push('EMAIL;TYPE=WORK:' + email);
        }

        lines.push('END:VCARD');
        return lines.join('\n');
    }


    function renderQRCode(text) {
        qrContainer.innerHTML = '';
        try {
            qr = new QRCode(qrContainer, {
                text: text,
                width: 180,
                height: 180,
                // Use low error correction to reduce "code length overflow" for long vCards
                correctLevel: QRCode.CorrectLevel.L
            });
        } catch (e) {
            // If the QR library overflows, log it so the user can shorten the data
            console.error('Unable to generate QR code:', e && e.message ? e.message : e);
            qrContainer.innerHTML = '<p style="color:#b7695c;font-size:0.9rem;">QR too large. Try shortening address or removing optional fields.</p>';
        }
    }

    function renderDirectVcardQRCode(data) {
        var directContainer = document.getElementById('directQrcode');
        if (!directContainer) return;

        var vcardText = buildVCard(data);

        directContainer.innerHTML = '';
        try {
            new QRCode(directContainer, {
                text: vcardText,
                width: 160,
                height: 160,
                correctLevel: QRCode.CorrectLevel.L
            });
        } catch (e) {
            console.error('Unable to generate direct vCard QR code:', e && e.message ? e.message : e);
            directContainer.innerHTML = '<p style="color:#b7695c;font-size:0.85rem;">Direct vCard QR too large. Try shortening optional fields.</p>';
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

            // Do not auto-generate an offline vCard QR on restore.
            // The QR will be generated only after creating the online card via /api/cards.

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

        // Save latest payload for export.html and future restores
        try {
            if (window.localStorage) {
                var serialized = JSON.stringify(payload);
                window.localStorage.setItem(LOCAL_KEY_LAST, serialized);
                lastSavedPayload = serialized;
            }
        } catch (e) {
            // ignore storage errors; export will simply not have the latest data
        }

        // Online-only public builder: create a public card via /api/cards
        qrContainer.innerHTML = '<p style="font-size:0.9rem; color:#555;">Creating your online card…</p>';

        var requestBody = {
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

        fetch(NAMECARD_API_BASE + '/api/cards', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        }).then(function (res) {
            if (res.status === 409) {
                return res.json().then(function (data) {
                    if (data && data.code === 'duplicate_public_company') {
                        var msg = 'A public NameCard already exists for this company.\n\nTo create more contacts for the same company, please upgrade to a business account.';
                        var goUpgrade = window.confirm(msg + '\n\nGo to business login page now?');
                        if (goUpgrade) {
                            window.location.href = 'https://namecard-17wq.onrender.com/secure-dashboard';
                        } else {
                            qrContainer.innerHTML = '';
                        }
                    } else {
                        alert('Unable to create card for this company. Please try again or contact support.');
                        qrContainer.innerHTML = '';
                    }
                });
            }

            if (!res.ok) {
                return res.json().catch(function () { return {}; }).then(function (data) {
                    var msg = 'An error occurred while creating the online card.';
                    if (data && data.message) {
                        msg += '\n\nServer message: ' + data.message;
                    }
                    msg += '\n\nStatus code: ' + res.status;
                    alert(msg);
                    qrContainer.innerHTML = '';
                });
            }

            return res.json().then(function (data) {
                var card = data && data.card;
                var scanUrl = card && card.scanUrl;

                if (!scanUrl) {
                    alert('The server did not return a scan URL. Please try again later.');
                    qrContainer.innerHTML = '';
                    return;
                }

                // Generate main QR from the online scan URL (tracked scans)
                renderQRCode(scanUrl);

                // Persist the last scan URL so export.html can render an "Online" QR
                try {
                    if (window.localStorage) {
                        window.localStorage.setItem('namecard_last_scanUrl', scanUrl);
                    }
                } catch (e) {
                    // ignore storage errors
                }

                // Also generate a direct vCard QR for faster "Add to contacts" (not tracked)
                renderDirectVcardQRCode(payload);
            });
        }).catch(function (err) {
            console.error('Error calling /api/cards:', err);
            alert('Network error while creating the online card. Please check your connection and try again.');
            qrContainer.innerHTML = '';
        });
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

    // QR view toggle between online and vCard QR codes
    var onlinePanel = document.getElementById('onlineQrPanel');
    var vcardPanel = document.getElementById('vcardQrPanel');
    var showOnlineBtn = document.getElementById('showOnlineQrBtn');
    var showVcardBtn = document.getElementById('showVcardQrBtn');

    function showOnlineQr() {
        if (onlinePanel) onlinePanel.style.display = '';
        if (vcardPanel) vcardPanel.style.display = 'none';

        if (showOnlineBtn) showOnlineBtn.classList.add('active');
        if (showVcardBtn) showVcardBtn.classList.remove('active');
    }

    function showVcardQr() {
        if (onlinePanel) onlinePanel.style.display = 'none';
        if (vcardPanel) vcardPanel.style.display = '';

        if (showOnlineBtn) showOnlineBtn.classList.remove('active');
        if (showVcardBtn) showVcardBtn.classList.add('active');
    }

    if (showOnlineBtn) {
        showOnlineBtn.addEventListener('click', function () {
            showOnlineQr();
        });
    }

    if (showVcardBtn) {
        showVcardBtn.addEventListener('click', function () {
            showVcardQr();
        });
    }

    // Default to online QR visible
    showOnlineQr();

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