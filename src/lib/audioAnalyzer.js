/**
 * Real-time audio analysis for accurate signal detection
 */

export class AudioAnalyzer {
  constructor(stream) {
    this.stream = stream;
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    
    const source = this.audioContext.createMediaStreamSource(stream);
    source.connect(this.analyser);
    
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.isActive = true;
  }

  /**
   * Get current sound level (0-100)
   */
  getSoundLevel() {
    if (!this.isActive) return 0;
    
    this.analyser.getByteFrequencyData(this.dataArray);
    
    // Calculate RMS (Root Mean Square) for more accurate level
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      const normalized = this.dataArray[i] / 255;
      sum += normalized * normalized;
    }
    const rms = Math.sqrt(sum / this.dataArray.length);
    
    // Scale 0-1 to 0-100
    return Math.min(100, Math.round(rms * 250));
  }

  /**
   * Get frequency spectrum for waveform visualization (0-100 scale)
   */
  getWaveformBars(barCount = 24) {
    if (!this.isActive) return Array(barCount).fill(0);
    
    this.analyser.getByteFrequencyData(this.dataArray);
    
    const barsData = [];
    const binSize = Math.floor(this.dataArray.length / barCount);
    
    for (let i = 0; i < barCount; i++) {
      let sum = 0;
      for (let j = 0; j < binSize; j++) {
        sum += this.dataArray[i * binSize + j];
      }
      const avg = (sum / binSize) / 255;
      barsData.push(Math.round(avg * 100));
    }
    
    return barsData;
  }

  /**
   * Analyze signal quality
   */
  analyzeSignalQuality() {
    if (!this.isActive) return { level: 0, quality: 'none' };
    
    const level = this.getSoundLevel();
    
    if (level < 10) return { level, quality: 'no_signal' };
    if (level < 25) return { level, quality: 'weak' };
    if (level < 50) return { level, quality: 'good' };
    return { level, quality: 'excellent' };
  }

  /**
   * Detect peaks for activity indication
   */
  detectPeaks() {
    if (!this.isActive) return false;
    
    this.analyser.getByteFrequencyData(this.dataArray);
    const peakThreshold = 255 * 0.4;
    
    for (let i = 0; i < this.dataArray.length; i++) {
      if (this.dataArray[i] > peakThreshold) return true;
    }
    return false;
  }

  /**
   * Cleanup
   */
  stop() {
    this.isActive = false;
    this.stream.getTracks().forEach(track => track.stop());
  }
}