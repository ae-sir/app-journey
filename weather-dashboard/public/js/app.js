const cityInput   = document.getElementById('city-input');
const searchBtn   = document.getElementById('search-btn');
const weatherCard = document.getElementById('weather-card');
const errorMsg    = document.getElementById('error-message');

async function fetchWeather(city) {
  clearError();

  try {
    const response = await fetch(`/api/weather?city=${encodeURIComponent(city)}`);
    const data = await response.json();

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`No city found for "${city}". Check the spelling and try again.`);
      }
      throw new Error(data.message || 'Something went wrong');
    }

    renderWeather(data);
  } catch (err) {
    showError(err.message);
    weatherCard.style.display = 'none';
  }
}

function renderWeather(data) {
  document.getElementById('city-name').textContent =
    `${data.name}, ${data.sys.country}`;

  document.getElementById('temperature').textContent =
    `${Math.round(data.main.temp)}°C`;

  document.getElementById('condition').textContent =
    data.weather[0].description;

  document.getElementById('humidity').textContent =
    `${data.main.humidity}%`;

  // API gives wind in m/s — multiply by 3.6 to get km/h
  document.getElementById('wind-speed').textContent =
    `${(data.wind.speed * 3.6).toFixed(1)} km/h`;

  const iconCode = data.weather[0].icon;
  const iconImg  = document.getElementById('icon-img');
  iconImg.src = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
  iconImg.alt = data.weather[0].description;

  weatherCard.style.display = 'block';
  // Re-trigger the CSS animation by removing and re-adding the element's class
  weatherCard.classList.remove('animate');
  void weatherCard.offsetWidth; // force browser reflow
  weatherCard.classList.add('animate');
}

function showError(message) {
  errorMsg.textContent = capitalise(message);
}

function clearError() {
  errorMsg.textContent = '';
}

function capitalise(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function handleSearch() {
  const city = cityInput.value.trim();
  if (!city) {
    showError('Please enter a city name.');
    return;
  }
  fetchWeather(city);
}

searchBtn.addEventListener('click', handleSearch);

cityInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleSearch();
});
