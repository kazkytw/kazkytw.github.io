let bgm;
let isPlaying = false;
let fft;
let particles = [];

function preload() {
  bgm = loadSound("./bgm.mp3");
}

function setup() {
  let canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent("canvasContainer");

  // 設置 canvas 的背景為透明
  clear();

  fft = new p5.FFT();
  for (let i = 0; i < 64; i++) {
    particles[i] = new Particle(i);
  }

  setInterval(updateProgress, 100);

  document.getElementById("menu-toggle").addEventListener("click", function () {
    if (
      getComputedStyle(document.getElementById("sidebar")).left === "-250px"
    ) {
      openNav();
    } else {
      closeNav();
    }
  });
}

function draw() {
  // 使用 clear() 替代 background()
  clear();

  let spectrum = fft.analyze();
  for (let i = 0; i < particles.length; i++) {
    let freq = isPlaying ? spectrum[i * 2] : 0;
    particles[i].update(freq);
    particles[i].show();
  }

  updateProgress();
}

class Particle {
  constructor(index) {
    this.index = index;
    this.x = map(index, 0, 63, 0, windowWidth);
    this.y = windowHeight / 2;
    this.baseHeight = 5;
    this.height = this.baseHeight;
    this.targetHeight = this.baseHeight;
    this.easing = 0.1;
  }

  update(freq) {
    if (!isPlaying) {
      this.targetHeight = this.baseHeight;
    } else {
      this.targetHeight = map(
        freq,
        0,
        255,
        this.baseHeight,
        windowHeight / 1.5
      );
    }

    let diff = this.targetHeight - this.height;
    this.height += diff * this.easing;
  }

  show() {
    let alpha = map(this.height, this.baseHeight, windowHeight / 1.5, 100, 255);
    stroke(217, 171, 223, alpha);
    strokeWeight(2);

    line(this.x, this.y + this.height / 2, this.x, this.y - this.height / 2);
  }
}

function updateProgress() {
  if (bgm.isPlaying()) {
    let current = bgm.currentTime();
    let total = bgm.duration();
    let progress = (current / total) * 100;

    document.getElementById("progress-bar").style.width = progress + "%";

    document.getElementById("currentTime").textContent = formatTime(current);
    document.getElementById("totalTime").textContent = formatTime(total);
  }
}

function formatTime(seconds) {
  let minutes = Math.floor(seconds / 60);
  seconds = Math.floor(seconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function MusicControll() {
  const button = document.querySelector(".music-control i");

  if (!isPlaying) {
    bgm.loop();
    isPlaying = true;
    button.className = "fas fa-pause";
  } else {
    bgm.pause();
    isPlaying = false;
    button.className = "fas fa-play";
  }
}

function windowResized() {
  for (let i = 0; i < particles.length; i++) {
    particles[i].x = map(i, 0, 63, 0, 520);
  }
}

function openNav() {
  document.getElementById("sidebar").style.left = "0";
  document.getElementById("main").style.marginLeft = "250px";
  document.getElementById("menu-toggle").style.marginLeft = "250px";
}

function closeNav() {
  document.getElementById("sidebar").style.left = "-250px";
  document.getElementById("main").style.marginLeft = "0";
  document.getElementById("menu-toggle").style.marginLeft = "0";
}

function MyWeb() {
  window.open("https://kazkytw.github.io", "_blank");
}
