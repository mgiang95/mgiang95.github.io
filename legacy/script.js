////// Profile FX: Hover Switch
const profileContainer = document.getElementById("profile-img");
const profileImage = document.querySelector(".profile-image");
const profileMemoji = document.querySelector(".profile-memoji");

// Hover Behavior
profileContainer.addEventListener("mouseover", () => {
  profileImage.style.animation = "bounceOut 0.6s ease forwards";
  profileMemoji.style.animation = "bounceIn 0.6s ease forwards";
});

profileContainer.addEventListener("mouseout", () => {
  profileImage.style.animation = "bounceIn 0.6s ease forwards";
  profileMemoji.style.animation = "bounceOut 0.6s ease forwards";
});

////// Navbar Scroll function
document.addEventListener("DOMContentLoaded", function () {
  const sections = document.querySelectorAll(".section");
  const navLinks = document.querySelectorAll(".sidebar-nav a");

  const options = {
    root: document.getElementById("outer-container"), // Make sure this targets your scrollable container
    rootMargin: "0px",
    threshold: 0.15, // Adjust as needed, 0.6 means 60% of the section must be in view to trigger
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const currentSection = entry.target.getAttribute("id");

        // Update the nav links
        navLinks.forEach((link) => {
          link.classList.remove("active");
          if (link.getAttribute("href").includes(currentSection)) {
            link.classList.add("active");
          }
        });
      }
    });
  }, options);

  sections.forEach((section) => {
    observer.observe(section);
  });
});

// Smooth scroll on click using scrollIntoView
document.querySelectorAll(".sidebar-nav a").forEach((link) => {
  link.addEventListener("click", function (e) {
    e.preventDefault();
    const targetId = this.getAttribute("href");
    const targetSection = document.querySelector(targetId);

    targetSection.scrollIntoView({
      behavior: "smooth", // Smooth scroll behavior
      block: "start", // Scrolls to the top of the element
    });
  });
});

// function copyToClipboard(element) {
//   const url = element.getAttribute("data-url");

//   // Kopieren der URL in die Zwischenablage
//   navigator.clipboard
//     .writeText(url)
//     .then(() => {
//       const banner = document.getElementById("copy-banner");
//       banner.style.display = "block"; // Banner anzeigen
//       banner.style.opacity = "1"; // Banner sichtbar machen

//       // Banner nach 2 Sekunden ausblenden
//       setTimeout(() => {
//         banner.style.opacity = "0"; // Banner ausblenden
//         setTimeout(() => {
//           banner.style.display = "none"; // Banner nicht mehr anzeigen
//         }, 300); // Warte auf den Übergang
//       }, 4000);
//     })
//     .catch((err) => {
//       console.error("Fehler beim Kopieren: ", err);
//     });
// }

////// Cursor FX
// Zugriff auf das Kreiselement
const cursorCircle = document.getElementById("cursorCircle");

// Funktion, um die Position des Kreises bei jeder Mausbewegung anzupassen
document.addEventListener("mousemove", (e) => {
  // Platziere den Kreis zentriert um den Mauszeiger
  cursorCircle.style.left = `${e.pageX - 50}px`;
  cursorCircle.style.top = `${e.pageY - 50}px`;
});

