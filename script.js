// 기본값 상수 정의
const DEFAULT_TEXT = "탄핵 독재자 반란";
const DEFAULT_FONT_SIZE = 7;
const DEFAULT_GAP = 5;
const DEFAULT_FONT_FAMILY = "sans-serif";
const DEFAULT_COLOR_MODE = "image";
const DEFAULT_CUSTOM_COLOR = "#000000";

document.getElementById('fontSizeInput').addEventListener('input', function() {
  document.getElementById('fontSizeValue').textContent = this.value;
});
document.getElementById('gapInput').addEventListener('input', function() {
  document.getElementById('gapValue').textContent = this.value;
});

document.getElementById('textDistInput').addEventListener('input', function() {
  document.getElementById('textDistValue').textContent = this.value;
});

document.getElementById('generateBtn').addEventListener('click', function() {
  var fileInput = document.getElementById('imageUpload');
  var selectedImageRadio = document.querySelector('input[name="selectedImage"]:checked');
  var textValue = document.getElementById('textInput').value.trim();
  var fontSize = parseInt(document.getElementById('fontSizeInput').value, 10);
  var gap = parseInt(document.getElementById('gapInput').value, 10);
  var fontFamily = document.getElementById('fontFamilySelect').value;
  var colorMode = document.querySelector('input[name="colorMode"]:checked').value;
  var customColor = document.getElementById('customColor').value;
  var textDist = parseInt(document.getElementById('textDistInput').value,10); // 1~4

  if (!fileInput.files.length && !selectedImageRadio) {
    alert("이미지를 업로드하거나 선택해주세요.");
    return;
  }

  if (!textValue) {
    alert("텍스트를 입력해주세요.");
    return;
  }

  var texts = textValue.split(/\s+/).filter(Boolean);
  if (texts.length === 0) {
    alert("올바른 텍스트를 입력해주세요.");
    return;
  }

  if (!fontSize || fontSize <= 0) {
    alert("올바른 폰트 크기를 입력해주세요.");
    return;
  }

  if (!gap || gap <= 0) {
    alert("올바른 간격을 입력해주세요.");
    return;
  }

  // 이미지 경로 결정
  let imageURL = null;
  if (fileInput.files.length > 0) {
    // 업로드한 이미지 사용
    imageURL = URL.createObjectURL(fileInput.files[0]);
  } else if (selectedImageRadio) {
    // 선택한 썸네일 이미지 사용
    imageURL = selectedImageRadio.value;
  }

  if (!imageURL) {
    alert("이미지를 사용할 수 없습니다.");
    return;
  }

  var img = new Image();
  img.onload = function() {
    var targetWidth = 1800; // 고정 가로폭
    var ratio = targetWidth / img.width;
    var targetHeight = Math.round(img.height * ratio);

    var canvas = document.getElementById('canvas');
    var ctx = canvas.getContext('2d');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, targetWidth, targetHeight);

    var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    var rgba = imageData.data;
    var width = canvas.width;
    var height = canvas.height;

    var data = new Float64Array(width * height);
    for (let i = 0, n = rgba.length / 4; i < n; ++i) {
      data[i] = Math.max(0, 1 - rgba[i * 4] / 254);
    }

    var n = Math.round(width * height / 40);

    var workerCode = `
importScripts("https://unpkg.com/d3-delaunay@6/dist/d3-delaunay.min.js");
onmessage = event => {
  const {data: {data, width, height, n}} = event;
  const points = new Float64Array(n * 2);
  const c = new Float64Array(n * 2);
  const s = new Float64Array(n);

  for (let i = 0; i < n; ++i) {
    for (let j = 0; j < 30; ++j) {
      const x = points[i * 2] = Math.floor(Math.random() * width);
      const y = points[i * 2 + 1] = Math.floor(Math.random() * height);
      if (Math.random() < data[y * width + x]) break;
    }
  }

  const delaunay = new d3.Delaunay(points);
  const voronoi = delaunay.voronoi([0, 0, width, height]);

  for (let k = 0; k < 80; ++k) {
    c.fill(0);
    s.fill(0);
    for (let y = 0, i = 0; y < height; ++y) {
      for (let x = 0; x < width; ++x) {
        const w = data[y * width + x];
        i = delaunay.find(x + 0.5, y + 0.5, i);
        s[i] += w;
        c[i * 2] += w * (x + 0.5);
        c[i * 2 + 1] += w * (y + 0.5);
      }
    }

    const w = Math.pow(k + 1, -0.8) * 10;
    for (let i = 0; i < n; ++i) {
      const x0 = points[i * 2], y0 = points[i * 2 + 1];
      const x1 = s[i] ? c[i * 2] / s[i] : x0, y1 = s[i] ? c[i * 2 + 1] / s[i] : y0;
      points[i * 2] = x0 + (x1 - x0) * 1.8 + (Math.random() - 0.5) * w;
      points[i * 2 + 1] = y0 + (y1 - y0) * 1.8 + (Math.random() - 0.5) * w;
    }

    postMessage(points);
    voronoi.update();
  }

  close();
};
`;

    var blob = new Blob([workerCode], {type: "text/javascript"});
    var scriptURL = URL.createObjectURL(blob);
    var worker = new Worker(scriptURL);

    ctx.font = fontSize + "px " + fontFamily;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    function shouldDisplayText(i) {
      let index = i/2;
      if (textDist === 1) {
        return (index % 20 === 0);
      } else if (textDist === 2) {
        return (index % 10 === 0);
      } else if (textDist === 3) {
        return ((index % 20) < 3);
      } else {
        return (index % 5 === 0);
      }
    }

    worker.onmessage = function(event) {
      var points = event.data;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, width, height);

      for (var i = 0, len = points.length; i < len; i += 2) {
        if (!shouldDisplayText(i)) continue;

        var px = Math.round(points[i]);
        var py = Math.round(points[i+1]);
        var txt = texts[(i / 2) % texts.length];

        var idx = (py * width + px) * 4;
        var r = rgba[idx];
        var g = rgba[idx+1];
        var b = rgba[idx+2];

        if (colorMode === "image") {
          ctx.fillStyle = "rgb(" + r + "," + g + "," + b + ")";
        } else {
          ctx.fillStyle = customColor;
        }

        ctx.fillText(txt, px, py);
      }

      var downloadBtn = document.getElementById('downloadBtn');
      var twitterShare = document.getElementById('twitterShare');
      var facebookShare = document.getElementById('facebookShare');
      var instagramShare = document.getElementById('instagramShare');

      var dataURL = canvas.toDataURL("image/png");
      downloadBtn.onclick = function() {
        var link = document.createElement('a');
        link.href = dataURL;
        link.download = 'image.png';
        link.click();
      };

      var pageURL = window.location.href;
      
      var twitterURL = "https://twitter.com/intent/tweet?text=" + encodeURIComponent("내란 수괴 윤석열을 탄핵합니다!") + "&url=" + encodeURIComponent(pageURL);
      twitterShare.href = twitterURL;

      var facebookURL = "https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(pageURL);
      facebookShare.href = facebookURL;

      instagramShare.href = "https://www.instagram.com/";
    };

    worker.postMessage({data, width, height, n});
  };
  img.src = imageURL;
});

