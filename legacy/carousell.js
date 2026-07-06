document.addEventListener("DOMContentLoaded", () => {
  const carousel = document.querySelector(".card-carousell");

  const carouselObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          carousel.classList.add("fade-in"); // Startet die Einblendung
          startRotation(); // Startet die Karussell-Rotation
          carouselObserver.unobserve(carousel); // Beobachtung beenden
        }
      });
    },
    { threshold: 0.3 }
  );

  if (carousel) carouselObserver.observe(carousel);
});

const mobileQuery = window.matchMedia("(max-width: 768px)");

function updateImagesSrc(e) {
  const cruiseImage = document.getElementById("cruiseImage");
  const koreahikeImage = document.getElementById("koreahikeImage");
  const sleepoverImage = document.getElementById("sleepoverImage");
  const hanbokImage = document.getElementById("hanbokImage");
  const beachImage = document.getElementById("beachImage");

  if (e.matches) {
    cruiseImage.src = "img/assets/img-cruise-mobile.jpg";
    koreahikeImage.src = "img/assets/img-korea_hike-mobile.jpg";
    sleepoverImage.src = "img/assets/img-sleepover-mobile.jpg";
    hanbokImage.src = "img/assets/img-korea_hanbok-mobile.jpg";
    beachImage.src = "img/assets/img-beach-mobile.jpg";
    console.log("images switched into mobile");
  } else {
    cruiseImage.src = "img/assets/img-cruise.jpg";
    koreahikeImage.src = "img/assets/img-korea_hike.jpg";
    sleepoverImage.src = "img/assets/img-sleepover.jpg";
    beachImage.src = "img/assets/img-beach.jpg";
    console.log("images switched into desktop");
  }
}

updateImagesSrc(mobileQuery);

// Event-Listener only for Media Query-changes
mobileQuery.addEventListener("change", updateImagesSrc);

////// Card-Img-Carousell
let currentIndex = -1;
const cardSections = document.querySelectorAll(".card-carousell-section");
const indicatorDots = document.querySelectorAll(
  ".card-carousell-indicator-dot"
);
let intervalId; // Variable zum Speichern des Intervalls
let timeoutId; // Timeout für die Verzögerung

function showSection(index) {
  // Entferne die aktive Klasse von allen Indikatoren
  cardSections.forEach((cardSection, i) => {
    cardSection.style.opacity = 0; // macht die vorherige Sektion unsichtbar
    indicatorDots[i].classList.remove("active");
  });

  // Zeige die neue Sektion und hebe den neuen Punkt hervor
  cardSections[index].style.opacity = 1;
  indicatorDots[index].classList.add("active");
}

function resetRotationDelay() {
  // Stoppe das aktuelle Intervall und starte die Rotation nach 5 Sekunden neu
  clearInterval(intervalId);
  clearTimeout(timeoutId);

  timeoutId = setTimeout(() => {
    intervalId = setInterval(() => {
      currentIndex = (currentIndex + 1) % cardSections.length;
      showSection(currentIndex);
    }, 5000);
  }, 5000);
}

// Funktion zum Starten der Rotation mit einem kürzeren ersten Timeout
function startRotation() {
  // Erstes Bild sofort anzeigen
  showSection(0);
  currentIndex = 0;

  // Nach einer Verzögerung die Rotation starten
  timeoutId = setTimeout(() => {
    intervalId = setInterval(() => {
      currentIndex = (currentIndex + 1) % cardSections.length;
      showSection(currentIndex);
    }, 5000);
  }, 5000); // Erste Verzögerung
}

// Klickbare Indikatoren
indicatorDots.forEach((dot, index) => {
  dot.addEventListener("click", () => {
    currentIndex = index; // Setze den aktuellen Index
    showSection(index); // Zeige die entsprechende Sektion
    resetRotationDelay(); // Verzögere die automatische Rotation
  });
});
