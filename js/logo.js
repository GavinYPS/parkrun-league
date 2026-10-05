// Club logo load/upload

function loadLogo() {
  var src = localStorage.getItem('parkrun_logo') || DEFAULT_LOGO;
  var img = document.getElementById('logo-img');
  var fb = document.getElementById('logo-fallback');
  var circle = document.getElementById('logo-circle');
  if (!img) return;
  img.onload = function() { img.style.display = 'block'; if (fb) fb.style.display = 'none'; if (circle) { circle.style.border = 'none'; circle.style.background = 'transparent'; } };
  img.onerror = function() { img.style.display = 'none'; if (fb) fb.style.display = 'block'; };
  img.src = src;
}

function syncLogoPreview() {
  var src = localStorage.getItem('parkrun_logo') || DEFAULT_LOGO;
  var img = document.getElementById('logo-preview-img');
  var fb = document.getElementById('logo-preview-fallback');
  if (!img) return;
  img.onload = function() { img.style.display = 'block'; if (fb) fb.style.display = 'none'; };
  img.onerror = function() { img.style.display = 'none'; if (fb) fb.style.display = 'block'; };
  img.src = src;
}

function handleLogoUpload(input) {
  var file = input.files[0]; if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    localStorage.setItem('parkrun_logo', e.target.result);
    loadLogo(); syncLogoPreview();
    var msg = document.getElementById('logo-upload-msg');
    if (msg) { msg.style.display = 'block'; setTimeout(function() { msg.style.display = 'none'; }, 2000); }
  };
  reader.readAsDataURL(file); input.value = '';
}

function removeLogo() { localStorage.removeItem('parkrun_logo'); loadLogo(); syncLogoPreview(); }