document.getElementById('resetBtn').addEventListener('click', function() {
  document.getElementById('imageUpload').value = "";
  document.querySelectorAll('input[name="selectedImage"]').forEach(r => r.checked = false);
  document.getElementById('textInput').value = DEFAULT_TEXT;
  document.getElementById('fontSizeInput').value = DEFAULT_FONT_SIZE;
  document.getElementById('fontSizeValue').textContent = DEFAULT_FONT_SIZE;
  document.getElementById('gapInput').value = DEFAULT_GAP;
  document.getElementById('gapValue').textContent = DEFAULT_GAP;
  document.getElementById('fontFamilySelect').value = DEFAULT_FONT_FAMILY;
  document.querySelector('input[name="colorMode"][value="' + DEFAULT_COLOR_MODE + '"]').checked = true;
  document.getElementById('customColor').value = DEFAULT_CUSTOM_COLOR;
  document.getElementById('textDistInput').value = 2;
  document.getElementById('textDistValue').textContent = 2;

  var canvas = document.getElementById('canvas');
  var ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#121212';
  ctx.fillRect(0,0,canvas.width,canvas.height);

  var downloadBtn = document.getElementById('downloadBtn');
  downloadBtn.onclick = null;
  document.getElementById('twitterShare').href = "#";
  document.getElementById('facebookShare').href = "#";
  document.getElementById('instagramShare').href = "https://www.instagram.com/";
});