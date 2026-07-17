let state = {
  playing: false, volume: 0.5, speed: 1.0, currentTime: 0,
  url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  accentColor: '#a855f7', title: 'Thaesu Radio',
  enabled: true, visualizerType: 'Floating', visualizerAlign: 'left',
  visualizerOffsetY: 0, visualizerOffsetX: 0,
};
export const getMusicState = () => ({ ...state });
export const updateMusicState = (newState) => { state = { ...state, ...newState }; return state; };
