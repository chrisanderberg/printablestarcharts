import { useEffect, useState } from 'react';

const STORAGE_KEY = 'printablestarcharts-theme';

function applyTheme(next: 'light' | 'night') {
  if (next === 'night') {
    document.documentElement.dataset.theme = 'night';
  } else {
    delete document.documentElement.dataset.theme;
  }
  localStorage.setItem(STORAGE_KEY, next);
}

export default function NightModeToggle() {
  const [isNight, setIsNight] = useState(false);

  useEffect(() => {
    setIsNight(document.documentElement.dataset.theme === 'night');
  }, []);

  function handleToggle() {
    const nextNight = !isNight;
    setIsNight(nextNight);
    applyTheme(nextNight ? 'night' : 'light');
  }

  return (
    <button
      type="button"
      className="night-toggle"
      onClick={handleToggle}
      aria-pressed={isNight}
      aria-label={isNight ? 'Switch to light mode' : 'Switch to Red Night Mode'}
    >
      <span className="night-toggle__dot" aria-hidden="true" />
      <span>{isNight ? 'Light mode' : 'Red Night Mode'}</span>
    </button>
  );
}
