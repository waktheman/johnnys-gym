(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Background videos: hold on the poster frame when the visitor prefers less
     motion, otherwise play only while on screen (saves battery and bandwidth). */
  document.querySelectorAll("video[data-bg], #hero-video, #quote-video").forEach((video) => {
    if (reduceMotion) {
      video.autoplay = false;
      video.removeAttribute("autoplay");
      video.pause();
      return;
    }
    const play = () => video.play().catch(() => {});
    new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? play() : video.pause()),
      { threshold: 0.1 }
    ).observe(video);
  });

  /* Nav background once the hero top is out of view */
  const nav = document.querySelector(".site-nav");
  const sentinel = document.getElementById("top-sentinel");
  if (nav && sentinel) {
    new IntersectionObserver(([entry]) => {
      nav.classList.toggle("scrolled", !entry.isIntersecting);
    }).observe(sentinel);
  }

  /* Mobile menu */
  const menuBtn = document.querySelector(".menu-btn");
  if (menuBtn) {
    const setOpen = (open) => {
      document.body.classList.toggle("menu-open", open);
      menuBtn.setAttribute("aria-expanded", String(open));
      menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      document.body.style.overflow = open ? "hidden" : "";
    };
    menuBtn.addEventListener("click", () =>
      setOpen(!document.body.classList.contains("menu-open"))
    );
    document.querySelectorAll(".mobile-menu a").forEach((link) =>
      link.addEventListener("click", () => setOpen(false))
    );
  }

  /* Stagger delays inside grouped grids */
  document.querySelectorAll("[data-stagger]").forEach((group) => {
    [...group.children].forEach((child, i) =>
      child.style.setProperty("--d", `${i * 90}ms`)
    );
  });

  /* Membership selector: clicking a plan moves the red highlight to it.
     Purely visual, a radio group, no navigation. */
  const planCards = [...document.querySelectorAll(".plan-card")];
  if (planCards.length) {
    const select = (card, focus) => {
      planCards.forEach((c) => {
        const on = c === card;
        c.classList.toggle("selected", on);
        c.setAttribute("aria-checked", String(on));
        c.tabIndex = on ? 0 : -1;
      });
      if (focus) card.focus();
    };
    planCards.forEach((card, i) => {
      card.addEventListener("click", () => select(card));
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          select(card);
        } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
          e.preventDefault();
          select(planCards[(i + 1) % planCards.length], true);
        } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
          e.preventDefault();
          select(planCards[(i - 1 + planCards.length) % planCards.length], true);
        }
      });
    });
    // roving tabindex: only the selected card is tab-reachable
    planCards.forEach((c) => {
      if (!c.classList.contains("selected")) c.tabIndex = -1;
    });
  }

  /* Scroll reveals */
  const revealEls = document.querySelectorAll(".reveal");
  if (revealEls.length && !reduceMotion) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -5% 0px" }
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("in"));
  }

  /* Reviews marquee: repeat the source cards until the row is comfortably wider
     than the viewport, then duplicate the whole run so the -50% loop is seamless. */
  const reviewsTrack = document.getElementById("reviews-track");
  if (reviewsTrack && reviewsTrack.children.length) {
    const sources = [...reviewsTrack.children].map((el) => el.cloneNode(true));
    const cardWidth =
      reviewsTrack.children[0].getBoundingClientRect().width + 16 || 396;
    const runWidth = cardWidth * sources.length;
    const repeats = Math.max(2, Math.ceil((window.innerWidth * 1.6) / runWidth));

    const run = document.createDocumentFragment();
    for (let i = 0; i < repeats; i++) {
      sources.forEach((el) => run.appendChild(el.cloneNode(true)));
    }
    const copy = run.cloneNode(true);
    [...copy.children].forEach((el) => el.setAttribute("aria-hidden", "true"));

    reviewsTrack.innerHTML = "";
    reviewsTrack.appendChild(run);
    reviewsTrack.appendChild(copy);
  }

  /* Footer year */
  const year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());
})();
