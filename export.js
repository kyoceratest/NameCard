(function () {
    var LOCAL_KEY_LAST = 'namecard_last';
    var cardBgImage = null;
    var cardBgReady = false;
    var logoImage = null;
    var logoReady = false;

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

    function getAddressLines(data) {
        if (!data) data = {};
        function normalize(value) {
            if (value == null) return '';
            return String(value).trim();
        }
        var streetVal = normalize(data.addressStreet || data.street);
        var cityVal = normalize(data.addressCity || data.city);
        var regionVal = normalize(data.addressRegion || data.region);
        var zipCountryVal = normalize(data.addressZipCountry || data.zipCountry);
        var line1 = streetVal;
        var line2 = [cityVal, regionVal, zipCountryVal]
            .filter(function (s) { return s; })
            .join(', ');
        if (!line1 && !line2 && data.address) {
            var rawAddr = String(data.address).replace(/\r?\n/g, ', ');
            var firstComma = rawAddr.indexOf(',');
            if (firstComma !== -1) {
                line1 = rawAddr.slice(0, firstComma).trim();
                line2 = rawAddr.slice(firstComma + 1).trim();
            } else {
                line1 = rawAddr.trim();
            }
        }
        return {
            line1: line1,
            line2: line2
        };
    }

    function loadLastData() {
        if (!window.localStorage) return null;
        try {
            var raw = window.localStorage.getItem(LOCAL_KEY_LAST);
            if (!raw) return null;
            var data = JSON.parse(raw);
            if (!data || typeof data !== 'object') return null;
            return data;
        } catch (e) {
            return null;
        }
    }

    function updateCardPreview(data) {
        var nameEl = document.getElementById('exportName');
        var companyEl = document.getElementById('exportCompany');
        var positionEl = document.getElementById('exportPosition');
        var emailEl = document.getElementById('exportEmail');
        var phonesEl = document.getElementById('exportPhones');
        var addrEl = document.getElementById('exportAddress');

        var fullName = ((data.firstName || '') + ' ' + (data.lastName || '')).trim();
        nameEl.innerText = fullName || 'Your Name';
        companyEl.innerText = data.company || 'Company';
        if (positionEl) {
            positionEl.innerText = data.position || 'Post / Position';
        }
        emailEl.innerText = data.email || 'name@example.com';

        // Card shows only the mobile number; office is still included in vCard
        if (data.mobile) {
            phonesEl.innerText = data.mobile;
        } else {
            phonesEl.innerText = '+00 0000000000';
        }

        var addrLines = getAddressLines(data);
        var addrText;
        if (addrLines.line1 && addrLines.line2) {
            addrText = [addrLines.line1, addrLines.line2];
        } else if (addrLines.line1 || addrLines.line2) {
            addrText = [addrLines.line1 || addrLines.line2];
        } else {
            addrText = ['Your address will appear here'];
        }

        // Render address as explicit <br>-separated lines so it always shows on two visual lines
        // while still escaping any HTML-sensitive characters.
        function escapeHtml(str) {
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
        }

        addrEl.innerHTML = addrText
            .map(function (line) { return escapeHtml(line); })
            .join('<br>');
    }

    function renderQRCodeText(vcardText) {
        var qrContainer = document.getElementById('exportQr');
        qrContainer.innerHTML = '';
        new QRCode(qrContainer, {
            text: vcardText,
            width: 256,
            height: 256,
            // Match main page: low error correction to support longer vCards
            correctLevel: QRCode.CorrectLevel.L
        });
    }

    function drawImageCard(data) {
        var qrCanvas = document.querySelector('#exportQr canvas');
        if (!qrCanvas) {
            return null;
        }

        var width = 700;
        var height = 900;
        var canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        var ctx = canvas.getContext('2d');

        // background (match page background)
        ctx.fillStyle = '#f1e3d4';
        ctx.fillRect(0, 0, width, height);

        // card background area using cdcNC.png
        var cardX = 70;
        var cardY = 80;
        var cardW = width - 140;
        var cardH = 360;

        if (cardBgReady && cardBgImage) {
            ctx.drawImage(cardBgImage, cardX, cardY, cardW, cardH);
        } else {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(cardX, cardY, cardW, cardH);
        }

        // draw CDC logo in top-left of card if available (slightly smaller)
        var logoSize = 40; // smaller than preview to match card design
        var logoX = cardX + 30;
        var logoY = cardY + 30;
        if (logoReady && logoImage) {
            ctx.drawImage(logoImage, logoX, logoY, logoSize, logoSize);
        }

        ctx.strokeStyle = '#d2b8a6';
        ctx.lineWidth = 2;
        ctx.strokeRect(cardX, cardY, cardW, cardH);

        // text & layout to mirror on-screen design card
        var fullName = ((data.firstName || '') + ' ' + (data.lastName || '')).trim();

        // Company, placed next to the logo
        ctx.fillStyle = '#221815';
        ctx.font = '18px Montserrat, sans-serif';
        var companyTextX = logoX + logoSize + 16;
        var companyTextY = logoY + logoSize / 2 + 4; // vertically centered with logo
        ctx.fillText(data.company || 'Company', companyTextX, companyTextY);

        // Name in accent color
        ctx.fillStyle = '#b7695c';
        ctx.font = 'bold 24px Montserrat, sans-serif';
        ctx.fillText(fullName || 'Your Name', cardX + 30, cardY + 105);

        // Name underline
        ctx.strokeStyle = '#221815';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cardX + 30, cardY + 112);
        ctx.lineTo(cardX + 30 + 260, cardY + 112);
        ctx.stroke();

        // Position (italic, accent)
        if (data.position) {
            ctx.fillStyle = '#b7695c';
            ctx.font = 'italic 16px Montserrat, sans-serif';
            ctx.fillText(data.position, cardX + 30, cardY + 140); // moved slightly down for more space under line
        }

        // Start contact lines below the position line (or below name if no position)
        // and use a larger gap between each contact row to match the on-screen card feel
        var positionBaseY = data.position ? (cardY + 140) : (cardY + 105);
        var lineY = positionBaseY + 45; // more space under "post" before first contact line
        var lineGap = 36;               // extra spacing between phone / email / address lines

        var iconRadius = 17;
        var iconCenterX = cardX + 30 + iconRadius;
        var textX = cardX + 30 + iconRadius * 2 + 15;

        function drawContactRow(symbol, text, isAddress) {
            if (!text) return;

            // Icon circle
            ctx.fillStyle = '#221815';
            ctx.beginPath();
            ctx.arc(iconCenterX, lineY - 12, iconRadius, 0, Math.PI * 2);
            ctx.fill();

            // Icon symbol
            ctx.fillStyle = '#ffffff';
            ctx.font = '18px Montserrat, sans-serif';
            ctx.textBaseline = 'middle';
            ctx.fillText(symbol, iconCenterX - 8, lineY - 10);

            // Text (use accent color for all contact lines; keep smaller size for address)
            ctx.fillStyle = '#b7695c';
            if (isAddress) {
                ctx.font = '12.8px Montserrat, sans-serif';
            } else {
                ctx.font = '16px Montserrat, sans-serif';
            }
            ctx.textBaseline = 'alphabetic';
            ctx.fillText(text, textX, lineY - 4);

            lineY += lineGap;
        }

        // Mobile (only mobile on card, like preview)
        if (data.mobile) {
            drawContactRow('☎', data.mobile, false);
        }

        if (data.email) {
            drawContactRow('✉', data.email, false);
        }

        var addrLines = getAddressLines(data);
        if (addrLines.line1 || addrLines.line2) {
            var firstLineText = addrLines.line1 || addrLines.line2;
            drawContactRow('📍', firstLineText, true);
            if (addrLines.line1 && addrLines.line2) {
                var savedLineY = lineY;
                var secondBaseline = savedLineY - (lineGap / 2);
                ctx.fillStyle = '#b7695c';
                ctx.font = '12.8px Montserrat, sans-serif';
                ctx.textBaseline = 'alphabetic';
                ctx.fillText(addrLines.line2, textX, secondBaseline - 4);
                lineY = savedLineY;
            }
        }

        // QR area
        var qrSize = 300;
        var qrX = (width - qrSize) / 2;
        var qrY = cardY + cardH + 60;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(qrX - 16, qrY - 16, qrSize + 32, qrSize + 32);
        ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

        return canvas;
    }

    function downloadCanvasAsPng(canvas, filename) {
        if (!canvas) return;
        var link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = filename || 'namecard.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function init() {
        var msgEl = document.getElementById('exportMessage');
        var downloadBtn = document.getElementById('downloadBtn');

        cardBgImage = new Image();
        cardBgImage.onload = function () {
            cardBgReady = true;
        };
        cardBgImage.onerror = function () {
            cardBgReady = false;
        };
        cardBgImage.src = 'image/cdcNC.png';

        // load CDC logo used on the design card
        logoImage = new Image();
        logoImage.onload = function () {
            logoReady = true;
        };
        logoImage.onerror = function () {
            logoReady = false;
        };
        logoImage.src = '../logo/logoCDC.png';

        var data = loadLastData();
        if (!data) {
            msgEl.textContent = 'No saved card found. Please fill the form in the editor first.';
            downloadBtn.disabled = true;
            return;
        }

        updateCardPreview(data);
        var vcardText = buildVCard(data);
        renderQRCodeText(vcardText);

        downloadBtn.addEventListener('click', function () {
            var canvas = drawImageCard(data);
            if (!canvas) {
                msgEl.textContent = 'Unable to generate image. Please try again.';
                return;
            }
            downloadCanvasAsPng(canvas, 'namecard.png');
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
