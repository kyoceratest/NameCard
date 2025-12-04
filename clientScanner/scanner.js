(function () {
  function parseVcardText(text) {
    var result = {
      firstName: '',
      lastName: '',
      email: '',
      mobile: '',
      company: ''
    };

    if (!text) return result;

    var lines = String(text).split(/\r?\n/);
    lines.forEach(function (line) {
      line = line.trim();
      if (!line) return;

      // Name: N:Last;First;;;  or FN:Full Name
      if (line.indexOf('N:') === 0) {
        var nVal = line.substring(2).split(';');
        if (nVal.length > 0) {
          result.lastName = nVal[0] || '';
        }
        if (nVal.length > 1) {
          result.firstName = nVal[1] || '';
        }
      } else if (line.indexOf('FN:') === 0 && !result.firstName && !result.lastName) {
        var full = line.substring(3).trim();
        var parts = full.split(/\s+/);
        if (parts.length > 1) {
          result.firstName = parts[0];
          result.lastName = parts.slice(1).join(' ');
        } else {
          result.firstName = full;
        }
      }

      // Email
      if (line.toUpperCase().indexOf('EMAIL') === 0) {
        var emailIdx = line.indexOf(':');
        if (emailIdx !== -1) {
          result.email = line.substring(emailIdx + 1).trim();
        }
      }

      // Telephone (first one)
      if (!result.mobile && line.toUpperCase().indexOf('TEL') === 0) {
        var telIdx = line.indexOf(':');
        if (telIdx !== -1) {
          result.mobile = line.substring(telIdx + 1).trim();
        }
      }

      // Simple company detection (ORG:Company Name)
      if (line.toUpperCase().indexOf('ORG:') === 0) {
        result.company = line.substring(4).trim();
      }
    });

    return result;
  }

  function setStatus(message, isError) {
    var statusEl = document.getElementById('clientStatus');
    if (!statusEl) return;
    statusEl.textContent = message || '';
    statusEl.style.color = isError ? '#b7695c' : '#116466';
  }

  function init() {
    var vcardInput = document.getElementById('vcardInput');
    var parseBtn = document.getElementById('parseVcardBtn');
    var form = document.getElementById('clientForm');

    if (parseBtn && vcardInput) {
      parseBtn.addEventListener('click', function () {
        var data = parseVcardText(vcardInput.value || '');
        if (data.firstName) document.getElementById('clientFirstName').value = data.firstName;
        if (data.lastName) document.getElementById('clientLastName').value = data.lastName;
        if (data.email) document.getElementById('clientEmail').value = data.email;
        if (data.mobile) document.getElementById('clientMobile').value = data.mobile;
        if (data.company) document.getElementById('clientCompany').value = data.company;
        setStatus('Fields updated from vCard text.', false);
      });
    }

    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();

        var payload = {
          firstName: document.getElementById('clientFirstName').value.trim(),
          lastName: document.getElementById('clientLastName').value.trim(),
          company: document.getElementById('clientCompany').value.trim(),
          email: document.getElementById('clientEmail').value.trim(),
          mobile: document.getElementById('clientMobile').value.trim(),
          source: document.getElementById('clientSource').value.trim()
        };

        setStatus('Saving client…', false);

        fetch('api/add_client.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        })
          .then(function (res) { return res.json(); })
          .then(function (data) {
            if (!data || !data.success) {
              setStatus((data && data.message) || 'Save failed', true);
              return;
            }
            setStatus('Client saved successfully.', false);
          })
          .catch(function () {
            setStatus('Network or server error while saving client.', true);
          });
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
