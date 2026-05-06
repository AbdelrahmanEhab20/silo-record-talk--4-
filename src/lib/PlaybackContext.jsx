import React, { createContext, useContext, useState } from 'react';

const PlaybackContext = createContext(null);

export function PlaybackProvider({ children }) {
  const [seekTime, setSeekTime] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const seekTo = (seconds) => {
    setSeekTime(seconds);
  };

  return (
    <PlaybackContext.Provider value={{ seekTime, setSeekTime, isPlaying, setIsPlaying, seekTo }}>
      {children}
    </PlaybackContext.Provider>
  );
}

export function usePlayback() {
  const context = useContext(PlaybackContext);
  if (!context) {
    throw new Error('usePlayback must be used within PlaybackProvider');
  }
  return context;
}