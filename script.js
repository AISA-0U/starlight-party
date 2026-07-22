(() => {
  "use strict";

  const canvas = document.querySelector("#effects");
  const party = document.querySelector("#party");
  const wishButton = document.querySelector("#wishButton");
  const context = canvas.getContext("2d", { alpha: true });
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const eggModal = document.querySelector("#eggModal");
  const eggDialog = eggModal.querySelector(".egg-dialog");
  const eggClose = document.querySelector("#eggClose");
  const unwrapButton = document.querySelector("#unwrapButton");
  const drawButton = document.querySelector("#drawButton");
  const againButton = document.querySelector("#againButton");
  const realCloseButton = document.querySelector("#realCloseButton");
  const memoryWheel = document.querySelector("#memoryWheel");
  const rollingCopy = document.querySelector("#rollingCopy");
  const tickerTrack = document.querySelector("#tickerTrack");
  const photoZoomTrigger = document.querySelector("#photoZoomTrigger");
  const memoryPhoto = document.querySelector("#memoryPhoto");
  const photoPlaceholder = document.querySelector("#photoPlaceholder");
  const photoMessage = document.querySelector("#photoMessage");
  const closeTease = document.querySelector("#closeTease");
  const photoViewer = document.querySelector("#photoViewer");
  const photoViewerImage = document.querySelector("#photoViewerImage");
  const photoViewerClose = document.querySelector("#photoViewerClose");

  const colors = ["#ffffff", "#ffd84d", "#ff63b7", "#9a7cff", "#55dcff", "#72f1b8"];
  const particles = [];
  let width = 0;
  let height = 0;
  let animationFrame = 0;
  let photoPool = [];
  let photoMessages = [];
  let photoMessageIndex = 0;
  let lastPhotoIndex = -1;
  let fakeCloseCount = 0;
  let lastFocusedElement = null;
  let photoPoolPromise = Promise.resolve();

  const defaultMessages = [
    "这一刻被星光悄悄收藏了。",
    "随机翻到的，也是值得反复想起的。",
    "愿照片里的快乐一直有回声。",
  ];
  const rollingMessages = [
    "正在绕过平凡的一天...",
    "把好运和回忆搅拌均匀...",
    "捕捉一颗正在发光的瞬间...",
    "马上就翻到这一页了...",
  ];
  const tickerMessages = ["快乐正在加载", "今日宜回忆", "星光不会迟到", "下一张也值得期待"];

  const random = (min, max) => Math.random() * (max - min) + min;

  function setTicker() {
    const copy = tickerMessages.map((message) => `✦ ${message}`).join("　　");
    tickerTrack.textContent = `${copy}　　${copy}　　`;
  }

  async function loadPhotoPool() {
    try {
      const response = await fetch("./assets/photos/photos.json", { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const config = await response.json();
      photoPool = Array.isArray(config.photos)
        ? config.photos.filter((photo) => typeof photo === "string" && photo.trim())
        : [];
      photoMessages = Array.isArray(config.messages)
        ? config.messages.filter((message) => typeof message === "string" && message.trim())
        : [];
    } catch (error) {
      console.warn("照片池加载失败：", error);
      photoPool = [];
      photoMessages = [];
    }
  }

  function showStep(stepName) {
    document.querySelectorAll(".egg-step").forEach((step) => {
      const isActive = step.dataset.step === stepName;
      step.classList.toggle("is-active", isActive);
      step.setAttribute("aria-hidden", String(!isActive));
    });
  }

  function openEgg() {
    lastFocusedElement = document.activeElement;
    fakeCloseCount = 0;
    photoMessageIndex = 0;
    closeTease.textContent = "";
    showStep("intro");
    eggModal.hidden = false;
    document.body.classList.add("modal-open");
    window.setTimeout(() => unwrapButton.focus(), 0);
    burst(width / 2, height * 0.42, 45);
  }

  function closeEgg() {
    closePhotoViewer();
    eggModal.hidden = true;
    document.body.classList.remove("modal-open");
    memoryWheel.classList.remove("is-spinning");
    drawButton.disabled = false;
    closeTease.textContent = "";
    if (lastFocusedElement instanceof HTMLElement) lastFocusedElement.focus();
  }

  function openPhotoViewer() {
    if (!memoryPhoto.src || memoryPhoto.hidden) return;
    photoViewerImage.src = memoryPhoto.src;
    photoViewer.hidden = false;
    window.setTimeout(() => photoViewerClose.focus(), 0);
  }

  function closePhotoViewer() {
    if (photoViewer.hidden) return;
    photoViewer.hidden = true;
    photoViewerImage.removeAttribute("src");
    if (!photoZoomTrigger.hidden) photoZoomTrigger.focus();
  }

  function teaseClose() {
    fakeCloseCount += 1;
    if (fakeCloseCount >= 3) {
      closeEgg();
      return;
    }

    const messages = ["等等，这颗彩蛋还没拆完 ✦", "差一点！看完这张回忆再走吧"];
    closeTease.textContent = messages[fakeCloseCount - 1];
    eggDialog.classList.remove("is-teasing");
    void eggDialog.offsetWidth;
    eggDialog.classList.add("is-teasing");
  }

  function choosePhotoIndex() {
    if (photoPool.length <= 1) return photoPool.length - 1;
    let nextIndex = lastPhotoIndex;
    while (nextIndex === lastPhotoIndex) {
      nextIndex = Math.floor(Math.random() * photoPool.length);
    }
    return nextIndex;
  }

  function revealRandomPhoto() {
    const nextIndex = choosePhotoIndex();
    const messages = photoMessages.length ? photoMessages : defaultMessages;
    const nextMessage = messages[photoMessageIndex % messages.length];
    photoMessage.textContent = nextMessage;
    photoMessageIndex += 1;

    if (nextIndex < 0) {
      memoryPhoto.removeAttribute("src");
      memoryPhoto.hidden = true;
      photoZoomTrigger.hidden = true;
      photoPlaceholder.hidden = false;
      photoMessage.textContent = "照片池准备好了，只差你放入照片。";
    } else {
      lastPhotoIndex = nextIndex;
      memoryPhoto.src = `./assets/photos/${encodeURIComponent(photoPool[nextIndex]).replace(/%2F/gi, "/")}`;
      memoryPhoto.hidden = false;
      photoZoomTrigger.hidden = false;
      photoPlaceholder.hidden = true;
    }

    showStep("photo");
    burst(width / 2, height * 0.38, 85);
  }

  async function startDraw() {
    if (drawButton.disabled) return;
    drawButton.disabled = true;
    await photoPoolPromise;
    memoryWheel.classList.add("is-spinning");
    let messageIndex = 0;
    rollingCopy.textContent = rollingMessages[messageIndex];
    const messageTimer = window.setInterval(() => {
      messageIndex = (messageIndex + 1) % rollingMessages.length;
      rollingCopy.textContent = rollingMessages[messageIndex];
    }, reduceMotion.matches ? 700 : 380);
    const duration = reduceMotion.matches ? 500 : 2200;
    window.setTimeout(() => {
      window.clearInterval(messageTimer);
      memoryWheel.classList.remove("is-spinning");
      drawButton.disabled = false;
      revealRandomPhoto();
    }, duration);
  }

  class Particle {
    constructor(x, y, type = "confetti", ambient = false) {
      this.type = type;
      this.ambient = ambient;
      this.x = x;
      this.y = y;
      this.previousX = x;
      this.previousY = y;
      this.size = type === "star" ? random(2, 6) : random(5, 11);
      this.color = colors[Math.floor(Math.random() * colors.length)];
      this.rotation = random(0, Math.PI * 2);
      this.rotationSpeed = random(-0.18, 0.18);
      this.opacity = ambient ? random(0.25, 0.85) : 1;
      this.life = ambient ? Number.POSITIVE_INFINITY : random(70, 125);
      this.maxLife = this.life;
      this.twinkle = random(0, Math.PI * 2);

      if (ambient) {
        this.velocityX = random(-0.08, 0.08);
        this.velocityY = random(-0.04, 0.04);
      } else {
        const angle = random(-Math.PI, 0);
        const speed = random(3.5, 9);
        this.velocityX = Math.cos(angle) * speed;
        this.velocityY = Math.sin(angle) * speed - random(1, 4);
      }
    }

    update() {
      this.previousX = this.x;
      this.previousY = this.y;
      this.x += this.velocityX;
      this.y += this.velocityY;
      this.rotation += this.rotationSpeed;
      this.twinkle += 0.06;

      if (this.ambient) {
        this.opacity = 0.35 + Math.sin(this.twinkle) * 0.28;
        if (this.x < -10) this.x = width + 10;
        if (this.x > width + 10) this.x = -10;
        if (this.y < -10) this.y = height + 10;
        if (this.y > height + 10) this.y = -10;
        return;
      }

      this.velocityY += 0.13;
      this.velocityX *= 0.992;
      this.life -= 1;
      this.opacity = Math.max(0, this.life / this.maxLife);
    }

    draw() {
      context.save();
      context.globalAlpha = this.opacity;
      context.fillStyle = this.color;
      context.translate(this.x, this.y);
      context.rotate(this.rotation);

      if (this.type === "star") {
        this.drawStar();
      } else {
        context.fillRect(-this.size / 2, -this.size / 3, this.size, this.size / 1.7);
      }

      context.restore();
    }

    drawStar() {
      context.beginPath();
      for (let point = 0; point < 10; point += 1) {
        const radius = point % 2 === 0 ? this.size : this.size * 0.38;
        const angle = -Math.PI / 2 + (point * Math.PI) / 5;
        const pointX = Math.cos(angle) * radius;
        const pointY = Math.sin(angle) * radius;
        if (point === 0) context.moveTo(pointX, pointY);
        else context.lineTo(pointX, pointY);
      }
      context.closePath();
      context.fill();
    }
  }

  function resizeCanvas() {
    const density = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * density);
    canvas.height = Math.round(height * density);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(density, 0, 0, density, 0, 0);

    const ambientCount = Math.min(130, Math.max(55, Math.round((width * height) / 7000)));
    const ambientParticles = particles.filter((particle) => particle.ambient);
    particles.length = 0;
    particles.push(...ambientParticles.slice(0, ambientCount));

    while (particles.length < ambientCount) {
      particles.push(new Particle(random(0, width), random(0, height), "star", true));
    }
  }

  function burst(x, y, amount = 55) {
    const particleCount = reduceMotion.matches ? Math.min(amount, 18) : amount;
    for (let index = 0; index < particleCount; index += 1) {
      const type = index % 4 === 0 ? "star" : "confetti";
      particles.push(new Particle(x, y, type));
    }
  }

  function animate() {
    context.clearRect(0, 0, width, height);
    for (let index = particles.length - 1; index >= 0; index -= 1) {
      const particle = particles[index];
      particle.update();
      particle.draw();
      if (!particle.ambient && (particle.life <= 0 || particle.y > height + 30)) {
        particles.splice(index, 1);
      }
    }
    animationFrame = window.requestAnimationFrame(animate);
  }

  function handlePointer(event) {
    if (event.target.closest("button")) return;
    burst(event.clientX, event.clientY, 42);
  }

  wishButton.addEventListener("click", () => {
    const bounds = wishButton.getBoundingClientRect();
    burst(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2, 90);
    openEgg();
  });
  unwrapButton.addEventListener("click", () => showStep("draw"));
  drawButton.addEventListener("click", startDraw);
  againButton.addEventListener("click", () => {
    showStep("draw");
    startDraw();
  });
  eggClose.addEventListener("click", teaseClose);
  realCloseButton.addEventListener("click", closeEgg);
  eggModal.querySelector("[data-close-modal]").addEventListener("click", teaseClose);
  photoZoomTrigger.addEventListener("click", openPhotoViewer);
  photoViewerClose.addEventListener("click", closePhotoViewer);
  photoViewer.querySelector(".photo-viewer-backdrop").addEventListener("click", closePhotoViewer);
  memoryPhoto.addEventListener("error", () => {
    memoryPhoto.hidden = true;
    photoZoomTrigger.hidden = true;
    photoPlaceholder.hidden = false;
    photoMessage.textContent = "这张照片暂时迷路了，请检查 photos.json 中的文件名。";
  });
  party.addEventListener("pointerdown", handlePointer);
  window.addEventListener("resize", resizeCanvas, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      window.cancelAnimationFrame(animationFrame);
    } else {
      animationFrame = window.requestAnimationFrame(animate);
    }
  });
  document.addEventListener("keydown", (event) => {
    if (eggModal.hidden) return;
    if (event.key === "Escape") {
      if (!photoViewer.hidden) {
        closePhotoViewer();
        return;
      }
      closeEgg();
      return;
    }

    if (!photoViewer.hidden) {
      if (event.key === "Tab") {
        event.preventDefault();
        photoViewerClose.focus();
      }
      return;
    }

    if (event.key === "Tab") {
      const focusable = [...eggModal.querySelectorAll("button:not([disabled])")].filter(
        (element) => !element.closest("[aria-hidden='true']"),
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  setTicker();
  photoPoolPromise = loadPhotoPool();
  resizeCanvas();
  animate();
  window.setTimeout(() => burst(width / 2, height * 0.32, 75), 450);

  if ("serviceWorker" in navigator && window.location.protocol !== "file:") {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./service-worker.js").catch((error) => {
        console.warn("离线功能注册失败：", error);
      });
    });
  }
})();
