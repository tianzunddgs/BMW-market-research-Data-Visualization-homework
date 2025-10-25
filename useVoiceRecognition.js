import { ref, watch } from 'vue';

export function useVoiceRecognition() {
  const isListening = ref(false);
  const transcript = ref('');
  const error = ref('');

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    error.value = 'Your browser does not support the Web Speech API.';
    return { isListening, transcript, error };
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'zh-CN';

  recognition.onstart = () => {
    isListening.value = true;
    error.value = '';
  };

  recognition.onresult = (event) => {
    let finalTranscript = '';
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript;
      }
    }
    if (finalTranscript) {
      transcript.value = finalTranscript.trim();
    }
  };

  recognition.onerror = (event) => {
    // event.error 常见值: 'no-speech', 'audio-capture', 'not-allowed', 'network', ...
    error.value = `Speech recognition error: ${event.error}`;
    isListening.value = false;
  };

  recognition.onend = () => {
    isListening.value = false;
  };

  // 尝试获取麦克风（请求权限并立即释放）
  async function ensureMicrophone() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('getUserMedia not supported');
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(t => t.stop());
  }

  const toggleListening = async () => {
    if (isListening.value) {
      recognition.stop();
      return;
    }
    transcript.value = '';
    error.value = '';

    try {
      // 先显式请求麦克风权限（这样可以得到更清晰的错误）
      await ensureMicrophone();
      recognition.start();
      // 不要在这里直接设置 isListening，等待 onstart 触发
    } catch (err) {
      // err.name 可能是 NotAllowedError / NotFoundError / NotReadableError 等
      if (err && err.name === 'NotAllowedError') {
        error.value = 'Microphone permission denied. Please allow microphone access in browser settings.';
      } else if (err && err.name === 'NotFoundError') {
        error.value = 'No microphone found. Please check your device.';
      } else {
        error.value = `Failed to access microphone: ${err.message || err}`;
      }
      isListening.value = false;
    }
  };

  // 保底：当 isListening 外部被改为 false 时，确保 recognition 停止
  watch(isListening, (listening) => {
    if (!listening && recognition) {
      try {
        recognition.stop();
      } catch (e) {
        // ignore
      }
    }
  });

  return {
    isListening,
    transcript,
    error,
    toggleListening,
  };
}
