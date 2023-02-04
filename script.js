const imageInput = document.querySelector('#image-input');
const imagePreview = document.querySelector('#image-preview');
const extractButton = document.querySelector('#extract-btn');
const colorsPreview = document.querySelector('#colors-preview');
const primaryColor = document.querySelector('#primary-color');
const secondaryColor = document.querySelector('#secondary-color');
const errorMessage = document.querySelector('#error-message');
const failedMessage = document.querySelector('#failed-message');
const loading = document.querySelector('#loading');
const popup = document.querySelector('#popup');

let imageURL;
let colors = [];

async function readURL(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();

    return new Promise((resolve, reject) => {
      reader.onload = function (e) {
        imagePreview.src = e.target.result;
        imagePreview.classList.remove('hidden');
        resolve(e.target.result);
      };

      reader.readAsDataURL(input.files[0]);
    });
  }
}

imageInput.addEventListener('change', async function () {
  imageURL = await readURL(this);
  errorMessage.classList.add('hidden');
  failedMessage.classList.add('hidden');
  colorsPreview.classList.add('hidden');
});

extractButton.onclick = async function () {
  if (!imageURL) {
    errorMessage.classList.remove('hidden');
    return;
  }

  errorMessage.classList.add('hidden');
  failedMessage.classList.add('hidden');
  loading.classList.remove('hidden');
  colorsPreview.classList.add('hidden');

  try {
    const colors = await convertImageToPixelArray(imageURL);
    await extractPrimaryAndSecondaryColors(colors);

    colorsPreview.classList.remove('hidden');
    colorsPreview.classList.add('flex');
  } catch (error) {
    failedMessage.classList.remove('hidden');
  } finally {
    loading.classList.add('hidden');
  }
};

async function convertImageToPixelArray(url) {
  var canvas = document.createElement('canvas');
  var ctx = canvas.getContext('2d');
  var image = new Image();

  image.src = url;
  return new Promise((resolve, reject) => {
    image.onload = function () {
      canvas.width = image.width;
      canvas.height = image.height;
      ctx.drawImage(image, 0, 0);

      var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      var data = imageData.data;

      const pixels = [];

      for (var i = 0; i < data.length; i += 4) {
        var red = data[i];
        var green = data[i + 1];
        var blue = data[i + 2];

        pixels.push([red, green, blue]);
      }

      resolve(pixels);
    };
  });
}

function extractPrimaryAndSecondaryColors(colorsArr) {
  // Number of primary and secondary colors to extract
  var k = 2;

  // Helper function to calculate the Euclidean distance between two RGB colors
  function distance(color1, color2) {
    return Math.sqrt((color1[0] - color2[0]) ** 2 + (color1[1] - color2[1]) ** 2 + (color1[2] - color2[2]) ** 2);
  }

  // Initialize the cluster centroids with random RGB colors
  var centroids = [];
  for (var i = 0; i < k; i++) {
    centroids.push(colorsArr[Math.floor(Math.random() * colorsArr.length)]);
  }

  // Repeat the following steps until convergence:
  // 1. Assign each color to the closest centroid
  // 2. Recalculate the centroid of each cluster
  var converged = false;
  while (!converged) {
    var clusters = Array.from({ length: k }, () => []);

    colorsArr.forEach(color => {
      var minDistance = Infinity;
      var closestCentroid;
      centroids.forEach((centroid, j) => {
        var dist = distance(color, centroid);
        if (dist < minDistance) {
          minDistance = dist;
          closestCentroid = j;
        }
      });
      clusters[closestCentroid].push(color);
    });

    converged = true;
    centroids.forEach((centroid, i) => {
      var mean = [0, 0, 0];
      clusters[i].forEach(color => {
        mean[0] += color[0];
        mean[1] += color[1];
        mean[2] += color[2];
      });
      mean[0] /= clusters[i].length;
      mean[1] /= clusters[i].length;
      mean[2] /= clusters[i].length;
      if (distance(centroid, mean) > 0.01) {
        converged = false;
      }
      centroid[0] = mean[0];
      centroid[1] = mean[1];
      centroid[2] = mean[2];
    });
  }

  colors[0] = centroids[0].map(c => Math.floor(c));
  colors[1] = centroids[1].map(c => Math.floor(c));

  primaryColor.style.backgroundColor = `rgb(${centroids[0][0]}, ${centroids[0][1]}, ${centroids[0][2]})`;
  secondaryColor.style.backgroundColor = `rgb(${centroids[1][0]}, ${centroids[1][1]}, ${centroids[1][2]})`;
}

primaryColor.onclick = function () {
  copyToClipboard(colors[0]);
};

secondaryColor.onclick = function () {
  copyToClipboard(colors[1]);
};

async function copyToClipboard(rgb) {
  await navigator.clipboard.writeText(rgbToHex(rgb[0]) + rgbToHex(rgb[1]) + rgbToHex(rgb[2]));

  popup.classList.remove('translate-y-80');
  setTimeout(() => {
    popup.classList.add('translate-y-80');
  }, 1000);
}

function rgbToHex(c) {
  var hex = c.toString(16);
  return hex.length == 1 ? '0' + hex : hex;
}