////// Timeline
document.addEventListener("DOMContentLoaded", () => {
  const buttons = document.querySelectorAll(".timeline-controls button");
  const slider = document.querySelector(".timeline-controls .slider");
  const timelineItems = document.querySelectorAll(".timeline-item");

  // Funktion für die Timeline-Filterung
  function filterTimeline(category) {
    buttons.forEach((btn) => btn.classList.remove("active"));
    const activeButton = Array.from(buttons).find(
      (btn) => btn.dataset.filter === category
    );

    if (activeButton) {
      activeButton.classList.add("active");

      // Slider-Animation
      updateSliderPosition(activeButton);
    }

    // Timeline-Filterlogik
    timelineItems.forEach((item) => {
      const isWork = item.dataset.category === "work";
      const isEducation = item.dataset.category === "education";
      const details = item.querySelector(".styled-list");

      // Entferne alle Statusklassen
      item.classList.remove("hidden", "reduced-view");

      if (category === "all") {
        // Full journey zeigt alle Items vollständig
        if (details) expandDetails(details); // Details immer anzeigen
      } else if (category === "work") {
        // Work filtert Education auf reduced view
        if (isWork) {
          if (details) expandDetails(details); // Nur Details für Work anzeigen
        } else if (isEducation) {
          item.classList.add("reduced-view");
          if (details) collapseDetails(details); // Details ausblenden
        } else {
          item.classList.add("hidden");
        }
      } else if (category === "education") {
        // Education filtert Work auf reduced view
        if (isEducation) {
          if (details) expandDetails(details); // Nur Details für Education anzeigen
        } else if (isWork) {
          item.classList.add("reduced-view");
          if (details) collapseDetails(details); // Details ausblenden
        } else {
          item.classList.add("hidden");
        }
      }
    });
  }

  // Helper-Funktionen
  function expandDetails(details) {
    details.style.height = details.scrollHeight + "px"; // Automatische Höhe setzen
    details.style.opacity = 1; // Sichtbar machen
    details.style.overflow = "visible"; // Inhalt sichtbar
  }

  function collapseDetails(details) {
    details.style.height = "0"; // Höhe auf 0 setzen
    details.style.opacity = 0; // Unsichtbar machen
    details.style.overflow = "hidden"; // Inhalt verstecken
  }

  // Funktion zum Aktualisieren der Slider-Position
  function updateSliderPosition(activeButton) {
    const buttonRect = activeButton.getBoundingClientRect();
    const containerRect = activeButton.parentElement.getBoundingClientRect();
    const newLeft = buttonRect.left - containerRect.left;
    slider.style.transform = `translateX(${newLeft}px)`;
    slider.style.width = `${buttonRect.width}px`;
  }

  // Event-Listener für Buttons hinzufügen
  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const category = button.dataset.filter;
      filterTimeline(category);
    });
  });

  // Event-Listener für Fenster-Skalierung
  window.addEventListener("resize", () => {
    const activeButton = document.querySelector(
      ".timeline-controls button.active"
    );
    if (activeButton) {
      updateSliderPosition(activeButton);
    }
  });

  // Standardzustand
  filterTimeline("work");
});

////// Funktion: Scroll down Effect
document.addEventListener("DOMContentLoaded", function () {
  const scrollContainer = document.querySelector(".scroll-down-container");
  const logoMarquee = document.querySelector(".logo-marquee-container");
  const outerContainer = document.getElementById("outer-container");

  // Media Query für den gewünschten Bereich
  const mediaQuery = window.matchMedia(
    "(min-width: 1200px) and (max-width: 1920px)"
  );

  // Funktion: Effekt aktivieren oder zurücksetzen
  function handleEffectActivation() {
    if (mediaQuery.matches) {
      // Effekt aktivieren: Scroll-Event hinzufügen
      outerContainer.addEventListener("scroll", handleScroll);
    } else {
      // Effekt deaktivieren: Zustand zurücksetzen
      scrollContainer.classList.remove("hidden");
      logoMarquee.classList.remove("shifted-up");
      outerContainer.removeEventListener("scroll", handleScroll);
    }
  }

  // Funktion: Scroll-Handling
  function handleScroll() {
    if (outerContainer.scrollTop > 50) {
      scrollContainer.classList.add("hidden");
      logoMarquee.classList.add("shifted-up");
    } else {
      scrollContainer.classList.remove("hidden");
      logoMarquee.classList.remove("shifted-up");
    }
  }

  // Initiale Aktivierung basierend auf der Media Query
  handleEffectActivation();

  // Event-Listener für Änderungen der Bildschirmgröße
  mediaQuery.addEventListener("change", handleEffectActivation);
});
